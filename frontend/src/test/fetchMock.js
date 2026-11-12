import { vi } from 'vitest';

/** Resposta mínima compatível com o que `requestJson` usa (ok, status, text). */
export function jsonResponse(body, { status = 200 } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

/** Substitui `fetch` global por um mock. Repor com `vi.unstubAllGlobals()`. */
export function stubFetch(implementation) {
  const mock = vi.fn(implementation);
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** `fetch` que só termina quando o sinal é abortado (simula servidor lento). */
export function hangingFetch() {
  return (_url, init) =>
    new Promise((_resolve, reject) => {
      const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
      // Tal como o fetch real: um sinal já abortado rejeita de imediato.
      if (init.signal.aborted) {
        reject(abortError());
        return;
      }
      init.signal.addEventListener('abort', () => reject(abortError()));
    });
}
