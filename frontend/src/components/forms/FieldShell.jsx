import { StatusIcon } from '../ui/icons.jsx';

/**
 * Rótulo + controlo + dica + erro. O erro usa ícone e texto em Charcoal (Earth sobre Sage
 * não atinge 4,5:1), por isso o significado nunca depende só da cor.
 */
export default function FieldShell({ id, label, hint, error, children, extra }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-charcoal">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-dica`} className="mt-1 text-sm text-charcoal/75">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-erro`} className="mt-2 flex items-start gap-2 text-sm font-semibold text-charcoal">
          <StatusIcon tone="warning" className="mt-0.5 size-4 shrink-0 text-earth" />
          <span>{error}</span>
        </p>
      ) : null}
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}
