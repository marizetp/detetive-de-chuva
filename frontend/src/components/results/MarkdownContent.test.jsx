import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownContent from './MarkdownContent.jsx';

// Formatos observados na API a 2026-11-12: títulos "###" ou a negrito, listas "*" e numeradas, "---".
const SAMPLE = [
  '**FAVORÁVEL: O período atual é favorável para a sementeira de Milho.**',
  '',
  '### Justificações Técnicas:',
  '* **Reservas Hídricas no Solo:** A humidade apresenta níveis adequados.',
  '* **Comportamento das Chuvas:** A previsão assegura humidade.',
  '',
  '---',
  '',
  '### Recomendação Prática de Campo:',
  '1. Abra uma pequena cova.',
  '2. Aperte a terra na mão.',
].join('\n');

describe('MarkdownContent', () => {
  it('preserva títulos, parágrafos, ênfase, listas e separadores', () => {
    const { container } = render(<MarkdownContent text={SAMPLE} />);

    expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'Justificações Técnicas:',
      'Recomendação Prática de Campo:',
    ]);
    expect(container.querySelector('strong')).toHaveTextContent(
      'FAVORÁVEL: O período atual é favorável para a sementeira de Milho.',
    );
    expect(container.querySelectorAll('ul > li')).toHaveLength(2);
    expect(container.querySelectorAll('ol > li')).toHaveLength(2);
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('não altera o texto recebido (só a marcação Markdown desaparece)', () => {
    const { container } = render(<MarkdownContent text={SAMPLE} />);
    const expectedText = SAMPLE.replace(/\*\*|### |^\* |^\d+\. |^---$/gm, '').replace(/\s+/g, '');
    expect(container.textContent.replace(/\s+/g, '')).toBe(expectedText);
  });

  it('não injecta HTML: scripts, imagens e atributos de evento são ignorados', () => {
    const { container } = render(
      <MarkdownContent
        text={'Antes <script>alert(1)</script> <img src=x onerror="alert(2)"> depois\n\n<b>negrito html</b>'}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });

  it('imagens em Markdown não são carregadas', () => {
    const { container } = render(<MarkdownContent text="![rastreio](https://exemplo.org/pixel.png)" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('ligações javascript: são neutralizadas; ligações normais abrem em segurança', () => {
    const { container } = render(
      <MarkdownContent text="[mau](javascript:alert(1)) e [bom](https://exemplo.org)" />,
    );
    const links = [...container.querySelectorAll('a')];
    expect(links.some((a) => (a.getAttribute('href') ?? '').startsWith('javascript:'))).toBe(false);
    const good = links.find((a) => a.textContent === 'bom');
    expect(good).toHaveAttribute('href', 'https://exemplo.org');
    expect(good).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
