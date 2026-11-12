import { StatusIcon } from '../ui/icons.jsx';
import { statusToneStyles } from './statusTone.js';

const SIZES = {
  lg: { label: 'text-4xl sm:text-5xl', icon: 'size-8 sm:size-10' },
  md: { label: 'text-3xl', icon: 'size-7' },
};

/**
 * Estado da avaliação: ícone + rótulo + filete de cor. Um código desconhecido é mostrado tal
 * como veio da API, com aspecto neutro, em vez de ser escondido ou reinterpretado.
 */
export default function StatusDisplay({ status, caption = 'Estado', size = 'md' }) {
  const tone = statusToneStyles(status.tone);
  const sizes = SIZES[size] ?? SIZES.md;

  return (
    <div className={`border-l-4 pl-4 ${tone.rule}`}>
      <p className="text-xs font-semibold tracking-[0.16em] text-charcoal/75 uppercase">{caption}</p>
      <p
        className={`mt-1.5 flex items-center gap-3 font-display leading-tight font-semibold ${sizes.label} ${tone.text}`}
      >
        <StatusIcon tone={status.tone} className={`shrink-0 ${sizes.icon}`} />
        <span>{status.label}</span>
      </p>
      {!status.known && status.code ? (
        <p className="mt-1.5 text-sm text-charcoal/80">
          Valor recebido: <code className="font-mono">{status.code}</code>
        </p>
      ) : null}
    </div>
  );
}
