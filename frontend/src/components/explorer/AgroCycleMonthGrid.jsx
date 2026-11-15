import { useMemo } from 'react';
import { useI18n } from '../../i18n/useI18n.js';
import { ROUTES } from '../../routing/routes.js';
import { getCropDisplayLabel } from '../../utils/cropDisplay.js';
import ButtonLink from '../ui/ButtonLink.jsx';

function getIsoWeek(dateObj) {
  const target = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.min(Math.max(Math.ceil((((target - yearStart) / 86400000) + 1) / 7), 1), 52);
}

function toIso(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const CELL_TIER = Object.freeze({
  alta: 'bg-status-favorable/22 text-ink border-status-favorable/35',
  media: 'bg-status-wait/22 text-ink border-status-wait/35',
  baixa: 'bg-canvas/70 text-ink-muted border-line',
});

export default function AgroCycleMonthGrid({
  province,
  municipality,
  crop,
  weeks = [],
  months = [],
  optimal,
  activeEval = null,
  selectedDateIso,
  onSelectDate,
}) {
  const { t, language } = useI18n();
  const locale = language === 'pt' ? 'pt-AO' : 'en-US';
  const cropDisplay = getCropDisplayLabel(crop, language);

  const selectedDate = useMemo(() => {
    const parsed = new Date(`${selectedDateIso}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedDateIso]);

  const viewYear = selectedDate.getFullYear();
  const viewMonth = selectedDate.getMonth(); // 0..11

  const weekMap = useMemo(() => new Map(weeks.map((w) => [w.semana_iso, w])), [weeks]);
  const monthSummary = useMemo(
    () => months.find((m) => m.mes === viewMonth + 1) ?? null,
    [months, viewMonth],
  );

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const startOffset = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d, 12, 0, 0);
      const iso = toIso(dt);
      const weekIso = getIsoWeek(dt);
      const wData = weekMap.get(weekIso) ?? null;
      cells.push({
        empty: false,
        key: iso,
        iso,
        day: d,
        weekIso,
        nivel: wData?.nivel ?? 'baixa',
        prob: wData?.probabilidade_cultura_pct ?? null,
        inWindow: Boolean(wData?.dentro_janela_otima),
      });
    }
    return cells;
  }, [viewYear, viewMonth, weekMap]);

  const monthHeading = useMemo(() => {
    const raw = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(viewYear, viewMonth, 15),
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [locale, viewYear, viewMonth]);

  const weekdayHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2025, 0, 5 + i)).replace('.', '').slice(0, 3));
  }, [locale]);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, Math.min(selectedDate.getDate(), 28), 12, 0, 0);
    onSelectDate(toIso(next));
  };

  const activeWeekIso = getIsoWeek(selectedDate);
  const activeWeekData = weekMap.get(activeWeekIso) ?? null;
  const falseStart = optimal?.risco_falsa_partida;
  const reqs = optimal?.exigencia_cultura;

  return (
    <section
      aria-label={t('cycle.calendar.sectionLabel')}
      className="rounded-2xl border border-line bg-surface p-5 font-display sm:p-6"
    >
      <div className="flex flex-col gap-6">
        {/* Top: Monthly Color-Pill Calendar */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-xs font-medium tracking-wider text-label uppercase">
                {t('cycle.calendar.eyebrow')}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{monthHeading}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label={t('cycle.calendar.prevMonth')}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-line bg-canvas text-ink transition-colors hover:border-aurora-text hover:text-interactive"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label={t('cycle.calendar.nextMonth')}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-line bg-canvas text-ink transition-colors hover:border-aurora-text hover:text-interactive"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5 text-center font-display text-[11px] font-medium text-ink-subtle uppercase">
            {weekdayHeaders.map((w, idx) => (
              <div key={idx} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell) => {
              if (cell.empty) {
                return <div key={cell.key} className="h-11" aria-hidden="true" />;
              }
              const isSelected = cell.iso === selectedDateIso;
              const pillStyle = CELL_TIER[cell.nivel] ?? CELL_TIER.baixa;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => onSelectDate(cell.iso)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.iso}: ${t(`cycle.tier.${cell.nivel}`)}${cell.prob !== null ? ` (${cell.prob}%)` : ''}`}
                  className={`relative flex h-11 cursor-pointer flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-all ${pillStyle} ${
                    isSelected ? 'ring-2 ring-orbital-white ring-offset-2 ring-offset-surface' : 'hover:border-aurora-text'
                  }`}
                >
                  <span>{cell.day}</span>
                  {cell.inWindow && (
                    <span className="mt-0.5 size-1 rounded-full bg-status-favorable" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 3 Probability Tier Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-status-favorable/70" aria-hidden="true" />
              {t('cycle.tier.alta')} (≥65%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-status-wait/70" aria-hidden="true" />
              {t('cycle.tier.media')} (35–64%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded border border-line bg-canvas" aria-hidden="true" />
              {t('cycle.tier.baixa')} (&lt;35%)
            </span>
          </div>
        </div>

        {/* Bottom: Selected Day / Week Cycle Drawer (wide, clean 2-column strip) */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-canvas/85 p-5 font-display">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-display text-xs font-medium tracking-wider text-label uppercase">
                  {t('cycle.drawer.title')}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  {selectedDateIso} · {cropDisplay}
                </h3>
              </div>
              <p className="text-sm font-medium text-ink-muted">
                {municipality ? `${municipality}, ${province}` : province}
              </p>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
              {activeEval && (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-muted">{t('cycle.drawer.liveStatus')}</dt>
                    <dd className="shrink-0 text-right font-display font-semibold text-ink">
                      {t(`status.${activeEval.status}`)} · {activeEval.score_confianca}/100
                    </dd>
                  </div>
                  {activeEval.metricas?.humidade_solo_raiz !== undefined && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">{t('cycle.drawer.liveMoisture')}</dt>
                      <dd className="shrink-0 text-right font-display font-semibold text-ink">
                        {Math.round(Number(activeEval.metricas.humidade_solo_raiz) * 100)}%
                      </dd>
                    </div>
                  )}
                  {activeEval.metricas?.chuva_acumulada_recente_mm !== undefined && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">{t('cycle.drawer.liveRecentRain')}</dt>
                      <dd className="shrink-0 text-right font-display font-semibold text-ink">
                        {activeEval.metricas.chuva_acumulada_recente_mm} mm
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cycle.drawer.weekSuitability')}</dt>
                <dd className="text-right font-display font-semibold text-ink">
                  {activeWeekData
                    ? `${activeWeekData.probabilidade_cultura_pct}% (${t(`cycle.tier.${activeWeekData.nivel}`)})`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cycle.drawer.weeklyRain')}</dt>
                <dd className="shrink-0 text-right font-display font-semibold text-ink">
                  {activeWeekData ? `${activeWeekData.chuva_semanal_media_mm} mm` : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cycle.drawer.monthlyRainMean')}</dt>
                <dd className="shrink-0 text-right font-display font-semibold text-ink">
                  {monthSummary ? `${monthSummary.chuva_media_mensal_mm} mm` : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cycle.drawer.falseStartRisk')}</dt>
                <dd className="shrink-0 text-right font-display font-semibold text-status-wait">
                  {falseStart
                    ? `${falseStart.probabilidade_pct}% (IC90 ${falseStart.ic90_pct?.[0]}–${falseStart.ic90_pct?.[1]}%)`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cycle.drawer.openingRainMin')}</dt>
                <dd className="shrink-0 text-right font-display font-semibold text-ink">
                  {reqs ? `${reqs.chuva_abertura_3d_mm} mm · ${reqs.profundidade_cm} cm` : '—'}
                </dd>
              </div>
            </dl>

            {reqs?.notas_agronomicas && (
              <p className="mt-4 rounded-lg border border-line bg-surface/60 p-3 text-xs leading-relaxed text-ink-muted">
                {reqs.notas_agronomicas}
              </p>
            )}
          </div>

          <div className="mt-6">
            <ButtonLink to={ROUTES.consultation} className="w-full justify-center">
              {t('cycle.drawer.openConsultation')}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
