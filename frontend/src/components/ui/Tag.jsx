const TONES = {
  /** Disponível agora: fundo NASA Blue com texto Orbital White (8,9:1). */
  available: 'bg-raised text-ink',
  /** Ainda não disponível: contorno tracejado Steel Blue, para não se confundir com o anterior. */
  pending: 'border border-dashed border-line-strong text-ink-muted',
};

/** Etiqueta curta de estado. O texto transmite o significado; a cor só reforça. */
export default function Tag({ tone = 'available', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium tracking-wide ${TONES[tone] ?? TONES.available}`}
    >
      {children}
    </span>
  );
}
