// Verificações puras de tipos e valores. Não lançam excepções, excepto onde indicado.

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
  /** @param {Record<string, string>} fieldErrors mensagens por campo, em português */
  constructor(fieldErrors) {
    super('Parâmetros de consulta inválidos.');
    this.name = 'ConsultationInputError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Valida os parâmetros da consulta.
 * @param {{ provincia?: unknown, cultura?: unknown, data_consulta?: unknown }} params
 * @returns {Record<string, string>} vazio quando válido
 */
export function validateConsultationParams(params) {
  const errors = {};
  const { provincia, cultura, data_consulta } = params ?? {};

  if (!isNonEmptyString(provincia)) {
    errors.provincia = 'Seleccione uma província.';
  }
  // A API aceita qualquer cultura sem validar (verificado em 2026-11-12). Exigimos uma escolha
  // explícita; a lista válida vem de /api/v1/crops e é imposta pelo formulário.
  if (!isNonEmptyString(cultura)) {
    errors.cultura = 'Seleccione uma cultura.';
  }
  // A API aceita datas inválidas sem aviso e usa a data actual (verificado em 2026-11-12).
  if (data_consulta !== undefined && data_consulta !== null && data_consulta !== '') {
    if (!isValidIsoDate(data_consulta)) {
      errors.data_consulta = 'Indique uma data válida no formato AAAA-MM-DD.';
    }
  }
  return errors;
}

/**
 * Constrói o corpo JSON partilhado por /advisory e /evaluate, mantendo os nomes de campos da API.
 * @throws {ConsultationInputError}
 */
export function buildConsultationPayload(params) {
  const errors = validateConsultationParams(params);
  if (Object.keys(errors).length > 0) throw new ConsultationInputError(errors);

  const payload = { provincia: params.provincia.trim(), cultura: params.cultura.trim() };
  if (isNonEmptyString(params.data_consulta)) payload.data_consulta = params.data_consulta;
  return payload;
}
