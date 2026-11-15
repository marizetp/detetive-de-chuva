import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen, within } from '../test/render.jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import ConsultationPage from '../pages/ConsultationPage.jsx';
import { isDemoMode } from '../config/env.js';
import { resetTransport } from '../services/api.js';
import { activateDemoMode } from './index.js';

// Isolamento entre produção e demonstração:
// - estático: nenhum módulo de produção importa o código de demonstração (só main.jsx, por
//   import dinâmico condicionado a VITE_DEMO_MODE === 'true');
// - em execução: sem o modo activo não há faixa nem reprodução; com o modo activo, a consulta
//   completa usa só gravações e nunca a rede.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !/\.test\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

afterEach(() => {
  resetTransport();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('isolamento estático', () => {
  it('nenhum módulo fora de demo/ importa demo/, excepto main.jsx por import dinâmico condicionado', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !relative(SRC, file).startsWith('demo'))
      .filter((file) => /['"]\.{1,2}\/(?:[\w./]*\/)?demo\//.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).replaceAll('\\', '/'));
    expect(offenders).toEqual(['main.jsx']);

    const main = readFileSync(join(SRC, 'main.jsx'), 'utf8');
    expect(main).not.toMatch(/^import .*demo\//m);
    expect(main).toMatch(/if \(import\.meta\.env\.VITE_DEMO_MODE === 'true'\) \{\s*const \{ activateDemoMode \} = await import\('\.\/demo\/index\.js'\);/);
  });

  it('isDemoMode só é verdadeiro com VITE_DEMO_MODE exactamente "true"', () => {
    expect(isDemoMode({})).toBe(false);
    for (const value of ['false', '1', 'TRUE', 'yes', '', ' true']) {
      expect(isDemoMode({ VITE_DEMO_MODE: value }), value).toBe(false);
    }
    expect(isDemoMode({ VITE_DEMO_MODE: 'true' })).toBe(true);
    // Ambiente de testes: desactivado por omissão.
    expect(isDemoMode()).toBe(false);
  });
});

describe('faixa do modo de demonstração', () => {
  it('sem o modo activo, não há faixa', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'Modo de demonstração' })).not.toBeInTheDocument();
  });

  it.each([
    ['pt', 'Modo de demonstração', /gravadas em 15 de novembro de 2026\. Não representam condições actuais/, 'Huambo (Caála) · Milho · 15 de novembro de 2026', /só avaliação técnica/],
    ['en', 'Demonstration mode', /recorded on 15 November 2026\. They do not represent current conditions/, 'Huambo (Caála) · Maize · 15 November 2026', /technical assessment only/],
  ])('%s: permanente, com a data da captura e as consultas do manifesto', (language, label, body, complete, assessmentOnly) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App demo={activateDemoMode()} />, { language });
    const banner = screen.getByRole('complementary', { name: label });
    expect(within(banner).getByText(body)).toBeInTheDocument();
    expect(within(banner).getByText(complete)).toBeInTheDocument();
    expect(within(banner).getAllByText(assessmentOnly)).toHaveLength(2);
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument(); // não pode ser fechada
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('consulta em modo de demonstração', () => {
  async function submit({ provincia, municipio, cultura, data }) {
    await screen.findByRole('option', { name: provincia });
    await screen.findByRole('option', { name: cultura });
    fireEvent.change(screen.getByLabelText('Província'), { target: { value: provincia } });
    if (municipio) fireEvent.change(screen.getByLabelText('Município'), { target: { value: municipio } });
    fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: cultura } });
    fireEvent.change(screen.getByLabelText(/Data da consulta/), { target: { value: data } });
    fireEvent.click(screen.getByRole('button', { name: /Consultar/ }));
  }

  it('consulta gravada completa: relatório com as respostas gravadas e nenhum pedido à rede', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    activateDemoMode();
    render(<ConsultationPage />);
    expect(await screen.findByRole('option', { name: 'Mandioca' })).toBeInTheDocument();
    await submit({ provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data: '2026-11-15' });
    expect(await screen.findByText('Favorável para semeadura')).toBeInTheDocument();
    expect(screen.getByText('Recomendação do serviço de avaliação')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('consulta gravada em inglês: recomendação real em inglês (lang=en), sem pedidos à rede', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    activateDemoMode();
    render(<ConsultationPage />, { language: 'en' });
    await screen.findByRole('option', { name: 'Huambo' });
    await screen.findByRole('option', { name: 'Maize' });
    fireEvent.change(screen.getByLabelText('Province'), { target: { value: 'Huambo' } });
    fireEvent.change(screen.getByLabelText('Municipality'), { target: { value: 'Caála' } });
    fireEvent.change(screen.getByLabelText('Crop'), { target: { value: 'Milho' } });
    fireEvent.change(screen.getByLabelText(/Intended sowing date/), { target: { value: '2026-11-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Check suitability/ }));
    expect(await screen.findByText('Favourable for sowing')).toBeInTheDocument();
    expect(screen.getByText(/FAVORABLE: November 2026 presents favorable conditions/)).toBeInTheDocument();
    expect(screen.queryByText(/not yet available in English/)).toBeInTheDocument(); // só as justificações do /evaluate (pt)
    expect(screen.queryByText('The detailed recommendation is not yet available in English.')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('consulta só com avaliação técnica gravada: recomendação «não disponível no modo de demonstração»', async () => {
    vi.stubGlobal('fetch', vi.fn());
    activateDemoMode();
    render(<ConsultationPage />);
    await submit({ provincia: 'Bié', cultura: 'Arroz', data: '2026-06-15' });
    expect(await screen.findByText('Recomendação indisponível')).toBeInTheDocument();
    expect(screen.getByText(/Esta consulta não está disponível no modo de demonstração/)).toBeInTheDocument();
    expect(screen.getByText('Estado segundo a avaliação técnica')).toBeInTheDocument();
    expect(screen.getByText('Desfavorável')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('consulta não gravada: as duas fontes recusadas, sem resultado inventado', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    activateDemoMode();
    render(<ConsultationPage />);
    await submit({ provincia: 'Huíla', cultura: 'Soja', data: '2026-11-15' });
    expect(await screen.findByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    expect(screen.getByText('Avaliação técnica indisponível')).toBeInTheDocument();
    expect(screen.queryByText(/Favorável|Desfavorável|Aguardar antes/)).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
