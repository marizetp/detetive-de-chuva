// Métricas documentadas em `metricas` (docs/backend-api.md §4). A ordem define a apresentação.
// Os limites servem apenas para rejeitar valores impossíveis; não são limiares agronómicos.
// As descrições explicam o que cada valor é, sem limiares nem interpretações: o serviço ainda
// não documentou nenhuns. Nos testes de 2026-11-12, com `is_fallback_weather: true` em todas as
// respostas, os valores variaram por província e mês, não por dia: por isso as descrições não os
// apresentam como medições nem como previsão meteorológica da data consultada.

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
    description:
      'Chuva acumulada antes da data consultada, segundo o serviço. Pode ser um valor de referência, e não uma medição.',
  }),
  Object.freeze({
    key: 'humidade_solo_raiz',
    label: 'Humidade do solo na zona das raízes',
    unit: METRIC_UNITS.fraction,
    min: 0,
    max: 1,
    description:
      'Água disponível na camada de solo onde a raiz se desenvolve, segundo o serviço, numa escala de 0 a 1 (aqui em percentagem). Pode ser um valor de referência, e não uma medição.',
  }),
  Object.freeze({
    key: 'previsao_7dias_mm',
    label: 'Chuva indicada para 7 dias',
    unit: METRIC_UNITS.millimetres,
    min: 0,
    max: Number.POSITIVE_INFINITY,
    description:
      'Chuva indicada pelo serviço para os sete dias seguintes à data consultada. Pode ser um valor de referência, e não uma previsão meteorológica.',
  }),
]);

/** `score_confianca`: 0–100 segundo a documentação. */
export const CONFIDENCE_SCORE_RANGE = Object.freeze({ min: 0, max: 100 });
