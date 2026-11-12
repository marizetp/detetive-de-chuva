import { useCallback, useEffect, useState } from 'react';
import { mapCatalogOptions } from '../utils/mappers.js';

/**
 * @typedef {'loading' | 'success' | 'empty' | 'error'} CatalogStatus
 * @typedef {{ status: CatalogStatus, options: { id: string, label: string, value: string }[], error: unknown }} CatalogState
 */

const LOADING_STATE = Object.freeze({ status: 'loading', options: [], error: null });

/**
 * Carrega uma lista de opções (províncias ou culturas) a partir de um serviço do catálogo.
 * @param {(options: { signal: AbortSignal }) => Promise<unknown>} loadList função estável do serviço
 * @returns {CatalogState & { retry: () => void }}
 */
export function useCatalogOptions(loadList) {
  const [state, setState] = useState(LOADING_STATE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loadList({ signal: controller.signal }).then(
      (rawList) => {
        if (controller.signal.aborted) return;
        const { options } = mapCatalogOptions(rawList);
        setState({ status: options.length > 0 ? 'success' : 'empty', options, error: null });
      },
      (error) => {
        if (controller.signal.aborted || error?.kind === 'aborted') return;
        setState({ status: 'error', options: [], error });
      },
    );

    return () => controller.abort();
  }, [loadList, attempt]);

  const retry = useCallback(() => {
    setState(LOADING_STATE);
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
