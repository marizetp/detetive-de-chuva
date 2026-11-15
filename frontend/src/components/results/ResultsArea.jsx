import { RESULT_SOURCES } from '../../config/api.js';
import { STATUS_CODES } from '../../config/status.js';
import { localizeCropValue } from '../../i18n/catalogNames.js';
import { useI18n } from '../../i18n/useI18n.js';
import { CONSULTATION_ANCHORS, ROUTES } from '../../routing/routes.js';
import { compareConsultationResults, formatDivergenceValue } from '../../utils/divergences.js';
import { getUserErrorMessage } from '../../utils/errorMessages.js';
import {
  formatFractionAsPercentNumber,
  formatMillimetreNumber,
  formatScoreNumber,
} from '../../utils/format.js';
import { describeConsultation, getFallbackStatus } from '../../utils/report.js';
import { isFiniteNumber } from '../../utils/validators.js';
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
const IDLE_SOURCE = Object.freeze({ status: 'idle', result: null, error: null });

function getMetricValue(metrics, key) {
  const found = metrics?.find((m) => m.key === key);
  return found?.value ?? null;
}

/** Mensagem do erro de uma fonte, no idioma activo; nunca expõe detalhes técnicos. */
function useErrorMessage() {
  const { t } = useI18n();
  return (error) =>
    getUserErrorMessage(error, t) ?? {
      title: t('errors.unexpectedTitle'),
      description: t('errors.unexpectedDescription'),
      canRetry: true,
    };
}

function RetryButton({ onClick }) {
  const { t } = useI18n();
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <RetryIcon className="size-4" />
      <span>{t('common.retry')}</span>
    </Button>
  );
}

/** Rótulo, título (h2) e, num relatório, a identificação da consulta e o aviso de dados alterados. */
function ReportHeader({ title, headingRef, submittedParams, crops, isStale }) {
  const { t, language } = useI18n();
  return (
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
        {title}
      </h2>
      {submittedParams ? (
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
      ) : null}

      {isStale ? (
        <InlineNotice tone="info" title={t('results.staleTitle')} className="mt-5">
          {t('results.staleBody', { action: t('consultation.form.submitUpdate') })}
        </InlineNotice>
      ) : null}
    </div>
  );
}

/** Pontuação de confiança: N/100 com barra e legenda, ou «Não disponível» sem barra. */
function ConfidenceScore({ score, barClass }) {
  const { t, language } = useI18n();
  if (score === null) {
    // Sem pontuação válida: texto explícito e sem barra (uma barra vazia leria-se como 0).
    return (
      <p className="mt-2 font-display text-xl font-semibold text-ink-muted">
        {t('results.confidenceUnavailable')}
      </p>
    );
  }
  return (
    <>
      {/* Formato N/100 (decisão de 2026-11-12): pontuação do sistema, não percentagem.
          «/100» funciona como unidade: span próprio em Aurora text. */}
      <p className="mt-1 font-display text-4xl font-bold text-ink tabular-nums">
        {formatScoreNumber(score, language)}
        <span className="text-2xl text-label">/100</span>
      </p>
      <div className="mt-2 h-2 w-full rounded-full bg-surface overflow-hidden" aria-hidden="true">
        <div
          className={`motion-fill h-full ${barClass} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      {/* Legenda discreta (decisão de 2026-11-12): pontuação do sistema, não probabilidade.
          Inter, texto secundário, abaixo da pontuação na hierarquia. `w-0 min-w-full`: a
          legenda ocupa a largura da caixa sem a alargar (o layout do cartão não muda). */}
      <p className="mt-2 w-0 min-w-full font-sans text-xs leading-snug text-ink-muted">
        {t('results.confidenceCaption')}
      </p>
    </>
  );
}

function validScore(result) {
  // `null` quando a pontuação falta ou é inválida (mapper). Nunca se assume um valor.
  return isFiniteNumber(result?.confidenceScore) ? result.confidenceScore : null;
}

/** Os três cartões de indicadores, com os valores da fonte indicada (sem misturar fontes). */
function IndicatorCards({ metrics }) {
  const { t, language } = useI18n();
  const rainRecent = getMetricValue(metrics, 'chuva_acumulada_recente_mm');
  const rootMoisture = getMetricValue(metrics, 'humidade_solo_raiz');
  const forecastRain = getMetricValue(metrics, 'previsao_7dias_mm');

  return (
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
  );
}

/**
 * Aviso de dados meteorológicos alternativos (docs/docs2.md §3: `is_fallback_weather`).
 * A indicação vem só da avaliação técnica (/evaluate); o texto não a estende aos indicadores da
 * recomendação. `denied` e `pending` não mostram nada; nunca se assume substituição.
 */
function FallbackNotice({ evaluate, indicatorsSource = 'advisory' }) {
  const { t } = useI18n();
  const status = getFallbackStatus(evaluate);
  if (status === 'confirmed') {
    // A ressalva depende de que valores estão nos cartões: com os da recomendação, não se sabe se
    // usaram a mesma origem; com os da avaliação técnica, não se sabe quais deles a usaram.
    return (
      <InlineNotice tone="info" title={t('results.fallback.confirmedTitle')} className="mt-5">
        {indicatorsSource === 'evaluate'
          ? t('results.fallback.confirmedBodyAssessment')
          : t('results.fallback.confirmedBody')}
      </InlineNotice>
    );
  }
  if (status === 'unconfirmed') {
    return (
      <InlineNotice tone="info" title={t('results.fallback.unconfirmedTitle')} className="mt-5">
        {evaluate.status === 'error'
          ? t('results.fallback.evaluateUnavailable')
          : t('results.fallback.notIndicated')}
      </InlineNotice>
    );
  }
  return null;
}

/**
 * Comparação entre a recomendação (/advisory) e a avaliação técnica (/evaluate). Mostra os dois
 * valores lado a lado, tal como recebidos; não escolhe nem combina resultados.
 */
function SourceComparison({ advisoryResult, evaluate, onRetry }) {
  const { t, language } = useI18n();
  const errorMessage = useErrorMessage();

  if (evaluate.status === 'error') {
    const message = errorMessage(evaluate.error);
    return (
      <InlineNotice
        tone="error"
        title={t('results.divergence.assessmentUnavailableTitle')}
        action={message.canRetry ? <RetryButton onClick={() => onRetry(RESULT_SOURCES.evaluate)} /> : null}
      >
        <p>
          {message.title} {message.description}
        </p>
        <p className="mt-1">{t('results.divergence.assessmentUnavailableBody')}</p>
      </InlineNotice>
    );
  }
  if (evaluate.status !== 'success' || !evaluate.result) return null;

  const { divergences, notComparable, hasDivergences } = compareConsultationResults(
    advisoryResult,
    evaluate.result,
  );
  if (!hasDivergences && notComparable.length === 0) return null;

  const statusDiffers = divergences.some((divergence) => divergence.field === 'status');
  let title = t('results.divergence.notComparableTitle');
  if (statusDiffers) title = t('results.divergence.statusTitle');
  else if (hasDivergences) title = t('results.divergence.valuesTitle');
  const format = (field, value) => formatDivergenceValue(field, value, { language, t });

  return (
    <InlineNotice tone="info" title={title}>
      {hasDivergences ? (
        <>
          <p>{statusDiffers ? t('results.divergence.statusBody') : t('results.divergence.valuesBody')}</p>
          {/* `w-0 min-w-full`: o contentor ocupa a largura disponível sem a alargar; em ecrãs
              estreitos a tabela desliza dentro dele, sem scroll horizontal na página. */}
          <div className="mt-3 w-0 min-w-full overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <caption className="sr-only">{t('results.divergence.tableCaption')}</caption>
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">{t('results.divergence.field')}</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">{t('results.divergence.recommendation')}</th>
                  <th scope="col" className="py-1.5 font-semibold">{t('results.divergence.assessment')}</th>
                </tr>
              </thead>
              <tbody>
                {divergences.map((divergence) => (
                  <tr key={divergence.field} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1.5 pr-3 font-normal">{t(divergence.labelKey)}</th>
                    <td className="py-1.5 pr-3 tabular-nums">{format(divergence.field, divergence.advisoryValue)}</td>
                    <td className="py-1.5 tabular-nums">{format(divergence.field, divergence.evaluateValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {notComparable.length > 0 ? (
        <p className={hasDivergences ? 'mt-3' : ''}>
          {t('results.divergence.notComparableBody', {
            fields: notComparable.map((item) => t(item.labelKey)).join(', '),
          })}
        </p>
      ) : null}
    </InlineNotice>
  );
}

/** Detalhes técnicos da avaliação (/evaluate): gatilhos e justificações, num painel discreto. */
function TechnicalDetails({ evaluate }) {
  const { t } = useI18n();
  const result = evaluate?.result;
  if (!(result?.triggers?.length > 0 || result?.justifications?.length > 0)) return null;
  return (
    <details className="rounded-xl border border-line bg-surface/30 p-4 text-xs text-ink-muted" data-reveal="fade">
      <summary className="cursor-pointer font-medium text-ink-subtle hover:text-ink">
        {t('results.detailsSummary')}
      </summary>
      <div className="mt-4 space-y-3">
        {result.triggers?.length > 0 ? (
          <div>
            <span className="font-semibold text-ink">{t('results.triggersLabel')}</span>
            {/* Códigos técnicos da API: identificadores, mostrados tal como recebidos. */}
            <span translate="no">{result.triggers.join(', ')}</span>
          </div>
        ) : null}
        {result.justifications?.length > 0 ? (
          <SourceLanguageContent unavailableTitleKey="results.sourceLanguage.justificationsTitle">
            <div className="space-y-3">
              {result.justifications.map((just, idx) => (
                <p key={idx} className="leading-relaxed">• {just}</p>
              ))}
            </div>
          </SourceLanguageContent>
        ) : null}
      </div>
    </details>
  );
}

/**
 * Cenário em que a recomendação falhou e a avaliação técnica respondeu: a avaliação técnica é
 * apresentada só como tal (estado, confiança e indicadores próprios), sem o cartão de veredito da
 * recomendação e sem lhe atribuir autoridade de recomendação.
 */
function TechnicalAssessmentOnly({ evaluate }) {
  const { t } = useI18n();
  const result = evaluate.result;
  const code = result?.status?.code ?? null;
  const tone = VERDICT_TONES[code] ?? 'neutral';
  const colors = statusToneStyles(tone);
  let statusText = t('status.missing');
  // Estado desconhecido: mostrado tal como recebido, sem interpretação.
  if (code !== null) statusText = VERDICT_TONES[code] ? t(`status.${code}`) : `${t('status.unknown')}: ${code}`;

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-ink sm:text-xl" data-reveal>
        {t('results.divergence.assessment')}
      </h3>
      <div className="mt-4 rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="1">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="type-label text-label">{t('results.divergence.assessmentStatusLabel')}</p>
            <p className={`mt-2 inline-flex items-center gap-2 font-display text-base font-bold ${colors.text}`}>
              <StatusIcon tone={tone} className={`size-5 shrink-0 ${colors.icon}`} />
              <span>{statusText}</span>
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-canvas border border-line p-4 text-center md:min-w-[180px]">
            <p className="type-label font-display text-label">{t('results.confidence')}</p>
            <ConfidenceScore score={validScore(result)} barClass={colors.bar} />
          </div>
        </div>
      </div>
      <IndicatorCards metrics={result?.metrics ?? []} />
      <FallbackNotice evaluate={evaluate} indicatorsSource="evaluate" />
    </div>
  );
}

/**
 * Área de resultados. A recomendação (/advisory) e a avaliação técnica (/evaluate) são pedidas em
 * paralelo e tratadas de forma independente: a falha de uma não esconde a outra, as divergências
 * são mostradas e nenhuma das duas tem autoridade sobre a outra (CLAUDE.md §11).
 */
export default function ResultsArea({
  submittedParams,
  advisory,
  evaluate: evaluateProp,
  crops,
  onRetry,
  headingRef,
  isStale = false,
}) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const evaluate = evaluateProp ?? IDLE_SOURCE;

  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <ReportHeader title={t('results.emptyTitle')} headingRef={headingRef} />
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
        <ReportHeader title={t('results.loadingTitle')} headingRef={headingRef} />
        <div className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center" data-reveal="fade" data-reveal-delay="2">
          <LoadingIndicator label={t('results.loadingLabel')} />
        </div>
      </section>
    );
  }

  if (advisory.status === 'error') {
    const message = errorMessage(advisory.error);
    const retryAdvisory = message.canRetry ? (
      <RetryButton onClick={() => onRetry(RESULT_SOURCES.advisory)} />
    ) : null;

    // Recomendação falhou, avaliação técnica disponível: mostrar só a avaliação técnica, como tal.
    if (evaluate.status === 'success' && evaluate.result) {
      return (
        <section aria-labelledby="resultados-titulo" className="space-y-8">
          <ReportHeader
            title={t('results.reportTitle')}
            headingRef={headingRef}
            submittedParams={submittedParams}
            crops={crops}
            isStale={isStale}
          />
          <InlineNotice
            tone="error"
            role="alert"
            title={t('results.divergence.recommendationUnavailableTitle')}
            action={retryAdvisory}
          >
            <p>
              {message.title} {message.description}
            </p>
            <p className="mt-1">{t('results.divergence.recommendationUnavailableBody')}</p>
          </InlineNotice>
          <TechnicalAssessmentOnly evaluate={evaluate} />
          <TechnicalDetails evaluate={evaluate} />
        </section>
      );
    }

    // Recomendação falhou e não há avaliação técnica (a carregar ou também com erro).
    return (
      <section aria-labelledby="resultados-titulo">
        <ReportHeader title={t('results.errorTitle')} headingRef={headingRef} />
        {/* Falha técnica: aviso de erro (filete e triângulo vermelhos, texto ink), distinto do
            cartão de veredito usado para um resultado desfavorável. */}
        <InlineNotice
          tone="error"
          role="alert"
          title={t('results.errorNoticeTitle')}
          className="mt-8"
          action={retryAdvisory}
        >
          <p>
            {message.title} {message.description}
          </p>
        </InlineNotice>
        {evaluate.status === 'error' ? (
          <div className="mt-6">
            <SourceComparison advisoryResult={null} evaluate={evaluate} onRetry={onRetry} />
          </div>
        ) : null}
      </section>
    );
  }

  const result = advisory.result;
  // `null` quando o serviço não enviou estado (mapStatus → MISSING_STATUS); nunca se assume um.
  const statusRaw = result?.status?.code ?? null;

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
      <ReportHeader
        title={t('results.reportTitle')}
        headingRef={headingRef}
        submittedParams={submittedParams}
        crops={crops}
        isStale={isStale}
      />

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
            <ConfidenceScore score={validScore(result)} barClass={statusColors.bar} />
          </div>
        </div>
      </div>

      {/* Recomendação e avaliação técnica: divergências ou indisponibilidade da avaliação. */}
      <SourceComparison advisoryResult={result} evaluate={evaluate} onRetry={onRetry} />

      {/* 2. OS 3 CARTÕES DE INDICADORES SIMPLES (valores da recomendação) */}
      <div>
        <h3 className="font-display text-lg font-semibold text-ink sm:text-xl" data-reveal>
          {t('results.indicatorsTitle')}
        </h3>
        <IndicatorCards metrics={result?.metrics ?? []} />
        <FallbackNotice evaluate={evaluate} />
      </div>

      {/* 3. RECOMENDAÇÃO DO SERVIÇO DE AVALIAÇÃO (texto gerado automaticamente) */}
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
      <TechnicalDetails evaluate={evaluate} />
    </section>
  );
}
