import { describe, expect, it } from 'vitest';
import {
  advisoryHuamboMilho,
  cropsResponse,
  evaluateHuamboAguardar,
  evaluateHuamboMilho,
  evaluateHuilaDesfavoravel,
  healthResponse,
  provincesResponse,
} from '../test/fixtures/liveResponses.js';
import {
  mapAdvisoryResponse,
  mapCatalogOptions,
  mapEvaluateResponse,
  mapHealthResponse,
  mapStatus,
} from './mappers.js';

const metricValues = (viewModel) =>
  Object.fromEntries(viewModel.metrics.map(({ key, value }) => [key, value]));

describe('mapStatus', () => {
  it.each([
    ['FAVORAVEL', 'Favorável', 'positive'],
    ['AGUARDAR', 'Aguardar', 'caution'],
    ['DESFAVORAVEL', 'Desfavorável', 'warning'],
  ])('%s → %s', (code, label, tone) => {
    expect(mapStatus(code)).toEqual({ code, known: true, label, tone });
  });

  it('estado desconhecido → fallback neutro, mantendo o código original', () => {
    expect(mapStatus('PLANTAR_JA')).toEqual({
      code: 'PLANTAR_JA',
      known: false,
      label: 'Estado não reconhecido',
      tone: 'neutral',
    });
  });

  it('estado em falta → "Estado indisponível"', () => {
    expect(mapStatus(undefined)).toMatchObject({ code: null, known: false, tone: 'neutral' });
    expect(mapStatus('')).toMatchObject({ code: null, label: 'Estado indisponível' });
  });
});

describe('mapAdvisoryResponse', () => {
  it('mapeia uma resposta real completa', () => {
    const vm = mapAdvisoryResponse(advisoryHuamboMilho);

    expect(vm.source).toBe('advisory');
    expect(vm.status.code).toBe('FAVORAVEL');
    expect(vm.confidenceScore).toBe(95);
    expect(metricValues(vm)).toEqual({
      chuva_acumulada_recente_mm: 25.6,
      humidade_solo_raiz: 0.48, // valor original 0–1 preservado
      previsao_7dias_mm: 51.2,
    });
    expect(vm.recommendationText).toBe(advisoryHuamboMilho.recomendacao_extensao);
    expect(vm.isComplete).toBe(true);
    expect(vm.issues).toEqual([]);
  });

  it('não acrescenta campos que /advisory não devolve', () => {
    const vm = mapAdvisoryResponse(advisoryHuamboMilho);
    expect(vm).not.toHaveProperty('triggers');
    expect(vm).not.toHaveProperty('justifications');
    expect(vm).not.toHaveProperty('isFallbackWeather');
  });

  it('resposta incompleta: campos em falta ficam null e são registados', () => {
    const vm = mapAdvisoryResponse({ status: 'AGUARDAR', metricas: { previsao_7dias_mm: 10 } });

    expect(vm.status.code).toBe('AGUARDAR');
    expect(vm.confidenceScore).toBeNull();
    expect(vm.recommendationText).toBeNull();
    expect(metricValues(vm)).toEqual({
      chuva_acumulada_recente_mm: null,
      humidade_solo_raiz: null,
      previsao_7dias_mm: 10,
    });
    expect(vm.isComplete).toBe(false);
    expect(vm.issues).toEqual(
      expect.arrayContaining([
        { field: 'score_confianca', problem: 'missing' },
        { field: 'metricas.chuva_acumulada_recente_mm', problem: 'missing' },
        { field: 'metricas.humidade_solo_raiz', problem: 'missing' },
        { field: 'recomendacao_extensao', problem: 'missing' },
      ]),
    );
  });

  it('valores impossíveis são rejeitados, não corrigidos', () => {
    const vm = mapAdvisoryResponse({
      ...advisoryHuamboMilho,
      score_confianca: 140,
      metricas: { chuva_acumulada_recente_mm: -3, humidade_solo_raiz: 34, previsao_7dias_mm: '83' },
    });
    expect(vm.confidenceScore).toBeNull();
    expect(Object.values(metricValues(vm))).toEqual([null, null, null]);
    expect(vm.issues.every(({ problem }) => problem === 'invalid')).toBe(true);
  });

  it('metricas ausente ou com tipo errado', () => {
    expect(mapAdvisoryResponse({ ...advisoryHuamboMilho, metricas: null }).issues).toContainEqual({
      field: 'metricas',
      problem: 'missing',
    });
    expect(mapAdvisoryResponse({ ...advisoryHuamboMilho, metricas: [] }).issues).toContainEqual({
      field: 'metricas',
      problem: 'invalid',
    });
  });

  it('recomendação vazia é inválida', () => {
    const vm = mapAdvisoryResponse({ ...advisoryHuamboMilho, recomendacao_extensao: '  ' });
    expect(vm.recommendationText).toBeNull();
    expect(vm.issues).toContainEqual({ field: 'recomendacao_extensao', problem: 'invalid' });
  });

  it('estado desconhecido não é considerado erro de estrutura', () => {
    const vm = mapAdvisoryResponse({ ...advisoryHuamboMilho, status: 'NOVO_ESTADO' });
    expect(vm.status.known).toBe(false);
    expect(vm.isComplete).toBe(true);
  });

  it('entrada que não é objecto não rebenta', () => {
    const vm = mapAdvisoryResponse(null);
    expect(vm.status.code).toBeNull();
    expect(vm.issues[0]).toEqual({ field: '(resposta)', problem: 'invalid' });
  });
});

describe('mapEvaluateResponse', () => {
  it('mapeia os campos documentados de uma resposta real', () => {
    const vm = mapEvaluateResponse(evaluateHuamboMilho);

    expect(vm.source).toBe('evaluate');
    expect(vm.status.code).toBe('FAVORAVEL');
    expect(vm.confidenceScore).toBe(95);
    expect(vm.triggers).toEqual(['RECENT_RAIN_TRIGGER_SATISFIED']);
    expect(vm.justifications).toEqual(evaluateHuamboMilho.justificacoes_tecnicas);
    expect(vm.isFallbackWeather).toBe(true);
    expect(vm.isComplete).toBe(true);
  });

  it('guarda detalhes_agroclimaticos (não documentado) como opcional, sem interpretar', () => {
    const vm = mapEvaluateResponse(evaluateHuamboMilho);
    expect(vm.undocumentedDetails).toEqual(evaluateHuamboMilho.detalhes_agroclimaticos);

    const withoutDetails = mapEvaluateResponse({ ...evaluateHuamboMilho, detalhes_agroclimaticos: undefined });
    expect(withoutDetails.undocumentedDetails).toBeNull();
    expect(withoutDetails.isComplete).toBe(true);
  });

  it('detalhes não documentados: só valores simples são mantidos', () => {
    const vm = mapEvaluateResponse({
      ...evaluateHuamboMilho,
      detalhes_agroclimaticos: { a: 1, b: 'x', c: { nested: true }, d: [1], e: NaN },
    });
    expect(vm.undocumentedDetails).toEqual({ a: 1, b: 'x' });
  });

  it('distingue lista vazia (nenhum trigger) de lista ausente (desconhecido)', () => {
    const vm = mapEvaluateResponse(evaluateHuamboAguardar);
    expect(vm.status.code).toBe('AGUARDAR');
    expect(vm.triggers).toEqual([]);
    expect(vm.justifications).toBeNull();
    expect(vm.issues).toContainEqual({ field: 'justificacoes_tecnicas', problem: 'missing' });
  });

  it('suporta o estado DESFAVORAVEL e métricas a zero', () => {
    const vm = mapEvaluateResponse(evaluateHuilaDesfavoravel);
    expect(vm.status).toMatchObject({ code: 'DESFAVORAVEL', label: 'Desfavorável' });
    expect(metricValues(vm).chuva_acumulada_recente_mm).toBe(0);
  });

  it('filtra itens que não são texto e regista o problema', () => {
    const vm = mapEvaluateResponse({
      ...evaluateHuamboMilho,
      triggers_ativados: ['OK', 3, null],
      is_fallback_weather: 'sim',
    });
    expect(vm.triggers).toEqual(['OK']);
    expect(vm.isFallbackWeather).toBeNull();
    expect(vm.issues).toEqual(
      expect.arrayContaining([
        { field: 'triggers_ativados', problem: 'invalid' },
        { field: 'is_fallback_weather', problem: 'invalid' },
      ]),
    );
  });
});

describe('mapCatalogOptions', () => {
  it('usa nome como valor enviado à API e ignora campos não documentados', () => {
    expect(mapCatalogOptions(provincesResponse)).toEqual({
      options: [
        { id: 'huambo', label: 'Huambo', value: 'Huambo' },
        { id: 'bie', label: 'Bié', value: 'Bié' },
        { id: 'huila', label: 'Huíla', value: 'Huíla' },
      ],
      discardedCount: 0,
    });
    expect(mapCatalogOptions(cropsResponse).options.map((o) => o.value)).toEqual([
      'Milho',
      'Feijão',
      'Soja',
    ]);
  });

  it('descarta entradas inválidas ou repetidas', () => {
    const result = mapCatalogOptions([
      { id: 'a', nome: 'A' },
      { id: 'a', nome: 'A de novo' },
      { id: '', nome: 'Sem id' },
      { id: 'b' },
      null,
    ]);
    expect(result.options).toEqual([{ id: 'a', label: 'A', value: 'A' }]);
    expect(result.discardedCount).toBe(4);
  });

  it('lista vazia ou não-lista → sem opções', () => {
    expect(mapCatalogOptions([])).toEqual({ options: [], discardedCount: 0 });
    expect(mapCatalogOptions(undefined)).toEqual({ options: [], discardedCount: 0 });
  });
});

describe('mapHealthResponse', () => {
  it('serviço pronto', () => {
    expect(mapHealthResponse(healthResponse)).toEqual({
      isHealthy: true,
      baselineReady: true,
      isReady: true,
      serverDate: '2026-11-12',
    });
  });

  it('serviço activo mas sem baseline', () => {
    expect(mapHealthResponse({ status: 'healthy', baseline_ready: false })).toMatchObject({
      isHealthy: true,
      isReady: false,
      serverDate: null,
    });
  });

  it('resposta inesperada', () => {
    expect(mapHealthResponse(null)).toMatchObject({ isHealthy: false, isReady: false });
  });
});
