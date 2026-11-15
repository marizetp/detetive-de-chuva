// Nomes do catálogo noutros idiomas, indexados pelo `id` estável da API (/crops).
// Em Português usa-se sempre o `nome` devolvido pelo serviço. Províncias e municípios são nomes
// próprios e não se traduzem. O valor enviado à API continua a ser o `nome` original.
// Revisão humana: os nomes ingleses das culturas estão listados em CROP_NAMES_REVIEW_REQUIRED
// (reviewRequired.js); um teste garante que todas as traduções aqui definidas estão nessa lista.

import { BACKEND_CONTENT_LANGUAGE } from './config.js';

const CROP_NAMES = Object.freeze({
  // `mandioca` e `arroz`: culturas acrescentadas na API v1.1 (docs/docs2.md §2). «Cassava» é o termo
  // que o próprio /advisory usa em inglês (observado em 2026-11-15).
  en: Object.freeze({
    milho: 'Maize',
    feijao: 'Beans',
    soja: 'Soybean',
    mandioca: 'Cassava',
    arroz: 'Rice',
  }),
});

/**
 * Nome de uma cultura para a interface.
 * @param {{ id: string, label: string }} option opção do catálogo (label = `nome` da API)
 * @returns {{ text: string, lang: string | undefined }} `lang` só quando o texto fica no original
 */
export function localizeCropName(option, language) {
  if (language === BACKEND_CONTENT_LANGUAGE) return { text: option.label, lang: undefined };
  const translated = CROP_NAMES[language]?.[option.id];
  return translated ? { text: translated, lang: undefined } : { text: option.label, lang: BACKEND_CONTENT_LANGUAGE };
}

/** Nome traduzido a partir do `nome` enviado (valor do formulário), usando o catálogo carregado. */
export function localizeCropValue(value, cropOptions, language) {
  const option = cropOptions?.find((item) => item.value === value);
  return option ? localizeCropName(option, language).text : value;
}

export const CROP_TRANSLATIONS = CROP_NAMES;
