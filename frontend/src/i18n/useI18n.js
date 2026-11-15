import { useContext } from 'react';
import { LanguageContext } from './languageContext.js';

/**
 * @returns {{
 *   language: 'en' | 'pt',
 *   t: (key: string, vars?: Record<string, unknown>) => string,
 *   setLanguage: (language: 'en' | 'pt') => void,
 *   suggestion: { visible: boolean, accept: () => void, dismiss: () => void },
 * }}
 */
export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useI18n tem de ser usado dentro de <LanguageProvider>.');
  return value;
}
