import { resolveApiBaseUrl, resolveApiTimeoutMs } from '../config/env.js';
import { isPlainObject } from '../utils/validators.js';

/**
 * Tipos de falha:
 * - network:    sem ligação ou servidor inalcançável
 * - timeout:    o pedido excedeu o tempo máximo
 * - aborted:    cancelado pelo próprio cliente (ex.: nova consulta)
 * - validation: HTTP 422 — a API rejeitou os parâmetros
 * - http:       outro estado HTTP não-2xx
 * - malformed:  resposta 2xx que não é JSON ou não tem a estrutura esperada
 * - demoUnavailable: só no modo de demonstração — pedido sem resposta gravada (nunca é inventada)
 */
export const API_ERROR_KINDS = Object.freeze({
  network: 'network',
  timeout: 'timeout',
  aborted: 'aborted',
  validation: 'validation',
  http: 'http',
  malformed: 'malformed',
  demoUnavailable: 'demoUnavailable',
});

export class ApiError extends Error {
  /**
   * @param {keyof typeof API_ERROR_KINDS} kind
   * @param {string} message mensagem técnica (não mostrar ao utilizador)
   * @param {{ status?: number|null, path?: string, details?: string[], fields?: string[], cause?: unknown }} [info]
   */
  constructor(kind, message, { status = null, path = '', details = [], fields = [], cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.path = path;
    /** Mensagens legíveis devolvidas pela API (ex.: `detail[].msg` de um 422). */
    this.details = details;
    /** Campos rejeitados num 422 (último elemento de `detail[].loc`, ex.: `lang`). */
    this.fields = fields;
  }
}

/**
 * Transporte de rede: único ponto onde os pedidos saem da aplicação.
 * Por omissão (sempre, em produção) é o `fetch` do navegador. Só o modo de demonstração
 * (VITE_DEMO_MODE=true, carregado à parte em main.jsx) o substitui por reprodução de respostas
 * gravadas — e, nesse caso, `fetch` nunca é chamado: as duas origens nunca se misturam.
 */
let customTransport = null;

/** @param {(url: string, init: RequestInit) => Promise<{ ok: boolean, status: number, text: () => Promise<string> }>} transport */
export function setTransport(transport) {
  customTransport = transport;
}

/** Repõe o transporte por omissão (`fetch`). */
export function resetTransport() {
  customTransport = null;
}

function send(url, init) {
  return customTransport ? customTransport(url, init) : fetch(url, init);
}

/** Extrai mensagens do formato de erro FastAPI observado: `{ detail: string | [{ msg }] }`. */
export function extractErrorDetails(body) {
  if (!isPlainObject(body)) return [];
  const { detail } = body;
  if (typeof detail === 'string') return [detail];
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (isPlainObject(item) && typeof item.msg === 'string' ? item.msg : null))
      .filter(Boolean);
  }
  return [];
}

/** Campos rejeitados num 422 FastAPI: último elemento textual de `detail[].loc`. */
export function extractErrorFields(body) {
  if (!isPlainObject(body) || !Array.isArray(body.detail)) return [];
  return body.detail
    .map((item) => (isPlainObject(item) && Array.isArray(item.loc) ? item.loc.at(-1) : null))
    .filter((field) => typeof field === 'string');
}

/**
 * Combina o sinal externo (cancelamento) com um temporizador, sem depender de AbortSignal.any
 * (indisponível em navegadores mais antigos).
 */
function createRequestSignal(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function readJson(response) {
  const text = await response.text();
  if (text.trim() === '') return { ok: false, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: undefined };
  }
}

/**
 * Pedido JSON à API. Devolve o JSON tal como recebido (nomes de campos da API preservados).
 * @param {string} path
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal, timeoutMs?: number, baseUrl?: string }} [options]
 * @throws {ApiError}
 */
export async function requestJson(path, options = {}) {
  const {
    method = 'GET',
    body,
    signal,
    timeoutMs = resolveApiTimeoutMs(),
    baseUrl = resolveApiBaseUrl(),
  } = options;

  if (signal?.aborted) throw new ApiError('aborted', 'Pedido cancelado', { path });

  const headers = { Accept: 'application/json' };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const request = createRequestSignal(signal, timeoutMs);
  init.signal = request.signal;

  let response;
  try {
    response = await send(`${baseUrl}${path}`, init);
  } catch (error) {
    request.cleanup();
    // Erros já classificados pelo transporte (modo de demonstração) passam sem alteração.
    if (error instanceof ApiError) throw error;
    if (request.didTimeout()) {
      throw new ApiError('timeout', `Tempo esgotado após ${timeoutMs} ms`, { path, cause: error });
    }
    if (signal?.aborted) {
      throw new ApiError('aborted', 'Pedido cancelado', { path, cause: error });
    }
    throw new ApiError('network', 'Falha de rede', { path, cause: error });
  }

  let parsed;
  try {
    parsed = await readJson(response);
  } catch (error) {
    // O corpo pode ser interrompido pelo temporizador ou por cancelamento a meio da leitura.
    request.cleanup();
    if (request.didTimeout()) {
      throw new ApiError('timeout', `Tempo esgotado após ${timeoutMs} ms`, { path, cause: error });
    }
    if (signal?.aborted) throw new ApiError('aborted', 'Pedido cancelado', { path, cause: error });
    throw new ApiError('network', 'Falha ao ler a resposta', { path, cause: error });
  }
  request.cleanup();

  if (!response.ok) {
    const details = parsed.ok ? extractErrorDetails(parsed.value) : [];
    const fields = parsed.ok ? extractErrorFields(parsed.value) : [];
    const kind = response.status === 422 ? 'validation' : 'http';
    throw new ApiError(kind, `HTTP ${response.status}`, { status: response.status, path, details, fields });
  }

  if (!parsed.ok) {
    throw new ApiError('malformed', 'Resposta sem JSON válido', { status: response.status, path });
  }
  return parsed.value;
}
