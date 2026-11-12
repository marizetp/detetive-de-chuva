import AppLink from './AppLink.jsx';
import { ArrowIcon } from './icons.jsx';

const BASE =
  'inline-flex items-center gap-2.5 font-semibold transition-colors duration-200 ' +
  'motion-safe:[&_svg]:transition-transform motion-safe:hover:[&_svg]:translate-x-0.5';

const VARIANTS = {
  /** Acção principal: pílula Forest sobre fundos claros. */
  primary: 'rounded-full bg-forest text-ivory hover:bg-charcoal active:bg-charcoal',
  /** Acção principal sobre superfícies Forest. */
  inverse: 'rounded-full bg-ivory text-forest hover:bg-sage',
  /** Acção secundária: texto sublinhado, sem caixa. */
  text:
    'text-forest underline decoration-forest/30 decoration-2 underline-offset-[6px] hover:decoration-forest',
};

/** Alvos de toque: 48 px (md) e 40 px (sm, só em barras compactas com alternativa maior). */
const SIZES = {
  md: { pill: 'min-h-12 px-6 py-3', text: 'min-h-12 py-3' },
  sm: { pill: 'min-h-10 px-5 py-2 text-sm', text: 'min-h-10 py-2 text-sm' },
};

/** Ligação com aspecto de botão. Usa-se para navegar; acções de formulário usam <button>. */
export default function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  withArrow = true,
  className = '',
  children,
  ...rest
}) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.primary;
  const sizeSet = SIZES[size] ?? SIZES.md;
  const sizeClasses = variant === 'text' ? sizeSet.text : sizeSet.pill;

  return (
    <AppLink to={to} className={`${BASE} ${variantClasses} ${sizeClasses} ${className}`} {...rest}>
      <span>{children}</span>
      {withArrow ? <ArrowIcon className="size-4 shrink-0" /> : null}
    </AppLink>
  );
}
