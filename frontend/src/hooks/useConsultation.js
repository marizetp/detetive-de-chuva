import { useCallback, useEffect, useRef, useState } from 'react';
import { RESULT_SOURCES } from '../config/api.js';
import { postAdvisory, postEvaluate, startConsultation } from '../services/consultation.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../utils/mappers.js';

/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} SourceStatus
 * @typedef {{ status: SourceStatus, result: object | null, error: unknown }} SourceState
 */

const IDLE = Object.freeze({ status: 'idle', result: null, error: null });
const LOADING = Object.freeze({ status: 'loading', result: null, error: null });

/** Cada fonte tem o seu pedido, o seu mapper e o seu estado — nunca se misturam. */
const SOURCES = {
  [RESULT_SOURCES.advisory]: { request: postAdvisory, map: mapAdvisoryResponse },
  [RESULT_SOURCES.evaluate]: { request: postEvaluate, map: mapEvaluateResponse },
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
export function useConsultation() {
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

  const track = useCallback(
    (source, settledPromise, controller) => {
      inFlightRef.current.add(source);
      setSourceState(source, LOADING);

      settledPromise.then((settled) => {
        inFlightRef.current.delete(source);
        if (controller.signal.aborted) return;
        if (settled.state === 'success') {
          setSourceState(source, {
            status: 'success',
            result: SOURCES[source].map(settled.data),
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
   * @throws {import('../utils/validators.js').ConsultationInputError}
   */
  const submit = useCallback(
    (params) => {
      if (inFlightRef.current.size > 0) return false;

      const controller = createTrackedController(controllersRef.current);
      let consultation;
      try {
        consultation = startConsultation(params, { signal: controller.signal });
      } catch (error) {
        controller.abort();
        throw error;
      }

      setSubmittedParams(params);
      track(RESULT_SOURCES.advisory, consultation.advisory, controller);
      track(RESULT_SOURCES.evaluate, consultation.evaluate, controller);
      Promise.all([consultation.advisory, consultation.evaluate]).then(() =>
        controllersRef.current.delete(controller),
      );
      return true;
    },
    [track],
  );

  /** Repete só um endpoint (ex.: após uma falha parcial), com os parâmetros já submetidos. */
  const retrySource = useCallback(
    (source) => {
      if (!submittedParams || !SOURCES[source] || inFlightRef.current.has(source)) return false;
      const controller = createTrackedController(controllersRef.current);
      const settled = settle(
        SOURCES[source].request(submittedParams, { signal: controller.signal }),
      );
      track(source, settled, controller);
      settled.then(() => controllersRef.current.delete(controller));
      return true;
    },
    [submittedParams, track],
  );

  const isPending = advisory.status === 'loading' || evaluate.status === 'loading';

  return { submittedParams, advisory, evaluate, isPending, submit, retrySource };
}
