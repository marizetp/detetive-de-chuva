import { METRIC_UNITS } from '../config/metrics.js';
import { DEFAULT_LANGUAGE, INTL_LOCALES } from '../i18n/config.js';
import { isFiniteNumber, isValidIsoDate } from './validators.js';

/** Texto mostrado quando um valor está em falta ou é inválido. Nunca substituir por 0. */
export const MISSING_VALUE_TEXT = '—';

// Formatadores por idioma da interface (en → en-GB, pt → pt-AO), criados uma vez e reutilizados.
// Só mudam a apresentação (separador decimal, nomes dos meses): os valores nunca são alterados.
const cache = new Map();
function formatter(kind, language, factory) {
  const locale = INTL_LOCALES[language] ?? INTL_LOCALES[DEFAULT_LANGUAGE];
  const key = `${kind}:${locale}`;
  if (!cache.has(key)) cache.set(key, factory(locale));
  return cache.get(key);
}
const millimetreFormatter = (language) =>
  formatter('mm', language, (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }));
const percentFormatter = (language) =>
  formatter('percent', language, (locale) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }),
  );
const integerFormatter = (language) =>
  formatter('integer', language, (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }));
const scoreFormatter = (language) =>
  formatter('score', language, (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }));
const longDateFormatter = (language) =>
  formatter('date', language, (locale) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }),
  );

/** Espaço não separável (U+00A0): impede que o número e a unidade fiquem em linhas diferentes. */
export const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** Ex.: 25.6 → "25,6" (pt) / "25.6" (en) + espaço não separável + "mm". */
export function formatMillimetres(value, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(value)) return MISSING_VALUE_TEXT;
  return `${millimetreFormatter(language).format(value)}${NO_BREAK_SPACE}mm`;
}

/** Número de milímetros sem a unidade (a unidade é mostrada à parte): 25.6 → "25,6" / "25.6". */
export function formatMillimetreNumber(value, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(value)) return MISSING_VALUE_TEXT;
  return millimetreFormatter(language).format(value);
}

/** Fracção 0–1 → percentagem inteira sem o símbolo (mostrado à parte): 0.48 → "48". */
export function formatFractionAsPercentNumber(fraction, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(fraction)) return MISSING_VALUE_TEXT;
  return integerFormatter(language).format(fraction * 100);
}

/**
 * Converte a fracção 0–1 da API em 0–100, apenas para apresentação.
 * O valor original deve continuar guardado tal como veio da API.
 */
export function fractionToPercentage(fraction) {
  return isFiniteNumber(fraction) ? fraction * 100 : null;
}

/** Ex.: 0.48 → "48%". */
export function formatFractionAsPercent(fraction, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(fraction)) return MISSING_VALUE_TEXT;
  return percentFormatter(language).format(fraction);
}

/**
 * `score_confianca` (0–100) no formato "95/100" (decisão de 2026-11-12): evita que a pontuação
 * do sistema seja lida como percentagem de probabilidade. Mostrar sempre com a legenda explicativa.
 */
export function formatConfidenceScore(score, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(score)) return MISSING_VALUE_TEXT;
  return `${formatScoreNumber(score, language)}/100`;
}

/** Só o número da pontuação (o «/100» é mostrado à parte): 82.5 → "82.5" (en) / "82,5" (pt). */
export function formatScoreNumber(score, language = DEFAULT_LANGUAGE) {
  if (!isFiniteNumber(score)) return MISSING_VALUE_TEXT;
  return scoreFormatter(language).format(score);
}

/** Formata um item de métrica do view model segundo a sua unidade. */
export function formatMetricValue({ unit, value }, language = DEFAULT_LANGUAGE) {
  if (unit === METRIC_UNITS.millimetres) return formatMillimetres(value, language);
  if (unit === METRIC_UNITS.fraction) return formatFractionAsPercent(value, language);
  return isFiniteNumber(value) ? millimetreFormatter(language).format(value) : MISSING_VALUE_TEXT;
}

/** "2026-11-12" → "12 de novembro de 2026" (pt) / "12 November 2026" (en). */
export function formatIsoDateLong(isoDate, language = DEFAULT_LANGUAGE) {
  if (!isValidIsoDate(isoDate)) return MISSING_VALUE_TEXT;
  return longDateFormatter(language).format(new Date(`${isoDate}T00:00:00Z`));
}
