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
});
