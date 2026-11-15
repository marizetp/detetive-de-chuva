import { afterEach, describe, expect, it, vi } from 'vitest';
import { isEvaluateLanguageEnabled } from '../config/env.js';
import { normalizeContentLanguage } from '../i18n/config.js';
import { resolveSourceLanguage } from '../utils/localizedContent.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../utils/mappers.js';
import {
  evaluateLanguageParams,
  evaluateRequestedLanguage,
  postEvaluate,
  startConsultation,
} from './consultation.js';

// Preparação para o contrato de i18n pedido ao backend (docs/ESPECIFICACAO-BACKEND-I18N.md):
// - `content_language` na resposta: lido quando existir, nunca exigido;
// - `lang` no /evaluate: só com a capacidade VITE_API_EVALUATE_LANG (desactivada por omissão).
// Os valores de `content_language` destes testes são simulados: a API v1.1 ainda não devolve o campo.

const PARAMS = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };

function stubFetch() {
  const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => '{}' }));
  vi.stubGlobal('fetch', fetchSpy);
  return () => fetchSpy.mock.calls.map(([url, init]) => [new URL(url).pathname, JSON.parse(init.body)]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('normalizeContentLanguage', () => {
  it.each([
    ['pt', 'pt'],
    ['pt-AO', 'pt'],
    ['PT-ao', 'pt'],
    [' en ', 'en'],
    ['en-US', 'en'],
  ])('%j → %s', (raw, expected) => {
    expect(normalizeContentLanguage(raw)).toBe(expected);
  });

  it.each([undefined, null, '', 'fr', 'en-GB', 'pt-BR', 42, {}, ['en']])(
    'valor ausente ou fora da lista (%j) → null, sem adivinhar',
    (raw) => {
      expect(normalizeContentLanguage(raw)).toBeNull();
    },
  );
});

describe('content_language nos mappers', () => {
  const advisory = { status: 'FAVORAVEL', score_confianca: 90, metricas: {}, recomendacao_extensao: 'x' };
  const evaluate = {
    status: 'FAVORAVEL',
    score_confianca: 90,
    metricas: {},
    triggers_ativados: [],
    justificacoes_tecnicas: ['x'],
    is_fallback_weather: false,
  };

  it('é lido e normalizado nas duas fontes', () => {
    expect(mapAdvisoryResponse({ ...advisory, content_language: 'en-US' }).contentLanguage).toBe('en');
    expect(mapEvaluateResponse({ ...evaluate, content_language: 'pt-AO' }).contentLanguage).toBe('pt');
  });

  it('ausente ou inválido: null, sem contar como problema de estrutura', () => {
    const withoutField = mapAdvisoryResponse(advisory);
    const invalid = mapAdvisoryResponse({ ...advisory, content_language: 'fr' });
    expect(withoutField.contentLanguage).toBeNull();
    expect(invalid.contentLanguage).toBeNull();
    expect(invalid.issues.some((issue) => issue.field === 'content_language')).toBe(false);
    expect(mapEvaluateResponse(evaluate).contentLanguage).toBeNull();
  });
});

describe('resolveSourceLanguage', () => {
  it('content_language tem prioridade e é confirmado', () => {
    expect(resolveSourceLanguage({ contentLanguage: 'pt', requestedLanguage: 'en' })).toEqual({
      language: 'pt',
      confirmed: true,
    });
  });

  it('sem content_language: o idioma pedido, não confirmado', () => {
    expect(resolveSourceLanguage({ contentLanguage: null, requestedLanguage: 'en' })).toEqual({
      language: 'en',
      confirmed: false,
    });
  });

  it('sem nenhum dos dois: o português por omissão do serviço, não confirmado', () => {
    expect(resolveSourceLanguage({})).toEqual({ language: 'pt', confirmed: false });
    expect(resolveSourceLanguage(null)).toEqual({ language: 'pt', confirmed: false });
  });
});

describe('lang no /evaluate (capacidade VITE_API_EVALUATE_LANG)', () => {
  it('desactivada por omissão; só "true" exacto a activa', () => {
    expect(isEvaluateLanguageEnabled({})).toBe(false);
    for (const value of ['false', '1', 'TRUE', ' true', '']) {
      expect(isEvaluateLanguageEnabled({ VITE_API_EVALUATE_LANG: value }), value).toBe(false);
    }
    expect(isEvaluateLanguageEnabled({ VITE_API_EVALUATE_LANG: 'true' })).toBe(true);
    expect(isEvaluateLanguageEnabled()).toBe(false); // ambiente de testes
  });

  it('parâmetros e idioma pedido seguem a capacidade', () => {
    expect(evaluateLanguageParams('en', false)).toEqual({});
    expect(evaluateLanguageParams('en', true)).toEqual({ lang: 'en' });
    expect(evaluateLanguageParams('pt', true)).toEqual({});
    expect(evaluateRequestedLanguage('en', false)).toBeNull();
    expect(evaluateRequestedLanguage('en', true)).toBe('en');
    expect(evaluateRequestedLanguage('pt', true)).toBe('pt');
  });

  it('desactivada: o /evaluate não recebe lang', async () => {
    const bodies = stubFetch();
    await postEvaluate(PARAMS, { language: 'en' });
    expect(bodies()).toEqual([['/api/v1/evaluate', PARAMS]]);
  });

  it('activa por variável de ambiente: lang=en também no /evaluate, só em inglês', async () => {
    vi.stubEnv('VITE_API_EVALUATE_LANG', 'true');
    const bodies = stubFetch();
    const en = startConsultation(PARAMS, { language: 'en' });
    await Promise.all([en.advisory, en.evaluate]);
    const pt = startConsultation(PARAMS, { language: 'pt' });
    await Promise.all([pt.advisory, pt.evaluate]);
    expect(bodies()).toEqual([
      ['/api/v1/advisory', { ...PARAMS, lang: 'en' }],
      ['/api/v1/evaluate', { ...PARAMS, lang: 'en' }],
      ['/api/v1/advisory', PARAMS],
      ['/api/v1/evaluate', PARAMS],
    ]);
  });
});
