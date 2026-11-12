// Nomes legíveis dos campos da API, para avisos de dados em falta ou inválidos.
// Os nomes técnicos (chaves) são os da API e não mudam.

import { METRIC_DEFINITIONS } from './metrics.js';

export const RESPONSE_FIELD = '(resposta)';

export const FIELD_LABELS = Object.freeze({
  [RESPONSE_FIELD]: 'Resposta completa',
  status: 'Estado',
  score_confianca: 'Nível de confiança',
  metricas: 'Indicadores (métricas)',
  recomendacao_extensao: 'Recomendação de extensão',
  triggers_ativados: 'Triggers activados',
  justificacoes_tecnicas: 'Justificações técnicas',
  is_fallback_weather: 'Indicação de dados meteorológicos de substituição',
  ...Object.fromEntries(METRIC_DEFINITIONS.map(({ key, label }) => [`metricas.${key}`, label])),
});

export const ISSUE_PROBLEM_LABELS = Object.freeze({
  missing: 'não enviado',
  invalid: 'valor inválido ou fora do intervalo esperado',
});
