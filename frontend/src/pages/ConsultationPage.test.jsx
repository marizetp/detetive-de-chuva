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
const panel = (name) => screen.getByRole('region', { name });

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

describe('ConsultationPage — submissão', () => {
  it('envia os mesmos parâmetros aos dois endpoints e mostra os dois resultados', async () => {
    const api = setupApi();
    await renderReady();
    fillForm({ data: '2026-11-10' });
    fireEvent.click(submitButton());

    await waitFor(() => expect(within(panel('Recomendação')).getByText('Favorável')).toBeInTheDocument());
    await waitFor(() =>
      expect(within(panel('Avaliação técnica')).getByText('Favorável')).toBeInTheDocument(),
    );

    const [advisoryCall] = api.callsTo(ADVISORY);
    const [evaluateCall] = api.callsTo(EVALUATE);
    expect(advisoryCall[1].body).toBe(evaluateCall[1].body);
    expect(JSON.parse(advisoryCall[1].body)).toEqual({
      provincia: 'Huambo',
      cultura: 'Milho',
      data_consulta: '2026-11-10',
    });

    const recommendation = panel('Recomendação');
    expect(within(recommendation).getByText('95%')).toBeInTheDocument();
    expect(within(recommendation).getByText('48%')).toBeInTheDocument(); // 0.48 → 48%
    expect(within(recommendation).getByText(/^25,6.mm$/)).toBeInTheDocument();
    expect(within(recommendation).getByText('/api/v1/advisory')).toBeInTheDocument();
    expect(within(panel('Avaliação técnica')).getByText('/api/v1/evaluate')).toBeInTheDocument();
    expect(screen.getByText('10 de novembro de 2026')).toBeInTheDocument();
  });

  it('mostra cada resultado assim que chega, com carregamentos independentes', async () => {
    const slowAdvisory = deferred();
    setupApi({ [ADVISORY]: () => slowAdvisory.promise });
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(within(panel('Avaliação técnica')).getByText('Favorável')).toBeInTheDocument(),
    );
    expect(within(panel('Recomendação')).getByText('A obter a recomendação…')).toBeInTheDocument();

    await act(async () => slowAdvisory.resolve(jsonResponse(advisoryHuamboMilho)));
    await waitFor(() => expect(within(panel('Recomendação')).getByText('Favorável')).toBeInTheDocument());
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

describe('ConsultationPage — falhas parciais', () => {
  it('falha em /advisory: mostra a avaliação técnica e permite repetir só a recomendação', async () => {
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

    const recommendation = panel('Recomendação');
    expect(await within(recommendation).findByRole('alert')).toHaveTextContent(
      'O servidor encontrou um problema.',
    );
    await waitFor(() =>
      expect(within(panel('Avaliação técnica')).getByText('Favorável')).toBeInTheDocument(),
    );

    fireEvent.click(within(recommendation).getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(within(recommendation).getByText('Favorável')).toBeInTheDocument());
    expect(api.callsTo(ADVISORY)).toHaveLength(2);
    expect(api.callsTo(EVALUATE)).toHaveLength(1);
    expect(api.callsTo(ADVISORY)[1][1].body).toBe(api.callsTo(ADVISORY)[0][1].body);
  });

  it('falha de rede em /evaluate: a recomendação continua visível', async () => {
    setupApi({
      [EVALUATE]: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    expect(await within(panel('Avaliação técnica')).findByRole('alert')).toHaveTextContent(
      'Não foi possível ligar ao servidor.',
    );
    await waitFor(() => expect(within(panel('Recomendação')).getByText('Favorável')).toBeInTheDocument());
    // Leitores de ecrã ouvem o desfecho de cada fonte.
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
    fireEvent.click(submitButton());

    const alert = await within(panel('Avaliação técnica')).findByRole('alert');
    expect(alert).toHaveTextContent("Província 'X' não suportada.");
    expect(alert).not.toHaveTextContent('Value error');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ConsultationPage — apresentação honesta dos dados', () => {
  it('divergências entre as duas fontes são mostradas, não ocultadas', async () => {
    setupApi({
      [EVALUATE]: () =>
        jsonResponse({ ...evaluateHuamboMilho, status: 'AGUARDAR', score_confianca: 72 }),
    });
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    expect(
      await screen.findByText('A recomendação e a avaliação técnica não coincidem'),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Valores divergentes entre as duas fontes' });
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(rows).toEqual(['EstadoFavorávelAguardar', 'Nível de confiança95%72%']);
  });

  it('estado desconhecido e valores em falta: aspecto neutro, valor original e «—»', async () => {
    setupApi({
      [ADVISORY]: () =>
        jsonResponse({
          status: 'PLANTAR_JA',
          metricas: { chuva_acumulada_recente_mm: 10 },
          recomendacao_extensao: 'Texto',
        }),
    });
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    const recommendation = panel('Recomendação');
    expect(await within(recommendation).findByText('Estado não reconhecido')).toBeInTheDocument();
    expect(within(recommendation).getByText('PLANTAR_JA')).toBeInTheDocument();
    expect(within(recommendation).getByText('Resposta incompleta')).toBeInTheDocument();
    expect(within(recommendation).getAllByText('Sem dado').length).toBe(3);
  });

  it('indica quando o serviço usou dados meteorológicos de substituição', async () => {
    setupApi();
    await renderReady();
    fillForm();
    fireEvent.click(submitButton());

    const technical = panel('Avaliação técnica');
    expect(
      await within(technical).findByText('Dados meteorológicos de substituição'),
    ).toBeInTheDocument();
    expect(
      within(panel('Recomendação')).queryByText('Dados meteorológicos de substituição'),
    ).not.toBeInTheDocument();
  });
});
