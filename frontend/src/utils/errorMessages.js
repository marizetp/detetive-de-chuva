// Mensagens para o utilizador final. Nunca expor stack traces nem detalhes técnicos.

import { DEFAULT_LANGUAGE } from '../i18n/config.js';
import { createTranslator } from '../i18n/translate.js';
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
 * Erros HTTP que não são de validação (docs/docs2.md §7).
 * - 400 e 404: repetir o mesmo pedido dá o mesmo resultado → sem nova tentativa.
 * - 503 e restantes 5xx: falhas temporárias do serviço → nova tentativa.
 * - Outros 4xx (não documentados): mensagem genérica de pedido recusado, como até aqui.
 */
function httpErrorMessage(status, t) {
  const message = (key, canRetry) => ({
    title: t(`errors.${key}Title`),
    description: t(`errors.${key}Description`),
    canRetry,
    serverMessages: [],
  });
  if (status === 400) return message('badRequest', false);
  if (status === 404) return message('notFound', false);
  if (status === 503) return message('unavailable', true);
  if (typeof status === 'number' && status >= 500) return message('server', true);
  return message('rejected', true);
}

/**
 * @param {unknown} error
 * @param {(key: string) => string} [t] tradutor do idioma activo (useI18n().t)
 * @returns {UserErrorMessage | null} `null` para cancelamentos pedidos pelo próprio cliente
 */
export function getUserErrorMessage(error, t = createTranslator(DEFAULT_LANGUAGE)) {
  if (error instanceof ConsultationInputError) {
    return {
      title: t('errors.inputTitle'),
      description: Object.values(error.fieldErrors).map((key) => t(key)).join(' '),
      canRetry: false,
      serverMessages: [],
    };
  }

  if (!(error instanceof ApiError)) {
    return {
      title: t('errors.unexpectedTitle'),
      description: t('errors.unexpectedDescription'),
      canRetry: true,
      serverMessages: [],
    };
  }

  switch (error.kind) {
    case 'aborted':
      return null;
    case 'timeout':
      return {
        title: t('errors.timeoutTitle'),
        description: t('errors.timeoutDescription'),
        canRetry: true,
        serverMessages: [],
      };
    case 'network':
      return {
        title: t('errors.networkTitle'),
        description: t('errors.networkDescription'),
        canRetry: true,
        serverMessages: [],
      };
    case 'validation':
      // 422 sobre `lang`: o idioma pedido não é suportado por este endpoint. Não é um erro dos
      // dados da consulta; a mensagem técnica do servidor não é mostrada.
      if (error.fields?.includes('lang')) {
        return {
          title: t('errors.unsupportedLanguageTitle'),
          description: t('errors.unsupportedLanguageDescription'),
          canRetry: false,
          serverMessages: [],
        };
      }
      return {
        title: t('errors.validationTitle'),
        description: t('errors.validationDescription'),
        canRetry: false,
        serverMessages: error.details.map(cleanServerMessage).filter(Boolean),
      };
    case 'demoUnavailable':
      // Modo de demonstração: pedido sem resposta gravada. Repetir dá o mesmo resultado.
      return {
        title: t('errors.demoUnavailableTitle'),
        description: t('errors.demoUnavailableDescription'),
        canRetry: false,
        serverMessages: [],
      };
    case 'malformed':
      return {
        title: t('errors.malformedTitle'),
        description: t('errors.malformedDescription'),
        canRetry: true,
        serverMessages: [],
      };
    case 'http':
    default:
      return httpErrorMessage(error.status, t);
  }
}
