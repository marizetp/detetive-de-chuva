import FieldShell from './FieldShell.jsx';
import { CONTROL_CLASSES, fieldDescriptionIds } from './fieldStyles.js';

/**
 * Data da consulta. `max` desactiva datas futuras no selector nativo; como alguns navegadores
 * permitem escrever a data à mão, a validação do formulário repete a verificação.
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
        max={max}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionIds(id, { hint, error })}
        className={CONTROL_CLASSES}
      />
    </FieldShell>
  );
}
