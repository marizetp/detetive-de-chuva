import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslator } from '../i18n/translate.js';
import { ApiError, requestJson, resetTransport, setTransport } from '../services/api.js';
import { getCrops, getProvinces } from '../services/catalog.js';
import { postAdvisory, postEvaluate } from '../services/consultation.js';
import { getUserErrorMessage } from '../utils/errorMessages.js';
import { ALL_RECORDINGS as RECORDINGS } from '../test/allRecordings.js';
import { DEMO_RECORDINGS } from './recordings.js';
import { createReplayTransport } from './replayTransport.js';

// Isolamento do modo de demonstração: com a reprodução instalada, nenhum pedido chega à rede, só
// são servidas respostas gravadas elegíveis e um pedido sem gravação é recusado (nunca inventado).

const recording = (id) => RECORDINGS.find((entry) => entry.id === id);
const NOT_ELIGIBLE = RECORDINGS.filter((entry) => entry.demo !== true);

function installReplayWithNetworkSpy() {
  const fetchSpy = vi.fn(() => Promise.reject(new Error('rede não deve ser usada')));
  vi.stubGlobal('fetch', fetchSpy);
  setTransport(createReplayTransport(DEMO_RECORDINGS));
  return fetchSpy;
}

afterEach(() => {
  resetTransport();
  vi.unstubAllGlobals();
});

describe('reprodução — respostas servidas', () => {
  it('cada resposta elegível é servida tal como gravada, sem tocar na rede', async () => {
    const fetchSpy = installReplayWithNetworkSpy();
    for (const entry of DEMO_RECORDINGS) {
      const value = await requestJson(entry.path, {
        method: entry.method,
        body: entry.body ?? undefined,
      });
      expect(value, entry.id).toEqual(JSON.parse(entry.text));
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('os serviços de produção funcionam sobre a reprodução (catálogos e consulta completa)', async () => {
    const fetchSpy = installReplayWithNetworkSpy();
    expect(await getProvinces()).toEqual(JSON.parse(recording('get_api_v1_provinces').text));
    expect((await getCrops()).map((crop) => crop.nome)).toEqual([
      'Milho',
      'Feijão',
      'Soja',
      'Mandioca',
      'Arroz',
    ]);
    const params = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };
    expect(await postAdvisory(params)).toEqual(JSON.parse(recording('adv_pt').text));
    expect(await postEvaluate(params)).toEqual(JSON.parse(recording('eval_pt').text));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a ordem das chaves do corpo não altera a correspondência', async () => {
    installReplayWithNetworkSpy();
    const value = await requestJson('/api/v1/evaluate', {
      method: 'POST',
      body: { data_consulta: '2026-06-15', cultura: 'Arroz', provincia: 'Bié' },
    });
    expect(value).toEqual(JSON.parse(recording('eval_arroz_bie').text));
  });
});

describe('reprodução — idioma da recomendação', () => {
  const params = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };

  it('inglês: o /advisory com lang=en serve a gravação real em inglês; o /evaluate (sem lang) a mesma de sempre', async () => {
    const fetchSpy = installReplayWithNetworkSpy();
    const advisory = await postAdvisory(params, { language: 'en' });
    expect(advisory).toEqual(JSON.parse(recording('adv_en').text));
    expect(advisory.recomendacao_extensao).toMatch(/^\*\*FAVORABLE/);
    expect(await postEvaluate(params)).toEqual(JSON.parse(recording('eval_pt').text));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('português: o /advisory sem lang serve a gravação em português', async () => {
    installReplayWithNetworkSpy();
    const advisory = await postAdvisory(params, { language: 'pt' });
    expect(advisory).toEqual(JSON.parse(recording('adv_pt').text));
    expect(advisory.recomendacao_extensao).toMatch(/^\*\*FAVORÁVEL/);
  });

  it('as duas gravações têm os mesmos estado e métricas (só o texto muda de idioma)', () => {
    const en = JSON.parse(recording('adv_en').text);
    const pt = JSON.parse(recording('adv_pt').text);
    expect(en.status).toBe(pt.status);
    expect(en.metricas).toEqual(pt.metricas);
  });

  it('lang=en no /evaluate não tem gravação elegível (o frontend nunca o envia)', async () => {
    installReplayWithNetworkSpy();
    await expect(
      requestJson('/api/v1/evaluate', { method: 'POST', body: { ...params, lang: 'en' } }),
    ).rejects.toMatchObject({ kind: 'demoUnavailable' });
  });
});

describe('reprodução — pedidos sem gravação', () => {
  it.each([
    ['outra data', '/api/v1/advisory', { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-16' }],
    ['/advisory só existe para a consulta completa', '/api/v1/advisory', { provincia: 'Bié', cultura: 'Arroz', data_consulta: '2026-06-15' }],
    ['cultura inexistente (gravada, mas excluída)', '/api/v1/advisory', { provincia: 'Huambo', cultura: 'Batata', data_consulta: '2026-11-15' }],
    ['município inexistente (gravado, mas excluído)', '/api/v1/advisory', { provincia: 'Huambo', municipio: 'Lisboa', cultura: 'Milho', data_consulta: '2026-11-15' }],
    ['data impossível (gravada, mas excluída)', '/api/v1/evaluate', { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-02-30' }],
  ])('%s → demoUnavailable, sem resposta inventada', async (_, path, body) => {
    const fetchSpy = installReplayWithNetworkSpy();
    await expect(requestJson(path, { method: 'POST', body })).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'demoUnavailable',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('endpoints não usados pelo frontend nunca são servidos (motor, janela de plantio, linha de base)', async () => {
    installReplayWithNetworkSpy();
    for (const path of ['/zonas', '/zonas/huambo/decisao', '/api/v1/optimal-planting', '/api/v1/baseline/Huambo', '/compliance']) {
      await expect(requestJson(path), path).rejects.toBeInstanceOf(ApiError);
    }
  });

  it('respeita o cancelamento', async () => {
    installReplayWithNetworkSpy();
    const controller = new AbortController();
    controller.abort();
    await expect(requestJson('/api/v1/provinces', { signal: controller.signal })).rejects.toMatchObject({
      kind: 'aborted',
    });
  });

  it('mensagem própria nos dois idiomas, sem nova tentativa', () => {
    const error = new ApiError('demoUnavailable', 'x');
    expect(getUserErrorMessage(error, createTranslator('pt'))).toMatchObject({
      title: 'Esta consulta não está disponível no modo de demonstração.',
      canRetry: false,
    });
    expect(getUserErrorMessage(error, createTranslator('en')).title).toBe(
      'This consultation is not available in demonstration mode.',
    );
  });
});

describe('respostas não elegíveis', () => {
  it('nenhuma das 42 respostas não elegíveis é servida pela demonstração', async () => {
    expect(NOT_ELIGIBLE).toHaveLength(42);
    const fetchSpy = installReplayWithNetworkSpy();
    for (const entry of NOT_ELIGIBLE) {
      await expect(
        requestJson(entry.path, { method: entry.method, body: entry.body ?? undefined }),
        entry.id,
      ).rejects.toMatchObject({ kind: 'demoUnavailable' });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('createReplayTransport — só entradas elegíveis', () => {
  it('ignora entradas com demo !== true, mesmo que lhe sejam passadas', async () => {
    const transport = createReplayTransport(RECORDINGS); // inclui as 42 não elegíveis
    await expect(
      transport('https://x.invalid/api/v1/advisory', {
        method: 'POST',
        body: JSON.stringify({ provincia: 'Huambo', cultura: 'Batata', data_consulta: '2026-11-15' }),
      }),
    ).rejects.toMatchObject({ kind: 'demoUnavailable' });
  });
});
