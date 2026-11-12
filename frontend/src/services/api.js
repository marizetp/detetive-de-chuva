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
 */
export const API_ERROR_KINDS = Object.freeze({
  network: 'network',
  timeout: 'timeout',
  aborted: 'aborted',
  validation: 'validation',
  http: 'http',
  malformed: 'malformed',
});

export class ApiError extends Error {
  /**
   * @param {keyof typeof API_ERROR_KINDS} kind
   * @param {string} message mensagem técnica (não mostrar ao utilizador)
   * @param {{ status?: number|null, path?: string, details?: string[], cause?: unknown }} [info]
   */
  constructor(kind, message, { status = null, path = '', details = [], cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.path = path;
    /** Mensagens legíveis devolvidas pela API (ex.: `detail[].msg` de um 422). */
    this.details = details;
  }
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
    response = await fetch(`${baseUrl}${path}`, init);
  } catch (error) {
    request.cleanup();
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
    const kind = response.status === 422 ? 'validation' : 'http';
    throw new ApiError(kind, `HTTP ${response.status}`, { status: response.status, path, details });
  }

  if (!parsed.ok) {
    throw new ApiError('malformed', 'Resposta sem JSON válido', { status: response.status, path });
  }
  return parsed.value;
}
