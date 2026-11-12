import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import SiteHeader from './SiteHeader.jsx';

beforeEach(() => window.history.replaceState(null, '', '/'));

function getMenuButton() {
  return screen.getByRole('button', { name: /Menu|Fechar/ });
}

describe('SiteHeader — menu em telemóvel', () => {
  it('começa fechado e associado ao painel', () => {
    render(<SiteHeader currentPath="/" />);
    const button = getMenuButton();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    expect(panel).not.toBeNull();
    expect(panel).not.toBeVisible();
  });

  it('abre e fecha com o botão', () => {
    render(<SiteHeader currentPath="/" />);
    fireEvent.click(getMenuButton());
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(getMenuButton()).toHaveTextContent('Fechar');
    fireEvent.click(getMenuButton());
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape fecha o menu e devolve o foco ao botão', () => {
    render(<SiteHeader currentPath="/" />);
    fireEvent.click(getMenuButton());
    const mobileNav = screen.getByRole('navigation', { name: 'Principal (telemóvel)' });
    fireEvent.keyDown(mobileNav, { key: 'Escape' });
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(getMenuButton());
  });

  it('escolher uma ligação fecha o menu', () => {
    render(<SiteHeader currentPath="/" />);
    fireEvent.click(getMenuButton());
    const mobileNav = screen.getByRole('navigation', { name: 'Principal (telemóvel)' });
    fireEvent.click(mobileNav.querySelector('a[href="/#fontes"]'));
    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('marca "Iniciar consulta" como página actual em /consulta', () => {
    render(<SiteHeader currentPath="/consulta" />);
    const current = screen
      .getAllByRole('link', { hidden: true })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.length).toBeGreaterThan(0);
    current.forEach((link) => expect(link).toHaveAttribute('href', '/consulta'));
  });
});
