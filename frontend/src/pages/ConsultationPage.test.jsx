import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubFetch } from '../test/fetchMock.js';
import {
  advisoryHuamboMilho,
  cropsResponse,
  evaluateHuamboMilho,
  provincesResponse,
} from '../test/fixtures/liveResponses.js';
import { getLocalIsoDate } from '../utils/dates.js';
import ConsultationPage from './ConsultationPage.jsx';

afterEach(() => vi.unstubAllGlobals());

const PROVINCES = 'GET /api/v1/provinces';
const CROPS = 'GET /api/v1/crops';
const ADVISORY = 'POST /api/v1/advisory';
const EVALUATE = 'POST /api/v1/evaluate';

const routeKey = (url, init) => `${init?.method ?? 'GET'} ${new URL(url).pathname}`;

/** API simulada por rota. Cada handler pode devolver uma resposta ou uma promessa adiada. */
function setupApi(overrides = {}) {
  const handlers = {
    [PROVINCES]: () => jsonResponse(provincesResponse),
    [CROPS]: () => jsonResponse(cropsResponse),
    [ADVISORY]: () => jsonResponse(advisoryHuamboMilho),
    [EVALUATE]: () => jsonResponse(evaluateHuamboMilho),
    ...overrides,
  };
  const fetchMock = stubFetch(async (url, init) => {
    const handler = handlers[routeKey(url, init)];
    if (!handler) throw new Error(`Rota não prevista: ${routeKey(url, init)}`);
    return handler(init);
  });
  return {
    fetchMock,
    callsTo: (key) => fetchMock.mock.calls.filter(([url, init]) => routeKey(url, init) === key),
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function renderReady() {
  render(<ConsultationPage />);
  await screen.findByRole('option', { name: 'Huambo' });
  await screen.findByRole('option', { name: 'Milho' });
}

function fillForm({ provincia = 'Huambo', cultura = 'Milho', data } = {}) {
  fireEvent.change(screen.getByLabelText('Província'), { target: { value: provincia } });
  fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: cultura } });
  if (data !== undefined) {
    fireEvent.change(screen.getByLabelText(/Data da consulta/), { target: { value: data } });
  }
}

const submitButton = () => screen.getByRole('button', { name: /Consultar|A consultar/ });

describe('ConsultationPage — catálogos', () => {
  it('carrega províncias e culturas da API', async () => {
    setupApi();
    render(<ConsultationPage />);

    expect(screen.getByText('A carregar as províncias…')).toBeInTheDocument();
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

    await screen.findByRole('option', { name: 'Huíla' });
    const provinceOptions = within(screen.getByLabelText('Província'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(provinceOptions).toEqual(['Seleccione a província', 'Huambo', 'Bié', 'Huíla']);
    await screen.findByRole('option', { name: 'Feijão' });
    expect(submitButton()).not.toHaveAttribute('aria-disabled');
  });

  it('erro ao carregar um catálogo: mensagem e nova tentativa, sem afectar o outro', async () => {
    let attempts = 0;
    const api = setupApi({
      [PROVINCES]: () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse({ detail: 'erro' }, { status: 503 })
          : jsonResponse(provincesResponse);
      },
    });
    render(<ConsultationPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as províncias.');
    await screen.findByRole('option', { name: 'Soja' }); // culturas carregadas na mesma
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('option', { name: 'Huambo' });
    expect(api.callsTo(PROVINCES)).toHaveLength(2);
    expect(api.callsTo(CROPS)).toHaveLength(1);
  });

  it('lista vazia: avisa e permite verificar novamente', async () => {
    setupApi({ [CROPS]: () => jsonResponse([]) });
    render(<ConsultationPage />);
    expect(await screen.findByText('Não há culturas disponíveis de momento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar novamente' })).toBeInTheDocument();
  });
});

describe('ConsultationPage — data e validação', () => {
  it('a data começa em hoje e as datas futuras estão desactivadas no selector', async () => {
    setupApi();
    await renderReady();
    const dateInput = screen.getByLabelText(/Data da consulta/);
    const today = getLocalIsoDate();
    expect(dateInput).toHaveValue(today);
    expect(dateInput).toHaveAttribute('max', today);
  });

  it('campos em falta: mostra erros, foca o primeiro e não envia pedidos', async () => {
    const api = setupApi();
    await renderReady();
    fireEvent.change(screen.getByLabelText(/Data da consulta/), { target: { value: '' } });
    fireEvent.click(submitButton());

    expect(screen.getByText('Seleccione uma província.')).toBeInTheDocument();
    expect(screen.getByText('Seleccione uma cultura.')).toBeInTheDocument();
    expect(screen.getByText('Indique a data da consulta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Província')).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(screen.getByLabelText('Província'));
    expect(api.callsTo(ADVISORY)).toHaveLength(0);
    expect(api.callsTo(EVALUATE)).toHaveLength(0);
  });

  it('data futura escrita à mão é recusada', async () => {
    const api = setupApi();
    await renderReady();
    const tomorrow = getLocalIsoDate(new Date(Date.now() + 36 * 60 * 60 * 1000));
    fillForm({ data: tomorrow });
    fireEvent.click(submitButton());

    expect(screen.getByText('Escolha a data de hoje ou uma data anterior.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/Data da consulta/));
    expect(api.callsTo(ADVISORY)).toHaveLength(0);
  });

  it('os erros desaparecem à medida que os campos são corrigidos', async () => {
    setupApi();
    await renderReady();
    fireEvent.click(submitButton());
    expect(screen.getByText('Seleccione uma província.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Província'), { target: { value: 'Bié' } });
    expect(screen.queryByText('Seleccione uma província.')).not.toBeInTheDocument();
  });
});


const section = (name) => screen.getByRole('region', { name });

async function submitAndWaitForBoth() {
  fireEvent.click(submitButton());
  await waitFor(() => expect(submitButton()).toHaveTextContent('Consultar'));
}

describe('ConsultationPage — submissão e relatório', () => {
  it('envia os mesmos parâmetros aos dois endpoints e apresenta as cinco secções', async () => {
    const api = setupApi();
    await renderReady();
    fillForm({ data: '2026-11-10' });
    await submitAndWaitForBoth();

    const [advisoryCall] = api.callsTo(ADVISORY);
    const [evaluateCall] = api.callsTo(EVALUATE);
    expect(advisoryCall[1].body).toBe(evaluateCall[1].body);
    expect(JSON.parse(advisoryCall[1].body)).toEqual({
      provincia: 'Huambo',
      cultura: 'Milho',
      data_consulta: '2026-11-10',
    });

    for (const name of [
      'Resumo da avaliação',
      'Indicadores agroclimáticos',
      'Recomendação de extensão',
      'Fundamentação técnica',
      'Transparência e limitações',
    ]) {
      expect(section(name)).toBeInTheDocument();
    }
    const summary = section('Resumo da avaliação');
    expect(within(summary).getByText('Estado da recomendação')).toBeInTheDocument();
    expect(within(summary).getByText('10 de novembro de 2026')).toBeInTheDocument();
    expect(
      await within(section('Recomendação de extensão')).findByRole('heading', {
        level: 4,
        name: 'Justificações Técnicas:',
      }),
    ).toBeInTheDocument();
  });

  it('o relatório não faz pedidos adicionais à API', async () => {
    const api = setupApi();
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();
    await within(section('Recomendação de extensão')).findByRole('heading', { level: 4 });

    expect(api.fetchMock).toHaveBeenCalledTimes(4); // 2 catálogos + 2 consultas
  });

  it('cada fonte aparece assim que chega, com carregamentos independentes', async () => {
    const slowAdvisory = deferred();
    setupApi({ [ADVISORY]: () => slowAdvisory.promise });
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    expect(
      await within(section('Fundamentação técnica')).findByText('RECENT_RAIN_TRIGGER_SATISFIED'),
    ).toBeInTheDocument();
    expect(
      within(section('Recomendação de extensão')).getByText('A obter a recomendação…'),
    ).toBeInTheDocument();
    // Enquanto a recomendação carrega, o resumo espera por ela em vez de mudar de fonte.
    expect(
      within(section('Resumo da avaliação')).getByText('A obter o resultado da avaliação…'),
    ).toBeInTheDocument();

    await act(async () => slowAdvisory.resolve(jsonResponse(advisoryHuamboMilho)));
    expect(
      await within(section('Resumo da avaliação')).findByText('Estado da recomendação'),
    ).toBeInTheDocument();
  });

  it('impede submissões duplicadas enquanto há pedidos em curso', async () => {
    const slowAdvisory = deferred();
    const api = setupApi({ [ADVISORY]: () => slowAdvisory.promise });
    await renderReady();
    fillForm();

    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    fireEvent.submit(submitButton().closest('form'));

    expect(submitButton()).toHaveTextContent('A consultar…');
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
    await waitFor(() => expect(api.callsTo(EVALUATE)).toHaveLength(1));
    expect(api.callsTo(ADVISORY)).toHaveLength(1);

    await act(async () => slowAdvisory.resolve(jsonResponse(advisoryHuamboMilho)));
    await waitFor(() => expect(submitButton()).toHaveTextContent('Consultar'));
    expect(submitButton()).not.toHaveAttribute('aria-disabled');
  });
});

describe('ConsultationPage — falha de apenas um endpoint', () => {
  it('/advisory falha: usa a avaliação técnica, sinaliza a ausência e repete só a recomendação', async () => {
    let advisoryAttempts = 0;
    const api = setupApi({
      [ADVISORY]: () => {
        advisoryAttempts += 1;
        return advisoryAttempts === 1
          ? jsonResponse({ detail: 'erro' }, { status: 500 })
          : jsonResponse(advisoryHuamboMilho);
      },
    });
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    const summary = section('Resumo da avaliação');
    expect(within(summary).getByText('Estado segundo a avaliação técnica')).toBeInTheDocument();
    expect(
      within(summary).getByText('Resumo baseado apenas na avaliação técnica'),
    ).toBeInTheDocument();

    const alert = within(section('Recomendação de extensão')).getByRole('alert');
    expect(alert).toHaveTextContent('Recomendação indisponível. O servidor encontrou um problema.');

    const table = within(section('Indicadores agroclimáticos')).getByRole('table');
    expect(within(table).getAllByText('Indisponível')).toHaveLength(3);
    const transparency = section('Transparência e limitações');
    expect(
      within(transparency).getByText(/Comparação indisponível: só uma das fontes respondeu/),
    ).toBeInTheDocument();
    expect(
      within(transparency).getByText('Recomendação: sem resposta do serviço.'),
    ).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));
    expect(await within(summary).findByText('Estado da recomendação')).toBeInTheDocument();
    expect(api.callsTo(ADVISORY)).toHaveLength(2);
    expect(api.callsTo(EVALUATE)).toHaveLength(1);
    expect(api.callsTo(ADVISORY)[1][1].body).toBe(api.callsTo(ADVISORY)[0][1].body);
  });

  it('/evaluate falha: a recomendação continua completa e a fundamentação mostra o erro', async () => {
    setupApi({
      [EVALUATE]: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    expect(within(section('Fundamentação técnica')).getByRole('alert')).toHaveTextContent(
      'Avaliação técnica indisponível. Não foi possível ligar ao servidor.',
    );
    expect(
      within(section('Resumo da avaliação')).getByText('Estado da recomendação'),
    ).toBeInTheDocument();
    expect(
      await within(section('Recomendação de extensão')).findByRole('heading', { level: 4 }),
    ).toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).getByText(
        /Sem informação: a avaliação técnica não está disponível\. Não foi possível confirmar/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('recomendação recebida; não foi possível obter a avaliação técnica'),
    ).toBeInTheDocument();
  });

  it('422 mostra a mensagem do servidor sem o prefixo técnico e sem botão de repetir', async () => {
    setupApi({
      [EVALUATE]: () =>
        jsonResponse(
          { detail: [{ type: 'value_error', msg: "Value error, Província 'X' não suportada." }] },
          { status: 422 },
        ),
    });
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    const alert = within(section('Fundamentação técnica')).getByRole('alert');
    expect(alert).toHaveTextContent("Província 'X' não suportada.");
    expect(alert).not.toHaveTextContent('Value error');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ConsultationPage — datas (decisão: passadas e actual sim, futuras não)', () => {
  it('a data actual (predefinida) é aceite e enviada aos dois endpoints', async () => {
    const api = setupApi();
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    const today = getLocalIsoDate();
    expect(JSON.parse(api.callsTo(ADVISORY)[0][1].body).data_consulta).toBe(today);
    expect(JSON.parse(api.callsTo(EVALUATE)[0][1].body).data_consulta).toBe(today);
  });

  it('uma data passada é aceite, enviada e contextualizada no relatório', async () => {
    const api = setupApi();
    await renderReady();
    fillForm({ data: '2025-11-12' });
    await submitAndWaitForBoth();

    expect(JSON.parse(api.callsTo(ADVISORY)[0][1].body).data_consulta).toBe('2025-11-12');
    expect(JSON.parse(api.callsTo(EVALUATE)[0][1].body).data_consulta).toBe('2025-11-12');
    expect(
      within(section('Indicadores agroclimáticos')).getByText('Consulta para uma data passada'),
    ).toBeInTheDocument();
    expect(
      within(section('Recomendação de extensão')).getByText('Contexto para ler esta recomendação'),
    ).toBeInTheDocument();
  });

  it('datas futuras: desactivadas no selector e recusadas se escritas à mão (sem pedidos)', async () => {
    const api = setupApi();
    await renderReady();
    const dateInput = screen.getByLabelText(/Data da consulta/);
    expect(dateInput).toHaveAttribute('max', getLocalIsoDate());

    for (const daysAhead of [1, 3, 7, 30]) {
      const future = getLocalIsoDate(new Date(Date.now() + (daysAhead * 24 + 12) * 60 * 60 * 1000));
      fillForm({ data: future });
      fireEvent.click(submitButton());
      expect(screen.getByText('Escolha a data de hoje ou uma data anterior.')).toBeInTheDocument();
    }
    expect(api.callsTo(ADVISORY)).toHaveLength(0);
    expect(api.callsTo(EVALUATE)).toHaveLength(0);
  });
});
