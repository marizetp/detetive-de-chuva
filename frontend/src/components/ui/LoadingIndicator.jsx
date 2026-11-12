import { SLOW_REQUEST_NOTICE_MS, useDelayedFlag } from '../../hooks/useDelayedFlag.js';

const DROP_DELAYS_MS = [0, 180, 360];

/**
 * Indicador de espera: três gotas que pulsam (estáticas com movimento reduzido).
 *
 * - `slowNotice`: depois de alguns segundos, explica que o servidor pode estar a arrancar
 *   (arranque a frio observado: ~54 s). Deve aparecer **uma só vez** por ecrã: os indicadores
 *   secundários usam `slowNotice={false}`.
 * - `live`: anuncia o estado a leitores de ecrã (`role="status"`). Os indicadores secundários
 *   usam `live={false}` para não repetir o mesmo anúncio várias vezes.
 */
export default function LoadingIndicator({
  label,
  slowNotice = true,
  live = true,
  slowNoticeMs = SLOW_REQUEST_NOTICE_MS,
}) {
  const isSlow = useDelayedFlag(slowNoticeMs);

  return (
    <div role={live ? 'status' : undefined} className="flex items-start gap-4">
      <span className="mt-1.5 flex shrink-0 items-end gap-1" aria-hidden="true">
        {DROP_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            className="block h-3 w-1.5 rounded-full bg-accent motion-safe:animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-ink">{label}</p>
        {slowNotice && isSlow ? (
          <p className="mt-1 text-ink-muted">
            Está a demorar mais do que o habitual. O serviço pode estar a arrancar depois de um
            período sem utilização — pode levar até dois minutos.
          </p>
        ) : null}
      </div>
    </div>
  );
}
