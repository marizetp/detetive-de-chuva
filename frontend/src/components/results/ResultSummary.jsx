import { MISSING_VALUE_TEXT, formatConfidenceScore, formatMetricValue } from '../../utils/format.js';
import InlineNotice from '../ui/InlineNotice.jsx';
import StatusDisplay from './StatusDisplay.jsx';

function Value({ text }) {
  if (text !== MISSING_VALUE_TEXT) return text;
  return (
    <>
      <span aria-hidden="true">{MISSING_VALUE_TEXT}</span>
      <span className="sr-only">Sem dado</span>
    </>
  );
}

/**
 * Resumo de um resultado já mapeado (advisory ou evaluate): estado, confiança e métricas.
 * Mostra só o que a API devolveu; valores em falta aparecem como "—".
 * O relatório detalhado (recomendação, justificações) é tratado numa fase posterior.
 */
export default function ResultSummary({ result }) {
  return (
    <div>
      <StatusDisplay status={result.status} />

      <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="border-t border-charcoal/10 pt-3">
          <dt className="text-sm text-charcoal/80">Nível de confiança</dt>
          <dd className="mt-1 font-display text-2xl text-forest tabular-nums">
            <Value text={formatConfidenceScore(result.confidenceScore)} />
          </dd>
        </div>
        {result.metrics.map((metric) => (
          <div key={metric.key} className="border-t border-charcoal/10 pt-3">
            <dt className="text-sm text-charcoal/80">{metric.label}</dt>
            <dd className="mt-1 font-display text-2xl text-forest tabular-nums">
              <Value text={formatMetricValue(metric)} />
            </dd>
          </div>
        ))}
      </dl>

      {!result.isComplete ? (
        <InlineNotice tone="info" title="Resposta incompleta" className="mt-6">
          O serviço não enviou alguns valores, ou enviou valores fora do intervalo esperado. Esses
          campos aparecem como «—».
        </InlineNotice>
      ) : null}

      {result.isFallbackWeather === true ? (
        <InlineNotice tone="info" title="Dados meteorológicos de substituição" className="mt-6">
          O serviço indica que esta avaliação usou dados meteorológicos de substituição, e não a
          previsão habitual.
        </InlineNotice>
      ) : null}
    </div>
  );
}
