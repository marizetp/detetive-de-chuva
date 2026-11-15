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
 * Modo de demonstração: activo só quando VITE_DEMO_MODE é exactamente "true". Desactivado por
 * omissão; nunca é activado automaticamente (nem quando a API falha).
 * Nota: main.jsx testa `import.meta.env.VITE_DEMO_MODE` directamente, para que o build de
 * produção elimine o código e os dados de demonstração.
 * @param {Record<string, unknown>} [env]
 */
export function isDemoMode(env = import.meta.env) {
  return env?.VITE_DEMO_MODE === 'true';
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

/**
 * Envio de `lang` aos endpoints que a API v1.1 ainda não suporta. Cada capacidade só fica activa
 * com a variável exactamente "true"; desactivadas por omissão. Activar só depois de o backend
 * publicar o suporte (docs/ESPECIFICACAO-BACKEND-I18N.md). Observado em 2026-11-15: /evaluate e
 * /optimal-planting ignoraram `lang`; o motor IMERG não o documenta.
 * (O /advisory não precisa de capacidade: `lang` está documentado no docs2 §3.)
 */
export const LANGUAGE_CAPABILITY_ENV = Object.freeze({
  evaluate: 'VITE_API_EVALUATE_LANG',
  imerg: 'VITE_API_IMERG_LANG',
  optimalPlanting: 'VITE_API_PLANTING_LANG',
});

/**
 * @param {keyof typeof LANGUAGE_CAPABILITY_ENV} endpoint
 * @param {Record<string, unknown>} [env]
 */
export function isLanguageCapabilityEnabled(endpoint, env = import.meta.env) {
  const name = LANGUAGE_CAPABILITY_ENV[endpoint];
  return Boolean(name) && env?.[name] === 'true';
}

/** `lang` no POST /api/v1/evaluate (VITE_API_EVALUATE_LANG). */
export function isEvaluateLanguageEnabled(env = import.meta.env) {
  return isLanguageCapabilityEnabled('evaluate', env);
}
