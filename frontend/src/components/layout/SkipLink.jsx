/** Primeira paragem do teclado: salta a navegação e coloca o foco no conteúdo principal. */
export default function SkipLink({ targetId }) {
  const handleClick = (event) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only rounded-full bg-accent px-5 py-3 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Saltar para o conteúdo
    </a>
  );
}
