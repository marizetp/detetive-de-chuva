import { RESULT_SOURCES } from '../../config/api.js';
import { STATUS_CODES } from '../../config/status.js';
import { localizeCropValue } from '../../i18n/catalogNames.js';
import { useI18n } from '../../i18n/useI18n.js';
import { CONSULTATION_ANCHORS, ROUTES } from '../../routing/routes.js';
import {
  formatFractionAsPercentNumber,
  formatMillimetreNumber,
  formatScoreNumber,
} from '../../utils/format.js';
import { isFiniteNumber } from '../../utils/validators.js';
import { describeConsultation } from '../../utils/report.js';
import AppLink from '../ui/AppLink.jsx';
import Button from '../ui/Button.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import { DropletIcon, ForecastIcon, RainIcon, RetryIcon, SproutIcon, StatusIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import MarkdownContent from './MarkdownContent.jsx';
import SourceLanguageContent from './SourceLanguageContent.jsx';
import { statusToneStyles } from './statusTone.js';

/** Tom de cada estado documentado (cores em statusTone.js). */
const VERDICT_TONES = Object.freeze({
  [STATUS_CODES.FAVORAVEL]: 'positive',
  [STATUS_CODES.AGUARDAR]: 'caution',
  [STATUS_CODES.DESFAVORAVEL]: 'warning',
});

const HEADING = 'mt-3 text-3xl leading-tight font-semibold text-ink sm:text-4xl';

function getMetricValue(metrics, key) {
  const found = metrics?.find((m) => m.key === key);
  return found?.value ?? null;
}

/**
 * Área de Resultados — Desenvolvida para agricultores, cooperativas e técnicos de extensão.
 * Apresenta o veredito em destaque, 3 indicadores claros e a recomendação prática do agrônomo.
 */
export default function ResultsArea({
  submittedParams,
  advisory,
  evaluate,
  crops,
  onRetry,
  today,
  headingRef,
  isStale = false,
}) {
  const { t, language } = useI18n();

  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          {t('results.eyebrow')}
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          {t('results.emptyTitle')}
        </h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted" data-reveal data-reveal-delay="2">
          {t('results.emptyBody', { action: t('consultation.form.submit') })}
        </p>
      </section>
    );
  }

  // Se a recomendação está a carregar
  if (advisory.status === 'loading') {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          {t('results.eyebrow')}
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          {t('results.loadingTitle')}
        </h2>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center" data-reveal="fade" data-reveal-delay="2">
          <LoadingIndicator label={t('results.loadingLabel')} />
        </div>
      </section>
    );
  }

  // Se a recomendação falhou com erro
  if (advisory.status === 'error') {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          {t('results.eyebrow')}
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          {t('results.errorTitle')}
        </h2>
        {/* Falha técnica: aviso de erro (filete e triângulo vermelhos, texto ink), distinto do
            cartão de veredito usado para um resultado desfavorável. */}
        <InlineNotice
          tone="error"
          role="alert"
          title={t('results.errorNoticeTitle')}
          className="mt-8"
          action={
            <Button variant="outline" size="sm" onClick={() => onRetry(RESULT_SOURCES.advisory)}>
              <RetryIcon className="size-4" />
              <span>{t('common.retry')}</span>
            </Button>
          }
        >
          {t('results.errorNoticeBody')}
        </InlineNotice>
      </section>
    );
  }

  const result = advisory.result;
  // `null` quando o serviço não enviou estado (mapStatus → MISSING_STATUS); nunca se assume um.
  const statusRaw = result?.status?.code ?? null;
  // `null` quando a pontuação falta ou é inválida (mapper). Nunca se assume um valor.
  const confidenceScore = isFiniteNumber(result?.confidenceScore) ? result.confidenceScore : null;
  const metrics = result?.metrics ?? [];

  const rainRecent = getMetricValue(metrics, 'chuva_acumulada_recente_mm');
  const rootMoisture = getMetricValue(metrics, 'humidade_solo_raiz');
  const forecastRain = getMetricValue(metrics, 'previsao_7dias_mm');

  // Configuração visual do Veredito Hero. As cores vêm de statusTone.js (por `tone`, como em
  // config/status.js). Estado ausente e estado não reconhecido nunca herdam o aspecto de outro
  // estado: recebem a apresentação neutra (contorno tracejado, ícone neutro, texto ink-muted),
  // sem classificação inventada (CLAUDE.md §5–6).
  //  - ausente: o serviço não enviou estado → MISSING_STATUS («Estado indisponível»);
  //  - não reconhecido: enviou um valor fora dos três documentados → UNKNOWN_STATUS, com o valor.
  let statusTheme;
  if (statusRaw === null) {
    statusTheme = {
      tone: 'neutral',
      title: t('status.missing'),
      description: t('results.verdict.missingDescription'),
    };
  } else if (VERDICT_TONES[statusRaw]) {
    statusTheme = {
      tone: VERDICT_TONES[statusRaw],
      title: t(`results.verdict.${statusRaw}.title`),
      description: t(`results.verdict.${statusRaw}.description`),
    };
  } else {
    statusTheme = {
      tone: 'neutral',
      title: t('status.unknown'),
      description: t('results.verdict.unknownDescription', { value: statusRaw }),
    };
  }
  const statusColors = statusToneStyles(statusTheme.tone);

  return (
    <section aria-labelledby="resultados-titulo" className="space-y-8">
      <div>
        <Eyebrow className="font-display" data-reveal>
          {t('results.eyebrow')}
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          {t('results.reportTitle')}
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2" data-reveal data-reveal-delay="2">
          <p className="text-base font-medium text-ink-muted">
            {describeConsultation(submittedParams, {
              language,
              cropLabel: (value) => localizeCropValue(value, crops?.options, language),
            })}
          </p>
          <AppLink
            to={`${ROUTES.consultation}#${CONSULTATION_ANCHORS.form}`}
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-interactive hover:decoration-interactive"
          >
            {t('results.changeData')}
          </AppLink>
        </div>

        {isStale ? (
          <InlineNotice tone="info" title={t('results.staleTitle')} className="mt-5">
            {t('results.staleBody', { action: t('consultation.form.submitUpdate') })}
          </InlineNotice>
        ) : null}
      </div>

      {/* 1. VEREDITO EM DESTAQUE (HERO CARD) */}
      <div
        className={`rounded-2xl border-2 bg-surface ${statusColors.rule} p-6 sm:p-8`}
        data-reveal
        data-reveal-delay="3"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className={`inline-flex items-center gap-2 font-display text-sm sm:text-base font-bold uppercase tracking-wide ${statusColors.text}`}>
              <StatusIcon tone={statusTheme.tone} className={`size-5 shrink-0 sm:size-6 ${statusColors.icon}`} />
              <span>{statusTheme.title}</span>
            </span>
            <p className="text-base sm:text-lg leading-relaxed text-ink">
              {statusTheme.description}
            </p>
          </div>

          {/* Nível de Confiança */}
          <div className="shrink-0 rounded-xl bg-canvas border border-line p-4 text-center md:min-w-[180px]">
            <p className="type-label font-display text-label">
              {t('results.confidence')}
            </p>
            {confidenceScore !== null ? (
              <>
                {/* Formato N/100 (decisão de 2026-11-12): pontuação do sistema, não percentagem.
                    «/100» funciona como unidade: span próprio em Aurora text. */}
                <p className="mt-1 font-display text-4xl font-bold text-ink tabular-nums">
                  {formatScoreNumber(confidenceScore, language)}
                  <span className="text-2xl text-label">/100</span>
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-surface overflow-hidden" aria-hidden="true">
                  <div
                    className={`motion-fill h-full ${statusColors.bar} transition-all duration-500`}
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                {/* Legenda discreta (decisão de 2026-11-12): pontuação do sistema, não probabilidade.
                    Inter, texto secundário, abaixo da pontuação na hierarquia. `w-0 min-w-full`: a
                    legenda ocupa a largura da caixa sem a alargar (o layout do cartão não muda). */}
                <p className="mt-2 w-0 min-w-full font-sans text-xs leading-snug text-ink-muted">
                  {t('results.confidenceCaption')}
                </p>
              </>
            ) : (
              // Sem pontuação válida: texto explícito e sem barra (uma barra vazia leria-se como 0).
              <p className="mt-2 font-display text-xl font-semibold text-ink-muted">
                {t('results.confidenceUnavailable')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. OS 3 CARTÕES DE INDICADORES SIMPLES */}
      <div>
        <h3 className="font-display text-lg font-semibold text-ink sm:text-xl" data-reveal>
          {t('results.indicatorsTitle')}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Chuva Recente */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="1">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <RainIcon className="size-5 shrink-0 text-label" />
              <span>{t('results.rainRecent.label')}</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {rainRecent !== null ? (<>{formatMillimetreNumber(rainRecent, language)}<span className="text-label"> mm</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {t('results.rainRecent.caption')}
            </p>
          </div>

          {/* Card 2: Humidade da Raiz */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="2">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <DropletIcon className="size-5 shrink-0 text-label" />
              <span>{t('results.rootMoisture.label')}</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {rootMoisture !== null ? (<>{formatFractionAsPercentNumber(rootMoisture, language)}<span className="text-label">%</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {t('results.rootMoisture.caption')}
            </p>
          </div>

          {/* Card 3: Chuva Prevista */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <ForecastIcon className="size-5 shrink-0 text-label" />
              <span>{t('results.forecastRain.label')}</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {forecastRain !== null ? (<>{formatMillimetreNumber(forecastRain, language)}<span className="text-label"> mm</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {t('results.forecastRain.caption')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. CARTA DO AGRÓNOMO (RECOMENDAÇÃO PRÁTICA) */}
      {result?.recommendationText ? (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8" data-reveal>
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <SproutIcon className="size-6 shrink-0 text-label" />
            <div>
              <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                {t('results.recommendationTitle')}
              </h3>
              <p className="text-xs text-ink-muted">{t('results.recommendationSubtitle')}</p>
            </div>
          </div>

          {/* Texto livre do backend (Português): nunca traduzido no browser. */}
          <div className="mt-6 max-w-none text-ink leading-relaxed">
            <SourceLanguageContent unavailableTitleKey="results.sourceLanguage.recommendationTitle">
              <MarkdownContent text={result.recommendationText} />
            </SourceLanguageContent>
          </div>
        </div>
      ) : null}

      {/* 4. DETALHES TÉCNICOS OPCIONAIS (EXPANSÍVEL E DISCRETO) */}
      {(evaluate?.result?.triggers?.length > 0 || evaluate?.result?.justifications?.length > 0) ? (
        <details className="rounded-xl border border-line bg-surface/30 p-4 text-xs text-ink-muted" data-reveal="fade">
          <summary className="cursor-pointer font-medium text-ink-subtle hover:text-ink">
            {t('results.detailsSummary')}
          </summary>
          <div className="mt-4 space-y-3">
            {evaluate.result.triggers?.length > 0 ? (
              <div>
                <span className="font-semibold text-ink">{t('results.triggersLabel')}</span>
                {/* Códigos técnicos da API: identificadores, mostrados tal como recebidos. */}
                <span translate="no">{evaluate.result.triggers.join(', ')}</span>
              </div>
            ) : null}
            {evaluate.result.justifications?.length > 0 ? (
              <SourceLanguageContent unavailableTitleKey="results.sourceLanguage.justificationsTitle">
                <div className="space-y-3">
                  {evaluate.result.justifications.map((just, idx) => (
                    <p key={idx} className="leading-relaxed">• {just}</p>
                  ))}
                </div>
              </SourceLanguageContent>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}
