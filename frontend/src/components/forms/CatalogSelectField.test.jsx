import { fireEvent, render, screen } from '../../test/render.jsx';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api.js';
import CatalogSelectField from './CatalogSelectField.jsx';

// Erros ao carregar um catálogo (/provinces, /crops): a nova tentativa segue o `canRetry` de
// getUserErrorMessage, a mesma regra do relatório.

function renderField(error, { language = 'pt' } = {}) {
  const retry = vi.fn();
  render(
    <CatalogSelectField
      id="provincia"
      label="Província"
      placeholder="Seleccione a província"
      loadingLabel="A carregar as províncias…"
      errorTitle="Não foi possível carregar as províncias."
      emptyMessage="Não há províncias disponíveis de momento."
      catalog={{ status: 'error', options: [], error, retry }}
      value=""
      onChange={() => {}}
    />,
    { language },
  );
  return { retry };
}

const http = (status) => new ApiError('http', `HTTP ${status}`, { status });

describe('CatalogSelectField — erros ao carregar o catálogo', () => {
  it.each([
    ['400', http(400), 'Verifique os dados da consulta'],
    ['404', http(404), 'O recurso poderá não estar disponível nesta versão do serviço.'],
    ['422', new ApiError('validation', 'HTTP 422', { status: 422, details: [] }), 'Verifique a província, a cultura e a data'],
  ])('%s: mensagem própria, sem nova tentativa', (_, error, description) => {
    renderField(error);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as províncias.');
    expect(screen.getByText(new RegExp(description))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it.each([
    ['500', http(500)],
    ['503', http(503)],
    ['timeout', new ApiError('timeout', 'x')],
    ['falha de ligação', new ApiError('network', 'x')],
  ])('%s: permite nova tentativa', (_, error) => {
    const { retry } = renderField(error);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('em inglês: mensagem e botão no idioma activo', () => {
    renderField(http(503), { language: 'en' });
    expect(screen.getByText('Try again in a few minutes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('em inglês, 404 sem nova tentativa', () => {
    renderField(http(404), { language: 'en' });
    expect(screen.getByText('This resource may not be available in this version of the service.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
