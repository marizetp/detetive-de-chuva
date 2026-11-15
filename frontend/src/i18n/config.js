// Configuração da internacionalização (decisão de 2026-11-14: English predefinido, Português
// como segundo idioma). Fonte única para os códigos de idioma, as etiquetas BCP 47 e os locales.

export const LANGUAGES = Object.freeze({ en: 'en', pt: 'pt' });

/** Idioma usado quando o utilizador ainda não escolheu nenhum. Nunca é alterado pela detecção. */
export const DEFAULT_LANGUAGE = LANGUAGES.en;

export const SUPPORTED_LANGUAGES = Object.freeze([LANGUAGES.en, LANGUAGES.pt]);

/** Valor de `<html lang>` por idioma da interface. */
export const LANGUAGE_TAGS = Object.freeze({ [LANGUAGES.en]: 'en', [LANGUAGES.pt]: 'pt-AO' });

/**
 * Locale do Intl (números e datas). en-GB: dia antes do mês e ponto decimal ("12 November 2026",
 * "25.6"); pt-AO: vírgula decimal ("12 de novembro de 2026", "25,6").
 */
export const INTL_LOCALES = Object.freeze({ [LANGUAGES.en]: 'en-GB', [LANGUAGES.pt]: 'pt-AO' });

/** Nome de cada idioma na própria língua (autónimo), para o selector. */
export const LANGUAGE_AUTONYMS = Object.freeze({
  [LANGUAGES.en]: 'English',
  [LANGUAGES.pt]: 'Português',
});

/**
 * Idioma do texto livre do backend quando nada indica outro: português por omissão do serviço
 * (`/evaluate` sem `lang`, nomes do catálogo e `/advisory` sem `lang`; docs/docs2.md §3).
 */
export const BACKEND_CONTENT_LANGUAGE = LANGUAGES.pt;

export function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value);
}

/**
 * Valores de `content_language` aceites na resposta do backend (especificação de i18n entregue ao
 * backend em 2026-11-15: `pt`, `pt-AO`, `en`, `en-US`), normalizados para o idioma da interface.
 * O campo ainda NÃO é documentado nem devolvido pela API v1.1: é lido só quando existir.
 */
const CONTENT_LANGUAGE_ALIASES = Object.freeze({
  pt: LANGUAGES.pt,
  'pt-ao': LANGUAGES.pt,
  en: LANGUAGES.en,
  'en-us': LANGUAGES.en,
});

/**
 * Normaliza o idioma efectivo declarado pelo backend. Valor ausente, não textual ou fora da
 * lista → `null` (o frontend volta ao idioma pedido; nunca adivinha o idioma do texto).
 */
export function normalizeContentLanguage(raw) {
  if (typeof raw !== 'string') return null;
  return CONTENT_LANGUAGE_ALIASES[raw.trim().toLowerCase()] ?? null;
}
