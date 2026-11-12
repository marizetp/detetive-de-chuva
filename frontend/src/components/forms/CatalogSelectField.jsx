import { getUserErrorMessage } from '../../utils/errorMessages.js';
import Button from '../ui/Button.jsx';
import { ChevronDownIcon, RetryIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import FieldShell from './FieldShell.jsx';
import { CONTROL_CLASSES, fieldDescriptionIds } from './fieldStyles.js';

/**
 * Selecção alimentada por um catálogo da API (províncias ou culturas).
 * Trata carregamento, lista vazia e erro com nova tentativa, sem bloquear o resto da página.
 *
 * @param {{
 *   id: string, label: string, hint?: string, placeholder: string,
 *   resourceLabel: string,  // ex.: "as províncias"
 *   emptyMessage: string,
 *   catalog: ReturnType<typeof import('../../hooks/useCatalogOptions.js').useCatalogOptions>,
 *   value: string, onChange: (value: string) => void, error?: string,
 *   inputRef?: import('react').Ref<HTMLSelectElement>,
 * }} props
 */
export default function CatalogSelectField({
  id,
  label,
  hint,
  placeholder,
  resourceLabel,
  emptyMessage,
  catalog,
  value,
  onChange,
  error,
  inputRef,
}) {
  const isReady = catalog.status === 'success';
  const describedBy = fieldDescriptionIds(id, { hint, error });

  let extra = null;
  if (catalog.status === 'loading') {
    // O aviso de demora e o anúncio para leitores de ecrã são dados uma vez pelo formulário.
    extra = <LoadingIndicator label={`A carregar ${resourceLabel}…`} slowNotice={false} live={false} />;
  } else if (catalog.status === 'error') {
    const message = getUserErrorMessage(catalog.error);
    extra = (
      <InlineNotice
        tone="error"
        role="alert"
        title={`Não foi possível carregar ${resourceLabel}.`}
        action={
          <Button variant="outline" size="sm" onClick={catalog.retry}>
            <RetryIcon className="size-4" />
            <span>Tentar novamente</span>
          </Button>
        }
      >
        {message?.description}
      </InlineNotice>
    );
  } else if (catalog.status === 'empty') {
    extra = (
      <InlineNotice
        tone="info"
        role="status"
        title={emptyMessage}
        action={
          <Button variant="outline" size="sm" onClick={catalog.retry}>
            <RetryIcon className="size-4" />
            <span>Verificar novamente</span>
          </Button>
        }
      />
    );
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} extra={extra}>
      <div className="relative">
        <select
          id={id}
          ref={inputRef}
          name={id}
          value={isReady ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={!isReady}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL_CLASSES} appearance-none pr-11`}
        >
          <option value="" disabled>
            {isReady ? placeholder : '—'}
          </option>
          {catalog.options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-accent" />
      </div>
    </FieldShell>
  );
}
