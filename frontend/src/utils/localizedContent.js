// Como apresentar o texto livre do backend (`recomendacao_extensao`, `justificacoes_tecnicas`)
// no idioma da interface. O texto livre nunca é traduzido no browser nem por substituição de
// palavras: cada idioma é pedido ao serviço, quando este o suporta.
//
// Idioma da fonte (resolveSourceLanguage), por ordem:
// 1. `content_language` da resposta, quando o backend o devolver (pedido em 2026-11-15; ainda não
//    documentado na API v1.1) — idioma CONFIRMADO;
// 2. o idioma PEDIDO (`requestedLanguage`: /advisory com `lang`; /evaluate só com a capacidade
//    VITE_API_EVALUATE_LANG) — não confirmado;
// 3. o português por omissão do serviço.
// Se o idioma da fonte não for o da interface: aviso + painel com o texto original.

import { BACKEND_CONTENT_LANGUAGE } from '../i18n/config.js';

export const DYNAMIC_CONTENT_MODES = Object.freeze({
  /** O texto está no idioma da interface: mostra-se directamente. */
  native: 'native',
  /** Não há texto no idioma da interface: aviso + painel fechado com o original. */
  originalOnly: 'original-only',
});

/**
 * Idioma em que um resultado (/advisory ou /evaluate) entregou o texto livre.
 * @param {{ contentLanguage?: string|null, requestedLanguage?: string|null } | null} result
 * @returns {{ language: string, confirmed: boolean }}
 */
export function resolveSourceLanguage(result, fallback = BACKEND_CONTENT_LANGUAGE) {
  if (result?.contentLanguage) return { language: result.contentLanguage, confirmed: true };
  return { language: result?.requestedLanguage ?? fallback, confirmed: false };
}

/**
 * @param {string} uiLanguage idioma activo da interface
 * @param {string} [sourceLanguage] idioma em que o backend entregou o texto
 */
export function resolveDynamicContentMode(uiLanguage, sourceLanguage = BACKEND_CONTENT_LANGUAGE) {
  return uiLanguage === sourceLanguage
    ? DYNAMIC_CONTENT_MODES.native
    : DYNAMIC_CONTENT_MODES.originalOnly;
}
