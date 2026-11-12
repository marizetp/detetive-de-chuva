import { RESULT_SOURCES } from '../../config/api.js';
import { METRIC_DEFINITIONS, METRIC_UNIT_LABELS } from '../../config/metrics.js';
import { formatIsoDateLong, formatMetricValue } from '../../utils/format.js';
import { isPastIsoDate } from '../../utils/report.js';
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
  if (state.status === 'loading') return <span className="text-sm text-charcoal/75">A carregar…</span>;
  if (state.status !== 'success') return <span className="text-sm text-charcoal/75">Indisponível</span>;
  const metric = metricValue(state, metricKey);
  if (!metric || metric.value === null) return <MissingValue />;
  return <span className="font-display text-2xl text-forest tabular-nums">{formatMetricValue(metric)}</span>;
}

/** 02 — Indicadores: os três valores documentados, de cada fonte, lado a lado. */
export default function IndicatorsSection({ params, advisory, evaluate, today, comparison }) {
  const states = { [RESULT_SOURCES.advisory]: advisory, [RESULT_SOURCES.evaluate]: evaluate };
  const divergentFields = new Set(comparison?.divergences.map((d) => d.field) ?? []);
  const isPast = isPastIsoDate(params.data_consulta, today);
  const usesFallbackWeather = evaluate.result?.isFallbackWeather === true;
  const hasMissingValue = SOURCES.some((source) =>
    states[source].result?.metrics.some((metric) => metric.value === null),
  );

  return (
    <ReportSection section={REPORT_SECTIONS.indicators}>
      <p className="max-w-prose leading-relaxed text-charcoal/85">
        Valores devolvidos por cada serviço para {params.provincia}, na data de{' '}
        {formatIsoDateLong(params.data_consulta)}. São apresentados tal como recebidos, sem limiares
        nem interpretação.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <caption className="sr-only">
            Indicadores agroclimáticos por fonte: recomendação e avaliação técnica
          </caption>
          <thead>
            <tr className="border-b-2 border-forest text-xs tracking-[0.12em] text-charcoal/80 uppercase">
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
                <tr key={definition.key} className="border-b border-charcoal/10 align-top">
                  <th scope="row" className="py-4 pr-3 font-normal sm:py-5 sm:pr-4">
                    <span className="block font-display text-base leading-snug text-forest sm:text-lg">
                      {definition.label}{' '}
                      <span className="font-mono text-sm text-earth">
                        ({METRIC_UNIT_LABELS[definition.unit]})
                      </span>
                    </span>
                    <span className="mt-1 hidden max-w-md text-sm leading-relaxed text-charcoal/80 sm:block">
                      {definition.description}
                    </span>
                    {isDivergent ? (
                      <span className="mt-2 block text-sm font-semibold text-charcoal">
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
            <dt className="font-semibold text-charcoal">{definition.label}</dt>
            <dd className="text-charcoal/80">{definition.description}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-5">
        {usesFallbackWeather ? (
          <InlineNotice tone="info" title="Dados meteorológicos de substituição">
            A avaliação técnica indica que usou dados meteorológicos de substituição. Estes valores
            não devem ser lidos como observações medidas. O serviço de recomendação não indica se
            usou dados de substituição.
          </InlineNotice>
        ) : null}
        {isPast ? (
          <InlineNotice tone="info" title="Consulta para uma data passada">
            Os valores referem-se a {formatIsoDateLong(params.data_consulta)}, tal como devolvidos
            pelo serviço. A «chuva prevista» corresponde aos sete dias seguintes a essa data; não é
            uma previsão a partir de hoje.
          </InlineNotice>
        ) : null}
        {hasMissingValue ? (
          <p className="text-sm leading-relaxed text-charcoal/80">
            «Sem dado»: o serviço não enviou o valor, ou enviou um valor fora do intervalo possível.
          </p>
        ) : null}
      </div>
    </ReportSection>
  );
}
