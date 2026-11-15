import { render, screen } from './render.jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, requestJson } from '../services/api.js';
import { getUserErrorMessage } from '../utils/errorMessages.js';
import { createTranslator } from '../i18n/translate.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../utils/mappers.js';
import { compareConsultationResults } from '../utils/divergences.js';
import { ALL_RECORDINGS } from './allRecordings.js';
import ResultsArea from '../components/results/ResultsArea.jsx';

// Integridade científica e estados de erro com respostas REAIS gravadas em 2026-11-15.

const entry = (id) => ALL_RECORDINGS.find((item) => item.id === id);
const json = (id) => JSON.parse(entry(id).text);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DecisionEngine: /advisory e /evaluate (par real Huambo · Milho · 15-11-2026)', () => {
  const advisoryPt = mapAdvisoryResponse(json('adv_pt'));
  const advisoryEn = mapAdvisoryResponse(json('adv_en'));
  const evaluate = mapEvaluateResponse(json('eval_pt'));

  it('estado, confiança e métricas coincidem entre as duas fontes e entre idiomas', () => {
    for (const advisory of [advisoryPt, advisoryEn]) {
      expect(advisory.status.code).toBe(evaluate.status.code);
      expect(advisory.confidenceScore).toBe(evaluate.confidenceScore);
      expect(advisory.metrics).toEqual(evaluate.metrics);
    }
  });

  it('códigos de estado e de gatilho ficam como recebidos (não dependem do idioma)', () => {
    expect(advisoryEn.status.code).toBe('FAVORAVEL');
    expect(evaluate.triggers).toEqual(json('eval_pt').triggers_ativados);
    expect(evaluate.triggers.every((code) => /^[A-Z_]+$/.test(code))).toBe(true);
  });

  it('métricas e unidades preservadas: humidade 0–1 no modelo, % só na apresentação', () => {
    const moisture = evaluate.metrics.find((metric) => metric.key === 'humidade_solo_raiz');
    expect(moisture.value).toBe(json('eval_pt').metricas.humidade_solo_raiz);
    expect(moisture.value).toBeLessThanOrEqual(1);
  });

  it('dados alternativos identificados pelo /evaluate', () => {
    expect(evaluate.isFallbackWeather).toBe(true);
  });

  it('sem divergências no par real', () => {
    const comparison = compareConsultationResults(advisoryPt, evaluate);
    expect(comparison).toMatchObject({ hasDivergences: false, notComparable: [] });
  });
});

describe('erro 422 de idioma não suportado (gravação real adv_badlang)', () => {
  function stub(id) {
    const { status, text } = entry(id);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status, text: async () => text })));
  }

  it.each([
    ['pt', 'O idioma pedido não é suportado por este serviço.'],
    ['en', 'The requested language is not supported by this service.'],
  ])('%s: mensagem própria, sem nova tentativa e sem a mensagem técnica do servidor', async (language, title) => {
    stub('adv_badlang');
    const error = await requestJson('/api/v1/advisory', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'validation', status: 422, fields: ['lang'] });
    const message = getUserErrorMessage(error, createTranslator(language));
    expect(message).toMatchObject({ title, canRetry: false, serverMessages: [] });
  });

  it('outros 422 continuam a ser erros dos dados da consulta', () => {
    const error = new ApiError('validation', 'HTTP 422', { status: 422, fields: ['provincia'], details: ['x'] });
    expect(getUserErrorMessage(error, createTranslator('en'))).toMatchObject({
      title: 'The consultation details are not valid.',
      canRetry: false,
      serverMessages: ['x'],
    });
  });
});

describe('rótulo do mecanismo científico no relatório', () => {
  const advisory = { status: 'success', result: { ...mapAdvisoryResponse(json('adv_pt')), requestedLanguage: 'pt' }, error: null };
  const evaluate = { status: 'success', result: mapEvaluateResponse(json('eval_pt')), error: null };
  const params = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };

  it.each([
    ['pt', /Avaliação agrícola do motor de decisão.*Não inclui a avaliação IMERG do início da época das chuvas nem a janela de plantio/],
    ['en', /Agricultural assessment from the decision engine.*does not include the IMERG assessment of the rainy-season onset or the planting window/],
  ])('%s: o relatório identifica o DecisionEngine e distingue-o do IMERG e da janela de plantio', (language, pattern) => {
    render(<ResultsArea submittedParams={params} advisory={advisory} evaluate={evaluate} onRetry={() => {}} />, { language });
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });

  it.each([
    ['pt', /climatologia NASA POWER de 2000–2024/],
    ['en', /NASA POWER climatology for 2000–2024/],
  ])('%s: aviso bilingue de dados alternativos (is_fallback_weather real)', (language, pattern) => {
    render(<ResultsArea submittedParams={params} advisory={advisory} evaluate={evaluate} onRetry={() => {}} />, { language });
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });
});
