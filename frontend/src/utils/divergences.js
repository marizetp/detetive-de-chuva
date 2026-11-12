// Compara os resultados de /advisory e /evaluate. As divergências são reportadas, nunca reconciliadas.

import { METRIC_DEFINITIONS } from '../config/metrics.js';
import { formatConfidenceScore, formatMetricValue } from './format.js';
import { mapStatus } from './mappers.js';

const NUMBER_TOLERANCE = 1e-9;
const METRIC_FIELD_PREFIX = 'metricas.';

/** Formata um valor de divergência para apresentação, segundo o campo comparado. */
export function formatDivergenceValue(field, value) {
  if (field === 'status') return mapStatus(value).known ? mapStatus(value).label : String(value);
  if (field === 'score_confianca') return formatConfidenceScore(value);
  if (field.startsWith(METRIC_FIELD_PREFIX)) {
    const key = field.slice(METRIC_FIELD_PREFIX.length);
    const definition = METRIC_DEFINITIONS.find((metric) => metric.key === key);
    if (definition) return formatMetricValue({ unit: definition.unit, value });
  }
  return String(value);
}

function sameNumber(a, b) {
  return Math.abs(a - b) <= NUMBER_TOLERANCE;
}

/**
 * @param {ReturnType<typeof import('./mappers.js').mapAdvisoryResponse>} advisory
 * @param {ReturnType<typeof import('./mappers.js').mapEvaluateResponse>} evaluate
 * @returns {{
 *   divergences: { field: string, label: string, advisoryValue: unknown, evaluateValue: unknown }[],
 *   notComparable: { field: string, label: string }[],
 *   hasDivergences: boolean,
 * }}
 * `notComparable`: campos em falta numa ou nas duas respostas, para a UI não sugerir concordância.
 */
export function compareConsultationResults(advisory, evaluate) {
  const divergences = [];
  const notComparable = [];

  const check = (field, label, advisoryValue, evaluateValue, equals) => {
    if (advisoryValue === null || evaluateValue === null) {
      notComparable.push({ field, label });
    } else if (!equals(advisoryValue, evaluateValue)) {
      divergences.push({ field, label, advisoryValue, evaluateValue });
    }
  };

  check('status', 'Estado', advisory.status.code, evaluate.status.code, (a, b) => a === b);
  check(
    'score_confianca',
    'Nível de confiança',
    advisory.confidenceScore,
    evaluate.confidenceScore,
    sameNumber,
  );

  for (const advisoryMetric of advisory.metrics) {
    const evaluateMetric = evaluate.metrics.find((metric) => metric.key === advisoryMetric.key);
    check(
      `metricas.${advisoryMetric.key}`,
      advisoryMetric.label,
      advisoryMetric.value,
      evaluateMetric?.value ?? null,
      sameNumber,
    );
  }

  return { divergences, notComparable, hasDivergences: divergences.length > 0 };
}
