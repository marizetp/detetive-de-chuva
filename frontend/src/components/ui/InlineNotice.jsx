import { StatusIcon } from './icons.jsx';

/**
 * Aviso em linha, sem caixa: filete lateral + ícone + texto.
 * - error: NASA Red no filete e no ícone (triângulo); o título e o texto ficam em Orbital White
 * - info:  Telemetry Cyan no filete e no ícone (círculo com «i»)
 */
const TONES = {
  error: { rule: 'border-danger', icon: 'warning', iconColor: 'text-danger' },
  info: { rule: 'border-accent', icon: 'neutral-info', iconColor: 'text-accent' },
};

export default function InlineNotice({ tone = 'info', title, children, action, role, className = '' }) {
  const style = TONES[tone] ?? TONES.info;
  return (
    <div role={role} className={`border-l-4 ${style.rule} py-1 pl-4 ${className}`}>
      <div className="flex gap-3">
        <StatusIcon tone={style.icon} className={`mt-0.5 size-5 shrink-0 ${style.iconColor}`} />
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold text-ink">{title}</p> : null}
          {children ? (
            <div className={`text-sm leading-relaxed text-ink-muted ${title ? 'mt-1' : ''}`}>
              {children}
            </div>
          ) : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
