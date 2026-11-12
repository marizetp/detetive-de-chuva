import { StatusIcon } from '../ui/icons.jsx';
import { statusToneStyles } from './statusTone.js';

/**
 * Estado da avaliação: ícone + rótulo + filete de cor. Um código desconhecido é mostrado tal
 * como veio da API, com aspecto neutro, em vez de ser escondido ou reinterpretado.
 */
export default function StatusDisplay({ status }) {
  const tone = statusToneStyles(status.tone);

  return (
    <div className={`border-l-4 pl-4 ${tone.rule}`}>
      <p className="text-xs font-semibold tracking-[0.16em] text-charcoal/75 uppercase">Estado</p>
      <p className={`mt-1 flex items-center gap-2.5 font-display text-3xl leading-tight font-semibold ${tone.text}`}>
        <StatusIcon tone={status.tone} className="size-7 shrink-0" />
        <span>{status.label}</span>
      </p>
      {!status.known && status.code ? (
        <p className="mt-1 text-sm text-charcoal/80">
          Valor recebido: <code className="font-mono">{status.code}</code>
        </p>
      ) : null}
    </div>
  );
}
