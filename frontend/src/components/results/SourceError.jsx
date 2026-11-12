import { getUserErrorMessage } from '../../utils/errorMessages.js';
import Button from '../ui/Button.jsx';
import { RetryIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import { SOURCE_META } from './reportStructure.js';

/**
 * Erro de uma fonte, com nova tentativa só dessa fonte (os mesmos parâmetros).
 * O título indica sempre qual das fontes falhou.
 */
export default function SourceError({ source, error, onRetry }) {
  const message = getUserErrorMessage(error);
  if (!message) return null;
  const meta = SOURCE_META[source];

  return (
    <InlineNotice
      tone="error"
      role="alert"
      title={`${meta.name} indisponível. ${message.title}`}
      action={
        message.canRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RetryIcon className="size-4" />
            <span>Tentar novamente</span>
          </Button>
        ) : null
      }
    >
      <p>{message.description}</p>
      {message.serverMessages.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {message.serverMessages.map((serverMessage) => (
            <li key={serverMessage}>{serverMessage}</li>
          ))}
        </ul>
      ) : null}
    </InlineNotice>
  );
}
