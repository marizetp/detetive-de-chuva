/**
 * Cor por superfície, para manter o contraste do texto pequeno (≥ 4,5:1).
 * Telemetry Cyan: 6,8:1 sobre Space Black (canvas) e 6,0:1 sobre Mission Navy (surface).
 */
const TONES = {
  onCanvas: 'text-accent',
  onSurface: 'text-accent',
};

/**
 * Rótulo técnico acima dos títulos, em JetBrains Mono. `index` (ex.: "01") dá o ritmo de
 * "capítulo" às secções.
 */
export default function Eyebrow({ index, tone = 'onCanvas', children, className = '' }) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-xs font-medium tracking-[0.14em] uppercase ${TONES[tone] ?? TONES.onCanvas} ${className}`}
    >
      {index ? (
        <>
          <span className="tracking-normal tabular-nums">{index}</span>
          <span className="h-px w-8 bg-current opacity-50" aria-hidden="true" />
        </>
      ) : null}
      <span>{children}</span>
    </p>
  );
}
