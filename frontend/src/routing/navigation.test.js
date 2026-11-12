import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLocationSnapshot,
  navigate,
  scrollToHash,
  shouldLetBrowserHandleClick,
  subscribeToLocation,
} from './navigation.js';

beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(() => {
  document.body.innerHTML = '';
});

describe('navigate', () => {
  it('actualiza o endereço e notifica os subscritores', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocation(listener);

    navigate('/consulta');
    expect(getLocationSnapshot()).toBe('/consulta');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    navigate('/');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('não duplica entradas no histórico para o mesmo destino', () => {
    navigate('/consulta');
    const length = window.history.length;
    navigate('/consulta');
    expect(window.history.length).toBe(length);
  });

  it('voltar a clicar na mesma âncora desloca novamente até à secção', () => {
    document.body.innerHTML = '<section id="fontes">Fontes</section>';
    const section = document.getElementById('fontes');
    const scrollSpy = vi.spyOn(section, 'scrollIntoView');

    navigate('/#fontes');
    navigate('/#fontes');
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});

describe('scrollToHash', () => {
  it('move o foco para a secção (acessibilidade)', () => {
    document.body.innerHTML = '<section id="como-funciona">x</section>';
    expect(scrollToHash('#como-funciona')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('como-funciona'));
    expect(document.activeElement).toHaveAttribute('tabindex', '-1');
  });

  it('ignora âncoras inexistentes ou inválidas', () => {
    expect(scrollToHash('#nada')).toBe(false);
    expect(scrollToHash('#%E0%A4%A')).toBe(false);
    expect(scrollToHash('')).toBe(false);
  });
});

describe('shouldLetBrowserHandleClick', () => {
  const click = (overrides = {}) => ({
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  });

  it('clique normal é tratado pela aplicação', () => {
    expect(shouldLetBrowserHandleClick(click())).toBe(false);
  });

  it('Ctrl/⌘, botão do meio e target=_blank ficam com o navegador', () => {
    expect(shouldLetBrowserHandleClick(click({ ctrlKey: true }))).toBe(true);
    expect(shouldLetBrowserHandleClick(click({ metaKey: true }))).toBe(true);
    expect(shouldLetBrowserHandleClick(click({ button: 1 }))).toBe(true);
    expect(shouldLetBrowserHandleClick(click(), '_blank')).toBe(true);
  });
});
