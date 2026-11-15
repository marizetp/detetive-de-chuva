// Pedidos aos motores independentes do DecisionEngine. Ainda não usados pela interface (decisão
// D11): preparam a integração com as mesmas regras de idioma do /advisory e do /evaluate.
// - O motor IMERG e a janela de plantio nunca são combinados com /advisory ou /evaluate.
// - `lang` só é enviado com a capacidade respectiva activa (desactivada por omissão: em
//   2026-11-15, /optimal-planting ignorou `lang`; o IMERG não o documenta).

import { IMERG_ZONES } from '../config/imerg.js';
import { isLanguageCapabilityEnabled } from '../config/env.js';
import { LANGUAGES } from '../i18n/config.js';
import { isPlainObject } from '../utils/validators.js';
import { ApiError, requestJson } from './api.js';

export const SCIENTIFIC_PATHS = Object.freeze({
  imergDecision: (zone) => `/zonas/${encodeURIComponent(zone)}/decisao`,
  optimalPlanting: '/api/v1/optimal-planting',
});

/** `lang` em parâmetros de consulta: só `en`, e só com a capacidade activa; português por omissão. */
export function languageQuery(language, enabled) {
  return enabled && language === LANGUAGES.en ? { lang: LANGUAGES.en } : {};
}

function withQuery(path, query) {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function getObject(path, options) {
  const body = await requestJson(path, { ...options, method: 'GET' });
  if (!isPlainObject(body)) throw new ApiError('malformed', 'Era esperado um objecto', { path });
  return body;
}

/**
 * GET /zonas/{zona}/decisao[/{data_ref}] — decisão do motor IMERG, sem alterações.
 * @param {string} zone uma de IMERG_ZONES
 * @param {{ referenceDate?: string, language?: string, languageEnabled?: boolean, signal?: AbortSignal }} [options]
 */
export function getImergDecision(
  zone,
  { referenceDate, language, languageEnabled = isLanguageCapabilityEnabled('imerg'), ...options } = {},
) {
  if (!IMERG_ZONES.includes(zone)) {
    return Promise.reject(new ApiError('malformed', `Zona IMERG não documentada: ${zone}`, { path: '/zonas' }));
  }
  const base = SCIENTIFIC_PATHS.imergDecision(zone);
  const path = referenceDate ? `${base}/${encodeURIComponent(referenceDate)}` : base;
  return getObject(withQuery(path, languageQuery(language, languageEnabled)), options);
}

/**
 * GET /api/v1/optimal-planting — janela de plantio, sem alterações.
 * @param {{ provincia?: string, municipio?: string, cultura?: string, epoca_agricola?: string }} params
 * @param {{ language?: string, languageEnabled?: boolean, signal?: AbortSignal }} [options]
 */
export function getOptimalPlanting(
  params,
  { language, languageEnabled = isLanguageCapabilityEnabled('optimalPlanting'), ...options } = {},
) {
  const { provincia, municipio, cultura, epoca_agricola: season } = params ?? {};
  const query = { provincia, municipio, cultura, epoca_agricola: season, ...languageQuery(language, languageEnabled) };
  return getObject(withQuery(SCIENTIFIC_PATHS.optimalPlanting, query), options);
}
