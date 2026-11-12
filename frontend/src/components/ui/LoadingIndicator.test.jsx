import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoadingIndicator from './LoadingIndicator.jsx';

afterEach(() => vi.useRealTimers());

describe('LoadingIndicator', () => {
  it('anuncia o carregamento e, após a espera, explica o possível arranque do servidor', () => {
    vi.useFakeTimers();
    render(<LoadingIndicator label="A obter a recomendação…" slowNoticeMs={8000} />);

    expect(screen.getByRole('status')).toHaveTextContent('A obter a recomendação…');
    expect(screen.queryByText(/pode estar a arrancar/)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText(/pode estar a arrancar/)).toBeInTheDocument();
  });

  it('slowNotice={false}: nunca mostra o aviso de demora, mesmo depois da espera', () => {
    vi.useFakeTimers();
    render(<LoadingIndicator label="A obter a avaliação técnica…" slowNotice={false} slowNoticeMs={8000} />);

    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText('A obter a avaliação técnica…')).toBeInTheDocument();
    expect(screen.queryByText(/Está a demorar mais do que o habitual/)).not.toBeInTheDocument();
    // Continua a ser anunciado: `slowNotice` não afecta `live`.
    expect(screen.getByRole('status')).toHaveTextContent('A obter a avaliação técnica…');
  });

  it('live={false}: o texto continua visível, mas não é uma região anunciada', () => {
    vi.useFakeTimers();
    render(<LoadingIndicator label="A obter a recomendação…" live={false} slowNoticeMs={8000} />);

    expect(screen.getByText('A obter a recomendação…')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // `live` não afecta `slowNotice`: o aviso de demora continua a aparecer.
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText(/Está a demorar mais do que o habitual/)).toBeInTheDocument();
  });

  it('indicador secundário (slowNotice={false}, live={false}): silencioso e sem aviso', () => {
    vi.useFakeTimers();
    render(<LoadingIndicator label="A carregar as culturas…" slowNotice={false} live={false} slowNoticeMs={8000} />);

    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText('A carregar as culturas…')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/Está a demorar mais do que o habitual/)).not.toBeInTheDocument();
  });
});
