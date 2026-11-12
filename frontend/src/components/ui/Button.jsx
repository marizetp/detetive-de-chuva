import { buttonClasses } from './buttonStyles.js';

/**
 * Botão de acção. `isUnavailable` usa aria-disabled em vez de `disabled`: o botão continua
 * focável (o foco do teclado não se perde durante um pedido) mas o clique é ignorado.
 */
export default function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  isUnavailable = false,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const handleClick = (event) => {
    if (isUnavailable) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      aria-disabled={isUnavailable || undefined}
      onClick={handleClick}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {children}
    </button>
  );
}
