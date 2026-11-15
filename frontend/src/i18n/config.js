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
 * Idioma do texto livre devolvido pelo backend (`recomendacao_extensao`, `justificacoes_tecnicas`,
 * nomes do catálogo). A API actual não tem parâmetro de idioma (docs/backend-api.md).
 */
export const BACKEND_CONTENT_LANGUAGE = LANGUAGES.pt;

export function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value);
}
