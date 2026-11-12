import { StatusIcon } from '../ui/icons.jsx';

/**
 * Rótulo + controlo + dica + erro. O erro tem ícone NASA Red e texto Orbital White, para o
 * significado nunca depender só da cor.
 */
export default function FieldShell({ id, label, hint, error, children, extra }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-dica`} className="mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-erro`} className="mt-2 flex items-start gap-2 text-sm font-semibold text-ink">
          <StatusIcon tone="warning" className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{error}</span>
        </p>
      ) : null}
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}
