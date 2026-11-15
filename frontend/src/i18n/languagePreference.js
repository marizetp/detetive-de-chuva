// Persistência local da escolha de idioma (localStorage), sempre protegida por try/catch.
//
// Dois registos separados, para nunca confundir uma escolha com uma sugestão recusada:
//  - ddc.language            { language, source: 'manual' | 'suggestion', at }
//                            escolha explícita do utilizador (selector, ou aceitar a sugestão);
//                            tem prioridade absoluta sobre a detecção do navegador.
//  - ddc.languageSuggestion  { status: 'dismissed', at }
//                            a sugestão foi recusada; não volta a ser apresentada. Não fixa idioma.

import { DEFAULT_LANGUAGE, LANGUAGES, isSupportedLanguage } from './config.js';
import { getPrimaryBrowserLanguage, isPortugueseLanguageTag } from './browserLanguage.js';

export const LANGUAGE_STORAGE_KEY = 'ddc.language';
export const SUGGESTION_STORAGE_KEY = 'ddc.languageSuggestion';
export const CHOICE_SOURCES = Object.freeze({ manual: 'manual', suggestion: 'suggestion' });

/** localStorage, ou `null` se estiver bloqueado (navegação privada, dados bloqueados…). */
export function getBrowserStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    storage.getItem(LANGUAGE_STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function readJson(storage, key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** @returns {{ language: string, source: string } | null} só registos válidos */
export function readLanguageChoice(storage) {
  const record = readJson(storage, LANGUAGE_STORAGE_KEY);
  if (!record || !isSupportedLanguage(record.language)) return null;
  const source = Object.values(CHOICE_SOURCES).includes(record.source)
    ? record.source
    : CHOICE_SOURCES.manual;
  return { language: record.language, source };
}

/** @returns {boolean} `false` se não foi possível guardar (a escolha vale só nesta sessão) */
export function saveLanguageChoice(storage, language, source, now = new Date()) {
  return writeJson(storage, LANGUAGE_STORAGE_KEY, { language, source, at: now.toISOString() });
}

export function isSuggestionDismissed(storage) {
  return readJson(storage, SUGGESTION_STORAGE_KEY)?.status === 'dismissed';
}

export function saveSuggestionDismissed(storage, now = new Date()) {
  return writeJson(storage, SUGGESTION_STORAGE_KEY, { status: 'dismissed', at: now.toISOString() });
}

/**
 * Estado inicial do idioma. Prioridade:
 *  1. escolha guardada (manual ou sugestão aceite) → esse idioma, sem sugestão;
 *  2. caso contrário, idioma predefinido (en). A detecção nunca muda o idioma: só decide se a
 *     sugestão aparece (preferência principal `pt-*` e sugestão ainda não recusada).
 */
export function resolveInitialLanguageState({ storage, navigatorLike } = {}) {
  const choice = readLanguageChoice(storage);
  if (choice) return { language: choice.language, suggestionVisible: false };

  const primary = getPrimaryBrowserLanguage(navigatorLike);
  const suggestionVisible =
    DEFAULT_LANGUAGE !== LANGUAGES.pt &&
    isPortugueseLanguageTag(primary) &&
    !isSuggestionDismissed(storage);
  return { language: DEFAULT_LANGUAGE, suggestionVisible };
}
