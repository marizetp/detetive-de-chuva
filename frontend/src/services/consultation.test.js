import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubFetch } from '../test/fetchMock.js';
import { advisoryHuamboMilho, evaluateHuamboMilho } from '../test/fixtures/liveResponses.js';
import { ConsultationInputError } from '../utils/validators.js';
import { postAdvisory, postEvaluate, startConsultation } from './consultation.js';

const options = { baseUrl: 'https://api.test' };
const params = { provincia: 'Huambo', cultura: 'Milho' };

afterEach(() => vi.unstubAllGlobals());

function routeFetch(routes) {
  return stubFetch(async (url) => {
    const path = new URL(url).pathname;
    const handler = routes[path];
    if (!handler) throw new Error(`Rota não prevista: ${path}`);
    return handler();
  });
}

describe('postAdvisory / postEvaluate', () => {
  it('fazem POST ao endpoint correcto e devolvem o JSON sem alterações', async () => {
    const fetchMock = routeFetch({
      '/api/v1/advisory': () => jsonResponse(advisoryHuamboMilho),
      '/api/v1/evaluate': () => jsonResponse(evaluateHuamboMilho),
    });

    await expect(postAdvisory(params, options)).resolves.toEqual(advisoryHuamboMilho);
    await expect(postEvaluate(params, options)).resolves.toEqual(evaluateHuamboMilho);
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'POST']);
  });

  it('rejeitam respostas 2xx que não são objectos', async () => {
    routeFetch({ '/api/v1/advisory': () => jsonResponse([1, 2]) });
    await expect(postAdvisory(params, options)).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('não fazem pedidos quando os parâmetros são inválidos', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    await expect(postAdvisory({ cultura: 'Milho' }, options)).rejects.toBeInstanceOf(
      ConsultationInputError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('startConsultation', () => {
  it('envia exactamente os mesmos parâmetros aos dois endpoints', async () => {
    const fetchMock = routeFetch({
      '/api/v1/advisory': () => jsonResponse(advisoryHuamboMilho),
      '/api/v1/evaluate': () => jsonResponse(evaluateHuamboMilho),
    });
    const consultation = startConsultation(
      { ...params, data_consulta: '2026-11-12' },
      options,
    );
    await Promise.all([consultation.advisory, consultation.evaluate]);

    const bodies = fetchMock.mock.calls.map(([, init]) => init.body);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(JSON.parse(bodies[0])).toEqual({
      provincia: 'Huambo',
      cultura: 'Milho',
      data_consulta: '2026-11-12',
    });
  });

  it('devolve os dois resultados separadamente', async () => {
    routeFetch({
      '/api/v1/advisory': () => jsonResponse(advisoryHuamboMilho),
      '/api/v1/evaluate': () => jsonResponse(evaluateHuamboMilho),
    });
    const consultation = startConsultation(params, options);

    await expect(consultation.advisory).resolves.toEqual({
      state: 'success',
      data: advisoryHuamboMilho,
    });
    await expect(consultation.evaluate).resolves.toEqual({
      state: 'success',
      data: evaluateHuamboMilho,
    });
  });

  it('uma falha em /evaluate não impede o resultado de /advisory', async () => {
    routeFetch({
      '/api/v1/advisory': () => jsonResponse(advisoryHuamboMilho),
      '/api/v1/evaluate': () => jsonResponse({ detail: 'erro' }, { status: 500 }),
    });
    const consultation = startConsultation(params, options);

    await expect(consultation.advisory).resolves.toMatchObject({ state: 'success' });
    const evaluate = await consultation.evaluate;
    expect(evaluate.state).toBe('error');
    expect(evaluate.error).toMatchObject({ kind: 'http', status: 500 });
  });

  it('uma falha em /advisory não impede o resultado de /evaluate', async () => {
    routeFetch({
      '/api/v1/advisory': () => {
        throw new TypeError('Failed to fetch');
      },
      '/api/v1/evaluate': () => jsonResponse(evaluateHuamboMilho),
    });
    const consultation = startConsultation(params, options);

    await expect(consultation.evaluate).resolves.toMatchObject({ state: 'success' });
    await expect(consultation.advisory).resolves.toMatchObject({
      state: 'error',
      error: { kind: 'network' },
    });
  });

  it('valida os parâmetros uma vez, antes de qualquer pedido', () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    expect(() => startConsultation({ provincia: 'Huambo' }, options)).toThrow(
      ConsultationInputError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
