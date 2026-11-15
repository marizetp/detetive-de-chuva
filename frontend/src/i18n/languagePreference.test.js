import { describe, expect, it } from 'vitest';
import { getPrimaryBrowserLanguage, isPortugueseLanguageTag } from './browserLanguage.js';
import {
  LANGUAGE_STORAGE_KEY,
  SUGGESTION_STORAGE_KEY,
  isSuggestionDismissed,
  readLanguageChoice,
  resolveInitialLanguageState,
  saveLanguageChoice,
  saveSuggestionDismissed,
} from './languagePreference.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

const throwingStorage = {
  getItem() {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem() {
    throw new DOMException('quota', 'QuotaExceededError');
  },
};

const nav = (languages, language = languages?.[0]) => ({ languages, language });

describe('detecção da preferência do navegador', () => {
  it.each(['pt', 'pt-PT', 'pt-BR', 'pt-AO', 'PT-ao', 'pt_BR', ' pt-MZ '])('%s é português', (tag) => {
    expect(isPortugueseLanguageTag(tag)).toBe(true);
  });

  it.each(['en', 'en-US', 'es-ES', 'ptx', 'p', '', null, undefined])('%s não é português', (tag) => {
    expect(isPortugueseLanguageTag(tag)).toBe(false);
  });

  it('usa a primeira de navigator.languages e só depois navigator.language', () => {
    expect(getPrimaryBrowserLanguage(nav(['pt-AO', 'en']))).toBe('pt-AO');
    expect(getPrimaryBrowserLanguage(nav(['en-US', 'pt-PT']))).toBe('en-US');
    expect(getPrimaryBrowserLanguage({ languages: [], language: 'pt-BR' })).toBe('pt-BR');
    expect(getPrimaryBrowserLanguage({ language: 'pt' })).toBe('pt');
    expect(getPrimaryBrowserLanguage({})).toBeNull();
    expect(getPrimaryBrowserLanguage(null)).toBeNull();
  });
});

describe('resolveInitialLanguageState — prioridade', () => {
  it('sem escolha: English, e sugestão só se a preferência principal for pt-*', () => {
    expect(resolveInitialLanguageState({ storage: memoryStorage(), navigatorLike: nav(['pt-BR']) })).toEqual({
      language: 'en',
      suggestionVisible: true,
    });
    expect(
      resolveInitialLanguageState({ storage: memoryStorage(), navigatorLike: nav(['en-US', 'pt-PT']) }),
    ).toEqual({ language: 'en', suggestionVisible: false });
  });

  it('a detecção nunca muda o idioma sozinha', () => {
    const state = resolveInitialLanguageState({ storage: memoryStorage(), navigatorLike: nav(['pt-AO']) });
    expect(state.language).toBe('en');
  });

  it('escolha manual guardada tem prioridade absoluta sobre o navegador', () => {
    const storage = memoryStorage();
    saveLanguageChoice(storage, 'en', 'manual');
    expect(resolveInitialLanguageState({ storage, navigatorLike: nav(['pt-AO']) })).toEqual({
      language: 'en',
      suggestionVisible: false,
    });
    saveLanguageChoice(storage, 'pt', 'manual');
    expect(resolveInitialLanguageState({ storage, navigatorLike: nav(['en-GB']) }).language).toBe('pt');
  });

  it('sugestão aceite fica guardada como escolha (source: suggestion)', () => {
    const storage = memoryStorage();
    saveLanguageChoice(storage, 'pt', 'suggestion');
    expect(readLanguageChoice(storage)).toEqual({ language: 'pt', source: 'suggestion' });
    expect(resolveInitialLanguageState({ storage, navigatorLike: nav(['pt-PT']) })).toEqual({
      language: 'pt',
      suggestionVisible: false,
    });
  });

  it('sugestão recusada: não volta a aparecer e não fixa idioma', () => {
    const storage = memoryStorage();
    saveSuggestionDismissed(storage);
    expect(isSuggestionDismissed(storage)).toBe(true);
    expect(readLanguageChoice(storage)).toBeNull();
    expect(resolveInitialLanguageState({ storage, navigatorLike: nav(['pt-AO']) })).toEqual({
      language: 'en',
      suggestionVisible: false,
    });
  });

  it('distingue a escolha (ddc.language) da recusa (ddc.languageSuggestion)', () => {
    const storage = memoryStorage();
    saveSuggestionDismissed(storage);
    saveLanguageChoice(storage, 'en', 'manual');
    expect(JSON.parse(storage.data[LANGUAGE_STORAGE_KEY])).toMatchObject({ language: 'en', source: 'manual' });
    expect(JSON.parse(storage.data[SUGGESTION_STORAGE_KEY])).toMatchObject({ status: 'dismissed' });
  });

  it('registos inválidos ou corrompidos são ignorados', () => {
    for (const raw of ['{not json', '{"language":"fr"}', '"pt"', 'null']) {
      const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: raw });
      expect(readLanguageChoice(storage)).toBeNull();
      expect(resolveInitialLanguageState({ storage, navigatorLike: nav(['pt']) }).language).toBe('en');
    }
  });
});

describe('falhas do localStorage', () => {
  it('leitura e escrita a lançar excepções não partem nada', () => {
    expect(readLanguageChoice(throwingStorage)).toBeNull();
    expect(isSuggestionDismissed(throwingStorage)).toBe(false);
    expect(saveLanguageChoice(throwingStorage, 'pt', 'manual')).toBe(false);
    expect(saveSuggestionDismissed(throwingStorage)).toBe(false);
    expect(resolveInitialLanguageState({ storage: throwingStorage, navigatorLike: nav(['pt-AO']) })).toEqual({
      language: 'en',
      suggestionVisible: true,
    });
  });

  it('sem armazenamento (null): idioma predefinido e sugestão por detecção', () => {
    expect(resolveInitialLanguageState({ storage: null, navigatorLike: nav(['pt']) })).toEqual({
      language: 'en',
      suggestionVisible: true,
    });
    expect(saveLanguageChoice(null, 'pt', 'manual')).toBe(false);
  });
});
