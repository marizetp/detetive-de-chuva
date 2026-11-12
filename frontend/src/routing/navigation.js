// Navegação mínima com a History API, sem dependências.
// Nota de publicação: o servidor estático deve devolver index.html para caminhos desconhecidos
// (ex.: /consulta), tal como o Vite já faz em `dev` e `preview`.

const NAVIGATION_EVENT = 'detetive:navigate';

/** Caminho + pesquisa + âncora actuais (string comparável por valor). */
export function getLocationSnapshot() {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

export function subscribeToLocation(onChange) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATION_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATION_EVENT, onChange);
  };
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Desloca a página até ao elemento da âncora e move o foco para ele (para leitores de ecrã
 * e navegação por teclado). Devolve `false` se o elemento não existir.
 */
export function scrollToHash(hash) {
  if (typeof hash !== 'string' || hash.length < 2) return false;
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return false;
  }
  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  return true;
}

/**
 * Navega para um caminho interno sem recarregar a página.
 * URLs de outra origem seguem a navegação normal do navegador.
 */
export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.assign(url.href);
    return;
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === getLocationSnapshot()) {
    // Mesmo destino (ex.: clicar outra vez numa âncora): só voltar a deslocar.
    if (url.hash) scrollToHash(url.hash);
    return;
  }

  window.history[replace ? 'replaceState' : 'pushState'](null, '', next);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

/** Indica se um clique deve ser tratado pelo navegador (nova aba, tecla modificadora, etc.). */
export function shouldLetBrowserHandleClick(event, target) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (typeof target === 'string' && target !== '' && target !== '_self')
  );
}
