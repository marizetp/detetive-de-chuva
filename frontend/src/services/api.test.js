import { afterEach, describe, expect, it, vi } from 'vitest';
import { hangingFetch, jsonResponse, stubFetch } from '../test/fetchMock.js';
import {
  validationErrorMissingProvince,
  validationErrorUnsupportedProvince,
} from '../test/fixtures/liveResponses.js';
import { ApiError, extractErrorDetails, requestJson } from './api.js';

const BASE = 'https://api.test';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function captureError(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Era esperado um erro');
}

describe('requestJson — sucesso', () => {
  it('faz GET à URL base + caminho e devolve o JSON sem alterações', async () => {
    const fetchMock = stubFetch(async () => jsonResponse([{ id: 'x', nome: 'X', extra: 1 }]));
    const result = await requestJson('/api/v1/crops', { baseUrl: BASE });

    expect(result).toEqual([{ id: 'x', nome: 'X', extra: 1 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/crops`);
    expect(init.method).toBe('GET');
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init.body).toBeUndefined();
  });

  it('em POST envia JSON com Content-Type: application/json', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));
    await requestJson('/p', { baseUrl: BASE, method: 'POST', body: { provincia: 'Bié' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"provincia":"Bié"}');
  });
});

describe('requestJson — erros', () => {
  it('HTTP 422 → validation, com as mensagens da API', async () => {
    stubFetch(async () => jsonResponse(validationErrorUnsupportedProvince, { status: 422 }));
    const error = await captureError(requestJson('/p', { baseUrl: BASE }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('validation');
    expect(error.status).toBe(422);
    expect(error.details[0]).toContain("Província 'Luanda' não suportada");
  });

  it('HTTP 500 → http, mesmo sem corpo JSON', async () => {
    stubFetch(async () => jsonResponse('<html>Internal error</html>', { status: 500 }));
    const error = await captureError(requestJson('/p', { baseUrl: BASE }));
    expect(error.kind).toBe('http');
    expect(error.status).toBe(500);
    expect(error.details).toEqual([]);
  });

  it('2xx com corpo não-JSON → malformed', async () => {
    stubFetch(async () => jsonResponse('not json'));
    const error = await captureError(requestJson('/p', { baseUrl: BASE }));
    expect(error.kind).toBe('malformed');
  });

  it('2xx com corpo vazio → malformed', async () => {
    stubFetch(async () => jsonResponse(''));
    expect((await captureError(requestJson('/p', { baseUrl: BASE }))).kind).toBe('malformed');
  });

  it('falha de fetch → network', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await captureError(requestJson('/p', { baseUrl: BASE }));
    expect(error.kind).toBe('network');
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('pedido que excede o tempo máximo → timeout', async () => {
    vi.useFakeTimers();
    stubFetch(hangingFetch());
    const pending = captureError(requestJson('/p', { baseUrl: BASE, timeoutMs: 5000 }));

    await vi.advanceTimersByTimeAsync(5000);
    expect((await pending).kind).toBe('timeout');
  });

  it('cancelamento pelo cliente → aborted (não é confundido com timeout)', async () => {
    stubFetch(hangingFetch());
    const controller = new AbortController();
    const pending = captureError(
      requestJson('/p', { baseUrl: BASE, signal: controller.signal, timeoutMs: 60000 }),
    );
    controller.abort();
    expect((await pending).kind).toBe('aborted');
  });

  it('sinal já abortado → aborted, sem chegar a fazer o pedido', async () => {
    const fetchMock = stubFetch(hangingFetch());
    const controller = new AbortController();
    controller.abort();
    const error = await captureError(
      requestJson('/p', { baseUrl: BASE, signal: controller.signal }),
    );
    expect(error.kind).toBe('aborted');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('extractErrorDetails', () => {
  it('lê detail como lista ou string', () => {
    expect(extractErrorDetails(validationErrorMissingProvince)).toEqual(['Field required']);
    expect(extractErrorDetails({ detail: 'There was an error parsing the body' })).toEqual([
      'There was an error parsing the body',
    ]);
  });

  it('ignora formatos desconhecidos', () => {
    expect(extractErrorDetails(null)).toEqual([]);
    expect(extractErrorDetails({ detail: [{ nope: 1 }] })).toEqual([]);
    expect(extractErrorDetails({ error: 'x' })).toEqual([]);
  });
});
