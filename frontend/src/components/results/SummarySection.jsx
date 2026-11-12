import { RESULT_SOURCES } from '../../config/api.js';
import { ROUTES } from '../../routing/routes.js';
import { formatConfidenceScore, formatIsoDateLong } from '../../utils/format.js';
import { isPastIsoDate, selectSummarySource } from '../../utils/report.js';
import AppLink from '../ui/AppLink.jsx';
import { StatusIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import MissingValue from './MissingValue.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS, SOURCE_META } from './reportStructure.js';
import SourceLabel from './SourceLabel.jsx';
import StatusDisplay from './StatusDisplay.jsx';
import { statusToneStyles } from './statusTone.js';

const SECTION_LINK = 'font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent';

function sectionHref(section) {
  return `${ROUTES.consultation}#${section.id}`;
}

/** Estado curto de uma fonte, para a lista "Fontes desta consulta". */
function SourceStateLine({ source, state }) {
  const meta = SOURCE_META[source];
  let content;
  if (state.status === 'success' && state.result) {
    const tone = statusToneStyles(state.result.status.tone);
    content = (
      <span className={`inline-flex flex-wrap items-center gap-x-2 font-semibold ${tone.text}`}>
        <StatusIcon tone={state.result.status.tone} className="size-4 shrink-0" />
        <span>{state.result.status.label}</span>
        <span className="font-normal text-ink-muted">
          · confiança{' '}
          {state.result.confidenceScore === null ? (
            <MissingValue className="text-sm" />
          ) : (
            formatConfidenceScore(state.result.confidenceScore)
          )}
        </span>
      </span>
    );
  } else if (state.status === 'error') {
    content = (
      <span className="text-ink">
        Indisponível —{' '}
        <AppLink to={sectionHref(meta.section)} className={SECTION_LINK}>
          ver secção {meta.section.index}
        </AppLink>
      </span>
    );
  } else {
    content = <span className="text-ink-muted">A aguardar resposta…</span>;
  }

  return (
    <li className="flex flex-col gap-0.5 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span className="text-xs text-ink-muted">
        {meta.name} · <code className="font-mono">{meta.endpoint}</code>
      </span>
      {content}
    </li>
  );
}

function PrimaryResult({ result, source }) {
  const isFallbackSource = source === RESULT_SOURCES.evaluate;
  return (
    <div>
      <StatusDisplay
        status={result.status}
        size="lg"
        caption={isFallbackSource ? 'Estado segundo a avaliação técnica' : 'Estado da recomendação'}
      />
      <div className="mt-8 border-l-4 border-transparent pl-4">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
          Nível de confiança
        </p>
        <p className="mt-1.5 font-display text-4xl leading-none text-ink tabular-nums">
          {result.confidenceScore === null ? (
            <MissingValue />
          ) : (
            formatConfidenceScore(result.confidenceScore)
          )}
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          Pontuação de 0 a 100 atribuída pelo sistema. Não é uma probabilidade nem uma garantia de
          sucesso da sementeira.
        </p>
      </div>
      <div className="mt-6 pl-5">
        <SourceLabel source={source} />
      </div>
    </div>
  );
}

/** 01 — Resumo: o resultado geral, a consulta efectuada e o estado de cada fonte. */
export default function SummarySection({ params, advisory, evaluate, today, comparison }) {
  const summarySource = selectSummarySource(advisory, evaluate);
  const primaryState = summarySource === RESULT_SOURCES.evaluate ? evaluate : advisory;
  const isPast = isPastIsoDate(params.data_consulta, today);

  let primary;
  if (summarySource === 'loading') {
    primary = <LoadingIndicator label="A obter o resultado da avaliação…" />;
  } else if (summarySource === 'unavailable') {
    primary = (
      <InlineNotice tone="error" title="Nenhuma das fontes respondeu.">
        Pode tentar novamente cada fonte nas secções{' '}
        <AppLink to={sectionHref(REPORT_SECTIONS.recommendation)} className={SECTION_LINK}>
          03
        </AppLink>{' '}
        e{' '}
        <AppLink to={sectionHref(REPORT_SECTIONS.technical)} className={SECTION_LINK}>
          04
        </AppLink>
        .
      </InlineNotice>
    );
  } else {
    primary = <PrimaryResult result={primaryState.result} source={summarySource} />;
  }

  return (
    <ReportSection section={REPORT_SECTIONS.summary}>
      <div className="grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          {primary}
          {summarySource === RESULT_SOURCES.evaluate ? (
            <InlineNotice tone="info" title="Resumo baseado apenas na avaliação técnica" className="mt-6">
              A recomendação não está disponível. Este resumo usa o estado e a confiança devolvidos
              pela avaliação técnica.
            </InlineNotice>
          ) : null}
          {comparison?.hasDivergences ? (
            <InlineNotice tone="info" title="As duas fontes não coincidem" className="mt-6">
              A recomendação e a avaliação técnica devolveram valores diferentes.{' '}
              <AppLink to={sectionHref(REPORT_SECTIONS.transparency)} className={SECTION_LINK}>
                Ver a comparação na secção 05
              </AppLink>
              .
            </InlineNotice>
          ) : null}
        </div>

        <div className="space-y-8 md:col-span-5">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted">Província</dt>
              <dd className="font-display text-xl text-ink">{params.provincia}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Cultura</dt>
              <dd className="font-display text-xl text-ink">{params.cultura}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Data da consulta</dt>
              <dd className="font-display text-xl text-ink">
                {formatIsoDateLong(params.data_consulta)}
              </dd>
              {isPast ? (
                <dd className="mt-1 text-ink-muted">
                  Data passada: os valores podem não corresponder às condições observadas nesse dia.
                </dd>
              ) : null}
            </div>
          </dl>

          <div>
            <h4 className="font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase">
              Fontes desta consulta
            </h4>
            <ul className="mt-3 text-sm">
              <SourceStateLine source={RESULT_SOURCES.advisory} state={advisory} />
              <SourceStateLine source={RESULT_SOURCES.evaluate} state={evaluate} />
            </ul>
          </div>
        </div>
      </div>
    </ReportSection>
  );
}
