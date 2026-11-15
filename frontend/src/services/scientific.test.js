import { afterEach, describe, expect, it, vi } from 'vitest';
import { IMERG_CODE_OUTCOMES, IMERG_OUTCOMES } from '../config/imerg.js';
import { STATUS_DEFINITIONS } from '../config/status.js';
import { isLanguageCapabilityEnabled } from '../config/env.js';
import { ALL_RECORDINGS } from '../test/allRecordings.js';
import {
  classifyImergCode,
  imergNoDecisionMessageKeys,
  mapImergDecisionResponse,
  mapOptimalPlantingResponse,
} from '../utils/scientificMappers.js';
import { getImergDecision, getOptimalPlanting, languageQuery } from './scientific.js';

// Motor IMERG e janela de plantio: preparação da integração (D11), com respostas REAIS gravadas em
// 2026-11-15. `content_language`, quando aparece, é acrescentado pelo teste (contrato pedido).

const json = (id) => JSON.parse(ALL_RECORDINGS.find((entry) => entry.id === id).text);
const text = (id) => ALL_RECORDINGS.find((entry) => entry.id === id).text;

function stubFetch(body = '{}') {
  const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => body }));
  vi.stubGlobal('fetch', fetchSpy);
  return () => fetchSpy.mock.calls.map(([url, init]) => [new URL(url).pathname + new URL(url).search, init.method, init.body]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('motor IMERG: desfechos', () => {
  it('é independente do DecisionEngine: nenhum desfecho é um estado FAVORAVEL/AGUARDAR/DESFAVORAVEL', () => {
    const decisionEngineStatuses = Object.keys(STATUS_DEFINITIONS);
    for (const outcome of Object.values(IMERG_OUTCOMES)) {
      expect(decisionEngineStatuses).not.toContain(outcome);
    }
    for (const code of Object.keys(IMERG_CODE_OUTCOMES)) {
      expect(decisionEngineStatuses).not.toContain(code);
    }
  });

  it('tabela oficial do docs2 §5', () => {
    expect(classifyImergCode('FAVORAVEL_INDICATIVO')).toBe('indicative');
    expect(classifyImergCode('AGUARDAR_CHUVA_INSUFICIENTE')).toBe('wait');
    expect(classifyImergCode('AGUARDAR_FALSA_PARTIDA')).toBe('wait');
    expect(classifyImergCode('AGUARDAR_ESTIAGEM_EM_CURSO')).toBe('wait');
    expect(classifyImergCode('SEM_BASE_FIAVEL')).toBe('noReliableBasis');
    expect(classifyImergCode('FORA_DA_EPOCA')).toBe('outOfSeason');
    expect(classifyImergCode('FAVORAVEL')).toBe('unknown'); // estado do DecisionEngine: não se mistura
    expect(classifyImergCode(null)).toBe('missing');
  });

  it('SEM_BASE_FIAVEL real (Huambo, época 2026/27): sem conclusão, nunca uma decisão', () => {
    const vm = mapImergDecisionResponse(json('decisao_huambo'));
    expect(vm).toMatchObject({
      source: 'imerg',
      zone: 'huambo',
      season: '2026/27',
      code: 'SEM_BASE_FIAVEL',
      outcome: 'noReliableBasis',
      isConclusive: false,
      answer: 'SEM CONCLUSÃO',
      engineState: 'desconhecido',
      confidenceGrade: null,
      contentLanguage: null,
    });
    expect(vm.farmerMessage).toMatch(/^Sem base fiável para sugerir data de plantio/);
    expect(imergNoDecisionMessageKeys(vm.outcome)).toEqual({
      titleKey: 'imerg.noDecision.noReliableBasis.title',
      bodyKey: 'imerg.noDecision.noReliableBasis.body',
    });
  });

  it('FAVORAVEL_INDICATIVO real (2024-11-15): indicação, com o grau de confiança e o texto intactos', () => {
    const raw = json('decisao_huambo_2024-11-15');
    const vm = mapImergDecisionResponse(raw);
    expect(vm).toMatchObject({ code: 'FAVORAVEL_INDICATIVO', outcome: 'indicative', isConclusive: true, answer: 'PLANTAR (indicativo)', confidenceGrade: 'Alta', seasonsCount: 24 });
    expect(vm.farmerMessage).toBe(raw.mensagem_agricultor.texto);
    expect(imergNoDecisionMessageKeys(vm.outcome)).toBeNull();
  });

  it('FORA_DA_EPOCA real: sem conclusão', () => {
    const vm = mapImergDecisionResponse(json('decisao_offseason'));
    expect(vm).toMatchObject({ code: 'FORA_DA_EPOCA', outcome: 'outOfSeason', isConclusive: false });
  });

  it('código em estado_motor (forma do docs2) também é aceite; outros estado_motor não são interpretados', () => {
    expect(mapImergDecisionResponse({ estado_motor: 'AGUARDAR_FALSA_PARTIDA' }).outcome).toBe('wait');
    expect(mapImergDecisionResponse({ estado_motor: 'inicio_confirmado' }).outcome).toBe('missing');
    expect(mapImergDecisionResponse({ mensagem_agricultor: { codigo: 'NOVO_CODIGO' } }).outcome).toBe('unknown');
    expect(imergNoDecisionMessageKeys('unknown').titleKey).toBe('imerg.noDecision.unknown.title');
    expect(mapImergDecisionResponse(null)).toMatchObject({ outcome: 'missing', isConclusive: false });
  });

  it('content_language e campos pedidos (motivo_tecnico, notas) são lidos quando existirem', () => {
    const vm = mapImergDecisionResponse({ ...json('decisao_huambo'), content_language: 'en-US', motivo_tecnico: 'x', notas: ['a', 'b'] });
    expect(vm).toMatchObject({ contentLanguage: 'en', technicalReason: 'x', notes: ['a', 'b'], code: 'SEM_BASE_FIAVEL' });
  });
});

describe('janela de plantio', () => {
  it('valores científicos reais passam sem alteração', () => {
    const raw = json('optimal_huambo_milho_2526');
    const vm = mapOptimalPlantingResponse(raw);
    expect(vm.window).toEqual({
      start: '2025-10-17',
      end: '2025-12-05',
      periodDescription: '17/10/2025 a 05/12/2025',
      imergMedianOnset: '2025-10-05',
      imergP90Consolidation: '2025-10-19',
    });
    expect(vm.favourableProbabilityPct).toBe(90.2);
    expect(vm.falseStartRisk).toEqual({
      referenceDate: '15 Out',
      probabilityPct: 0,
      ic90Pct: [0, 9.8],
      historicalFrequency: '0 de 25 épocas',
      note: 'risco estimado a partir de épocas passadas (IMERG V07); não é certeza',
    });
    expect(vm.crop).toBe('Milho');
    expect(vm.agronomicNotes).toBe(raw.exigencia_cultura.notas_agronomicas);
    expect(vm.contentLanguage).toBeNull();
  });

  it('lang=en real foi ignorado pelo serviço (resposta igual); sem content_language o idioma não é presumido', () => {
    expect(text('optimal_lang_en')).toBe(text('optimal_huambo_milho_2526'));
    expect(mapOptimalPlantingResponse(json('optimal_lang_en')).contentLanguage).toBeNull();
  });
});

describe('pedidos e idioma', () => {
  it('capacidades de idioma desactivadas por omissão', () => {
    expect(isLanguageCapabilityEnabled('imerg')).toBe(false);
    expect(isLanguageCapabilityEnabled('optimalPlanting')).toBe(false);
    expect(isLanguageCapabilityEnabled('advisory')).toBe(false); // não é capacidade: sempre documentado
    expect(isLanguageCapabilityEnabled('imerg', { VITE_API_IMERG_LANG: 'true' })).toBe(true);
    expect(languageQuery('en', true)).toEqual({ lang: 'en' });
    expect(languageQuery('pt', true)).toEqual({});
    expect(languageQuery('en', false)).toEqual({});
  });

  it('IMERG: GET sem lang por omissão; com a capacidade, lang=en só em inglês', async () => {
    const calls = stubFetch(text('decisao_huambo'));
    await getImergDecision('huambo', { language: 'en' });
    await getImergDecision('huambo', { referenceDate: '2024-11-15', language: 'en', languageEnabled: true });
    await getImergDecision('bie', { language: 'pt', languageEnabled: true });
    expect(calls()).toEqual([
      ['/zonas/huambo/decisao', 'GET', undefined],
      ['/zonas/huambo/decisao/2024-11-15?lang=en', 'GET', undefined],
      ['/zonas/bie/decisao', 'GET', undefined],
    ]);
  });

  it('IMERG: zona não documentada é recusada sem pedido', async () => {
    const calls = stubFetch();
    await expect(getImergDecision('luanda')).rejects.toMatchObject({ kind: 'malformed' });
    expect(calls()).toEqual([]);
  });

  it('janela de plantio: parâmetros de consulta; lang por variável de ambiente', async () => {
    const calls = stubFetch(text('optimal_huambo_milho_2526'));
    const params = { provincia: 'Huambo', cultura: 'Milho', epoca_agricola: '2025/2026' };
    await getOptimalPlanting(params, { language: 'en' });
    vi.stubEnv('VITE_API_PLANTING_LANG', 'true');
    await getOptimalPlanting(params, { language: 'en' });
    expect(calls()).toEqual([
      ['/api/v1/optimal-planting?provincia=Huambo&cultura=Milho&epoca_agricola=2025%2F2026', 'GET', undefined],
      ['/api/v1/optimal-planting?provincia=Huambo&cultura=Milho&epoca_agricola=2025%2F2026&lang=en', 'GET', undefined],
    ]);
  });
});
