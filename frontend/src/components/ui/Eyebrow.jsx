/**
 * Cor por superfície, para manter o contraste do texto pequeno (≥ 4,5:1):
 * Earth sobre Ivory 4,9:1; sobre Sage Earth desce para 4,2:1, por isso usa-se Forest (7,5:1).
 */
const TONES = {
  onIvory: 'text-earth',
  onSage: 'text-forest',
  onForest: 'text-sage',
};

/**
 * Rótulo editorial acima dos títulos. `index` (ex.: "01") dá o ritmo de "capítulo" às secções.
 */
export default function Eyebrow({ index, tone = 'onIvory', children, className = '' }) {
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase ${TONES[tone] ?? TONES.onIvory} ${className}`}
    >
      {index ? (
        <>
          <span className="font-mono tracking-normal tabular-nums">{index}</span>
          <span className="h-px w-8 bg-current opacity-50" aria-hidden="true" />
        </>
      ) : null}
      <span>{children}</span>
    </p>
  );
}
