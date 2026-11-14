/**
 * Cor por superfície, para manter o contraste do texto pequeno (≥ 4,5:1).
 * Aurora text (label, #6F9BFD): 7,1:1 sobre Space Black (canvas) e 6,3:1 sobre Mission Navy
 * (surface) — a mesma cor serve as duas superfícies. O traço junto ao índice é decorativo.
 */
const TONES = {
  onCanvas: 'text-label',
  onSurface: 'text-label',
};

/**
 * Rótulo acima dos títulos, em Space Mono (`type-label`); passar `className="font-display"` para
 * os subtítulos que usam Montserrat (ver CLAUDE.md §7). `index` (ex.: "01") dá o ritmo de
 * "capítulo" às secções.
 */
export default function Eyebrow({ index, tone = 'onCanvas', children, className = '' }) {
  return (
    <p
      className={`flex items-center gap-3 type-label ${TONES[tone] ?? TONES.onCanvas} ${className}`}
    >
      {index ? (
        <>
          <span className="tracking-normal tabular-nums">{index}</span>
          <span className="h-px w-8 bg-aurora" aria-hidden="true" />
        </>
      ) : null}
      <span>{children}</span>
    </p>
  );
}
