import { describe, expect, it } from 'vitest';
import { describeIssues, isPastIsoDate, selectSummarySource } from './report.js';

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
