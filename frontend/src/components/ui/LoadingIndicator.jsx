import { SLOW_REQUEST_NOTICE_MS, useDelayedFlag } from '../../hooks/useDelayedFlag.js';

const DROP_DELAYS_MS = [0, 180, 360];

/**
 * Indicador de espera: três gotas que pulsam (estáticas com movimento reduzido).
 * Depois de alguns segundos, explica que o servidor pode estar a arrancar, para a interface
 * não parecer bloqueada (arranque a frio observado: ~54 s).
 */
export default function LoadingIndicator({ label, slowNoticeMs = SLOW_REQUEST_NOTICE_MS }) {
  const isSlow = useDelayedFlag(slowNoticeMs);

  return (
    <div role="status" className="flex items-start gap-4">
      <span className="mt-1.5 flex shrink-0 items-end gap-1" aria-hidden="true">
        {DROP_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            className="block h-3 w-1.5 rounded-full bg-rain motion-safe:animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-charcoal">{label}</p>
        {isSlow ? (
          <p className="mt-1 text-charcoal/80">
            Está a demorar mais do que o habitual. O serviço pode estar a arrancar depois de um
            período sem utilização — pode levar até um minuto.
          </p>
        ) : null}
      </div>
    </div>
  );
}
