// Motor IMERG (`GET /zonas/{zona}/decisao`, docs/docs2.md §5): motor científico INDEPENDENTE do
// DecisionEngine (/advisory e /evaluate). Avalia o início da época das chuvas e o risco de falso
// início com NASA GPM IMERG V07. Os seus resultados nunca são convertidos nos estados do
// DecisionEngine (FAVORAVEL / AGUARDAR / DESFAVORAVEL, config/status.js) nem combinados com eles.
//
// Ainda não integrado na interface (decisão D11): esta configuração prepara a integração.

/** Desfechos do motor IMERG, do ponto de vista da apresentação. */
export const IMERG_OUTCOMES = Object.freeze({
  /** `FAVORAVEL_INDICATIVO` → «PLANTAR (indicativo)». Indicativo, nunca garantia. */
  indicative: 'indicative',
  /** `AGUARDAR_*` → «AGUARDAR». */
  wait: 'wait',
  /** `SEM_BASE_FIAVEL` → «SEM CONCLUSÃO»: dados IMERG insuficientes; NÃO é uma decisão. */
  noReliableBasis: 'noReliableBasis',
  /** `FORA_DA_EPOCA` → «SEM CONCLUSÃO (fora da época)»: NÃO é uma decisão. */
  outOfSeason: 'outOfSeason',
  /** Código recebido mas não documentado: mostrado tal como veio, sem interpretação. */
  unknown: 'unknown',
  /** Sem código na resposta. */
  missing: 'missing',
});

/**
 * Tabela oficial código → desfecho (docs/docs2.md §5, «Official Code-to-Label Mapping»).
 * Os códigos são identificadores estáveis: nunca dependem do idioma.
 */
export const IMERG_CODE_OUTCOMES = Object.freeze({
  FAVORAVEL_INDICATIVO: IMERG_OUTCOMES.indicative,
  AGUARDAR_CHUVA_INSUFICIENTE: IMERG_OUTCOMES.wait,
  AGUARDAR_FALSA_PARTIDA: IMERG_OUTCOMES.wait,
  AGUARDAR_ESTIAGEM_EM_CURSO: IMERG_OUTCOMES.wait,
  SEM_BASE_FIAVEL: IMERG_OUTCOMES.noReliableBasis,
  FORA_DA_EPOCA: IMERG_OUTCOMES.outOfSeason,
});

/** Só estes desfechos são uma indicação do motor. Os restantes nunca se apresentam como decisão. */
export const IMERG_CONCLUSIVE_OUTCOMES = Object.freeze([IMERG_OUTCOMES.indicative, IMERG_OUTCOMES.wait]);

/** Zonas IMERG documentadas (docs/docs2.md §5). */
export const IMERG_ZONES = Object.freeze(['huambo', 'bie', 'huila']);
