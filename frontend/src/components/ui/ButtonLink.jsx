import AppLink from './AppLink.jsx';
import { buttonClasses } from './buttonStyles.js';
import { ArrowIcon } from './icons.jsx';

/** Ligação com aspecto de botão. Usa-se para navegar; acções usam <Button>. */
export default function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  withArrow = true,
  className = '',
  children,
  ...rest
}) {
  return (
    <AppLink to={to} className={buttonClasses({ variant, size, className })} {...rest}>
      <span>{children}</span>
      {withArrow ? <ArrowIcon className="size-4 shrink-0" /> : null}
    </AppLink>
  );
}
