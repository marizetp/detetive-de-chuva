import { describe, expect, it } from 'vitest';
import en from './messages/en.js';
import pt from './messages/pt.js';
import { SCIENTIFIC_REVIEW_KEYS } from './reviewRequired.js';
import { createTranslator, flattenKeys, hasMessage } from './translate.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const valueAt = (messages, key) => key.split('.').reduce((node, part) => node?.[part], messages);

describe('dicionários pt.js / en.js', () => {
  const enKeys = flattenKeys(en).sort();
  const ptKeys = flattenKeys(pt).sort();

  it('têm exactamente as mesmas chaves (paridade)', () => {
    expect(ptKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !ptKeys.includes(key))).toEqual([]);
    expect(enKeys.length).toBeGreaterThan(100);
  });

  it('todos os valores são texto não vazio', () => {
    for (const [name, messages] of [['en', en], ['pt', pt]]) {
      for (const key of flattenKeys(messages)) {
        const value = valueAt(messages, key);
        expect(typeof value, `${name}:${key}`).toBe('string');
        expect(value.trim(), `${name}:${key}`).not.toBe('');
      }
    }
  });

  it('as variáveis de interpolação coincidem nos dois idiomas', () => {
    for (const key of enKeys) {
      expect(placeholders(valueAt(en, key)), key).toEqual(placeholders(valueAt(pt, key)));
    }
  });

  it('as traduções para revisão científica existem nos dois dicionários', () => {
    for (const key of SCIENTIFIC_REVIEW_KEYS) {
      expect(hasMessage('en', key), `en:${key}`).toBe(true);
      expect(hasMessage('pt', key), `pt:${key}`).toBe(true);
    }
  });

  it('os números e unidades dos textos científicos são os mesmos nos dois idiomas', () => {
    // Uma tradução não pode alterar valores (ex.: «7 dias» → «7 days», «5 cm» → «5 cm»).
    const numbers = (text) => (text.match(/\d+(?:[.,]\d+)?/g) ?? []).sort();
    for (const key of SCIENTIFIC_REVIEW_KEYS) {
      expect(numbers(valueAt(en, key)), key).toEqual(numbers(valueAt(pt, key)));
    }
  });
});

describe('createTranslator', () => {
  it('interpola variáveis e mantém as desconhecidas', () => {
    const t = createTranslator('en');
    expect(t('home.howItWorks.stepPrefix', { number: 2 })).toBe('Step 2: ');
    expect(t('home.howItWorks.stepPrefix')).toBe('Step {number}: ');
  });

  it('chave em falta → devolve a chave (nunca texto de outro idioma)', () => {
    expect(createTranslator('pt')('nao.existe')).toBe('nao.existe');
  });

  it('idioma não suportado → idioma predefinido (English)', () => {
    expect(createTranslator('fr')('nav.home')).toBe('Home');
    expect(createTranslator('fr').language).toBe('en');
  });
});
