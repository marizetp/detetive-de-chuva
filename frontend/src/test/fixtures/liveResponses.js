// FIXTURES DE TESTE — NÃO IMPORTAR EM CÓDIGO DE PRODUÇÃO (regra ESLint em eslint.config.js).
//
// Respostas reais da API https://detetive-da-chuva.onrender.com gravadas a 2026-11-12, durante o
// reconhecimento. Servem apenas para verificar formas de dados nos testes; não são observações
// actuais e não devem ser apresentadas na interface. Textos longos foram encurtados (marcados "[…]").

export const RECORDED_ON = '2026-11-12';

export const healthResponse = {
  status: 'healthy',
  baseline_ready: true,
  provincias_ativas: ['Huambo', 'Bié', 'Huíla'],
  culturas_ativas: ['Milho', 'Feijão', 'Soja'],
  data_servidor: '2026-11-12',
};

export const provincesResponse = [
  {
    id: 'huambo',
    nome: 'Huambo',
    latitude: -12.7761,
    longitude: 15.7392,
    altitude_m: 1700,
    zona_agroecologica: 'Planalto Central Tropical de Altitude',
  },
  {
    id: 'bie',
    nome: 'Bié',
    latitude: -12.3833,
    longitude: 16.9333,
    altitude_m: 1650,
    zona_agroecologica: 'Planalto Central Oriental',
  },
  {
    id: 'huila',
    nome: 'Huíla',
    latitude: -14.9172,
    longitude: 13.5414,
    altitude_m: 1760,
    zona_agroecologica: 'Planalto de Humpata e Lubango',
  },
];

export const cropsResponse = [
  {
    id: 'milho',
    nome: 'Milho',
    nome_cientifico: 'Zea mays',
    icone: '🌽',
    profundidade_sementeira_cm: 5,
    min_chuva_abertura_mm: 20.0,
    notas_agronomicas:
      'Cultura base de segurança alimentar no Planalto Central. Exige solo húmido até 5 cm.',
  },
  {
    id: 'feijao',
    nome: 'Feijão',
    nome_cientifico: 'Phaseolus vulgaris',
    icone: '🫘',
    profundidade_sementeira_cm: 4,
    min_chuva_abertura_mm: 18.0,
    notas_agronomicas: 'Muito sensível ao encharcamento prolongado e a veranicos pós-germinação.',
  },
  {
    id: 'soja',
    nome: 'Soja',
    nome_cientifico: 'Glycine max',
    icone: '🌱',
    profundidade_sementeira_cm: 4,
    min_chuva_abertura_mm: 22.0,
    notas_agronomicas: 'Exige humidade contínua na sementeira para boa taxa de emergência.',
  },
];

/** POST /api/v1/advisory { provincia: 'Huambo', cultura: 'Milho' } */
export const advisoryHuamboMilho = {
  status: 'FAVORAVEL',
  score_confianca: 95,
  metricas: {
    chuva_acumulada_recente_mm: 25.6,
    humidade_solo_raiz: 0.48,
    previsao_7dias_mm: 51.2,
  },
  recomendacao_extensao:
    '**FAVORÁVEL: O período atual é favorável para a sementeira de Milho na província do Huambo.**\n\n### Justificações Técnicas:\n* **Reservas Hídricas no Solo:** A humidade armazenada na camada da raiz apresenta níveis adequados […]',
};

/** POST /api/v1/evaluate { provincia: 'Huambo', cultura: 'Milho' } */
export const evaluateHuamboMilho = {
  status: 'FAVORAVEL',
  score_confianca: 95,
  triggers_ativados: ['RECENT_RAIN_TRIGGER_SATISFIED'],
  justificacoes_tecnicas: [
    'Reserva de água na raiz favorável (0.48), superior ao limiar mínimo histórico (0.43).',
    'Acumulação recente de chuvas atingiu 25.6 mm nos últimos dias, garantindo solo bem humedecido.',
    'Previsão de 7 dias com 51.2 mm e sem risco de estiagem severa, propício para germinação uniforme do Milho.',
  ],
  metricas: {
    chuva_acumulada_recente_mm: 25.6,
    humidade_solo_raiz: 0.48,
    previsao_7dias_mm: 51.2,
  },
  is_fallback_weather: true,
  detalhes_agroclimaticos: {
    provincia: 'Huambo',
    cultura: 'Milho',
    data_consulta: '2026-11-12',
    mes: 11,
    semana_iso: 46,
    p25_root: 0.432,
    p50_raiz_historico: 0.48,
    p75_raiz_historico: 0.54,
    prob_sementeira_semanal: 72.0,
    chuva_media_mensal_mm: 219.5,
    temperatura_media_c: 20.5,
    temperatura_max_c: 25.8,
    surface_moisture: 0.54,
  },
};

/** POST /api/v1/evaluate { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-09-10' } */
export const evaluateHuamboAguardar = {
  status: 'AGUARDAR',
  score_confianca: 72,
  triggers_ativados: [],
  metricas: { chuva_acumulada_recente_mm: 2.5, humidade_solo_raiz: 0.39, previsao_7dias_mm: 5 },
  is_fallback_weather: true,
};

/** POST /api/v1/evaluate { provincia: 'Huíla', cultura: 'Milho', data_consulta: '2026-08-01' } */
export const evaluateHuilaDesfavoravel = {
  status: 'DESFAVORAVEL',
  score_confianca: 85,
  triggers_ativados: [],
  metricas: { chuva_acumulada_recente_mm: 0, humidade_solo_raiz: 0.43, previsao_7dias_mm: 0.1 },
  is_fallback_weather: true,
};

/** 422 — POST com { provincia: 'Luanda', cultura: 'Milho' } */
export const validationErrorUnsupportedProvince = {
  detail: [
    {
      type: 'value_error',
      loc: ['body', 'provincia'],
      msg: "Value error, Província 'Luanda' não suportada. Selecione uma das seguintes províncias: Huambo, Bié ou Huíla.",
      input: 'Luanda',
      ctx: { error: {} },
    },
  ],
};

/** 422 — POST com {} */
export const validationErrorMissingProvince = {
  detail: [{ type: 'missing', loc: ['body', 'provincia'], msg: 'Field required', input: {} }],
};
