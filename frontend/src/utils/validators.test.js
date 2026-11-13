import { describe, expect, it } from 'vitest';
import {
  ConsultationInputError,
  buildConsultationPayload,
  isFiniteNumber,
  isFutureIsoDate,
  isNumberInRange,
  isPlainObject,
  isValidIsoDate,
  validateConsultationParams,
} from './validators.js';

describe('verificações básicas', () => {
  it('isPlainObject', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
  });

  it('isFiniteNumber rejeita NaN, Infinity e strings numéricas', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber('5')).toBe(false);
  });

  it('isNumberInRange inclui os limites', () => {
    expect(isNumberInRange(0, 0, 1)).toBe(true);
    expect(isNumberInRange(1, 0, 1)).toBe(true);
    expect(isNumberInRange(1.01, 0, 1)).toBe(false);
  });

  it('isValidIsoDate exige datas reais no formato YYYY-MM-DD', () => {
    expect(isValidIsoDate('2026-11-12')).toBe(true);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('12/11/2026')).toBe(false);
    expect(isValidIsoDate('not-a-date')).toBe(false);
    expect(isValidIsoDate(20261112)).toBe(false);
  });
});

describe('validateConsultationParams', () => {
  it('aceita parâmetros completos', () => {
    expect(validateConsultationParams({ provincia: 'Bié', cultura: 'Feijão' })).toEqual({});
  });

  it('exige província e cultura', () => {
    const errors = validateConsultationParams({ provincia: ' ', cultura: undefined });
    expect(Object.keys(errors).sort()).toEqual(['cultura', 'provincia']);
  });

  it('rejeita datas inválidas, que a API aceitaria em silêncio', () => {
    const errors = validateConsultationParams({
      provincia: 'Huambo',
      cultura: 'Milho',
      data_consulta: 'not-a-date',
    });
    expect(errors).toHaveProperty('data_consulta');
  });

  it('trata data vazia como ausente', () => {
    expect(
      validateConsultationParams({ provincia: 'Huambo', cultura: 'Milho', data_consulta: '' }),
    ).toEqual({});
  });
});

describe('validateConsultationParams — data (decisão de 2026-11-12)', () => {
  const base = { provincia: 'Huambo', cultura: 'Milho' };
  const today = '2026-11-12';

  it('requireDate exige a data', () => {
    expect(validateConsultationParams(base, { requireDate: true, today })).toEqual({
      data_consulta: 'Indique a data da consulta.',
    });
    expect(validateConsultationParams(base, { today })).toEqual({});
  });

  it('aceita a data actual e datas passadas', () => {
    expect(validateConsultationParams({ ...base, data_consulta: today }, { today })).toEqual({});
    expect(validateConsultationParams({ ...base, data_consulta: '2000-01-01' }, { today })).toEqual(
      {},
    );
  });

  it('aceita datas futuras para planeamento estratégico', () => {
    expect(
      validateConsultationParams({ ...base, data_consulta: '2027-11-15' }, { today }),
    ).toEqual({});
  });

  it('isFutureIsoDate compara datas YYYY-MM-DD', () => {
    expect(isFutureIsoDate('2026-11-13', today)).toBe(true);
    expect(isFutureIsoDate('2026-11-12', today)).toBe(false);
    expect(isFutureIsoDate('2027-01-01', '2026-12-31')).toBe(true);
    expect(isFutureIsoDate('inválida', today)).toBe(false);
  });
});

describe('buildConsultationPayload', () => {
  it('preserva os nomes de campos da API e omite a data quando não indicada', () => {
    expect(buildConsultationPayload({ provincia: ' Huíla ', cultura: 'Soja' })).toEqual({
      provincia: 'Huíla',
      cultura: 'Soja',
    });
  });

  it('inclui data_consulta quando válida', () => {
    expect(
      buildConsultationPayload({ provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-09-10' }),
    ).toEqual({ provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-09-10' });
  });

  it('lança ConsultationInputError com as mensagens por campo', () => {
    expect(() => buildConsultationPayload({})).toThrow(ConsultationInputError);
    try {
      buildConsultationPayload({ cultura: 'Milho' });
    } catch (error) {
      expect(error.fieldErrors).toEqual({ provincia: 'Seleccione uma província.' });
    }
  });
});
