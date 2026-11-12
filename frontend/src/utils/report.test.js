import { describe, expect, it } from 'vitest';
import {
  describeConsultation,
  describeIssues,
  getFallbackStatus,
  isPastIsoDate,
  isSameConsultation,
  selectSummarySource,
} from './report.js';

const state = (status) => ({ status, result: status === 'success' ? {} : null, error: null });

describe('isPastIsoDate', () => {
  it('compara com a data de referência', () => {
    expect(isPastIsoDate('2026-11-11', '2026-11-12')).toBe(true);
    expect(isPastIsoDate('2026-11-12', '2026-11-12')).toBe(false);
    expect(isPastIsoDate('inválida', '2026-11-12')).toBe(false);
  });
});

describe('selectSummarySource', () => {
  it.each([
    ['success', 'success', 'advisory'],
    ['success', 'error', 'advisory'],
    ['loading', 'success', 'loading'], // espera pela recomendação em vez de mudar de fonte
    ['error', 'success', 'evaluate'],
    ['error', 'loading', 'loading'],
    ['error', 'error', 'unavailable'],
  ])('advisory=%s, evaluate=%s → %s', (advisory, evaluate, expected) => {
    expect(selectSummarySource(state(advisory), state(evaluate))).toBe(expected);
  });
});

describe('describeIssues', () => {
  it('usa nomes legíveis e não repete campos', () => {
    expect(
      describeIssues([
        { field: 'score_confianca', problem: 'missing' },
        { field: 'score_confianca', problem: 'missing' },
        { field: 'metricas.humidade_solo_raiz', problem: 'invalid' },
        { field: 'campo_novo', problem: 'missing' },
      ]),
    ).toEqual([
      { field: 'score_confianca', label: 'Nível de confiança', problem: 'não enviado' },
      {
        field: 'metricas.humidade_solo_raiz',
        label: 'Humidade do solo na zona das raízes',
        problem: 'valor inválido ou fora do intervalo esperado',
      },
      { field: 'campo_novo', label: 'campo_novo', problem: 'não enviado' },
    ]);
  });
});

describe('getFallbackStatus', () => {
  const evaluate = (status, isFallbackWeather) => ({
    status,
    result: status === 'success' ? { isFallbackWeather } : null,
    error: null,
  });

  it.each([
    ['success', true, 'confirmed'],
    ['success', false, 'denied'],
    ['success', null, 'unconfirmed'], // o serviço não indicou
    ['error', undefined, 'unconfirmed'], // /evaluate falhou: nada confirmado
    ['loading', undefined, 'pending'],
    ['idle', undefined, 'pending'],
  ])('evaluate=%s, is_fallback_weather=%s → %s', (status, flag, expected) => {
    expect(getFallbackStatus(evaluate(status, flag))).toBe(expected);
  });
});

describe('isSameConsultation', () => {
  const base = { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-12' };

  it('compara província, cultura e data', () => {
    expect(isSameConsultation(base, { ...base })).toBe(true);
    expect(isSameConsultation(base, { ...base, provincia: ' Huambo ' })).toBe(true);
    expect(isSameConsultation(base, { ...base, cultura: 'Soja' })).toBe(false);
    expect(isSameConsultation(base, { ...base, data_consulta: '2026-11-11' })).toBe(false);
  });

  it('sem um dos lados não há consulta igual', () => {
    expect(isSameConsultation(null, base)).toBe(false);
    expect(isSameConsultation(base, undefined)).toBe(false);
  });
});

describe('describeConsultation', () => {
  it('identifica a consulta numa linha', () => {
    expect(describeConsultation({ provincia: 'Bié', cultura: 'Feijão', data_consulta: '2026-08-01' })).toBe(
      'Bié · Feijão · 1 de agosto de 2026',
    );
    expect(describeConsultation(null)).toBe('');
  });
});
