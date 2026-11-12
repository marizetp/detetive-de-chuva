import { RESULT_SOURCES } from '../../config/api.js';
import { METRIC_DEFINITIONS, METRIC_UNIT_LABELS } from '../../config/metrics.js';
import { formatIsoDateLong, formatMetricValue } from '../../utils/format.js';
import { getFallbackStatus, isPastIsoDate } from '../../utils/report.js';
import InlineNotice from '../ui/InlineNotice.jsx';
import MissingValue from './MissingValue.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS, SOURCE_META } from './reportStructure.js';

const SOURCES = [RESULT_SOURCES.advisory, RESULT_SOURCES.evaluate];

function metricValue(state, key) {
  return state.result?.metrics.find((metric) => metric.key === key) ?? null;
}

/** Célula de uma fonte: valor, «Sem dado», a carregar ou indisponível — nunca 0 por omissão. */
function ValueCell({ state, metricKey }) {
  if (state.status === 'loading') return <span className="text-sm text-ink-muted">A carregar…</span>;
  if (state.status !== 'success') return <span className="text-sm text-ink-muted">Indisponível</span>;
  const metric = metricValue(state, metricKey);
  if (!metric || metric.value === null) return <MissingValue />;
  return <span className="font-display text-2xl text-ink tabular-nums">{formatMetricValue(metric)}</span>;
}

/** 02 — Indicadores: os três valores documentados, de cada fonte, lado a lado. */
export default function IndicatorsSection({ params, advisory, evaluate, today, comparison }) {
  const states = { [RESULT_SOURCES.advisory]: advisory, [RESULT_SOURCES.evaluate]: evaluate };
  const divergentFields = new Set(comparison?.divergences.map((d) => d.field) ?? []);
  const isPast = isPastIsoDate(params.data_consulta, today);
  const fallbackStatus = getFallbackStatus(evaluate);
  const hasValuesToShow = advisory.status === 'success' || evaluate.status === 'success';
  const hasMissingValue = SOURCES.some((source) =>
    states[source].result?.metrics.some((metric) => metric.value === null),
  );
  // Só se afirma que as fontes coincidem quando as duas responderam e nenhuma métrica diverge.
  const metricsMatchAcrossSources =
    comparison !== null &&
    comparison !== undefined &&
    !comparison.divergences.some((d) => d.field.startsWith('metricas.')) &&
    !comparison.notComparable.some((d) => d.field.startsWith('metricas.'));
  const consultedDate = formatIsoDateLong(params.data_consulta);

  return (
    <ReportSection section={REPORT_SECTIONS.indicators}>
      <p className="max-w-prose leading-relaxed text-ink-muted">
        Valores devolvidos por cada serviço para a consulta de {params.provincia} com data de{' '}
        {consultedDate}. São apresentados tal como recebidos, sem limiares nem interpretação.
      </p>

      {fallbackStatus === 'unconfirmed' && hasValuesToShow ? (
        <InlineNotice tone="info" title="Natureza dos dados por confirmar" className="mt-6">
          <p>
            {evaluate.status === 'error'
              ? 'A avaliação técnica não está disponível, por isso não foi possível confirmar se estes valores são de substituição.'
              : 'A avaliação técnica não indicou se usou dados de substituição, por isso não foi possível confirmar a natureza destes valores.'}{' '}
            Não devem ser lidos como medições nem como previsões meteorológicas para{' '}
            {consultedDate}: podem ser valores de referência.
          </p>
        </InlineNotice>
      ) : null}

      {fallbackStatus === 'confirmed' ? (
        <InlineNotice tone="info" title="Valores de substituição" className="mt-6">
          <p>
            A avaliação técnica indica que usou dados meteorológicos de substituição. Por isso, estes
            valores não correspondem necessariamente a medições nem a previsões meteorológicas para{' '}
            {consultedDate}: podem ser valores de referência, por exemplo históricos ou mensais. A
            fonte e o método não estão documentados.
          </p>
          <p className="mt-2">
            {metricsMatchAcrossSources
              ? 'Os valores da recomendação coincidem com os da avaliação técnica. O serviço de recomendação não indica, por si, se usou dados de substituição.'
              : 'O serviço de recomendação não indica se usou dados de substituição.'}
          </p>
        </InlineNotice>
      ) : null}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <caption className="sr-only">
            Indicadores agroclimáticos por fonte: recomendação e avaliação técnica
          </caption>
          <thead>
            <tr className="border-b-2 border-line-strong text-xs tracking-[0.12em] text-ink-muted uppercase">
              <th scope="col" className="py-3 pr-4 font-semibold">Indicador</th>
              {SOURCES.map((source) => (
                <th key={source} scope="col" className="w-[24%] py-3 pr-2 font-semibold">
                  {SOURCE_META[source].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_DEFINITIONS.map((definition) => {
              const isDivergent = divergentFields.has(`metricas.${definition.key}`);
              return (
                <tr key={definition.key} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pr-3 font-normal sm:py-5 sm:pr-4">
                    <span className="block font-display text-base leading-snug text-ink sm:text-lg">
                      {definition.label}{' '}
                      <span className="font-mono text-sm text-accent">
                        ({METRIC_UNIT_LABELS[definition.unit]})
                      </span>
                    </span>
                    <span className="mt-1 hidden max-w-md text-sm leading-relaxed text-ink-muted sm:block">
                      {definition.description}
                    </span>
                    {isDivergent ? (
                      <span className="mt-2 block text-sm font-semibold text-ink">
                        Valores diferentes entre as fontes — ver secção 05.
                      </span>
                    ) : null}
                  </th>
                  {SOURCES.map((source) => (
                    <td key={source} className="py-5 pr-2">
                      <ValueCell state={states[source]} metricKey={definition.key} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Em ecrãs estreitos as descrições saem da tabela, para os valores terem espaço. */}
      <dl className="mt-6 space-y-3 text-sm leading-relaxed sm:hidden">
        {METRIC_DEFINITIONS.map((definition) => (
          <div key={definition.key}>
            <dt className="font-semibold text-ink">{definition.label}</dt>
            <dd className="text-ink-muted">{definition.description}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-5">
        {isPast ? (
          <InlineNotice tone="info" title="Consulta para uma data passada">
            O serviço não confirma que estes valores sejam observações de {consultedDate}. Podem
            ser valores de referência, por exemplo históricos ou mensais, e não as condições
            meteorológicas desse dia.
          </InlineNotice>
        ) : null}
        {hasMissingValue ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            «Sem dado»: o serviço não enviou o valor, ou enviou um valor fora do intervalo possível.
          </p>
        ) : null}
      </div>
    </ReportSection>
  );
}
