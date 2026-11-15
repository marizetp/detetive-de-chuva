import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api.js';
import { createTranslator } from '../i18n/translate.js';
import { getUserErrorMessage as getMessage } from './errorMessages.js';
import { ConsultationInputError } from './validators.js';

const pt = createTranslator('pt');
const en = createTranslator('en');
const getUserErrorMessage = (error) => getMessage(error, pt);

describe('getUserErrorMessage', () => {
  it('cancelamento pelo cliente não gera mensagem', () => {
    expect(getUserErrorMessage(new ApiError('aborted', 'x'))).toBeNull();
  });

  it.each([
    ['timeout', true],
    ['network', true],
    ['malformed', true],
    ['validation', false],
  ])('%s → mensagem em português, canRetry=%s', (kind, canRetry) => {
    const message = getUserErrorMessage(new ApiError(kind, 'técnico'));
    expect(message.title).toMatch(/\S/);
    expect(message.canRetry).toBe(canRetry);
    expect(message.title).not.toContain('técnico');
  });

  it('timeout menciona o arranque do servidor', () => {
    expect(getUserErrorMessage(new ApiError('timeout', 'x')).description).toMatch(/arrancar/);
  });

  it('distingue erros 5xx de outros erros HTTP', () => {
    expect(getUserErrorMessage(new ApiError('http', 'x', { status: 503 })).title).toBe(
      'O servidor encontrou um problema.',
    );
    expect(getUserErrorMessage(new ApiError('http', 'x', { status: 404 })).title).toBe(
      'O pedido não foi aceite pelo servidor.',
    );
  });

  it('422: limpa o prefixo técnico das mensagens do servidor', () => {
    const error = new ApiError('validation', 'HTTP 422', {
      status: 422,
      details: ["Value error, Província 'Luanda' não suportada."],
    });
    expect(getUserErrorMessage(error).serverMessages).toEqual(["Província 'Luanda' não suportada."]);
  });

  it('erros de validação local juntam as mensagens por campo', () => {
    const error = new ConsultationInputError({
      provincia: 'validation.provinceRequired',
      cultura: 'validation.cropRequired',
    });
    expect(getUserErrorMessage(error)).toMatchObject({
      canRetry: false,
      description: 'Seleccione uma província. Seleccione uma cultura.',
    });
  });

  it('erros desconhecidos → mensagem genérica, sem detalhes técnicos', () => {
    const message = getUserErrorMessage(new Error('stack trace secreto'));
    expect(message.title).toBe('Ocorreu um erro inesperado.');
    expect(JSON.stringify(message)).not.toContain('secreto');
  });

  it('as mensagens seguem o idioma do tradutor (en)', () => {
    expect(getMessage(new ApiError('http', 'x', { status: 503 }), en).title).toBe(
      'The server encountered a problem.',
    );
    expect(getMessage(new ApiError('network', 'x'), en).description).toBe(
      'Check your Internet connection and try again.',
    );
    const error = new ConsultationInputError({ provincia: 'validation.provinceRequired' });
    expect(getMessage(error, en).description).toBe('Select a province.');
  });
});
