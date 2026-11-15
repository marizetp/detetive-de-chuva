// Detecção da preferência linguística do navegador. Só usa navigator.languages / navigator.language:
// nunca localização geográfica, endereço IP, Accept-Language do servidor ou outros dados pessoais.

/** Primeira língua preferida do navegador, ou `null`. */
export function getPrimaryBrowserLanguage(navigatorLike = globalThis.navigator) {
  if (!navigatorLike) return null;
  try {
    const list = navigatorLike.languages;
    if (Array.isArray(list) || (list && typeof list.length === 'number')) {
      const first = Array.from(list).find((tag) => typeof tag === 'string' && tag.trim() !== '');
      if (first) return first.trim();
    }
    const single = navigatorLike.language;
    return typeof single === 'string' && single.trim() !== '' ? single.trim() : null;
  } catch {
    return null;
  }
}

/** `pt`, `pt-PT`, `pt-BR`, `pt-AO`, `PT_br`… → true; `en-US`, `ptx`, `es` → false. */
export function isPortugueseLanguageTag(tag) {
  return typeof tag === 'string' && /^pt(?:[-_]|$)/i.test(tag.trim());
}
