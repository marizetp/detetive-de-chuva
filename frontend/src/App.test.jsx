import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  // Pedidos que nunca terminam: estes testes verificam a estrutura e a navegação, não a API
  // (o comportamento da consulta é testado em pages/ConsultationPage.test.jsx).
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

const requestedUrls = () => fetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);

afterEach(() => vi.unstubAllGlobals());

describe('estrutura global', () => {
  it('tem as regiões semânticas principais', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  });

  it('a ligação "Saltar para o conteúdo" move o foco para o conteúdo principal', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Saltar para o conteúdo' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('o rodapé indica que o projecto não é um serviço oficial da NASA', () => {
    render(<App />);
    expect(within(screen.getByRole('contentinfo')).getByText(/não é um serviço oficial da NASA/)).toBeInTheDocument();
  });
});

describe('página inicial', () => {
  it('apresenta o nome, o slogan e a chamada à acção', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Detetive da Chuva' })).toBeInTheDocument();
    expect(screen.getByText('O calendário agrícola de sempre ainda é fiável?')).toBeInTheDocument();

    const ctas = screen.getAllByRole('link', { name: /Iniciar consulta agrícola/ });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((link) => expect(link).toHaveAttribute('href', '/consulta'));
  });

  it('tem as secções de apresentação, funcionamento e fontes', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /Informação agroclimática/ })).toHaveAttribute('id', 'apresentacao');
    expect(screen.getByRole('region', { name: /Três passos/ })).toHaveAttribute('id', 'como-funciona');
    expect(screen.getByRole('region', { name: /De onde vêm os dados/ })).toHaveAttribute('id', 'fontes');
  });

  it('apresenta os três passos, por ordem', () => {
    render(<App />);
    const steps = within(screen.getByRole('region', { name: /Três passos/ }))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(steps).toEqual([
      'Passo 1: Seleccionar a província e a cultura',
      'Passo 2: Analisar as condições agroclimáticas',
      'Passo 3: Consultar a recomendação',
    ]);
  });

  it('não afirma que o sistema usa previsão meteorológica', () => {
    render(<App />);
    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent(/previsão para os próximos dias/i);
    expect(main).not.toHaveTextContent(/chuva prevista para os próximos/i);
    expect(
      screen.getByText(/apresenta os indicadores agroclimáticos\s+disponibilizados pelo sistema/),
    ).toBeInTheDocument();
    expect(screen.getByText(/O serviço analisa indicadores agroclimáticos/)).toBeInTheDocument();
  });

  it('lista as três classificações documentadas com texto, não só ícones', () => {
    render(<App />);
    const list = screen.getByRole('list', { name: 'Classificações possíveis' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Favorável',
      'Aguardar',
      'Desfavorável',
    ]);
  });

  it('identifica as tendências NASA POWER como ainda não disponíveis', () => {
    render(<App />);
    const sources = screen.getByRole('region', { name: /De onde vêm os dados/ });
    expect(within(sources).getByText('Em preparação')).toBeInTheDocument();
    expect(within(sources).getByText(/Ainda não está disponível na plataforma/)).toBeInTheDocument();
  });

  it('não faz pedidos à API', () => {
    render(<App />);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('navegação', () => {
  it('a chamada à acção abre a página de consulta temporária, sem simular uma consulta', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('link', { name: /Iniciar consulta agrícola/ })[0]);

    expect(window.location.pathname).toBe('/consulta');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Avaliar as condições para semear' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Consulta agrícola · Detetive da Chuva');
    expect(document.activeElement).toBe(screen.getByRole('main'));

    // Abrir a página só carrega os catálogos; nenhuma consulta é enviada sem o utilizador pedir.
    expect(requestedUrls()).toEqual([
      expect.stringMatching(/^GET .*\/api\/v1\/provinces$/),
      expect.stringMatching(/^GET .*\/api\/v1\/crops$/),
    ]);
  });

  it('marca a página actual na navegação', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Como funciona' })).not.toHaveAttribute('aria-current');
  });

  it('os botões recuar/avançar do navegador actualizam a página', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('link', { name: /Iniciar consulta agrícola/ })[0]);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Avaliar as condições para semear' }),
    ).toBeInTheDocument();

    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Detetive da Chuva' })).toBeInTheDocument();
  });

  it('as ligações de secção levam à âncora correspondente', () => {
    window.history.replaceState(null, '', '/consulta');
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', {
        name: 'Fontes de dados',
      }),
    );
    expect(`${window.location.pathname}${window.location.hash}`).toBe('/#fontes');
    expect(document.activeElement).toHaveAttribute('id', 'fontes');
  });

  it('caminhos desconhecidos mostram a página "não encontrada"', () => {
    window.history.replaceState(null, '', '/nao-existe');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
