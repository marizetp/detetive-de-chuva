import { getUserErrorMessage } from '../../utils/errorMessages.js';
import Button from '../ui/Button.jsx';
import { RetryIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import ResultSummary from './ResultSummary.jsx';

/**
 * Bloco de uma fonte de resultados (recomendação ou avaliação técnica), com estado próprio.
 * A origem é sempre identificada, para que as duas fontes nunca se confundam.
 */
export default function SourcePanel({ id, title, sourceLabel, endpoint, loadingLabel, state, onRetry }) {
  const headingId = `${id}-titulo`;
  const errorMessage = state.status === 'error' ? getUserErrorMessage(state.error) : null;

  return (
    <section aria-labelledby={headingId} className="border-t-2 border-forest pt-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id={headingId} className="text-2xl leading-snug font-semibold text-forest">
          {title}
        </h3>
        <p className="text-xs text-charcoal/75">
          {sourceLabel} · <code className="font-mono">{endpoint}</code>
        </p>
      </header>

      <div className="mt-6">
        {state.status === 'loading' ? <LoadingIndicator label={loadingLabel} /> : null}

        {state.status === 'error' && errorMessage ? (
          <InlineNotice
            tone="error"
            role="alert"
            title={errorMessage.title}
            action={
              errorMessage.canRetry ? (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RetryIcon className="size-4" />
                  <span>Tentar novamente</span>
                </Button>
              ) : null
            }
          >
            <p>{errorMessage.description}</p>
            {errorMessage.serverMessages.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errorMessage.serverMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </InlineNotice>
        ) : null}

        {state.status === 'success' && state.result ? <ResultSummary result={state.result} /> : null}
      </div>
    </section>
  );
}
