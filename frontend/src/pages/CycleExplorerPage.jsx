import { useEffect, useMemo, useState } from 'react';
import AngolaInteractiveMap from '../components/explorer/AngolaInteractiveMap.jsx';
import AgroCycleMonthGrid from '../components/explorer/AgroCycleMonthGrid.jsx';
import AgroCycleRing from '../components/explorer/AgroCycleRing.jsx';
import ConsultationModeTabs from '../components/layout/ConsultationModeTabs.jsx';
import ButtonLink from '../components/ui/ButtonLink.jsx';
import Container from '../components/ui/Container.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import InlineNotice from '../components/ui/InlineNotice.jsx';
import { useExplorerSelection } from '../hooks/useExplorerSelection.js';
import { MUNICIPALITIES_BY_PROVINCE } from '../data/municipalities.js';
import { useCatalogOptions } from '../hooks/useCatalogOptions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useI18n } from '../i18n/useI18n.js';
import { ROUTES } from '../routing/routes.js';
import { getCrops } from '../services/catalog.js';
import { getMapOverview, getProvinceCycleData } from '../services/explorer.js';
import { getCropDisplayLabel } from '../utils/cropDisplay.js';
import { getLocalIsoDate } from '../utils/dates.js';

const DEFAULT_CROPS = [
  { value: 'Milho', icon: '🌽' },
  { value: 'Feijão', icon: '🫘' },
  { value: 'Soja', icon: '🌱' },
  { value: 'Mandioca', icon: '🥔' },
  { value: 'Arroz', icon: '🌾' },
];

const STATUS_BADGE = Object.freeze({
  FAVORAVEL: 'bg-status-favorable/20 text-status-favorable border-status-favorable/40',
  AGUARDAR: 'bg-status-wait/20 text-status-wait border-status-wait/40',
  DESFAVORAVEL: 'bg-status-unfavorable/20 text-status-unfavorable border-status-unfavorable/40',
});

function getIsoWeekFromIsoString(isoDate) {
  const dt = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return 46;
  const target = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.min(Math.max(Math.ceil((((target - yearStart) / 86400000) + 1) / 7), 1), 52);
}

function approximateDateForIsoWeek(weekIso, referenceIso) {
  const ref = new Date(`${referenceIso}T12:00:00`);
  const year = Number.isNaN(ref.getTime()) ? new Date().getFullYear() : ref.getFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
  const target = new Date(mondayWeek1);
  target.setUTCDate(mondayWeek1.getUTCDate() + (weekIso - 1) * 7 + 2);
  return target.toISOString().slice(0, 10);
}

export default function CycleExplorerPage({ mode = 'cycle' }) {
  const { t, language } = useI18n();
  const isMapView = mode === 'map';
  useDocumentTitle(t(isMapView ? 'documentTitle.map' : 'documentTitle.cycle'));

  const [today] = useState(() => getLocalIsoDate());
  const { selection, updateSelection } = useExplorerSelection();
  const selectedProvince = selection.province;
  const selectedMunicipality = selection.municipality;
  const selectedCrop = selection.crop;
  const selectedDateIso = selection.date;

  const cropsCatalog = useCatalogOptions(getCrops);

  const cropChoices = useMemo(() => {
    if (cropsCatalog.status === 'success' && Array.isArray(cropsCatalog.options) && cropsCatalog.options.length > 0) {
      return cropsCatalog.options.map((opt) => ({
        value: opt.value,
        icon: opt.raw?.icone || '🌱',
      }));
    }
    return DEFAULT_CROPS;
  }, [cropsCatalog]);

  const [mapState, setMapState] = useState({ status: 'loading', data: null, error: null });
  const [cycleState, setCycleState] = useState({ status: 'loading', data: null, error: null });

  // Always fetch synchronized map evaluation for the active province/municipality/crop/date
  // so Map and Cycle never diverge.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getMapOverview({
      crop: selectedCrop,
      date: selectedDateIso || today,
      province: selectedProvince,
      language,
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setMapState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') {
          setMapState({ status: 'error', data: null, error });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCrop, selectedDateIso, selectedProvince, language, today]);

  // Fetch synchronized 52-week & 12-month crop cycle data on Cycle mode
  useEffect(() => {
    if (isMapView) return undefined;
    const controller = new AbortController();
    let active = true;

    getProvinceCycleData({
      province: selectedProvince,
      municipality: selectedMunicipality,
      date: selectedDateIso || today,
      crop: selectedCrop,
      language,
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setCycleState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') {
          setCycleState({ status: 'error', data: null, error });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isMapView, selectedProvince, selectedMunicipality, selectedDateIso, selectedCrop, language, today]);

  const activeWeekIso = useMemo(() => getIsoWeekFromIsoString(selectedDateIso), [selectedDateIso]);

  const handleSelectProvince = (prov) => {
    updateSelection({ province: prov, municipality: '' });
  };

  const handleSelectMunicipality = (muni) => {
    updateSelection({ municipality: muni });
  };

  const handleSelectCrop = (crop) => {
    updateSelection({ crop });
  };

  const handleSelectDate = (date) => {
    updateSelection({ date });
  };

  const handleSelectWeekFromRing = (weekIso) => {
    handleSelectDate(approximateDateForIsoWeek(weekIso, selectedDateIso));
  };

  // Single authoritative evaluation for the selected province/municipality/date
  const activePlaceEval = useMemo(() => {
    if (selectedMunicipality && mapState.data?.municipios?.[selectedMunicipality]) {
      return mapState.data.municipios[selectedMunicipality];
    }
    if (mapState.data?.provincias?.[selectedProvince]) {
      return mapState.data.provincias[selectedProvince];
    }
    return cycleState.data?.optimal?.avaliacao_atual ?? null;
  }, [mapState.data, cycleState.data, selectedProvince, selectedMunicipality]);

  const provinceMunicipalities = MUNICIPALITIES_BY_PROVINCE[selectedProvince] ?? [];
  const activePlaceLabel = selectedMunicipality
    ? `${selectedMunicipality}, ${selectedProvince}`
    : selectedProvince;
  const cropDisplay = getCropDisplayLabel(selectedCrop, language);

  return (
    <Container className="py-14 lg:py-20">
      <ConsultationModeTabs activeTab={isMapView ? 'map' : 'cycle'} />

      <header className="max-w-3xl">
        <Eyebrow className="font-display">
          {t(isMapView ? 'cycle.mapPage.eyebrow' : 'cycle.cyclePage.eyebrow')}
        </Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
          {t(isMapView ? 'cycle.mapPage.title' : 'cycle.cyclePage.title')}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          {t(isMapView ? 'cycle.mapPage.lead' : 'cycle.cyclePage.lead')}
        </p>
      </header>

      {/* Crop, Location & Reference Date Filter Toolbar */}
      <div
        role="region"
        aria-label={t('cycle.controlsLabel')}
        className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-xs text-label uppercase">{t('cycle.cropLabel')}:</span>
          {cropChoices.map((crop) => {
            const active = selectedCrop === crop.value;
            return (
              <button
                key={crop.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectCrop(crop.value)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-transparent bg-action text-action-ink'
                    : 'border-line bg-canvas text-ink-muted hover:border-aurora-text hover:text-ink'
                }`}
              >
                <span aria-hidden="true">{crop.icon}</span>
                <span>{getCropDisplayLabel(crop.value, language)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isMapView && (
            <>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <span className="font-mono text-xs text-label uppercase">{t('consultation.form.province.label')}</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => handleSelectProvince(e.target.value)}
                  className="rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-sm text-ink focus:border-aurora-text focus:outline-none"
                >
                  {['Huambo', 'Bié', 'Huíla'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <span className="font-mono text-xs text-label uppercase">{t('consultation.form.municipality.label')}</span>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => handleSelectMunicipality(e.target.value)}
                  className="rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-sm text-ink focus:border-aurora-text focus:outline-none"
                >
                  <option value="">{t('cycle.map.provinceWhole', { province: selectedProvince })}</option>
                  {provinceMunicipalities.map((m) => (
                    <option key={m.id} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="font-mono text-xs text-label uppercase">{t('cycle.dateLabel')}</span>
            <input
              type="date"
              value={selectedDateIso}
              onChange={(e) => e.target.value && handleSelectDate(e.target.value)}
              className="rounded-lg border border-line-strong bg-canvas px-3 py-1.5 font-mono text-sm text-ink focus:border-aurora-text focus:outline-none"
            />
          </label>
        </div>
      </div>

      {(mapState.status === 'error' || (!isMapView && cycleState.status === 'error')) && (
        <div className="mt-6">
          <InlineNotice tone="warning" title={t('cycle.errorTitle')}>
            {t('cycle.errorBody')}
          </InlineNotice>
        </div>
      )}

      {isMapView ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <AngolaInteractiveMap
              selectedProvince={selectedProvince}
              selectedMunicipality={selectedMunicipality}
              selectedCrop={selectedCrop}
              mapData={mapState.data}
              isLoading={mapState.status === 'loading'}
              onSelectProvince={handleSelectProvince}
              onSelectMunicipality={handleSelectMunicipality}
            />
          </div>

          <aside
            aria-label={t('cycle.mapPage.summaryLabel')}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-4"
          >
            <div>
              <p className="font-mono text-xs tracking-wider text-label uppercase">
                {t('cycle.mapPage.summaryEyebrow')}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-ink">
                {activePlaceLabel} · {cropDisplay}
              </h2>
              <p className="mt-1 font-mono text-xs text-ink-subtle">{selectedDateIso}</p>

              {activePlaceEval ? (
                <>
                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 font-mono text-xs font-semibold ${
                        STATUS_BADGE[activePlaceEval.status] ?? 'border-line bg-canvas text-ink-muted'
                      }`}
                    >
                      {t(`status.${activePlaceEval.status}`)} · {activePlaceEval.score_confianca}/100
                    </span>
                  </div>

                  <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-muted">{t('results.rainRecent.label')}</dt>
                      <dd className="font-mono font-semibold text-ink">
                        {activePlaceEval.metricas?.chuva_acumulada_recente_mm ?? '—'} mm
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-muted">{t('results.rootMoisture.label')}</dt>
                      <dd className="font-mono font-semibold text-ink">
                        {activePlaceEval.metricas?.humidade_solo_raiz !== undefined
                          ? `${Math.round(Number(activePlaceEval.metricas.humidade_solo_raiz) * 100)}%`
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-muted">{t('results.forecastRain.label')}</dt>
                      <dd className="font-mono font-semibold text-ink">
                        {activePlaceEval.metricas?.previsao_7dias_mm ?? '—'} mm
                      </dd>
                    </div>
                  </dl>

                  {Array.isArray(activePlaceEval.justificacoes_tecnicas) &&
                    activePlaceEval.justificacoes_tecnicas.length > 0 && (
                      <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
                        {activePlaceEval.justificacoes_tecnicas.map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
                    )}
                </>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">{t('cycle.loading')}</p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <ButtonLink to={ROUTES.cycle} className="w-full justify-center">
                {t('cycle.mapPage.openCycleCta')}
              </ButtonLink>
              <ButtonLink to={ROUTES.consultation} variant="secondary" className="w-full justify-center">
                {t('cycle.drawer.openConsultation')}
              </ButtonLink>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <AgroCycleRing
              province={selectedProvince}
              municipality={selectedMunicipality}
              crop={selectedCrop}
              weeks={cycleState.data?.weeks ?? []}
              optimal={cycleState.data?.optimal ?? null}
              activeEval={activePlaceEval}
              activeWeekIso={activeWeekIso}
              dateWeekIso={activeWeekIso}
              selectedDateIso={selectedDateIso}
              onSelectWeek={handleSelectWeekFromRing}
            />
          </div>

          <div className="lg:col-span-7">
            <AgroCycleMonthGrid
              province={selectedProvince}
              municipality={selectedMunicipality}
              crop={selectedCrop}
              weeks={cycleState.data?.weeks ?? []}
              months={cycleState.data?.months ?? []}
              optimal={cycleState.data?.optimal ?? null}
              activeEval={activePlaceEval}
              selectedDateIso={selectedDateIso}
              onSelectDate={handleSelectDate}
            />
          </div>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-subtle">
        {cycleState.data?.optimal?.aviso ?? t('cycle.disclaimerFallback')}
      </p>
    </Container>
  );
}
