// Classes partilhadas por ButtonLink (navegação) e Button (acções). Fonte única do estilo dos botões.

const BASE =
  'inline-flex items-center gap-2.5 font-semibold transition-colors duration-200 ' +
  'motion-safe:[&_svg]:transition-transform motion-safe:hover:[&_svg]:translate-x-0.5 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

const VARIANTS = {
  /** Acção principal: pílula Telemetry Cyan com texto Space Black (6,8:1); Orbital White ao passar. */
  primary:
    'rounded-full bg-accent text-canvas hover:bg-ink active:bg-ink aria-disabled:hover:bg-accent',
  /** Acção principal alternativa: pílula Orbital White com texto Space Black (16,9:1). */
  inverse: 'rounded-full bg-ink text-canvas hover:bg-accent',
  /** Acção secundária com contorno, para acções locais (ex.: tentar novamente). */
  outline: 'rounded-full border border-accent text-accent hover:bg-accent/10',
  /** Acção secundária: texto sublinhado, sem caixa. */
  text:
    'text-accent underline decoration-accent/40 decoration-2 underline-offset-[6px] hover:decoration-accent',
};

/** Alvos de toque: 48 px (md) e 40 px (sm, só em barras compactas com alternativa maior). */
const SIZES = {
  md: { pill: 'min-h-12 px-6 py-3', text: 'min-h-12 py-3' },
  sm: { pill: 'min-h-10 px-5 py-2 text-sm', text: 'min-h-10 py-2 text-sm' },
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.primary;
  const sizeSet = SIZES[size] ?? SIZES.md;
  const sizeClasses = variant === 'text' ? sizeSet.text : sizeSet.pill;
  return `${BASE} ${variantClasses} ${sizeClasses} ${className}`.trim();
}
