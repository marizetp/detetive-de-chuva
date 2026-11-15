import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LanguageSuggestion from '../components/layout/LanguageSuggestion.jsx';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import LanguageProvider from './LanguageProvider.jsx';
import { LANGUAGE_STORAGE_KEY, SUGGESTION_STORAGE_KEY } from './languagePreference.js';

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
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

function renderApp({ storage = memoryStorage(), languages = ['en-US'] } = {}) {
  const view = render(
    <LanguageProvider storage={storage} navigatorLike={{ languages, language: languages[0] }}>
      <SiteHeader currentPath="/" />
      <LanguageSuggestion />
      <main>conteúdo</main>
    </LanguageProvider>,
  );
  return { ...view, storage };
}

const suggestionRegion = () => screen.queryByRole('region', { name: 'Would you prefer Portuguese?' });
const flushFrames = () => act(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));

afterEach(() => {
  document.documentElement.lang = 'en';
  vi.restoreAllMocks();
});

describe('LanguageProvider + selector de idioma', () => {
  it('idioma predefinido English, <html lang="en"> e selector visível com estado', () => {
    renderApp();
    expect(document.documentElement.lang).toBe('en');
    const group = screen.getByRole('group', { name: 'Language' });
    const en = within(group).getByRole('button', { name: 'EN English' });
    const pt = within(group).getByRole('button', { name: 'PT Português' });
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(pt).toHaveAttribute('aria-pressed', 'false');
    expect(en).toHaveAttribute('lang', 'en');
    expect(pt).toHaveAttribute('lang', 'pt');
    expect(screen.getByRole('link', { name: 'Start consultation' })).toBeInTheDocument();
  });

  it('mudança manual: toda a interface muda, <html lang="pt-AO">, guardada como manual', () => {
    const { storage } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'PT Português' }));
    expect(document.documentElement.lang).toBe('pt-AO');
    expect(screen.getByRole('link', { name: 'Iniciar consulta' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument();
    expect(JSON.parse(storage.data[LANGUAGE_STORAGE_KEY])).toMatchObject({ language: 'pt', source: 'manual' });
    expect(screen.getByText('Idioma alterado para Português.')).toBeInTheDocument();
  });

  it('uma escolha guardada é aplicada ao abrir', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: JSON.stringify({ language: 'pt', source: 'manual' }) });
    renderApp({ storage, languages: ['en-GB'] });
    expect(document.documentElement.lang).toBe('pt-AO');
    expect(screen.getByRole('button', { name: 'PT Português' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Sugestão de idioma', () => {
  it.each([['pt'], ['pt-PT'], ['pt-BR'], ['pt-AO']])('navegador %s: sugere, sem mudar o idioma', (tag) => {
    renderApp({ languages: [tag, 'en'] });
    const region = suggestionRegion();
    expect(region).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(within(region).getByText('Prefere ver o site em português?')).toHaveAttribute('lang', 'pt');
    expect(within(region).getByRole('button', { name: 'Switch to Portuguese' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Keep English' })).toBeInTheDocument();
  });

  it('navegador com inglês como preferência principal: não sugere', () => {
    renderApp({ languages: ['en-US', 'pt-PT'] });
    expect(suggestionRegion()).not.toBeInTheDocument();
  });

  it('aceitar: muda já para Português, guarda (source: suggestion) e devolve o foco ao selector', async () => {
    const { storage } = renderApp({ languages: ['pt-AO'] });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Portuguese' }));
    expect(document.documentElement.lang).toBe('pt-AO');
    expect(screen.queryByRole('region', { name: /Prefere ver o site/ })).not.toBeInTheDocument();
    expect(JSON.parse(storage.data[LANGUAGE_STORAGE_KEY])).toMatchObject({ language: 'pt', source: 'suggestion' });
    await flushFrames();
    expect(screen.getByRole('button', { name: 'PT Português' })).toHaveFocus();
  });

  it('manter inglês: fecha, regista a recusa (sem fixar idioma) e não volta a aparecer', async () => {
    const { storage, unmount } = renderApp({ languages: ['pt-BR'] });
    fireEvent.click(screen.getByRole('button', { name: 'Keep English' }));
    expect(suggestionRegion()).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(JSON.parse(storage.data[SUGGESTION_STORAGE_KEY])).toMatchObject({ status: 'dismissed' });
    expect(storage.data[LANGUAGE_STORAGE_KEY]).toBeUndefined();
    await flushFrames();
    expect(screen.getByRole('button', { name: 'EN English' })).toHaveFocus();

    unmount();
    renderApp({ storage, languages: ['pt-BR'] }); // recarregamento
    expect(suggestionRegion()).not.toBeInTheDocument();
  });

  it('uma escolha manual anterior tem prioridade: a sugestão nunca aparece', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: JSON.stringify({ language: 'en', source: 'manual' }) });
    renderApp({ storage, languages: ['pt-AO'] });
    expect(suggestionRegion()).not.toBeInTheDocument();
  });

  it('usar o selector esconde a sugestão e conta como escolha manual', () => {
    const { storage } = renderApp({ languages: ['pt-PT'] });
    fireEvent.click(screen.getByRole('button', { name: 'EN English' }));
    // Já activo: não muda nada, a sugestão continua (a pessoa ainda não respondeu).
    expect(suggestionRegion()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PT Português' }));
    expect(screen.queryByRole('region', { name: /Prefere/ })).not.toBeInTheDocument();
    expect(JSON.parse(storage.data[LANGUAGE_STORAGE_KEY]).source).toBe('manual');
  });

  it('localStorage bloqueado: a sugestão e as escolhas funcionam em memória', () => {
    renderApp({ storage: throwingStorage, languages: ['pt-AO'] });
    expect(suggestionRegion()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Portuguese' }));
    expect(document.documentElement.lang).toBe('pt-AO');
    expect(screen.getByRole('button', { name: 'PT Português' })).toHaveAttribute('aria-pressed', 'true');
  });
});
