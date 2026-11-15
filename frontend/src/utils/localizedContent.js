// Como apresentar o texto livre do backend (`recomendacao_extensao`, `justificacoes_tecnicas`)
// no idioma da interface. Decisão de 2026-11-14: o texto livre é traduzido pelo backend, nunca no
// browser nem por substituição de palavras.
//
// Estado actual: a API não tem parâmetro de idioma e devolve sempre Português. Por isso só há dois
// modos. O modo "traduzido" (fase 5) só será acrescentado quando o novo contrato da API estiver
// especificado e disponível — não se simula suporte multilingue que ainda não existe.

import { BACKEND_CONTENT_LANGUAGE } from '../i18n/config.js';

export const DYNAMIC_CONTENT_MODES = Object.freeze({
  /** O texto está no idioma da interface: mostra-se directamente. */
  native: 'native',
  /** Não há texto no idioma da interface: aviso + painel fechado com o original. */
  originalOnly: 'original-only',
});

/**
 * @param {string} uiLanguage idioma activo da interface
 * @param {string} [sourceLanguage] idioma em que o backend entregou o texto
 */
export function resolveDynamicContentMode(uiLanguage, sourceLanguage = BACKEND_CONTENT_LANGUAGE) {
  return uiLanguage === sourceLanguage
    ? DYNAMIC_CONTENT_MODES.native
    : DYNAMIC_CONTENT_MODES.originalOnly;
}
