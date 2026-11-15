// render() com LanguageProvider. Por omissão os testes de componentes usam Português (o texto
// verificado pelos testes existentes); passar { language: 'en' } para testar a versão inglesa.
// O idioma é fixado: sem localStorage nem detecção do navegador (testadas à parte).
import { render as rtlRender } from '@testing-library/react';
import LanguageProvider from '../i18n/LanguageProvider.jsx';

// Ficheiro só de testes: reexporta a Testing Library (não é um módulo de componentes com HMR).
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

export function render(ui, { language = 'pt', ...options } = {}) {
  const Wrapper = ({ children }) => (
    <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}
