import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advisoryHuamboMilho,
  cropsResponse,
  evaluateHuamboMilho,
  provincesResponse,
} from '../test/fixtures/liveResponses.js';
import { getLocalIsoDate } from '../utils/dates.js';
import ConsultationPage from './ConsultationPage.jsx';

const PROVINCES = 'GET:/api/v1/provinces';
const CROPS = 'GET:/api/v1/crops';
const ADVISORY = 'POST:/api/v1/advisory';
const EVALUATE = 'POST:/api/v1/evaluate';

function stubFetch(handler) {
  const mock = vi.fn(handler);
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const routeKey = (url, init = {}) => `${(init.method ?? 'GET').toUpperCase()}:${new URL(url).pathname}`;
const jsonResponse = (body, { status = 200 } = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function setupApi(custom = {}) {
  const handlers = {
    [PROVINCES]: () => jsonResponse(provincesResponse),
    [CROPS]: () => jsonResponse(cropsResponse),
    [ADVISORY]: () => jsonResponse(advisoryHuamboMilho),
    [EVALUATE]: () => jsonResponse(evaluateHuamboMilho),
    ...custom,
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

const submitButton = () =>
  screen.getByRole('button', { name: /(Consultar|Actualizar|avaliar)/i });

describe('ConsultationPage — catálogos', () => {
  it('carrega províncias e culturas da API', async () => {
    setupApi();
    render(<ConsultationPage />);
    expect(await screen.findByRole('option', { name: 'Huambo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bié' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Huíla' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Milho' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Feijão' })).toBeInTheDocument();
  });

  it('erro ao carregar um catálogo: mensagem e nova tentativa, sem afectar o outro', async () => {
    let attempts = 0;
    setupApi({
      [PROVINCES]: () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse({}, { status: 503 })
          : jsonResponse(provincesResponse);
      },
    });
    render(<ConsultationPage />);

    expect(await screen.findByText('Não foi possível carregar as províncias.')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Milho' })).toBeInTheDocument();
    expect(screen.getByLabelText('Província')).toBeDisabled();
    expect(screen.getByLabelText('Cultura')).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('option', { name: 'Huambo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Província')).not.toBeDisabled();
  });

  it('lista vazia: avisa e permite verificar novamente', async () => {
    setupApi({ [CROPS]: () => jsonResponse([]) });
    render(<ConsultationPage />);
    expect(await screen.findByText('Não há culturas disponíveis de momento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar novamente' })).toBeInTheDocument();
  });
});

describe('ConsultationPage — data e validação', () => {
  it('a data começa em hoje e permite planeamento futuro', async () => {
    setupApi();
    await renderReady();
    const dateInput = screen.getByLabelText(/Data da consulta/);
    const today = getLocalIsoDate();
    expect(dateInput).toHaveValue(today);
    expect(dateInput).not.toHaveAttribute('max');
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

  it('data futura é aceite para planeamento estratégico', async () => {
    const api = setupApi();
    await renderReady();
    fillForm({ data: '2027-11-15' });
    fireEvent.click(submitButton());
    await waitFor(() => expect(api.callsTo(ADVISORY)).toHaveLength(1));

    expect(screen.queryByText('Escolha a data de hoje ou uma data anterior.')).not.toBeInTheDocument();
    expect(api.callsTo(ADVISORY)).toHaveLength(1);
    expect(api.callsTo(EVALUATE)).toHaveLength(1);
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

async function submitAndWaitForBoth() {
  fireEvent.click(submitButton());
  await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Relatório da consulta' })).toBeInTheDocument());
}

describe('ConsultationPage — submissão e parecer', () => {
  it('envia os parâmetros aos endpoints e apresenta o parecer de viabilidade', async () => {
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

    expect(screen.getByText('FAVORÁVEL PARA SEMEADURA')).toBeInTheDocument();
    expect(screen.getByText('Chuva Recente')).toBeInTheDocument();
    expect(screen.getByText('Humidade da Raiz')).toBeInTheDocument();
    expect(screen.getByText('Chuva Prevista')).toBeInTheDocument();
    expect(screen.getByText('Recomendação Técnica do Agrónomo')).toBeInTheDocument();
  });

  it('o relatório não faz pedidos adicionais à API', async () => {
    const api = setupApi();
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    expect(api.fetchMock).toHaveBeenCalledTimes(4); // 2 catálogos + 2 consultas
  });

  it('impede submissões duplicadas enquanto há pedidos em curso', async () => {
    const slowAdvisory = deferred();
    const api = setupApi({ [ADVISORY]: () => slowAdvisory.promise });
    await renderReady();
    fillForm();

    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    fireEvent.submit(submitButton().closest('form'));

    expect(submitButton()).toHaveTextContent(/avaliar|consultar/i);
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
    await waitFor(() => expect(api.callsTo(EVALUATE)).toHaveLength(1));
    expect(api.callsTo(ADVISORY)).toHaveLength(1);

    await act(async () => slowAdvisory.resolve(jsonResponse(advisoryHuamboMilho)));
    await waitFor(() => expect(submitButton()).not.toHaveAttribute('aria-disabled'));
  });
});

describe('ConsultationPage — tratamento de erros e repetição', () => {
  it('/advisory em erro mostra aviso claro e permite tentar novamente', async () => {
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
    fireEvent.click(submitButton());

    expect(await screen.findByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('FAVORÁVEL PARA SEMEADURA')).toBeInTheDocument();
    expect(api.callsTo(ADVISORY)).toHaveLength(2);
  });
});

describe('ConsultationPage — datas estratégicas e passadas', () => {
  it('a data actual (predefinida) é aceite e enviada aos dois endpoints', async () => {
    const api = setupApi();
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();

    const today = getLocalIsoDate();
    expect(JSON.parse(api.callsTo(ADVISORY)[0][1].body).data_consulta).toBe(today);
    expect(JSON.parse(api.callsTo(EVALUATE)[0][1].body).data_consulta).toBe(today);
  });

  it('uma data passada é aceite e enviada', async () => {
    const api = setupApi();
    await renderReady();
    fillForm({ data: '2025-11-12' });
    await submitAndWaitForBoth();

    expect(JSON.parse(api.callsTo(ADVISORY)[0][1].body).data_consulta).toBe('2025-11-12');
    expect(JSON.parse(api.callsTo(EVALUATE)[0][1].body).data_consulta).toBe('2025-11-12');
    expect(screen.getByText('FAVORÁVEL PARA SEMEADURA')).toBeInTheDocument();
  });

  it('datas futuras: permitidas no selector e enviadas aos endpoints para planeamento de safra', async () => {
    const api = setupApi();
    await renderReady();
    const dateInput = screen.getByLabelText(/Data da consulta/);
    expect(dateInput).not.toHaveAttribute('max');

    const future = '2027-07-15';
    fillForm({ data: future });
    await submitAndWaitForBoth();

    expect(api.callsTo(ADVISORY)).toHaveLength(1);
    expect(api.callsTo(EVALUATE)).toHaveLength(1);
    const [advisoryCall] = api.callsTo(ADVISORY);
    expect(JSON.parse(advisoryCall[1].body)).toMatchObject({ data_consulta: future });
  });
});

describe('ConsultationPage — repetir consultas e estados', () => {
  it('alterar o formulário depois de um relatório: aviso e nova consulta', async () => {
    const api = setupApi();
    await renderReady();
    fillForm();
    await submitAndWaitForBoth();
    expect(screen.queryByText('Dados alterados no formulário')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: 'Soja' } });
    expect(screen.getByText('Dados alterados no formulário')).toBeInTheDocument();

    // Voltar aos dados anteriores elimina o aviso.
    fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: 'Milho' } });
    expect(screen.queryByText('Dados alterados no formulário')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: 'Soja' } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(JSON.parse(api.callsTo(ADVISORY)[1][1].body).cultura).toBe('Soja'));
  });

  it('catálogos lentos: aviso de demora', async () => {
    vi.useFakeTimers();
    try {
      setupApi({
        [PROVINCES]: () => new Promise(() => {}),
        [CROPS]: () => new Promise(() => {}),
      });
      render(<ConsultationPage />);
      expect(screen.getByText('A carregar as províncias e as culturas do serviço…')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(8000));
      expect(screen.getAllByText(/Está a demorar mais do que o habitual/)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
