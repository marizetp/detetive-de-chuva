// Estilo e ligações de acessibilidade partilhados pelos controlos de formulário.
// Contorno Steel Blue (line-strong): 4,6:1 sobre Space Black e 4,1:1 sobre Mission Navy (WCAG 1.4.11 ≥ 3:1).
// Texto a 16 px evita o zoom automático do iOS ao focar.

export const CONTROL_CLASSES =
  'block min-h-12 w-full rounded-lg border border-line-strong bg-canvas px-4 py-2.5 text-base ' +
  'text-ink [color-scheme:dark] transition-colors hover:border-accent ' +
  'aria-invalid:border-2 aria-invalid:border-danger ' +
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas/60 disabled:text-ink-subtle';

/** ids da dica e do erro, para `aria-describedby` do controlo. */
export function fieldDescriptionIds(id, { hint, error }) {
  const ids = [hint ? `${id}-dica` : null, error ? `${id}-erro` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
