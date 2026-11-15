// Tradução pura (sem React): usada pelo LanguageProvider e por utilitários que produzem texto.

import { DEFAULT_LANGUAGE, isSupportedLanguage } from './config.js';
import en from './messages/en.js';
import pt from './messages/pt.js';

export const MESSAGES = Object.freeze({ en, pt });

function lookup(messages, key) {
  let node = messages;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/** `true` quando a chave existe no dicionário do idioma (sem recorrer a outro idioma). */
export function hasMessage(language, key) {
  return lookup(MESSAGES[language] ?? {}, key) !== undefined;
}

/**
 * Devolve `t(key, vars)` para um idioma. Uma chave em falta devolve a própria chave (visível
 * como defeito) em vez de texto noutro idioma: nunca se misturam idiomas em silêncio.
 */
export function createTranslator(language) {
  const resolved = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  const messages = MESSAGES[resolved];
  const t = (key, vars) => {
    const template = lookup(messages, key);
    if (template === undefined) {
      if (import.meta.env?.DEV) console.warn(`[i18n] Chave em falta (${resolved}): ${key}`);
      return key;
    }
    return interpolate(template, vars);
  };
  t.language = resolved;
  return t;
}

/** Lista "a.b.c" de todas as chaves de texto de um dicionário (teste de paridade). */
export function flattenKeys(messages, prefix = '') {
  return Object.entries(messages).flatMap(([name, value]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    return value !== null && typeof value === 'object' ? flattenKeys(value, key) : [key];
  });
}
