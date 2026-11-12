import {
  DEFAULT_API_BASE_URL,
  DEFAULT_API_TIMEOUT_MS,
  MAX_API_TIMEOUT_MS,
  MIN_API_TIMEOUT_MS,
} from './api.js';

/**
 * Devolve a URL base da API sem barra final.
 * Usa VITE_API_BASE_URL quando é uma URL http(s) válida; caso contrário, a URL documentada.
 * @param {Record<string, unknown>} [env]
 */
export function resolveApiBaseUrl(env = import.meta.env) {
  const configured = typeof env?.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL.trim() : '';
  if (configured === '') return DEFAULT_API_BASE_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocolo');
    return configured.replace(/\/+$/, '');
  } catch {
    console.warn(
      `[config] VITE_API_BASE_URL inválida ("${configured}"). A usar ${DEFAULT_API_BASE_URL}.`,
    );
    return DEFAULT_API_BASE_URL;
  }
}

/**
 * Devolve o tempo máximo por pedido (ms), dentro de limites razoáveis.
 * @param {Record<string, unknown>} [env]
 */
export function resolveApiTimeoutMs(env = import.meta.env) {
  const raw = env?.VITE_API_TIMEOUT_MS;
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_API_TIMEOUT_MS;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_API_TIMEOUT_MS || value > MAX_API_TIMEOUT_MS) {
    console.warn(
      `[config] VITE_API_TIMEOUT_MS inválido ("${raw}"). A usar ${DEFAULT_API_TIMEOUT_MS} ms.`,
    );
    return DEFAULT_API_TIMEOUT_MS;
  }
  return value;
}
