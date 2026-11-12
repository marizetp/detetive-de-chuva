import { StatusIcon } from './icons.jsx';

/**
 * Aviso em linha, sem caixa: filete lateral + ícone + texto.
 * - error: Earth (a paleta não tem vermelho; o ícone de triângulo e o texto transmitem o sentido)
 * - info:  Rain Blue no filete (elemento gráfico; o texto fica em Charcoal)
 */
const TONES = {
  error: { rule: 'border-earth', icon: 'warning', iconColor: 'text-earth' },
  info: { rule: 'border-rain', icon: 'neutral-info', iconColor: 'text-rain' },
};

export default function InlineNotice({ tone = 'info', title, children, action, role, className = '' }) {
  const style = TONES[tone] ?? TONES.info;
  return (
    <div role={role} className={`border-l-4 ${style.rule} py-1 pl-4 ${className}`}>
      <div className="flex gap-3">
        <StatusIcon tone={style.icon} className={`mt-0.5 size-5 shrink-0 ${style.iconColor}`} />
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold text-charcoal">{title}</p> : null}
          {children ? (
            <div className={`text-sm leading-relaxed text-charcoal/85 ${title ? 'mt-1' : ''}`}>
              {children}
            </div>
          ) : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
