import { useMemo } from 'react';
import { useI18n } from '../../i18n/useI18n.js';
import { getCropDisplayLabel } from '../../utils/cropDisplay.js';

// Ordem circular da safra angolana no Planalto Central: Setembro (topo / 12h) → Agosto.
const SEASON_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function describeArc(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const [x1, y1] = polarToCartesian(cx, cy, rOuter, startDeg);
  const [x2, y2] = polarToCartesian(cx, cy, rOuter, endDeg);
  const [x3, y3] = polarToCartesian(cx, cy, rInner, endDeg);
  const [x4, y4] = polarToCartesian(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const TIER_COLORS = Object.freeze({
  alta: {
    stroke: '#22a06b',
    fill: '#22a06b',
    badge: 'bg-status-favorable/20 text-status-favorable border-status-favorable/40',
  },
  media: {
    stroke: '#e58a32',
    fill: '#e58a32',
    badge: 'bg-status-wait/20 text-status-wait border-status-wait/40',
  },
  baixa: {
    stroke: '#647f9b',
    fill: '#304766',
    badge: 'bg-surface text-ink-muted border-line-strong',
  },
});

const STATUS_BADGE = Object.freeze({
  FAVORAVEL: {
    stroke: '#22a06b',
    badgeClass: 'bg-status-favorable/20 text-status-favorable border-status-favorable/40',
  },
  AGUARDAR: {
    stroke: '#e58a32',
    badgeClass: 'bg-status-wait/20 text-status-wait border-status-wait/40',
  },
  DESFAVORAVEL: {
    stroke: '#fc3d21',
    badgeClass: 'bg-status-unfavorable/20 text-status-unfavorable border-status-unfavorable/40',
  },
});

export default function AgroCycleRing({
  province,
  municipality = '',
  crop,
  weeks = [],
  optimal,
  activeEval = null,
  activeWeekIso,
  dateWeekIso = null,
  selectedDateIso,
  onSelectWeek,
}) {
  const { t, language } = useI18n();
  const cropDisplay = getCropDisplayLabel(crop, language);
  const placeLabel = municipality ? `${municipality}, ${province}` : province;

  // Reorder 52 ISO weeks so Week 36 (early Sept) begins cleanly at the 12 o'clock top of the ring
  const orderedWeeks = useMemo(() => {
    const byWeek = new Map(weeks.map((w) => [w.semana_iso, w]));
    const seq = [];
    for (let w = 36; w <= 52; w++) if (byWeek.has(w)) seq.push(byWeek.get(w));
    for (let w = 1; w <= 35; w++) if (byWeek.has(w)) seq.push(byWeek.get(w));
    return seq;
  }, [weeks]);

  const activeWeekObj =
    orderedWeeks.find((w) => w.semana_iso === activeWeekIso) ?? orderedWeeks[0] ?? null;

  const isSelectedDateWeek = dateWeekIso === null || activeWeekIso === dateWeekIso;
  const syncedStatus = isSelectedDateWeek && activeEval?.status ? STATUS_BADGE[activeEval.status] : null;
  const activeTier = activeWeekObj?.nivel ?? 'baixa';
  const tierMeta = syncedStatus ?? TIER_COLORS[activeTier] ?? TIER_COLORS.baixa;

  // Approximate Day of Agricultural Season (Sep 1 = Day 1)
  const seasonDay = useMemo(() => {
    if (!selectedDateIso) return null;
    const d = new Date(`${selectedDateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const seasonStartYear = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    const start = new Date(seasonStartYear, 8, 1, 12, 0, 0);
    return Math.max(1, Math.round((d - start) / 86_400_000) + 1);
  }, [selectedDateIso]);

  // Moisture drops indicator: synchronized with live/map root moisture when on the active reference date
  const liveMoisture = isSelectedDateWeek ? activeEval?.metricas?.humidade_solo_raiz : undefined;
  const moisture = Number(liveMoisture ?? activeWeekObj?.humidade_raiz_mediana ?? 0.25);
  const activeDrops = moisture >= 0.55 ? 4 : moisture >= 0.42 ? 3 : moisture >= 0.30 ? 2 : 1;

  const monthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(language === 'pt' ? 'pt-AO' : 'en-US', { month: 'short' });
    return SEASON_MONTH_ORDER.map((m, idx) => ({
      m,
      label: fmt.format(new Date(2025, m - 1, 15)).replace('.', ''),
      angle: idx * 30 + 15,
    }));
  }, [language]);

  return (
    <section
      aria-label={t('cycle.ring.sectionLabel')}
      className="flex flex-col items-center rounded-2xl border border-line bg-surface p-5 font-display sm:p-6"
    >
      <div className="flex w-full flex-wrap items-start justify-between gap-2 text-left">
        <div>
          <p className="font-display text-xs font-medium tracking-wider text-label uppercase">
            {t('cycle.ring.eyebrow')}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {t('cycle.ring.title', { crop: cropDisplay, province: placeLabel })}
          </h2>
        </div>

        {activeEval && (
          <span
            className={`rounded-full border px-2.5 py-0.5 font-display text-xs font-semibold ${
              (STATUS_BADGE[activeEval.status] ?? TIER_COLORS.baixa).badgeClass
            }`}
          >
            {t(`status.${activeEval.status}`)} · {activeEval.score_confianca}/100
          </span>
        )}
      </div>

      {/* Circular Flo-style Agro-Cycle SVG */}
      <div className="relative mt-4 flex w-full max-w-[360px] items-center justify-center">
        <svg
          viewBox="0 0 340 340"
          role="img"
          aria-label={t('cycle.ring.svgLabel', { crop: cropDisplay, province })}
          className="h-auto w-full select-none"
        >
          {/* Outer subtle track */}
          <circle
            cx="170"
            cy="170"
            r="148"
            fill="none"
            stroke="rgba(234, 242, 248, 0.08)"
            strokeWidth="1"
          />

          {/* 12 Month Labels around the clock */}
          {monthLabels.map((item) => {
            const [lx, ly] = polarToCartesian(170, 170, 156, item.angle);
            return (
              <text
                key={item.m}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#9ab0c7"
                fontSize="10"
                fontWeight="600"
                fontFamily="var(--font-display)"
              >
                {item.label}
              </text>
            );
          })}

          {/* 52 Weekly Cycle Segments */}
          {orderedWeeks.map((week, idx) => {
            const total = Math.max(orderedWeeks.length, 1);
            const step = 360 / total;
            const startDeg = idx * step + 0.9;
            const endDeg = (idx + 1) * step - 0.9;
            const style = TIER_COLORS[week.nivel] ?? TIER_COLORS.baixa;
            const isActive = week.semana_iso === activeWeekIso;
            const rOuter = isActive ? 140 : 136;
            const rInner = isActive ? 106 : 110;
            const d = describeArc(170, 170, rOuter, rInner, startDeg, endDeg);

            return (
              <path
                key={week.semana_iso}
                d={d}
                fill={style.fill}
                fillOpacity={isActive ? 1 : week.nivel === 'baixa' ? 0.45 : 0.82}
                stroke={isActive ? '#ffffff' : '#080f1e'}
                strokeWidth={isActive ? 2.2 : 0.8}
                role="button"
                tabIndex={0}
                aria-label={`${t('cycle.weekShort')} ${week.semana_iso}: ${week.probabilidade_cultura_pct}% (${t(`cycle.tier.${week.nivel}`)})`}
                className="cursor-pointer transition-opacity hover:opacity-100 focus:outline-none"
                onClick={() => onSelectWeek?.(week.semana_iso)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWeek?.(week.semana_iso);
                  }
                }}
              >
                <title>
                  {`${t('cycle.weekShort')} ${week.semana_iso} · ${week.probabilidade_cultura_pct}% (${t(`cycle.tier.${week.nivel}`)})`}
                </title>
              </path>
            );
          })}

          {/* Center Flo-style Hero Circle */}
          <circle
            cx="170"
            cy="170"
            r="96"
            fill="#080f1e"
            stroke={tierMeta.stroke}
            strokeWidth="3.5"
          />

          <text
            x="170"
            y="126"
            textAnchor="middle"
            fill="#6f9bfd"
            fontSize="11"
            fontWeight="600"
            fontFamily="var(--font-display)"
          >
            {seasonDay ? t('cycle.ring.seasonDay', { day: seasonDay }) : `${t('cycle.weekShort')} ${activeWeekIso}`}
          </text>

          <text
            x="170"
            y="164"
            textAnchor="middle"
            fill="#eaf2f8"
            fontSize="36"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            {activeWeekObj ? `${activeWeekObj.probabilidade_cultura_pct}%` : '—'}
          </text>

          <text
            x="170"
            y="186"
            textAnchor="middle"
            fill="#eaf2f8"
            fontSize="12"
            fontWeight="600"
            fontFamily="var(--font-display)"
          >
            {t(`cycle.tier.${activeTier}`)}
          </text>

          <text
            x="170"
            y="206"
            textAnchor="middle"
            fill="#9ab0c7"
            fontSize="10"
            fontFamily="var(--font-display)"
          >
            {t('cycle.ring.weekLabel', { week: activeWeekObj?.semana_iso ?? activeWeekIso })}
          </text>
        </svg>
      </div>

      {/* Center summary cards below ring (matching the Flo detail strip) */}
      <div className="mt-3 grid w-full grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-line bg-canvas/80 p-3">
          <p className="font-display text-[11px] font-medium tracking-wider text-label uppercase">
            {t('cycle.ring.optimalWindow')}
          </p>
          <p className="mt-1 font-display font-semibold text-ink">
            {optimal?.janela_recomendada?.descricao_periodo ?? '—'}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-canvas/80 p-3">
          <p className="font-display text-[11px] font-medium tracking-wider text-label uppercase">
            {t('cycle.ring.soilReserve')}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5" aria-label={`${activeDrops} / 4`}>
            {[1, 2, 3, 4].map((idx) => (
              <span
                key={idx}
                className={`inline-block size-3 rounded-full border ${
                  idx <= activeDrops
                    ? 'border-status-favorable bg-status-favorable'
                    : 'border-line-strong bg-transparent'
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="ml-1 font-display text-xs font-semibold text-ink-muted">
              {Math.round(moisture * 100)}%
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-subtle">
        {t('cycle.ring.certaintyNote')}
      </p>
    </section>
  );
}
