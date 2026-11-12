// Métricas documentadas em `metricas` (docs/backend-api.md §4). A ordem define a apresentação.
// Os limites servem apenas para rejeitar valores impossíveis; não são limiares agronómicos.
// As descrições explicam o que cada valor é, sem limiares nem interpretações: o serviço ainda
// não documentou nenhuns.

export const METRIC_UNITS = Object.freeze({
  millimetres: 'mm',
  /** Fracção 0–1 na API; apresentada como percentagem. */
  fraction: 'fraction',
});

/** Unidade tal como é mostrada ao utilizador. */
export const METRIC_UNIT_LABELS = Object.freeze({
  [METRIC_UNITS.millimetres]: 'mm',
  [METRIC_UNITS.fraction]: '%',
});

export const METRIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'chuva_acumulada_recente_mm',
    label: 'Chuva acumulada recente',
    unit: METRIC_UNITS.millimetres,
    min: 0,
    max: Number.POSITIVE_INFINITY,
    description: 'Chuva acumulada nos dias anteriores à data consultada, segundo o serviço.',
  }),
  Object.freeze({
    key: 'humidade_solo_raiz',
    label: 'Humidade do solo na zona das raízes',
    unit: METRIC_UNITS.fraction,
    min: 0,
    max: 1,
    description:
      'Água disponível na camada de solo onde a raiz se desenvolve. O serviço indica-a numa escala de 0 a 1; aqui é apresentada em percentagem.',
  }),
  Object.freeze({
    key: 'previsao_7dias_mm',
    label: 'Chuva prevista para os próximos 7 dias',
    unit: METRIC_UNITS.millimetres,
    min: 0,
    max: Number.POSITIVE_INFINITY,
    description: 'Chuva esperada para os sete dias seguintes à data consultada, segundo o serviço.',
  }),
]);

/** `score_confianca`: 0–100 segundo a documentação. */
export const CONFIDENCE_SCORE_RANGE = Object.freeze({ min: 0, max: 100 });
