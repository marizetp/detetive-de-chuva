// Estrutura do relatório: secções numeradas e identificação das fontes.

import { API_PATHS, RESULT_SOURCES } from '../../config/api.js';

export const REPORT_SECTIONS = Object.freeze({
  summary: Object.freeze({ id: 'relatorio-resumo', index: '01', title: 'Resumo da avaliação' }),
  indicators: Object.freeze({
    id: 'relatorio-indicadores',
    index: '02',
    title: 'Indicadores agroclimáticos',
  }),
  recommendation: Object.freeze({
    id: 'relatorio-recomendacao',
    index: '03',
    title: 'Recomendação de extensão',
  }),
  technical: Object.freeze({ id: 'relatorio-fundamentacao', index: '04', title: 'Fundamentação técnica' }),
  transparency: Object.freeze({
    id: 'relatorio-transparencia',
    index: '05',
    title: 'Transparência e limitações',
  }),
});

export const REPORT_SECTION_ORDER = Object.freeze([
  REPORT_SECTIONS.summary,
  REPORT_SECTIONS.indicators,
  REPORT_SECTIONS.recommendation,
  REPORT_SECTIONS.technical,
  REPORT_SECTIONS.transparency,
]);

/** Como cada fonte é nomeada na interface. Nunca se mostram dados sem a sua origem. */
export const SOURCE_META = Object.freeze({
  [RESULT_SOURCES.advisory]: Object.freeze({
    name: 'Recomendação',
    service: 'Serviço de recomendação',
    endpoint: API_PATHS.advisory,
    section: REPORT_SECTIONS.recommendation,
  }),
  [RESULT_SOURCES.evaluate]: Object.freeze({
    name: 'Avaliação técnica',
    service: 'Serviço de avaliação técnica',
    endpoint: API_PATHS.evaluate,
    section: REPORT_SECTIONS.technical,
  }),
});
