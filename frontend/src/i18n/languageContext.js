import { createContext } from 'react';

/** Valor fornecido pelo LanguageProvider. `null` fora do provider (useI18n lança um erro claro). */
export const LanguageContext = createContext(null);
