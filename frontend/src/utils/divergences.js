// Compara os resultados de /advisory e /evaluate. As divergências são reportadas, nunca reconciliadas.

const NUMBER_TOLERANCE = 1e-9;

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
