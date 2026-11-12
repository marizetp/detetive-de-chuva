import { METRIC_UNITS } from '../config/metrics.js';
import { isFiniteNumber, isValidIsoDate } from './validators.js';

const LOCALE = 'pt-AO';

/** Texto mostrado quando um valor está em falta ou é inválido. Nunca substituir por 0. */
export const MISSING_VALUE_TEXT = '—';

const millimetreFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 1,
});
const longDateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' });

/** Espaço não separável (U+00A0): impede que o número e a unidade fiquem em linhas diferentes. */
export const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** Ex.: 25.6 → "25,6" + espaço não separável + "mm". */
export function formatMillimetres(value) {
  if (!isFiniteNumber(value)) return MISSING_VALUE_TEXT;
  return `${millimetreFormatter.format(value)}${NO_BREAK_SPACE}mm`;
}

/**
 * Converte a fracção 0–1 da API em 0–100, apenas para apresentação.
 * O valor original deve continuar guardado tal como veio da API.
 */
export function fractionToPercentage(fraction) {
  return isFiniteNumber(fraction) ? fraction * 100 : null;
}

/** Ex.: 0.48 → "48%". */
export function formatFractionAsPercent(fraction) {
  if (!isFiniteNumber(fraction)) return MISSING_VALUE_TEXT;
  return percentFormatter.format(fraction);
}

/** `score_confianca` (0–100). Ex.: 95 → "95%". É uma pontuação do sistema, não uma garantia. */
export function formatConfidenceScore(score) {
  if (!isFiniteNumber(score)) return MISSING_VALUE_TEXT;
  return percentFormatter.format(score / 100);
}

/** Formata um item de métrica do view model segundo a sua unidade. */
export function formatMetricValue({ unit, value }) {
  if (unit === METRIC_UNITS.millimetres) return formatMillimetres(value);
  if (unit === METRIC_UNITS.fraction) return formatFractionAsPercent(value);
  return isFiniteNumber(value) ? millimetreFormatter.format(value) : MISSING_VALUE_TEXT;
}

/** "2026-11-12" → "12 de novembro de 2026". */
export function formatIsoDateLong(isoDate) {
  if (!isValidIsoDate(isoDate)) return MISSING_VALUE_TEXT;
  return longDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
