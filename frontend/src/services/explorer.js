import { API_PATHS } from '../config/api.js';
import { ApiError, requestJson } from './api.js';

function withQuery(path, query) {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function buildFallbackCycleFromBaseline(optimalData, baselineData) {
  const weeklyCurve = baselineData?.curva_sementeira_semanal ?? {};
  const monthlyMatrix = baselineData?.linha_base_mensal ?? {};
  const reqRain = Number(optimalData?.exigencia_cultura?.chuva_mensal_min_mm ?? 110);
  const minRoot = Number(optimalData?.exigencia_cultura?.humidade_raiz_min ?? 0.35);

  const weeks = [];
  for (let w = 1; w <= 52; w++) {
    const raw = weeklyCurve[String(w)] ?? weeklyCurve[w] ?? {};
    const approxMonth = Math.min(Math.max(Math.round((w * 12) / 52), 1), 12);
    const mData = monthlyMatrix[String(approxMonth)] ?? monthlyMatrix[approxMonth] ?? {};
    const baseProb = Number(raw.probabilidade_sementeira_pct ?? 5);
    const wRain = Number(
      raw.chuva_semanal_media_mm ?? Number(mData.chuva_media_mensal_mm ?? 0) / 4.33,
    );
    const wMoist = Number(
      raw.humidade_raiz_mediana ?? raw.gwetroot_mediana ?? mData.gwetroot_p50 ?? 0.3,
    );
    const rainFactor = Math.min((wRain * 4.33) / Math.max(reqRain, 1), 1.3);
    const moistFactor = wMoist >= minRoot ? 1 : Math.max(0.35, wMoist / Math.max(minRoot, 0.01));
    const isKakimbo = approxMonth >= 5 && approxMonth <= 8;
    let pct = baseProb * (0.55 + 0.45 * Math.min(rainFactor, 1.15)) * moistFactor;
    if (isKakimbo) pct = Math.min(pct, 18);
    pct = Math.round(Math.min(Math.max(pct, 5), 95) * 10) / 10;
    const nivel = isKakimbo || pct < 35 ? 'baixa' : pct >= 65 ? 'alta' : 'media';
    weeks.push({
      semana_iso: w,
      probabilidade_cultura_pct: pct,
      nivel,
      fase_ciclo: isKakimbo ? 'CACIMBO_SECO' : nivel === 'alta' ? 'PLANTIO_OTIMO' : nivel === 'media' ? 'TRANSICAO_CAUTELA' : 'FORA_JANELA',
      dentro_janela_otima: false,
      humidade_raiz_mediana: Math.round(wMoist * 1000) / 1000,
      chuva_semanal_media_mm: Math.round(wRain * 10) / 10,
    });
  }

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const raw = monthlyMatrix[String(m)] ?? monthlyMatrix[m] ?? {};
    const mRain = Number(raw.chuva_media_mensal_mm ?? 0);
    const mMoist = Number(raw.gwetroot_p50 ?? 0.3);
    const isKakimbo = m >= 5 && m <= 8;
    let pct = 88 * Math.min(mRain / Math.max(reqRain, 1), 1) * (mMoist >= minRoot ? 1 : Math.max(0.3, mMoist / Math.max(minRoot, 0.01)));
    if (isKakimbo) pct = Math.min(pct, 15);
    pct = Math.round(Math.min(Math.max(pct, 5), 95) * 10) / 10;
    months.push({
      mes: m,
      probabilidade_cultura_pct: pct,
      nivel: isKakimbo || pct < 35 ? 'baixa' : pct >= 65 ? 'alta' : 'media',
      chuva_media_mensal_mm: Math.round(mRain * 10) / 10,
      humidade_solo_raiz_p50: Math.round(mMoist * 1000) / 1000,
      temperatura_media_c: Math.round(Number(raw.temperatura_media_c ?? 20) * 10) / 10,
    });
  }

  return { weeks, months };
}

/**
 * Carrega a avaliação por província e municípios para colorir o mapa interactivo.
 * Usa /api/v1/map-overview quando disponível, com fallback compatível para /api/v1/evaluate.
 */
export async function getMapOverview({ crop = 'Milho', date, province = '', language = 'en', signal } = {}) {
  const path = withQuery(API_PATHS.mapOverview, {
    cultura: crop,
    data_consulta: date,
    provincia: province || undefined,
    lang: language,
  });

  try {
    return await requestJson(path, { method: 'GET', signal });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
    const targetProvinces = ['Huambo', 'Bié', 'Huíla'];
    const entries = await Promise.all(
      targetProvinces.map(async (prov) => {
        const res = await requestJson(API_PATHS.evaluate, {
          method: 'POST',
          signal,
          body: {
            provincia: prov,
            cultura: crop,
            ...(date ? { data_consulta: date } : {}),
            ...(language === 'en' ? { lang: 'en' } : {}),
          },
        });
        return [prov, { provincia: prov, municipio: null, ...res }];
      }),
    );
    return {
      cultura: crop,
      data_consulta: date,
      content_language: language,
      provincias: Object.fromEntries(entries),
      municipios: {},
    };
  }
}

/**
 * Carrega os dados do ciclo agrícola anual (IMERG V07 + NASA POWER) para a província e cultura.
 */
export async function getProvinceCycleData({
  province = 'Huambo',
  municipality = '',
  date,
  crop = 'Milho',
  season,
  language = 'en',
  signal,
} = {}) {
  const now = new Date();
  const defaultSeasonYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const resolvedSeason = season || `${defaultSeasonYear}/${defaultSeasonYear + 1}`;

  const [optimal, baseline] = await Promise.all([
    requestJson(
      withQuery(API_PATHS.optimalPlanting, {
        provincia: province,
        municipio: municipality || undefined,
        data_consulta: date || undefined,
        cultura: crop,
        epoca_agricola: resolvedSeason,
        lang: language,
      }),
      { method: 'GET', signal },
    ),
    requestJson(
      withQuery(API_PATHS.baseline(province), { lang: language }),
      { method: 'GET', signal },
    ),
  ]);

  let weeks = optimal?.ciclo_anual_52s;
  let months = optimal?.ciclo_mensal_12m;
  if (!Array.isArray(weeks) || weeks.length === 0 || !Array.isArray(months) || months.length === 0) {
    const derived = buildFallbackCycleFromBaseline(optimal, baseline);
    weeks = derived.weeks;
    months = derived.months;
  }

  return {
    optimal,
    baseline,
    weeks,
    months,
  };
}
