import { describe, expect, it } from 'vitest';
import { METRIC_UNITS } from '../config/metrics.js';
import {
  MISSING_VALUE_TEXT,
  formatConfidenceScore,
  formatFractionAsPercent,
  formatIsoDateLong,
  formatMetricValue,
  formatMillimetres,
  fractionToPercentage,
} from './format.js';

// Construído aqui de forma independente do código testado.
const NBSP = String.fromCharCode(0xa0);

describe('formatMillimetres', () => {
  it('usa vírgula decimal e espaço não separável antes de mm', () => {
    expect(formatMillimetres(25.6)).toBe(`25,6${NBSP}mm`);
    expect(formatMillimetres(0)).toBe(`0${NBSP}mm`);
    expect(formatMillimetres(0.1)).toBe(`0,1${NBSP}mm`);
  });

  it('o separador é exactamente U+00A0', () => {
    const text = formatMillimetres(25.6);
    expect(text).toHaveLength(7);
    expect(text.charCodeAt(4)).toBe(0x00a0);
    expect(text.endsWith('mm')).toBe(true);
  });

  it('preserva até duas casas decimais', () => {
    expect(formatMillimetres(0.05)).toBe(`0,05${NBSP}mm`);
  });

  it('mostra o marcador de valor em falta, nunca 0', () => {
    expect(formatMillimetres(null)).toBe(MISSING_VALUE_TEXT);
    expect(formatMillimetres(undefined)).toBe(MISSING_VALUE_TEXT);
    expect(formatMillimetres('25.6')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('humidade do solo (fracção 0–1)', () => {
  it('converte para 0–100 apenas para apresentação', () => {
    expect(fractionToPercentage(0.48)).toBeCloseTo(48);
    expect(fractionToPercentage(null)).toBeNull();
  });

  it('formata como percentagem', () => {
    expect(formatFractionAsPercent(0.48)).toBe('48%');
    expect(formatFractionAsPercent(0.545)).toBe('54,5%');
    expect(formatFractionAsPercent(0)).toBe('0%');
    expect(formatFractionAsPercent(null)).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatConfidenceScore (0–100)', () => {
  it('formata a pontuação como percentagem', () => {
    expect(formatConfidenceScore(95)).toBe('95%');
    expect(formatConfidenceScore(72)).toBe('72%');
    expect(formatConfidenceScore(null)).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatMetricValue', () => {
  it('escolhe o formato pela unidade', () => {
    expect(formatMetricValue({ unit: METRIC_UNITS.millimetres, value: 51.2 })).toBe(`51,2${NBSP}mm`);
    expect(formatMetricValue({ unit: METRIC_UNITS.fraction, value: 0.3 })).toBe('30%');
    expect(formatMetricValue({ unit: METRIC_UNITS.fraction, value: null })).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatIsoDateLong', () => {
  it('formata datas em português', () => {
    expect(formatIsoDateLong('2026-11-12')).toBe('12 de novembro de 2026');
  });

  it('não depende do fuso horário local', () => {
    expect(formatIsoDateLong('2026-01-01')).toBe('1 de janeiro de 2026');
  });

  it('devolve o marcador para datas inválidas', () => {
    expect(formatIsoDateLong('not-a-date')).toBe(MISSING_VALUE_TEXT);
  });
});
