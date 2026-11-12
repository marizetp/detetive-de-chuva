import Eyebrow from './Eyebrow.jsx';

/** Cabeçalho de secção: rótulo, título (h2) e texto de abertura opcional. */
export default function SectionHeading({
  id,
  index,
  eyebrow,
  eyebrowTone,
  title,
  lead,
  className = '',
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <Eyebrow index={index} tone={eyebrowTone}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2
        id={id}
        className={`${eyebrow ? 'mt-4 ' : ''}text-3xl leading-[1.12] font-semibold text-ink sm:text-4xl lg:text-[2.75rem]`}
      >
        {title}
      </h2>
      {lead ? <p className="mt-5 max-w-prose text-lg text-ink-muted">{lead}</p> : null}
    </div>
  );
}
