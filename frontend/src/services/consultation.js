import { API_PATHS } from '../config/api.js';
import { buildConsultationPayload, isPlainObject } from '../utils/validators.js';
import { ApiError, requestJson } from './api.js';

async function postConsultation(path, params, options = {}) {
  const payload = buildConsultationPayload(params);
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
export function postAdvisory(params, options) {
  return postConsultation(API_PATHS.advisory, params, options);
}

/**
 * POST /api/v1/evaluate — avaliação técnica complementar. Devolve o JSON da API sem alterações.
 * @throws {import('../utils/validators.js').ConsultationInputError | ApiError}
 */
export function postEvaluate(params, options) {
  return postConsultation(API_PATHS.evaluate, params, options);
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
export function startConsultation(params, options = {}) {
  buildConsultationPayload(params);
  return {
    advisory: settle(postAdvisory(params, options)),
    evaluate: settle(postEvaluate(params, options)),
  };
}
