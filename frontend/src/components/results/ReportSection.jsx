/**
 * Secção numerada do relatório. O número é decorativo (aria-hidden); o nome acessível da
 * região é o título. `scroll-mt` deixa espaço ao saltar para a secção a partir do índice.
 */
export default function ReportSection({ section, source, children }) {
  const headingId = `${section.id}-titulo`;

  return (
    <section
      id={section.id}
      aria-labelledby={headingId}
      className="scroll-mt-6 border-t border-line pt-8"
    >
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-accent tabular-nums" aria-hidden="true">
          {section.index}
        </span>
        <h3 id={headingId} className="text-2xl leading-snug font-semibold text-ink sm:text-[1.75rem]">
          {section.title}
        </h3>
        {source ? <div className="w-full sm:ml-auto sm:w-auto">{source}</div> : null}
      </header>
      <div className="mt-7">{children}</div>
    </section>
  );
}
