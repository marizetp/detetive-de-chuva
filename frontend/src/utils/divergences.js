// Compara os resultados de /advisory e /evaluate. As divergências são reportadas, nunca reconciliadas.
// Nenhum dos dois endpoints tem autoridade sobre o outro (docs/docs2.md §6.4; CLAUDE.md §11).

import { METRIC_DEFINITIONS } from '../config/metrics.js';
import { LANGUAGES } from '../i18n/config.js';
import { formatConfidenceScore, formatMetricValue } from './format.js';
import { mapStatus } from './mappers.js';

const NUMBER_TOLERANCE = 1e-9;
const METRIC_FIELD_PREFIX = 'metricas.';

/**
 * Formata um valor de divergência para apresentação, segundo o campo comparado.
 * - `language`: formato de números (por omissão pt, para os componentes antigos);
 * - `t`: tradutor do idioma activo; sem ele, os estados usam as etiquetas portuguesas antigas.
 * Estados desconhecidos aparecem tal como recebidos, sem interpretação.
 */
export function formatDivergenceValue(field, value, { language = LANGUAGES.pt, t } = {}) {
  if (field === 'status') {
    if (!mapStatus(value).known) return String(value);
    return t ? t(`status.${value}`) : mapStatus(value).label;
  }
  if (field === 'score_confianca') return formatConfidenceScore(value, language);
  if (field.startsWith(METRIC_FIELD_PREFIX)) {
    const key = field.slice(METRIC_FIELD_PREFIX.length);
    const definition = METRIC_DEFINITIONS.find((metric) => metric.key === key);
    if (definition) return formatMetricValue({ unit: definition.unit, value }, language);
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
 *   divergences: { field: string, label: string, labelKey: string, advisoryValue: unknown, evaluateValue: unknown }[],
 *   notComparable: { field: string, label: string, labelKey: string }[],
 *   hasDivergences: boolean,
 * }}
 * `notComparable`: campos em falta numa ou nas duas respostas, para a UI não sugerir concordância.
 * `labelKey`: chave do dicionário i18n para o nome do campo; `label` (português) mantém-se para os
 * componentes antigos.
 */
export function compareConsultationResults(advisory, evaluate) {
  const divergences = [];
  const notComparable = [];

  const check = (field, label, labelKey, advisoryValue, evaluateValue, equals) => {
    if (advisoryValue === null || evaluateValue === null) {
      notComparable.push({ field, label, labelKey });
    } else if (!equals(advisoryValue, evaluateValue)) {
      divergences.push({ field, label, labelKey, advisoryValue, evaluateValue });
    }
  };

  check(
    'status',
    'Estado',
    'results.divergence.status',
    advisory.status.code,
    evaluate.status.code,
    (a, b) => a === b,
  );
  check(
    'score_confianca',
    'Nível de confiança',
    'results.divergence.confidence',
    advisory.confidenceScore,
    evaluate.confidenceScore,
    sameNumber,
  );

  for (const advisoryMetric of advisory.metrics) {
    const evaluateMetric = evaluate.metrics.find((metric) => metric.key === advisoryMetric.key);
    check(
      `metricas.${advisoryMetric.key}`,
      advisoryMetric.label,
      `metrics.${advisoryMetric.key}.label`,
      advisoryMetric.value,
      evaluateMetric?.value ?? null,
      sameNumber,
    );
  }

  return { divergences, notComparable, hasDivergences: divergences.length > 0 };
}
