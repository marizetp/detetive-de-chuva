// Rotas e navegação principal. Fonte única para caminhos e âncoras de secção.

export const ROUTES = Object.freeze({
  home: '/',
  consultation: '/consulta',
});

export const ROUTE_IDS = Object.freeze({
  home: 'home',
  consultation: 'consultation',
  notFound: 'notFound',
});

/** Identificadores das secções da página inicial (usados como âncoras). */
export const SECTION_IDS = Object.freeze({
  about: 'apresentacao',
  howItWorks: 'como-funciona',
  sources: 'fontes',
});

/** Âncoras da página de consulta. */
export const CONSULTATION_ANCHORS = Object.freeze({
  form: 'consulta-formulario',
});

/** `labelKey`: chave do dicionário (i18n), traduzida pelos componentes. */
export const NAV_ITEMS = Object.freeze([
  Object.freeze({ labelKey: 'nav.home', to: ROUTES.home }),
  Object.freeze({ labelKey: 'nav.howItWorks', to: `${ROUTES.home}#${SECTION_IDS.howItWorks}` }),
  Object.freeze({ labelKey: 'nav.sources', to: `${ROUTES.home}#${SECTION_IDS.sources}` }),
]);

/** Remove a barra final (excepto na raiz): "/consulta/" → "/consulta". */
export function normalizePathname(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return ROUTES.home;
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? ROUTES.home : trimmed;
}

/** @returns {keyof typeof ROUTE_IDS} */
export function resolveRouteId(pathname) {
  const path = normalizePathname(pathname);
  if (path === ROUTES.home) return ROUTE_IDS.home;
  if (path === ROUTES.consultation) return ROUTE_IDS.consultation;
  return ROUTE_IDS.notFound;
}
