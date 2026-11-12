/** Largura máxima e margens laterais consistentes (16 px em telemóvel). */
export default function Container({ as: Component = 'div', className = '', children, ...rest }) {
  return (
    <Component className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 ${className}`} {...rest}>
      {children}
    </Component>
  );
}
