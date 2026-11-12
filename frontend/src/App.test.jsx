import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App (verificação da configuração)', () => {
  it('renderiza o título do projecto', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Detetive da Chuva' })).toBeInTheDocument();
  });
});
