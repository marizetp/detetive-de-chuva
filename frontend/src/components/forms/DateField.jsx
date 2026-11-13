import FieldShell from './FieldShell.jsx';
import { CONTROL_CLASSES, fieldDescriptionIds } from './fieldStyles.js';

/**
 * Data da consulta. Suporta datas imediatas e datas futuras de planeamento de safra.
 */
export default function DateField({ id, label, hint, value, max, onChange, error, inputRef }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        ref={inputRef}
        name={id}
        type="date"
        value={value}
        max={max || undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionIds(id, { hint, error })}
        className={CONTROL_CLASSES}
      />
    </FieldShell>
  );
}
