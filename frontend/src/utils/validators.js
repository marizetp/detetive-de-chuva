// Verificações puras de tipos e valores. Não lançam excepções, excepto onde indicado.

import { getLocalIsoDate } from './dates.js';

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** Número finito dentro de [min, max], inclusive. */
export function isNumberInRange(value, min, max) {
  return isFiniteNumber(value) && value >= min && value <= max;
}

/** Data real no formato YYYY-MM-DD (rejeita, por exemplo, 2026-02-30). */
export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Erro de validação dos parâmetros da consulta, detectado antes de qualquer pedido. */
export class ConsultationInputError extends Error {
  /** @param {Record<string, string>} fieldErrors chaves de mensagem (i18n) por campo */
  constructor(fieldErrors) {
    super('Parâmetros de consulta inválidos.');
    this.name = 'ConsultationInputError';
    this.fieldErrors = fieldErrors;
  }
}

/** YYYY-MM-DD compara-se correctamente como texto. */
export function isFutureIsoDate(isoDate, today) {
  return isValidIsoDate(isoDate) && isValidIsoDate(today) && isoDate > today;
}

/**
 * Valida os parâmetros da consulta.
 * - `requireDate`: o formulário exige data; a API trata-a como opcional.
 * - Suporta datas actuais e datas futuras para planeamento de safra e investimento.
 * @param {{ provincia?: unknown, cultura?: unknown, data_consulta?: unknown, municipio?: unknown }} params
 * @param {{ requireDate?: boolean, today?: string }} [options]
 * @returns {Record<string, string>} chaves de mensagem (i18n) por campo; vazio quando válido
 */
export function validateConsultationParams(
  params,
  { requireDate = false, today = getLocalIsoDate() } = {},
) {
  const errors = {};
  const { provincia, cultura, data_consulta } = params ?? {};

  if (!isNonEmptyString(provincia)) {
    errors.provincia = 'validation.provinceRequired';
  }
  if (!isNonEmptyString(cultura)) {
    errors.cultura = 'validation.cropRequired';
  }
  const hasDate = data_consulta !== undefined && data_consulta !== null && data_consulta !== '';
  if (!hasDate) {
    if (requireDate) errors.data_consulta = 'validation.dateRequired';
  } else if (!isValidIsoDate(data_consulta)) {
    errors.data_consulta = 'validation.dateInvalid';
  }
  return errors;
}

/**
 * Constrói o corpo JSON partilhado por /advisory e /evaluate, mantendo os nomes de campos da API.
 * @param {Parameters<typeof validateConsultationParams>[1]} [options]
 * @throws {ConsultationInputError}
 */
export function buildConsultationPayload(params, options) {
  const errors = validateConsultationParams(params, options);
  if (Object.keys(errors).length > 0) throw new ConsultationInputError(errors);

  const payload = { provincia: params.provincia.trim(), cultura: params.cultura.trim() };
  if (isNonEmptyString(params.data_consulta)) payload.data_consulta = params.data_consulta;
  if (isNonEmptyString(params.municipio)) payload.municipio = params.municipio.trim();
  return payload;
}
