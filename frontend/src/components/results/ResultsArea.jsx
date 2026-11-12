import { RESULT_SOURCES } from '../../config/api.js';
import { CONSULTATION_ANCHORS, ROUTES } from '../../routing/routes.js';
import { compareConsultationResults } from '../../utils/divergences.js';
import { getUserErrorMessage } from '../../utils/errorMessages.js';
import { describeConsultation } from '../../utils/report.js';
import AppLink from '../ui/AppLink.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import IndicatorsSection from './IndicatorsSection.jsx';
import RecommendationSection from './RecommendationSection.jsx';
import ReportContents from './ReportContents.jsx';
import SummarySection from './SummarySection.jsx';
import TechnicalSection from './TechnicalSection.jsx';
import TransparencySection from './TransparencySection.jsx';

const SOURCE_NAMES = {
  [RESULT_SOURCES.advisory]: 'recomendação',
  [RESULT_SOURCES.evaluate]: 'avaliação técnica',
};

/**
 * Frase para a região "ao vivo", anunciada por leitores de ecrã quando muda.
 * Só anuncia o que terminou: o carregamento já é anunciado pelo LoadingIndicator de cada secção.
 */
function describeCompletion(advisory, evaluate) {
  return [
    [RESULT_SOURCES.advisory, advisory],
    [RESULT_SOURCES.evaluate, evaluate],
  ]
    .map(([source, state]) => {
      const name = SOURCE_NAMES[source];
      if (state.status === 'success') return `${name} recebida`;
      if (state.status === 'error') return `não foi possível obter a ${name}`;
      return null;
    })
    .filter(Boolean)
    .join('; ');
}

const HEADING = 'mt-4 text-3xl leading-tight font-semibold text-ink sm:text-4xl';

/**
 * Relatório da consulta. Usa apenas os estados já recebidos (não faz pedidos).
 * Ordem de leitura: resultado geral → indicadores → recomendação → fundamentação → limites.
 */
export default function ResultsArea({
  submittedParams,
  advisory,
  evaluate,
  onRetry,
  today,
  headingRef,
  isStale = false,
}) {
  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow>Relatório</Eyebrow>
        <h2 id="resultados-titulo" ref={headingRef} tabIndex={-1} className={HEADING}>
          Ainda sem consulta
        </h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted">
          Escolha a província, a cultura e a data, e seleccione «Consultar». O relatório reúne a
          recomendação e a avaliação técnica do serviço, cada uma com a sua origem identificada.
        </p>
      </section>
    );
  }

  const comparison =
    advisory.status === 'success' && evaluate.status === 'success'
      ? compareConsultationResults(advisory.result, evaluate.result)
      : null;
  const sectionProps = { params: submittedParams, advisory, evaluate, today, comparison };
  // Repete as fontes que falharam com erro que admite nova tentativa (ex.: não um 422).
  const retryAll = () => {
    for (const [source, state] of [
      [RESULT_SOURCES.advisory, advisory],
      [RESULT_SOURCES.evaluate, evaluate],
    ]) {
      if (state.status === 'error' && getUserErrorMessage(state.error)?.canRetry) onRetry(source);
    }
  };

  return (
    <section aria-labelledby="resultados-titulo">
      <Eyebrow>Relatório</Eyebrow>
      <h2 id="resultados-titulo" ref={headingRef} tabIndex={-1} className={HEADING}>
        Relatório da consulta
      </h2>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-ink-muted">{describeConsultation(submittedParams)}</p>
        <AppLink
          to={`${ROUTES.consultation}#${CONSULTATION_ANCHORS.form}`}
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          Alterar dados da consulta
        </AppLink>
      </div>

      {isStale ? (
        <InlineNotice tone="info" title="Este relatório corresponde à consulta anterior" className="mt-6">
          Os dados do formulário foram alterados depois desta consulta. Seleccione «Actualizar
          consulta» para obter um relatório com os novos dados.
        </InlineNotice>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {describeCompletion(advisory, evaluate)}
      </p>

      <div className="mt-7">
        <ReportContents />
      </div>

      <div className="mt-10 space-y-16">
        <SummarySection {...sectionProps} onRetryAll={retryAll} />
        <IndicatorsSection {...sectionProps} />
        <RecommendationSection
          advisory={advisory}
          evaluate={evaluate}
          params={submittedParams}
          today={today}
          onRetry={() => onRetry(RESULT_SOURCES.advisory)}
        />
        <TechnicalSection evaluate={evaluate} onRetry={() => onRetry(RESULT_SOURCES.evaluate)} />
        <TransparencySection {...sectionProps} />
      </div>
    </section>
  );
}
