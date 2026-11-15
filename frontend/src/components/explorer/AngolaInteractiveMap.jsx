import { useMemo, useState } from 'react';
import adm1Geo from '../../data/geo/angola-provincias-2021.json';
import adm2Geo from '../../data/geo/angola-municipios-planalto-2006.json';
import { canonicalMunicipalityName } from '../../data/municipalities.js';
import { useI18n } from '../../i18n/useI18n.js';
import { getCropDisplayLabel } from '../../utils/cropDisplay.js';
import { computeBoundingBox, createSvgProjector } from '../../utils/geoProjection.js';

const PILOT_ISO = Object.freeze({
  'AO-HUA': 'Huambo',
  'AO-BIE': 'Bié',
  'AO-HUI': 'Huíla',
});

const STATUS_STYLE = Object.freeze({
  FAVORAVEL: {
    fill: 'rgba(34, 160, 107, 0.72)',
    hoverFill: 'rgba(34, 160, 107, 0.90)',
    stroke: '#4ce0a2',
    badgeClass: 'bg-status-favorable/20 text-status-favorable border-status-favorable/40',
  },
  AGUARDAR: {
    fill: 'rgba(229, 138, 50, 0.70)',
    hoverFill: 'rgba(229, 138, 50, 0.88)',
    stroke: '#ffb469',
    badgeClass: 'bg-status-wait/20 text-status-wait border-status-wait/40',
  },
  DESFAVORAVEL: {
    fill: 'rgba(252, 61, 33, 0.65)',
    hoverFill: 'rgba(252, 61, 33, 0.85)',
    stroke: '#ff7b67',
    badgeClass: 'bg-status-unfavorable/20 text-status-unfavorable border-status-unfavorable/40',
  },
  NEUTRAL: {
    fill: 'rgba(45, 108, 255, 0.25)',
    hoverFill: 'rgba(45, 108, 255, 0.42)',
    stroke: '#6f9bfd',
    badgeClass: 'bg-surface text-ink-muted border-line-strong',
  },
});

export default function AngolaInteractiveMap({
  selectedProvince,
  selectedMunicipality,
  selectedCrop,
  mapData,
  isLoading,
  onSelectProvince,
  onSelectMunicipality,
}) {
  const { t, language } = useI18n();
  const [zoomMode, setZoomMode] = useState('national'); // 'national' | 'province'
  const [hoveredName, setHoveredName] = useState(null);

  const nationalProjection = useMemo(() => {
    const bounds = computeBoundingBox(adm1Geo.features);
    const projector = createSvgProjector(bounds, { width: 520, height: 520, padding: 18 });
    return {
      projector,
      features: adm1Geo.features.map((f) => ({
        iso: f.properties.iso,
        nome: f.properties.nome,
        pilotProvince: PILOT_ISO[f.properties.iso] ?? null,
        path: projector.toPath(f.geometry),
        center: projector.centroid(f.geometry),
      })),
    };
  }, []);

  const provinceMunis = useMemo(() => {
    const feats = adm2Geo.features.filter((f) => f.properties.provincia === selectedProvince);
    const bounds = computeBoundingBox(feats);
    const projector = createSvgProjector(bounds, { width: 520, height: 520, padding: 28 });
    return feats.map((f) => {
      const canonical = canonicalMunicipalityName(f.properties.nome);
      return {
        id: f.properties.id,
        rawName: f.properties.nome,
        canonical,
        path: projector.toPath(f.geometry),
        center: projector.centroid(f.geometry),
      };
    });
  }, [selectedProvince]);

  const provEvalMap = mapData?.provincias ?? {};
  const muniEvalMap = mapData?.municipios ?? {};

  const getRegionEval = (provName, muniName = null) => {
    if (muniName && muniEvalMap[muniName]) return muniEvalMap[muniName];
    return provEvalMap[provName] ?? null;
  };

  const handleProvinceClick = (provName) => {
    if (!provName) return;
    onSelectProvince(provName);
    setZoomMode('province');
  };

  const handleMuniClick = (canonical) => {
    onSelectMunicipality(canonical);
  };

  const cropDisplay = getCropDisplayLabel(selectedCrop, language);

  const activeInfoName =
    hoveredName ||
    (zoomMode === 'province' && selectedMunicipality ? selectedMunicipality : selectedProvince);
  const activeEval =
    zoomMode === 'province'
      ? getRegionEval(selectedProvince, hoveredName || selectedMunicipality)
      : getRegionEval(hoveredName && Object.values(PILOT_ISO).includes(hoveredName) ? hoveredName : selectedProvince);
  const activeStyle = STATUS_STYLE[activeEval?.status] ?? STATUS_STYLE.NEUTRAL;

  return (
    <section
      aria-label={t('cycle.map.sectionLabel')}
      className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-label uppercase">
            {t('cycle.map.eyebrow')}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {zoomMode === 'national'
              ? t('cycle.map.titleNational')
              : t('cycle.map.titleProvince', { province: selectedProvince, count: provinceMunis.length })}
          </h2>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => setZoomMode('national')}
            aria-pressed={zoomMode === 'national'}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              zoomMode === 'national'
                ? 'bg-action text-action-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('cycle.map.viewAngola')}
          </button>
          <button
            type="button"
            onClick={() => setZoomMode('province')}
            aria-pressed={zoomMode === 'province'}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              zoomMode === 'province'
                ? 'bg-action text-action-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {selectedProvince} ({provinceMunis.length})
          </button>
        </div>
      </div>

      {/* Live color summary pill */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{activeInfoName}</span>
          <span className="text-ink-subtle">·</span>
          <span className="text-ink-muted">{cropDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="font-mono text-xs text-label">{t('cycle.loading')}</span>
          ) : activeEval ? (
            <>
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${activeStyle.badgeClass}`}>
                {t(`status.${activeEval.status}`)} · {activeEval.score_confianca}/100
              </span>
            </>
          ) : (
            <span className="font-mono text-xs text-ink-subtle">{t('cycle.map.noDataYet')}</span>
          )}
        </div>
      </div>

      {/* Interactive SVG Map */}
      <div className="relative mt-4 flex items-center justify-center rounded-xl border border-line bg-canvas p-3">
        <svg
          viewBox="0 0 520 520"
          role="img"
          aria-label={
            zoomMode === 'national'
              ? t('cycle.map.svgLabelNational')
              : t('cycle.map.svgLabelProvince', { province: selectedProvince })
          }
          className="h-auto max-h-[380px] w-full select-none"
        >
          {zoomMode === 'national'
            ? nationalProjection.features.map((feat) => {
                const isPilot = Boolean(feat.pilotProvince);
                const isSelected = feat.pilotProvince === selectedProvince;
                const evalInfo = isPilot ? getRegionEval(feat.pilotProvince) : null;
                const style = isPilot ? STATUS_STYLE[evalInfo?.status] ?? STATUS_STYLE.NEUTRAL : null;
                const isHovered = hoveredName === feat.pilotProvince;

                if (!isPilot) {
                  return (
                    <path
                      key={feat.iso}
                      d={feat.path}
                      fill="#0b1d35"
                      stroke="rgba(100, 127, 155, 0.35)"
                      strokeWidth="0.9"
                    >
                      <title>{feat.nome}</title>
                    </path>
                  );
                }

                return (
                  <g
                    key={feat.iso}
                    role="button"
                    tabIndex={0}
                    aria-label={`${feat.pilotProvince}: ${evalInfo ? t(`status.${evalInfo.status}`) : ''}`}
                    className="cursor-pointer focus:outline-none"
                    onClick={() => handleProvinceClick(feat.pilotProvince)}
                    onMouseEnter={() => setHoveredName(feat.pilotProvince)}
                    onMouseLeave={() => setHoveredName(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProvinceClick(feat.pilotProvince);
                      }
                    }}
                  >
                    <path
                      d={feat.path}
                      fill={isHovered || isSelected ? style.hoverFill : style.fill}
                      stroke={isSelected ? '#eaf2f8' : style.stroke}
                      strokeWidth={isSelected ? '2.4' : '1.4'}
                    />
                    <text
                      x={feat.center[0]}
                      y={feat.center[1] - 3}
                      textAnchor="middle"
                      fill="#eaf2f8"
                      fontSize="12"
                      fontWeight="700"
                      className="pointer-events-none"
                    >
                      {feat.pilotProvince}
                    </text>
                    {evalInfo && (
                      <text
                        x={feat.center[0]}
                        y={feat.center[1] + 12}
                        textAnchor="middle"
                        fill="#eaf2f8"
                        fontSize="10"
                        fontFamily="Space Mono, monospace"
                        className="pointer-events-none"
                      >
                        {evalInfo.score_confianca}%
                      </text>
                    )}
                  </g>
                );
              })
            : provinceMunis.map((m) => {
                const evalInfo = getRegionEval(selectedProvince, m.canonical);
                const style = STATUS_STYLE[evalInfo?.status] ?? STATUS_STYLE.NEUTRAL;
                const isSelected = selectedMunicipality === m.canonical;
                const isHovered = hoveredName === m.canonical;
                return (
                  <g
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${m.canonical} (${selectedProvince}): ${evalInfo ? t(`status.${evalInfo.status}`) : ''}`}
                    className="cursor-pointer focus:outline-none"
                    onClick={() => handleMuniClick(m.canonical)}
                    onMouseEnter={() => setHoveredName(m.canonical)}
                    onMouseLeave={() => setHoveredName(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMuniClick(m.canonical);
                      }
                    }}
                  >
                    <path
                      d={m.path}
                      fill={isHovered || isSelected ? style.hoverFill : style.fill}
                      stroke={isSelected ? '#ffffff' : style.stroke}
                      strokeWidth={isSelected ? '2.6' : '1.2'}
                    />
                    <text
                      x={m.center[0]}
                      y={m.center[1]}
                      textAnchor="middle"
                      fill="#eaf2f8"
                      fontSize="8.5"
                      paintOrder="stroke"
                      stroke="#07101f"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      fontWeight={isSelected ? '700' : '600'}
                      className="pointer-events-none"
                    >
                      {m.canonical}
                    </text>
                  </g>
                );
              })}
        </svg>
      </div>

      {/* Legend + Province/Municipality quick chips */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-status-favorable" aria-hidden="true" />
          {t('status.FAVORAVEL')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-status-wait" aria-hidden="true" />
          {t('status.AGUARDAR')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-status-unfavorable" aria-hidden="true" />
          {t('status.DESFAVORAVEL')}
        </span>
        <span className="ml-auto font-mono text-[11px] text-ink-subtle">
          {t('cycle.map.clickHint')}
        </span>
      </div>

      {/* Province quick buttons + active municipalities */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex flex-wrap gap-2">
          {['Huambo', 'Bié', 'Huíla'].map((prov) => {
            const ev = getRegionEval(prov);
            const active = selectedProvince === prov;
            return (
              <button
                key={prov}
                type="button"
                onClick={() => handleProvinceClick(prov)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-aurora-text bg-aurora-blue/20 text-ink'
                    : 'border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {prov}
                {ev ? ` · ${ev.score_confianca}%` : ''}
              </button>
            );
          })}
        </div>

        {zoomMode === 'province' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectMunicipality('')}
              className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors ${
                !selectedMunicipality
                  ? 'border-aurora-text bg-aurora-blue/20 font-semibold text-ink'
                  : 'border-line bg-canvas text-ink-muted hover:text-ink'
              }`}
            >
              {t('cycle.map.provinceWhole', { province: selectedProvince })}
            </button>
            {provinceMunis.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMuniClick(m.canonical)}
                className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  selectedMunicipality === m.canonical
                    ? 'border-aurora-text bg-aurora-blue/20 font-semibold text-ink'
                    : 'border-line bg-canvas text-ink-muted hover:text-ink'
                }`}
              >
                {m.canonical}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
