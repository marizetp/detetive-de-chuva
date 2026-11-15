import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, ROUTE_IDS, normalizePathname, resolveRouteId } from './routes.js';

describe('routes', () => {
  it('normaliza barras finais', () => {
    expect(normalizePathname('/consulta/')).toBe('/consulta');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('')).toBe('/');
  });

  it('resolve as rotas conhecidas e o fallback', () => {
    expect(resolveRouteId('/')).toBe(ROUTE_IDS.home);
    expect(resolveRouteId('/consulta')).toBe(ROUTE_IDS.consultation);
    expect(resolveRouteId('/consulta/')).toBe(ROUTE_IDS.consultation);
    expect(resolveRouteId('/mapa')).toBe(ROUTE_IDS.map);
    expect(resolveRouteId('/mapa/')).toBe(ROUTE_IDS.map);
    expect(resolveRouteId('/ciclo')).toBe(ROUTE_IDS.cycle);
    expect(resolveRouteId('/ciclo/')).toBe(ROUTE_IDS.cycle);
    expect(resolveRouteId('/inexistente')).toBe(ROUTE_IDS.notFound);
  });

  it('a navegação inclui as secções da página inicial e os separadores Mapa e Ciclo separados', () => {
    expect(NAV_ITEMS.map((item) => item.to)).toEqual(['/', '/#como-funciona', '/#fontes', '/mapa', '/ciclo']);
  });
});
