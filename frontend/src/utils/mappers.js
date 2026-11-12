// Converte respostas da API (nomes de campos originais) em view models para a UI.
// Regras: nada é inventado; valores em falta ou inválidos ficam `null` e são registados em `issues`.

import { RESULT_SOURCES } from '../config/api.js';
import { RESPONSE_FIELD } from '../config/fieldLabels.js';
import { CONFIDENCE_SCORE_RANGE, METRIC_DEFINITIONS } from '../config/metrics.js';
import { MISSING_STATUS, STATUS_DEFINITIONS, UNKNOWN_STATUS } from '../config/status.js';
import {
  isFiniteNumber,
  isNonEmptyString,
  isNumberInRange,
  isPlainObject,
  isValidIsoDate,
} from './validators.js';

/**
 * @typedef {{ field: string, problem: 'missing' | 'invalid' }} FieldIssue
 * @typedef {{ code: string|null, known: boolean, label: string, tone: string }} StatusViewModel
 * @typedef {{ key: string, label: string, unit: string, value: number|null }} MetricViewModel
 */

function isMissing(value) {
  return value === undefined || value === null;
}

/** @returns {StatusViewModel} */
export function mapStatus(rawStatus) {
  if (!isNonEmptyString(rawStatus)) return { code: null, known: false, ...MISSING_STATUS };
  const definition = STATUS_DEFINITIONS[rawStatus];
  if (definition) return { code: rawStatus, known: true, ...definition };
  return { code: rawStatus, known: false, ...UNKNOWN_STATUS };
}

function readStatus(source, issues) {
  const raw = source.status;
  if (isMissing(raw)) issues.push({ field: 'status', problem: 'missing' });
  else if (!isNonEmptyString(raw)) issues.push({ field: 'status', problem: 'invalid' });
  // Um código desconhecido não é um erro de estrutura: é mostrado com o fallback neutro.
  return mapStatus(raw);
}

function readNumberInRange(source, key, { min, max }, issues, fieldPath = key) {
  const raw = source[key];
  if (isMissing(raw)) {
    issues.push({ field: fieldPath, problem: 'missing' });
    return null;
  }
  if (!isNumberInRange(raw, min, max)) {
    issues.push({ field: fieldPath, problem: 'invalid' });
    return null;
  }
  return raw;
}

/** @returns {MetricViewModel[]} sempre as três métricas documentadas, na ordem definida */
function readMetrics(source, issues) {
  const raw = source.metricas;
  const metricsAvailable = isPlainObject(raw);
  if (!metricsAvailable) {
    issues.push({ field: 'metricas', problem: isMissing(raw) ? 'missing' : 'invalid' });
  }
  return METRIC_DEFINITIONS.map(({ key, label, unit, min, max }) => ({
    key,
    label,
    unit,
    value: metricsAvailable
      ? readNumberInRange(raw, key, { min, max }, issues, `metricas.${key}`)
      : null,
  }));
}

function readStringList(source, key, issues) {
  const raw = source[key];
  if (isMissing(raw)) {
    issues.push({ field: key, problem: 'missing' });
    return null;
  }
  if (!Array.isArray(raw)) {
    issues.push({ field: key, problem: 'invalid' });
    return null;
  }
  const strings = raw.filter(isNonEmptyString);
  if (strings.length !== raw.length) issues.push({ field: key, problem: 'invalid' });
  return strings;
}

function readBoolean(source, key, issues) {
  const raw = source[key];
  if (isMissing(raw)) {
    issues.push({ field: key, problem: 'missing' });
    return null;
  }
  if (typeof raw !== 'boolean') {
    issues.push({ field: key, problem: 'invalid' });
    return null;
  }
  return raw;
}

/**
 * Campos não documentados: guardados só se forem valores simples, sem interpretação.
 * A sua ausência não é um problema (não entram em `issues`).
 */
function readUndocumentedPrimitives(raw) {
  if (!isPlainObject(raw)) return null;
  const entries = Object.entries(raw).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'boolean' || isFiniteNumber(value),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function withCompleteness(viewModel, issues) {
  return { ...viewModel, issues, isComplete: issues.length === 0 };
}

/** Resposta de POST /api/v1/advisory → view model da recomendação principal. */
export function mapAdvisoryResponse(raw) {
  const issues = [];
  const source = isPlainObject(raw) ? raw : {};
  if (!isPlainObject(raw)) issues.push({ field: RESPONSE_FIELD, problem: 'invalid' });

  const recommendation = source.recomendacao_extensao;
  let recommendationText = null;
  if (isMissing(recommendation)) issues.push({ field: 'recomendacao_extensao', problem: 'missing' });
  else if (!isNonEmptyString(recommendation)) {
    issues.push({ field: 'recomendacao_extensao', problem: 'invalid' });
  } else recommendationText = recommendation;

  return withCompleteness(
    {
      source: RESULT_SOURCES.advisory,
      status: readStatus(source, issues),
      confidenceScore: readNumberInRange(source, 'score_confianca', CONFIDENCE_SCORE_RANGE, issues),
      metrics: readMetrics(source, issues),
      /** Texto tipo Markdown. Renderizar de forma segura, nunca como HTML. */
      recommendationText,
    },
    issues,
  );
}

/** Resposta de POST /api/v1/evaluate → view model da avaliação técnica complementar. */
export function mapEvaluateResponse(raw) {
  const issues = [];
  const source = isPlainObject(raw) ? raw : {};
  if (!isPlainObject(raw)) issues.push({ field: RESPONSE_FIELD, problem: 'invalid' });

  return withCompleteness(
    {
      source: RESULT_SOURCES.evaluate,
      status: readStatus(source, issues),
      confidenceScore: readNumberInRange(source, 'score_confianca', CONFIDENCE_SCORE_RANGE, issues),
      metrics: readMetrics(source, issues),
      /** Códigos técnicos tal como vêm da API (sem tradução inventada). */
      triggers: readStringList(source, 'triggers_ativados', issues),
      justifications: readStringList(source, 'justificacoes_tecnicas', issues),
      isFallbackWeather: readBoolean(source, 'is_fallback_weather', issues),
      /** `detalhes_agroclimaticos`: observado mas NÃO documentado — opcional e instável. */
      undocumentedDetails: readUndocumentedPrimitives(source.detalhes_agroclimaticos),
    },
    issues,
  );
}

/**
 * Lista de /provinces ou /crops → opções de selecção. Entradas sem `id` e `nome` são descartadas.
 * `value` é o `nome`, enviado à API tal como nos exemplos documentados.
 */
export function mapCatalogOptions(rawList) {
  if (!Array.isArray(rawList)) return { options: [], discardedCount: 0 };
  const seenIds = new Set();
  const options = [];
  for (const item of rawList) {
    if (!isPlainObject(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.nome)) continue;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    options.push({ id: item.id, label: item.nome, value: item.nome });
  }
  return { options, discardedCount: rawList.length - options.length };
}

/** GET /health → estado de disponibilidade. */
export function mapHealthResponse(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const isHealthy = source.status === 'healthy';
  const baselineReady = typeof source.baseline_ready === 'boolean' ? source.baseline_ready : null;
  return {
    isHealthy,
    baselineReady,
    isReady: isHealthy && baselineReady === true,
    serverDate: isValidIsoDate(source.data_servidor) ? source.data_servidor : null,
  };
}
