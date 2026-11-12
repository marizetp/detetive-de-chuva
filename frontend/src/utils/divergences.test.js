import { describe, expect, it } from 'vitest';
import { advisoryHuamboMilho, evaluateHuamboMilho } from '../test/fixtures/liveResponses.js';
import { compareConsultationResults, formatDivergenceValue } from './divergences.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from './mappers.js';

const compare = (advisoryRaw, evaluateRaw) =>
  compareConsultationResults(mapAdvisoryResponse(advisoryRaw), mapEvaluateResponse(evaluateRaw));

describe('compareConsultationResults', () => {
  it('respostas reais concordantes → sem divergências', () => {
    const result = compare(advisoryHuamboMilho, evaluateHuamboMilho);
    expect(result.hasDivergences).toBe(false);
    expect(result.divergences).toEqual([]);
    expect(result.notComparable).toEqual([]);
  });

  it('detecta estado divergente sem escolher um vencedor', () => {
    const result = compare(advisoryHuamboMilho, { ...evaluateHuamboMilho, status: 'AGUARDAR' });
    expect(result.hasDivergences).toBe(true);
    expect(result.divergences).toEqual([
      { field: 'status', label: 'Estado', advisoryValue: 'FAVORAVEL', evaluateValue: 'AGUARDAR' },
    ]);
  });

  it('detecta pontuação e métricas divergentes', () => {
    const result = compare(advisoryHuamboMilho, {
      ...evaluateHuamboMilho,
      score_confianca: 85,
      metricas: { ...evaluateHuamboMilho.metricas, humidade_solo_raiz: 0.32 },
    });
    expect(result.divergences.map((d) => d.field)).toEqual([
      'score_confianca',
      'metricas.humidade_solo_raiz',
    ]);
    expect(result.divergences[1]).toMatchObject({ advisoryValue: 0.48, evaluateValue: 0.32 });
  });

  it('valores em falta são "não comparáveis", não concordância', () => {
    const result = compare(
      { ...advisoryHuamboMilho, score_confianca: null },
      { ...evaluateHuamboMilho, metricas: { ...evaluateHuamboMilho.metricas, previsao_7dias_mm: null } },
    );
    expect(result.hasDivergences).toBe(false);
    expect(result.notComparable.map((d) => d.field)).toEqual([
      'score_confianca',
      'metricas.previsao_7dias_mm',
    ]);
  });

  it('formatDivergenceValue formata cada campo segundo o seu tipo', () => {
    expect(formatDivergenceValue('status', 'AGUARDAR')).toBe('Aguardar');
    expect(formatDivergenceValue('status', 'NOVO')).toBe('NOVO');
    expect(formatDivergenceValue('score_confianca', 85)).toBe('85%');
    expect(formatDivergenceValue('metricas.humidade_solo_raiz', 0.32)).toBe('32%');
    expect(formatDivergenceValue('metricas.previsao_7dias_mm', 60.5)).toMatch(/^60,5.mm$/);
  });

  it('estados desconhecidos diferentes também divergem', () => {
    const result = compare(
      { ...advisoryHuamboMilho, status: 'X' },
      { ...evaluateHuamboMilho, status: 'Y' },
    );
    expect(result.divergences[0]).toMatchObject({ advisoryValue: 'X', evaluateValue: 'Y' });
  });
});
