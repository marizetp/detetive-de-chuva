import { useEffect, useRef } from 'react';
import { scrollToHash } from '../routing/navigation.js';

/**
 * Após cada navegação: desloca até à âncora, se existir; caso contrário, volta ao topo e move
 * o foco para o conteúdo principal, para que leitores de ecrã anunciem a nova página.
 * No primeiro carregamento só trata a âncora (o foco fica onde o navegador o pôs).
 */
export function useRouteFocus(location, mainRef) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    const isFirst = isFirstRender.current;
    isFirstRender.current = false;

    if (location.hash) {
      scrollToHash(location.hash);
      return;
    }
    if (isFirst) return;

    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.href, location.hash, mainRef]);
}
