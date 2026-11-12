// Estados documentados da avaliação (docs/backend-api.md §4). Cores finais são definidas na UI.

export const STATUS_CODES = Object.freeze({
  FAVORAVEL: 'FAVORAVEL',
  AGUARDAR: 'AGUARDAR',
  DESFAVORAVEL: 'DESFAVORAVEL',
});

/** `tone` é uma chave semântica para a UI escolher cor e ícone; nunca deve ser o único sinal. */
export const STATUS_DEFINITIONS = Object.freeze({
  [STATUS_CODES.FAVORAVEL]: Object.freeze({ label: 'Favorável', tone: 'positive' }),
  [STATUS_CODES.AGUARDAR]: Object.freeze({ label: 'Aguardar', tone: 'caution' }),
  [STATUS_CODES.DESFAVORAVEL]: Object.freeze({ label: 'Desfavorável', tone: 'warning' }),
});

export const UNKNOWN_STATUS = Object.freeze({ label: 'Estado não reconhecido', tone: 'neutral' });
export const MISSING_STATUS = Object.freeze({ label: 'Estado indisponível', tone: 'neutral' });
