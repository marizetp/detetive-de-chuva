import { useEffect, useState } from 'react';

/** Arranque a frio observado do servidor: ~54 s. Depois deste tempo, avisamos o utilizador. */
export const SLOW_REQUEST_NOTICE_MS = 8_000;

/**
 * Passa a `true` depois de `delayMs`. Usar dentro de um componente que só existe enquanto
 * a espera dura (ex.: painel de carregamento): ao desmontar, o estado reinicia sozinho.
 */
export function useDelayedFlag(delayMs = SLOW_REQUEST_NOTICE_MS) {
  const [isReached, setIsReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReached(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return isReached;
}
