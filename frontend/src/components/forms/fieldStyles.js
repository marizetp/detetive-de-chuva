// Estilo e ligações de acessibilidade partilhados pelos controlos de formulário.
// Contorno Charcoal a 60%: ≥ 3:1 sobre Ivory e sobre Sage (WCAG 1.4.11, componentes de interface).
// Texto a 16 px evita o zoom automático do iOS ao focar.

export const CONTROL_CLASSES =
  'block min-h-12 w-full rounded-lg border border-charcoal/60 bg-ivory px-4 py-2.5 text-base ' +
  'text-charcoal [color-scheme:light] transition-colors hover:border-forest ' +
  'aria-invalid:border-2 aria-invalid:border-earth ' +
  'disabled:cursor-not-allowed disabled:border-charcoal/30 disabled:bg-ivory/60 disabled:text-charcoal/60';

/** ids da dica e do erro, para `aria-describedby` do controlo. */
export function fieldDescriptionIds(id, { hint, error }) {
  const ids = [hint ? `${id}-dica` : null, error ? `${id}-erro` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
