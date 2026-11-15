const TONES = {
  /** Disponível agora: gradiente de acção Aurora com texto branco (≥ 4,58:1). */
  available: 'bg-action text-action-ink',
  /** Ainda não disponível: contorno tracejado Steel Blue, para não se confundir com o anterior. */
  pending: 'border border-dashed border-line-strong text-ink-muted',
};

/** Etiqueta curta de estado. O texto transmite o significado; a cor só reforça. */
export default function Tag({ tone = 'available', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 type-meta ${TONES[tone] ?? TONES.available}`}
    >
      {children}
    </span>
  );
}
