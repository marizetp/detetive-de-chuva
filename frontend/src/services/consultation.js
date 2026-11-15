import { API_PATHS } from '../config/api.js';
import { isEvaluateLanguageEnabled } from '../config/env.js';
import { BACKEND_CONTENT_LANGUAGE, LANGUAGES } from '../i18n/config.js';
import { buildConsultationPayload, isPlainObject } from '../utils/validators.js';
import { ApiError, requestJson } from './api.js';

/**
 * Parâmetro de idioma de POST /api/v1/advisory (docs/docs2.md §3: `lang` "pt" por omissão ou "en").
 * - Inglês: `{ lang: 'en' }` — o serviço gera a recomendação directamente em inglês.
 * - Português (ou qualquer outro valor): sem `lang`, ou seja, o português por omissão do serviço.
 * O /evaluate só o recebe com a capacidade `VITE_API_EVALUATE_LANG` activa (ver abaixo).
 */
export function advisoryLanguageParams(language) {
  return language === LANGUAGES.en ? { lang: LANGUAGES.en } : {};
}

/** Idioma em que a recomendação é pedida (o que o serviço deverá devolver; não é confirmado). */
export function advisoryRequestedLanguage(language) {
  return language === LANGUAGES.en ? LANGUAGES.en : BACKEND_CONTENT_LANGUAGE;
}

/**
 * Parâmetro de idioma de POST /api/v1/evaluate (`justificacoes_tecnicas`). A API v1.1 não o
 * documenta e ignorou-o em 2026-11-15, por isso só é enviado com a capacidade activa
 * (`isEvaluateLanguageEnabled`, desactivada por omissão). Mesma regra do /advisory: `en` para
 * inglês, nada para português.
 */
export function evaluateLanguageParams(language, enabled = isEvaluateLanguageEnabled()) {
  return enabled ? advisoryLanguageParams(language) : {};
}

/**
 * Idioma em que as justificações do /evaluate são pedidas: o da interface com a capacidade
 * activa; senão, `null` (sem pedido de idioma: português por omissão do serviço).
 */
export function evaluateRequestedLanguage(language, enabled = isEvaluateLanguageEnabled()) {
  return enabled ? advisoryRequestedLanguage(language) : null;
}

async function postConsultation(path, params, { extraBody, ...options } = {}) {
  const payload = { ...buildConsultationPayload(params), ...extraBody };
  const body = await requestJson(path, { ...options, method: 'POST', body: payload });
  if (!isPlainObject(body)) {
    throw new ApiError('malformed', 'Era esperado um objecto', { path });
  }
  return body;
}

/**
 * POST /api/v1/advisory — recomendação principal. Devolve o JSON da API sem alterações.
 * @throws {import('../utils/validators.js').ConsultationInputError | ApiError}
 */
export function postAdvisory(params, { language, ...options } = {}) {
  return postConsultation(API_PATHS.advisory, params, {
    ...options,
    extraBody: advisoryLanguageParams(language),
  });
}

/**
 * POST /api/v1/evaluate — avaliação técnica complementar. Devolve o JSON da API sem alterações.
 * @throws {import('../utils/validators.js').ConsultationInputError | ApiError}
 */
export function postEvaluate(params, { language, evaluateLanguageEnabled, ...options } = {}) {
  return postConsultation(API_PATHS.evaluate, params, {
    ...options,
    extraBody: evaluateLanguageParams(language, evaluateLanguageEnabled),
  });
}

/**
 * @typedef {{ state: 'success', data: Record<string, unknown> } | { state: 'error', error: Error }} SettledResult
 */

function settle(promise) {
  return promise.then(
    (data) => ({ state: 'success', data }),
    (error) => ({ state: 'error', error }),
  );
}

/**
 * Inicia as duas consultas em paralelo, de forma independente, com os mesmos parâmetros.
 * Cada promessa resolve sempre (nunca rejeita), para que a falha de uma não afecte a outra
 * e para que a UI possa mostrar cada resultado assim que chega (/evaluate é muito mais rápido).
 *
 * Os parâmetros são validados uma vez, antes de qualquer pedido.
 * @throws {import('../utils/validators.js').ConsultationInputError}
 * @returns {{ advisory: Promise<SettledResult>, evaluate: Promise<SettledResult> }}
 */
export function startConsultation(params, { language, evaluateLanguageEnabled, ...options } = {}) {
  buildConsultationPayload(params);
  return {
    advisory: settle(postAdvisory(params, { ...options, language })),
    evaluate: settle(postEvaluate(params, { ...options, language, evaluateLanguageEnabled })),
  };
}
