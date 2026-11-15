import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, LANGUAGE_TAGS, isSupportedLanguage } from './config.js';
import { LanguageContext } from './languageContext.js';
import {
  CHOICE_SOURCES,
  getBrowserStorage,
  resolveInitialLanguageState,
  saveLanguageChoice,
  saveSuggestionDismissed,
} from './languagePreference.js';
import { createTranslator } from './translate.js';

/**
 * Idioma da aplicação. O estado inicial é resolvido de forma síncrona (antes do primeiro render),
 * por isso a sugestão de idioma já faz parte do layout inicial e não provoca saltos.
 *
 * - `initialLanguage` (testes): fixa o idioma e ignora a persistência e a detecção.
 * - `storage` / `navigatorLike`: injectáveis para testes; por omissão, localStorage e navigator.
 * Se o armazenamento falhar, as escolhas valem em memória durante a sessão da página.
 */
export default function LanguageProvider({
  children,
  initialLanguage,
  storage: storageProp,
  navigatorLike = globalThis.navigator,
}) {
  const [storage] = useState(() =>
    initialLanguage ? null : storageProp === undefined ? getBrowserStorage() : storageProp,
  );
  const [state, setState] = useState(() =>
    isSupportedLanguage(initialLanguage)
      ? { language: initialLanguage, suggestionVisible: false }
      : resolveInitialLanguageState({ storage, navigatorLike }),
  );
  // Anúncio para leitores de ecrã, só depois de uma mudança pedida pelo utilizador.
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    document.documentElement.lang = LANGUAGE_TAGS[state.language];
  }, [state.language]);

  const chooseLanguage = useCallback(
    (language, source) => {
      if (!isSupportedLanguage(language)) return;
      saveLanguageChoice(storage, language, source);
      setState({ language, suggestionVisible: false });
      setAnnouncement(createTranslator(language)('language.changed'));
    },
    [storage],
  );

  const setLanguage = useCallback(
    (language) => chooseLanguage(language, CHOICE_SOURCES.manual),
    [chooseLanguage],
  );

  const acceptSuggestion = useCallback(
    () => chooseLanguage(LANGUAGES.pt, CHOICE_SOURCES.suggestion),
    [chooseLanguage],
  );

  const dismissSuggestion = useCallback(() => {
    saveSuggestionDismissed(storage);
    setState((current) => ({ ...current, suggestionVisible: false }));
  }, [storage]);

  const value = useMemo(
    () => ({
      language: state.language,
      t: createTranslator(state.language),
      setLanguage,
      suggestion: {
        visible: state.suggestionVisible,
        accept: acceptSuggestion,
        dismiss: dismissSuggestion,
      },
    }),
    [state, setLanguage, acceptSuggestion, dismissSuggestion],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </LanguageContext.Provider>
  );
}
