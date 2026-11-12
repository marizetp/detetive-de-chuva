// Mensagens para o utilizador final. Nunca expor stack traces nem detalhes técnicos.

import { ApiError } from '../services/api.js';
import { ConsultationInputError } from './validators.js';

/**
 * @typedef {{ title: string, description: string, canRetry: boolean, serverMessages: string[] }} UserErrorMessage
 */

/** Remove o prefixo técnico do Pydantic (ex.: "Value error, Província 'Luanda' não suportada…"). */
function cleanServerMessage(message) {
  return message.replace(/^Value error,\s*/i, '').trim();
}

/**
 * @param {unknown} error
 * @returns {UserErrorMessage | null} `null` para cancelamentos pedidos pelo próprio cliente
 */
export function getUserErrorMessage(error) {
  if (error instanceof ConsultationInputError) {
    return {
      title: 'Verifique os dados da consulta.',
      description: Object.values(error.fieldErrors).join(' '),
      canRetry: false,
      serverMessages: [],
    };
  }

  if (!(error instanceof ApiError)) {
    return {
      title: 'Ocorreu um erro inesperado.',
      description: 'Tente novamente. Se o problema continuar, volte mais tarde.',
      canRetry: true,
      serverMessages: [],
    };
  }

  switch (error.kind) {
    case 'aborted':
      return null;
    case 'timeout':
      return {
        title: 'O servidor demorou demasiado a responder.',
        description:
          'O serviço pode estar a arrancar após um período sem utilização. Aguarde alguns instantes e tente novamente.',
        canRetry: true,
        serverMessages: [],
      };
    case 'network':
      return {
        title: 'Não foi possível ligar ao servidor.',
        description: 'Verifique a sua ligação à Internet e tente novamente.',
        canRetry: true,
        serverMessages: [],
      };
    case 'validation':
      return {
        title: 'A consulta não foi aceite pelo servidor.',
        description: 'Reveja a província, a cultura e a data seleccionadas.',
        canRetry: false,
        serverMessages: error.details.map(cleanServerMessage).filter(Boolean),
      };
    case 'malformed':
      return {
        title: 'Não foi possível interpretar a resposta do servidor.',
        description: 'Tente novamente dentro de alguns instantes.',
        canRetry: true,
        serverMessages: [],
      };
    case 'http':
    default: {
      const isServerError = typeof error.status === 'number' && error.status >= 500;
      return {
        title: isServerError
          ? 'O servidor encontrou um problema.'
          : 'O pedido não foi aceite pelo servidor.',
        description: isServerError
          ? 'Tente novamente dentro de alguns instantes.'
          : 'Reveja os dados da consulta e tente novamente.',
        canRetry: true,
        serverMessages: [],
      };
    }
  }
}
