import { RESULT_SOURCES } from '../../config/api.js';
import { compareConsultationResults } from '../../utils/divergences.js';
import Eyebrow from '../ui/Eyebrow.jsx';
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

const HEADING = 'mt-4 text-3xl leading-tight font-semibold text-forest sm:text-4xl';

/**
 * Relatório da consulta. Usa apenas os estados já recebidos (não faz pedidos).
 * Ordem de leitura: resultado geral → indicadores → recomendação → fundamentação → limites.
 */
export default function ResultsArea({ submittedParams, advisory, evaluate, onRetry, today, headingRef }) {
  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow>Relatório</Eyebrow>
        <h2 id="resultados-titulo" ref={headingRef} tabIndex={-1} className={HEADING}>
          Ainda sem consulta
        </h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-charcoal/80">
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

  return (
    <section aria-labelledby="resultados-titulo">
      <Eyebrow>Relatório</Eyebrow>
      <h2 id="resultados-titulo" ref={headingRef} tabIndex={-1} className={HEADING}>
        Relatório da consulta
      </h2>
      <p className="mt-3 text-charcoal/80">
        {submittedParams.provincia} · {submittedParams.cultura}
      </p>

      <p className="sr-only" role="status" aria-live="polite">
        {describeCompletion(advisory, evaluate)}
      </p>

      <div className="mt-7">
        <ReportContents />
      </div>

      <div className="mt-10 space-y-16">
        <SummarySection {...sectionProps} />
        <IndicatorsSection {...sectionProps} />
        <RecommendationSection
          advisory={advisory}
          onRetry={() => onRetry(RESULT_SOURCES.advisory)}
        />
        <TechnicalSection evaluate={evaluate} onRetry={() => onRetry(RESULT_SOURCES.evaluate)} />
        <TransparencySection {...sectionProps} />
      </div>
    </section>
  );
}
