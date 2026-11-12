const TONES = {
  /** Disponível agora. */
  available: 'bg-sage text-forest',
  /** Ainda não disponível: contorno tracejado, para não se confundir com o anterior. */
  pending: 'border border-dashed border-earth text-earth',
};

/** Etiqueta curta de estado. O texto transmite o significado; a cor só reforça. */
export default function Tag({ tone = 'available', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${TONES[tone] ?? TONES.available}`}
    >
      {children}
    </span>
  );
}
