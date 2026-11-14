import { useEffect } from 'react';

const REVEAL_SELECTOR = '[data-reveal]';
const INVIEW_SELECTOR = '[data-inview-scope]';

function motionIsAllowed() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return false;
  return !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

/**
 * Activa a camada de movimento (styles/motion.css) para toda a aplicação.
 *
 * - Marca `<html data-motion>`: só então o CSS esconde os elementos `[data-reveal]` antes da
 *   entrada. Sem IntersectionObserver ou com movimento reduzido, nada é escondido.
 * - Um IntersectionObserver acrescenta `data-revealed` quando cada elemento entra no viewport
 *   (uma só vez). É um atributo que o React não gere, por isso sobrevive a re-renderizações.
 * - Um MutationObserver apanha elementos montados mais tarde (ex.: o relatório após a consulta).
 * - `[data-inview-scope]` recebe/perde `data-inview` conforme está visível: a flutuação da
 *   ilustração só corre enquanto se vê.
 */
export function useRevealMotion() {
  useEffect(() => {
    if (!motionIsAllowed()) return undefined;
    const root = document.documentElement;
    root.setAttribute('data-motion', '');

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );

    const inviewObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute('data-inview', entry.isIntersecting);
      }
    });

    const observe = (scope) => {
      if (!(scope instanceof Element)) return;
      const reveals = scope.matches(REVEAL_SELECTOR) ? [scope] : [];
      reveals.push(...scope.querySelectorAll(REVEAL_SELECTOR));
      for (const element of reveals) {
        if (!element.hasAttribute('data-revealed')) revealObserver.observe(element);
      }
      const scopes = scope.matches(INVIEW_SELECTOR) ? [scope] : [];
      scopes.push(...scope.querySelectorAll(INVIEW_SELECTOR));
      for (const element of scopes) inviewObserver.observe(element);
    };

    observe(document.body);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) observe(node);
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      revealObserver.disconnect();
      inviewObserver.disconnect();
      root.removeAttribute('data-motion');
    };
  }, []);
}
