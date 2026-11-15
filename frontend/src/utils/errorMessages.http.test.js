import { describe, expect, it } from 'vitest';
import { createTranslator } from '../i18n/translate.js';
import { ApiError } from '../services/api.js';
import { getUserErrorMessage } from './errorMessages.js';

// Códigos documentados em docs/docs2.md §7 (400, 404, 422, 503) e 500 (não documentado).
const pt = createTranslator('pt');
const en = createTranslator('en');
const http = (status) => new ApiError('http', `HTTP ${status}`, { status });

describe('getUserErrorMessage — códigos HTTP da API v1.1', () => {
  it.each([
    [400, 'O pedido não foi aceite pelo servidor.', 'The server did not accept the request.', false],
    [404, 'A informação solicitada não foi encontrada.', 'The requested information was not found.', false],
    [500, 'O servidor encontrou um problema.', 'The server encountered a problem.', true],
    [502, 'O servidor encontrou um problema.', 'The server encountered a problem.', true],
    [503, 'O serviço está temporariamente indisponível.', 'The service is temporarily unavailable.', true],
  ])('%s → título por idioma e canRetry=%s', (status, titlePt, titleEn, canRetry) => {
    expect(getUserErrorMessage(http(status), pt)).toMatchObject({ title: titlePt, canRetry });
    expect(getUserErrorMessage(http(status), en)).toMatchObject({ title: titleEn, canRetry });
  });

  it('400 e 404: pedem correcção ou indicam recurso indisponível, sem repetição', () => {
    expect(getUserErrorMessage(http(400), pt).description).toMatch(/corrija o que for necessário/);
    expect(getUserErrorMessage(http(404), pt).description).toBe(
      'O recurso poderá não estar disponível nesta versão do serviço.',
    );
    expect(getUserErrorMessage(http(404), en).description).toBe(
      'This resource may not be available in this version of the service.',
    );
  });

  it('422: identifica um problema de validação dos dados enviados, não uma falha do servidor', () => {
    const error = new ApiError('validation', 'HTTP 422', { status: 422, details: [] });
    const messagePt = getUserErrorMessage(error, pt);
    expect(messagePt).toMatchObject({ title: 'Os dados da consulta não são válidos.', canRetry: false });
    expect(messagePt.title).not.toMatch(/servidor/);
    expect(getUserErrorMessage(error, en).title).toBe('The consultation details are not valid.');
  });

  it('falha de ligação, timeout e resposta inválida continuam repetíveis', () => {
    for (const kind of ['network', 'timeout', 'malformed']) {
      expect(getUserErrorMessage(new ApiError(kind, 'x'), en).canRetry).toBe(true);
    }
  });

  it('nunca expõe o detalhe técnico do servidor no título ou na descrição', () => {
    const error = new ApiError('http', 'HTTP 400', {
      status: 400,
      details: ["Invalid isoformat string: '15-11-2026'"],
    });
    const message = getUserErrorMessage(error, pt);
    expect(`${message.title} ${message.description}`).not.toMatch(/isoformat/);
  });
});
