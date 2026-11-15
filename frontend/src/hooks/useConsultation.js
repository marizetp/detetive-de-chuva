import { useCallback, useEffect, useRef, useState } from 'react';
import { RESULT_SOURCES } from '../config/api.js';
import { isEvaluateLanguageEnabled } from '../config/env.js';
import {
  advisoryRequestedLanguage,
  evaluateRequestedLanguage,
  postAdvisory,
  postEvaluate,
  startConsultation,
} from '../services/consultation.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../utils/mappers.js';

/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} SourceStatus
 * @typedef {{ status: SourceStatus, result: object | null, error: unknown }} SourceState
 */

const IDLE = Object.freeze({ status: 'idle', result: null, error: null });
const LOADING = Object.freeze({ status: 'loading', result: null, error: null });

/** Cada fonte tem o seu pedido, o seu mapper e o seu estado — nunca se misturam. */
const SOURCES = {
  [RESULT_SOURCES.advisory]: {
    request: postAdvisory,
    map: mapAdvisoryResponse,
    requestedLanguage: (language) => advisoryRequestedLanguage(language),
  },
  [RESULT_SOURCES.evaluate]: {
    request: postEvaluate,
    map: mapEvaluateResponse,
    requestedLanguage: (language, enabled) => evaluateRequestedLanguage(language, enabled),
  },
};

/** Cria um AbortController registado, para ser cancelado se a página for desmontada. */
function createTrackedController(registry) {
  const controller = new AbortController();
  registry.add(controller);
  controller.signal.addEventListener('abort', () => registry.delete(controller), { once: true });
  return controller;
}

function settle(promise) {
  return promise.then(
    (data) => ({ state: 'success', data }),
    (error) => ({ state: 'error', error }),
  );
}

/**
 * Orquestra a consulta: os dois endpoints em paralelo, com estados independentes.
 * - A falha de um não afecta o outro.
 * - Não aceita nova submissão enquanto algum pedido estiver em curso.
 * - Permite repetir só o endpoint que falhou, com os mesmos parâmetros.
 */
export function useConsultation({ evaluateLanguageEnabled = isEvaluateLanguageEnabled() } = {}) {
  const [submittedParams, setSubmittedParams] = useState(null);
  const [advisory, setAdvisory] = useState(IDLE);
  const [evaluate, setEvaluate] = useState(IDLE);

  // Guarda síncrona contra duplos cliques (o estado só se actualiza no próximo render).
  const inFlightRef = useRef(new Set());
  const controllersRef = useRef(new Set());

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => controllers.forEach((controller) => controller.abort());
  }, []);

  const setSourceState = useCallback((source, value) => {
    if (source === RESULT_SOURCES.advisory) setAdvisory(value);
    else setEvaluate(value);
  }, []);

  // Idioma em que cada fonte foi pedida: guardado na submissão e reutilizado nas novas tentativas,
  // até o utilizador pedir explicitamente outro idioma para essa fonte.
  const languageRef = useRef({ [RESULT_SOURCES.advisory]: null, [RESULT_SOURCES.evaluate]: null });

  const track = useCallback(
    (source, settledPromise, controller, { requestedLanguage } = {}) => {
      inFlightRef.current.add(source);
      setSourceState(source, LOADING);

      settledPromise.then((settled) => {
        inFlightRef.current.delete(source);
        if (controller.signal.aborted) return;
        if (settled.state === 'success') {
          const result = SOURCES[source].map(settled.data);
          setSourceState(source, {
            status: 'success',
            // `requestedLanguage`: idioma PEDIDO. O idioma efectivo, se o backend o declarar, vem
            // em `contentLanguage` (mapper) e tem prioridade (utils/localizedContent.js).
            result: requestedLanguage ? { ...result, requestedLanguage } : result,
            error: null,
          });
        } else if (settled.error?.kind !== 'aborted') {
          setSourceState(source, { status: 'error', result: null, error: settled.error });
        }
      });
    },
    [setSourceState],
  );

  /**
   * Inicia a consulta. Devolve `false` se já houver um pedido em curso.
   * Os parâmetros devem já ter sido validados pelo formulário; o serviço valida de novo.
   * `language`: idioma da interface; a recomendação é pedida nesse idioma (só o /advisory).
   * @throws {import('../utils/validators.js').ConsultationInputError}
   */
  const submit = useCallback(
    (params, { language } = {}) => {
      if (inFlightRef.current.size > 0) return false;

      const controller = createTrackedController(controllersRef.current);
      let consultation;
      try {
        consultation = startConsultation(params, {
          signal: controller.signal,
          language,
          evaluateLanguageEnabled,
        });
      } catch (error) {
        controller.abort();
        throw error;
      }

      languageRef.current = {
        [RESULT_SOURCES.advisory]: language ?? null,
        [RESULT_SOURCES.evaluate]: language ?? null,
      };
      setSubmittedParams(params);
      track(RESULT_SOURCES.advisory, consultation.advisory, controller, {
        requestedLanguage: advisoryRequestedLanguage(language),
      });
      track(RESULT_SOURCES.evaluate, consultation.evaluate, controller, {
        requestedLanguage: evaluateRequestedLanguage(language, evaluateLanguageEnabled),
      });
      Promise.all([consultation.advisory, consultation.evaluate]).then(() =>
        controllersRef.current.delete(controller),
      );
      return true;
    },
    [track, evaluateLanguageEnabled],
  );

  /** Pede de novo um endpoint com os parâmetros já submetidos, no idioma indicado. */
  const requestSource = useCallback(
    (source, language) => {
      if (!submittedParams || !SOURCES[source] || inFlightRef.current.has(source)) return false;
      const controller = createTrackedController(controllersRef.current);
      const settled = settle(
        SOURCES[source].request(submittedParams, {
          signal: controller.signal,
          language,
          evaluateLanguageEnabled,
        }),
      );
      track(source, settled, controller, {
        requestedLanguage: SOURCES[source].requestedLanguage(language, evaluateLanguageEnabled),
      });
      settled.then(() => controllersRef.current.delete(controller));
      return true;
    },
    [submittedParams, track, evaluateLanguageEnabled],
  );

  /** Repete só um endpoint (ex.: após uma falha parcial), no mesmo idioma em que foi pedido. */
  const retrySource = useCallback(
    (source) => requestSource(source, languageRef.current[source] ?? undefined),
    [requestSource],
  );

  /**
   * Pede de novo só a recomendação (/advisory), noutro idioma, depois de o utilizador mudar o
   * idioma da interface. O /evaluate não é repetido. O texto é gerado de novo pelo serviço
   * (nunca traduzido no browser) e a redacção pode diferir da anterior.
   */
  const requestAdvisoryInLanguage = useCallback(
    (language) => {
      const started = requestSource(RESULT_SOURCES.advisory, language);
      if (started) languageRef.current[RESULT_SOURCES.advisory] = language;
      return started;
    },
    [requestSource],
  );

  /**
   * Pede de novo só a avaliação técnica (/evaluate) noutro idioma, para as justificações. Só existe
   * com a capacidade `VITE_API_EVALUATE_LANG` activa; o /advisory não é repetido.
   */
  const requestEvaluateInLanguage = useCallback(
    (language) => {
      if (!evaluateLanguageEnabled) return false;
      const started = requestSource(RESULT_SOURCES.evaluate, language);
      if (started) languageRef.current[RESULT_SOURCES.evaluate] = language;
      return started;
    },
    [requestSource, evaluateLanguageEnabled],
  );

  const isPending = advisory.status === 'loading' || evaluate.status === 'loading';

  return {
    submittedParams,
    advisory,
    evaluate,
    isPending,
    submit,
    retrySource,
    requestAdvisoryInLanguage,
    requestEvaluateInLanguage: evaluateLanguageEnabled ? requestEvaluateInLanguage : null,
  };
}
