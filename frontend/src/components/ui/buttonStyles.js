// Classes partilhadas por ButtonLink (navegação) e Button (acções). Fonte única do estilo dos botões.

const BASE =
  'inline-flex items-center gap-2.5 font-semibold transition-colors duration-200 ' +
  'motion-safe:[&_svg]:transition-transform motion-safe:hover:[&_svg]:translate-x-0.5 ' +
  'aria-disabled:cursor-not-allowed';

const VARIANTS = {
  /**
   * Acção principal: pílula com o gradiente de acção Aurora Blue e texto branco puro (≥ 4,58:1 em
   * toda a extensão); hover e active escurecem o mesmo gradiente (5,43:1 e 6,49:1).
   * Indisponível: sem gradiente (`bg-none`, porque o fundo é background-image), contorno Steel Blue
   * e texto ink-subtle (≥ 5,7:1). O contorno transparente evita mudança de tamanho.
   */
  primary:
    'rounded-full border border-transparent bg-action text-action-ink hover:bg-action-hover ' +
    'active:bg-action-active aria-disabled:border-line-strong aria-disabled:bg-none ' +
    'aria-disabled:text-ink-subtle aria-disabled:hover:bg-none aria-disabled:active:bg-none',
  /**
   * Acção secundária com contorno Steel Blue (≥ 4,1:1), para acções locais (ex.: tentar novamente);
   * ao passar, contorno Aurora text (≥ 6,3:1). Não compete com o gradiente do CTA.
   */
  outline:
    'rounded-full border border-line-strong text-ink hover:border-interactive aria-disabled:opacity-60',
  /** Acção secundária: texto sublinhado, sem caixa; cyan ao passar, como a navegação. */
  text:
    'text-ink underline decoration-line-strong decoration-2 underline-offset-[6px] ' +
    'hover:text-interactive hover:decoration-interactive aria-disabled:opacity-60',
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
