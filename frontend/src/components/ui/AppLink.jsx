import { navigate, shouldLetBrowserHandleClick } from '../../routing/navigation.js';

/**
 * Ligação interna: um <a href> real (funciona sem JavaScript, abre em nova aba com Ctrl/⌘),
 * mas navega sem recarregar a página num clique normal.
 */
export default function AppLink({ to, onClick, target, children, ...rest }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (shouldLetBrowserHandleClick(event, target)) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
