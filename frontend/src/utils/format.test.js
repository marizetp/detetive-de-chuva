import { describe, expect, it } from 'vitest';
import { METRIC_UNITS } from '../config/metrics.js';
import {
  MISSING_VALUE_TEXT,
  formatConfidenceScore,
  formatFractionAsPercent,
  formatIsoDateLong,
  formatMetricValue,
  formatFractionAsPercentNumber,
  formatMillimetreNumber,
  formatMillimetres,
  formatScoreNumber,
  fractionToPercentage,
} from './format.js';

// Construído aqui de forma independente do código testado.
const NBSP = String.fromCharCode(0xa0);

describe('formatMillimetres', () => {
  it('usa vírgula decimal e espaço não separável antes de mm', () => {
    expect(formatMillimetres(25.6, 'pt')).toBe(`25,6${NBSP}mm`);
    expect(formatMillimetres(0, 'pt')).toBe(`0${NBSP}mm`);
    expect(formatMillimetres(0.1, 'pt')).toBe(`0,1${NBSP}mm`);
  });

  it('o separador é exactamente U+00A0', () => {
    const text = formatMillimetres(25.6, 'pt');
    expect(text).toHaveLength(7);
    expect(text.charCodeAt(4)).toBe(0x00a0);
    expect(text.endsWith('mm')).toBe(true);
  });

  it('preserva até duas casas decimais', () => {
    expect(formatMillimetres(0.05, 'pt')).toBe(`0,05${NBSP}mm`);
  });

  it('mostra o marcador de valor em falta, nunca 0', () => {
    expect(formatMillimetres(null, 'pt')).toBe(MISSING_VALUE_TEXT);
    expect(formatMillimetres(undefined, 'pt')).toBe(MISSING_VALUE_TEXT);
    expect(formatMillimetres('25.6', 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('humidade do solo (fracção 0–1)', () => {
  it('converte para 0–100 apenas para apresentação', () => {
    expect(fractionToPercentage(0.48)).toBeCloseTo(48);
    expect(fractionToPercentage(null)).toBeNull();
  });

  it('formata como percentagem', () => {
    expect(formatFractionAsPercent(0.48, 'pt')).toBe('48%');
    expect(formatFractionAsPercent(0.545, 'pt')).toBe('54,5%');
    expect(formatFractionAsPercent(0, 'pt')).toBe('0%');
    expect(formatFractionAsPercent(null, 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatConfidenceScore (0–100)', () => {
  it('formata a pontuação como «N/100», não como percentagem', () => {
    expect(formatConfidenceScore(95, 'pt')).toBe('95/100');
    expect(formatConfidenceScore(72, 'pt')).toBe('72/100');
    expect(formatConfidenceScore(0, 'pt')).toBe('0/100');
    expect(formatConfidenceScore(82.5, 'pt')).toBe('82,5/100');
    expect(formatConfidenceScore(95, 'pt')).not.toContain('%');
    expect(formatConfidenceScore(null, 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatMetricValue', () => {
  it('escolhe o formato pela unidade', () => {
    expect(formatMetricValue({ unit: METRIC_UNITS.millimetres, value: 51.2 }, 'pt')).toBe(`51,2${NBSP}mm`);
    expect(formatMetricValue({ unit: METRIC_UNITS.fraction, value: 0.3 }, 'pt')).toBe('30%');
    expect(formatMetricValue({ unit: METRIC_UNITS.fraction, value: null }, 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatIsoDateLong', () => {
  it('formata datas em português', () => {
    expect(formatIsoDateLong('2026-11-12', 'pt')).toBe('12 de novembro de 2026');
  });

  it('não depende do fuso horário local', () => {
    expect(formatIsoDateLong('2026-01-01', 'pt')).toBe('1 de janeiro de 2026');
  });

  it('devolve o marcador para datas inválidas', () => {
    expect(formatIsoDateLong('not-a-date', 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});

describe('números e datas nos dois idiomas (i18n)', () => {
  it('en: ponto decimal; pt: vírgula decimal — o valor nunca muda', () => {
    expect(formatMillimetres(25.6, 'en')).toBe(`25.6${NBSP}mm`);
    expect(formatMillimetres(25.6, 'pt')).toBe(`25,6${NBSP}mm`);
    expect(formatMillimetres(1234.5, 'en')).toBe(`1,234.5${NBSP}mm`);
    expect(formatFractionAsPercent(0.545, 'en')).toBe('54.5%');
    expect(formatConfidenceScore(82.5, 'en')).toBe('82.5/100');
    expect(formatConfidenceScore(82.5, 'pt')).toBe('82,5/100');
    expect(formatMetricValue({ unit: METRIC_UNITS.millimetres, value: 51.2 }, 'en')).toBe(`51.2${NBSP}mm`);
  });

  it('números sem unidade, para os cartões de indicadores', () => {
    expect(formatMillimetreNumber(25.6, 'pt')).toBe('25,6');
    expect(formatMillimetreNumber(25.6, 'en')).toBe('25.6');
    expect(formatMillimetreNumber(0.05, 'en')).toBe('0.05');
    expect(formatMillimetreNumber(null, 'en')).toBe(MISSING_VALUE_TEXT);
    // Fracção → percentagem inteira, como antes (toFixed(0)): 0.48 → 48.
    expect(formatFractionAsPercentNumber(0.48, 'pt')).toBe('48');
    expect(formatFractionAsPercentNumber(0.48, 'en')).toBe('48');
    expect(formatFractionAsPercentNumber(undefined, 'pt')).toBe(MISSING_VALUE_TEXT);
  });

  it('datas: en-GB (dia antes do mês) e pt-AO, sem depender do fuso horário', () => {
    expect(formatIsoDateLong('2026-11-12', 'en')).toBe('12 November 2026');
    expect(formatIsoDateLong('2026-01-01', 'en')).toBe('1 January 2026');
    expect(formatIsoDateLong('2026-11-12', 'pt')).toBe('12 de novembro de 2026');
  });

  it('sem idioma, usa o predefinido (English)', () => {
    expect(formatMillimetres(25.6)).toBe(`25.6${NBSP}mm`);
    expect(formatIsoDateLong('2026-11-12')).toBe('12 November 2026');
  });
});

describe('formatScoreNumber', () => {
  it('só o número da pontuação, no formato do idioma', () => {
    expect(formatScoreNumber(95, 'en')).toBe('95');
    expect(formatScoreNumber(82.5, 'pt')).toBe('82,5');
    expect(formatScoreNumber(82.5, 'en')).toBe('82.5');
    expect(formatScoreNumber(null, 'pt')).toBe(MISSING_VALUE_TEXT);
  });
});
