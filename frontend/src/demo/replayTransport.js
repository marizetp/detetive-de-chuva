// Transporte de reprodução do modo de demonstração. Substitui só a rede: responde a um pedido com
// a resposta real gravada para exactamente o mesmo pedido, ou recusa-o. Nunca chama `fetch` e
// nunca gera, completa ou aproxima uma resposta.

import { ApiError } from '../services/api.js';

/** Caminho + query normalizados (descodificados, parâmetros por ordem alfabética). */
function canonicalPath(pathWithQuery) {
  const url = new URL(pathWithQuery, 'http://demo.invalid');
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = params.map(([name, value]) => `${name}=${value}`).join('&');
  return decodeURIComponent(url.pathname) + (query ? `?${query}` : '');
}

/** Corpo JSON normalizado: as mesmas chaves e valores, independentemente da ordem. */
function canonicalBody(body) {
  if (body === null || body === undefined) return '';
  const value = typeof body === 'string' ? JSON.parse(body) : body;
  return JSON.stringify(Object.keys(value).sort().map((name) => [name, value[name]]));
}

function requestKey(method, pathWithQuery, body) {
  return `${method.toUpperCase()} ${canonicalPath(pathWithQuery)} ${canonicalBody(body)}`;
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * @param {readonly { method: string, path: string, body: object|null, status: number, text: string, demo: boolean }[]} recordings
 *   só as entradas elegíveis (`demo: true`); entradas com `demo !== true` são ignoradas
 */
export function createReplayTransport(recordings) {
  const byKey = new Map();
  for (const entry of recordings) {
    if (entry.demo !== true) continue;
    byKey.set(requestKey(entry.method, entry.path, entry.body), entry);
  }

  return async function replayTransport(url, init = {}) {
    if (init.signal?.aborted) throw abortError();
    const { pathname, search } = new URL(url);
    const key = requestKey(init.method ?? 'GET', `${pathname}${search}`, init.body);
    const entry = byKey.get(key);
    if (!entry) {
      throw new ApiError('demoUnavailable', 'Pedido sem resposta gravada no modo de demonstração', {
        path: pathname,
      });
    }
    // Mesmo formato que `requestJson` lê de uma resposta real: ok, status e texto do corpo.
    return {
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      text: async () => entry.text,
    };
  };
}
