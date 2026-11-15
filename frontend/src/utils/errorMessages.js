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
      return {
        title: t('errors.validationTitle'),
        description: t('errors.validationDescription'),
        canRetry: false,
        serverMessages: error.details.map(cleanServerMessage).filter(Boolean),
      };
    case 'malformed':
      return {
        title: t('errors.malformedTitle'),
        description: t('errors.malformedDescription'),
        canRetry: true,
        serverMessages: [],
      };
    case 'http':
    default: {
      const isServerError = typeof error.status === 'number' && error.status >= 500;
      return {
        title: isServerError ? t('errors.serverTitle') : t('errors.rejectedTitle'),
        description: isServerError ? t('errors.serverDescription') : t('errors.rejectedDescription'),
        canRetry: true,
        serverMessages: [],
      };
    }
  }
}
