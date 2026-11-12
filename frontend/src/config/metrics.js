// Métricas documentadas em `metricas` (docs/backend-api.md §4). A ordem define a apresentação.
// Os limites servem apenas para rejeitar valores impossíveis; não são limiares agronómicos.

export const METRIC_UNITS = Object.freeze({
  millimetres: 'mm',
  /** Fracção 0–1 na API; apresentada como percentagem. */
  fraction: 'fraction',
});

export const METRIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'chuva_acumulada_recente_mm',
    label: 'Chuva acumulada recente',
    unit: METRIC_UNITS.millimetres,
    min: 0,
    max: Number.POSITIVE_INFINITY,
  }),
  Object.freeze({
    key: 'humidade_solo_raiz',
    label: 'Humidade do solo na zona das raízes',
    unit: METRIC_UNITS.fraction,
    min: 0,
    max: 1,
  }),
  Object.freeze({
    key: 'previsao_7dias_mm',
    label: 'Chuva prevista para os próximos 7 dias',
    unit: METRIC_UNITS.millimetres,
    min: 0,
    max: Number.POSITIVE_INFINITY,
  }),
]);

/** `score_confianca`: 0–100 segundo a documentação. */
export const CONFIDENCE_SCORE_RANGE = Object.freeze({ min: 0, max: 100 });
