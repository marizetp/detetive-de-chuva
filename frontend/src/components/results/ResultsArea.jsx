import { API_PATHS, RESULT_SOURCES } from '../../config/api.js';
import { formatIsoDateLong } from '../../utils/format.js';
import Eyebrow from '../ui/Eyebrow.jsx';
import DivergenceNotice from './DivergenceNotice.jsx';
import SourcePanel from './SourcePanel.jsx';

const SOURCE_NAMES = {
  [RESULT_SOURCES.advisory]: 'recomendação',
  [RESULT_SOURCES.evaluate]: 'avaliação técnica',
};

/**
 * Frase para a região "ao vivo", anunciada por leitores de ecrã quando muda.
 * Só anuncia o que terminou: o carregamento já é anunciado pelo LoadingIndicator de cada painel.
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

/**
 * Área de resultados. Estrutura preparada para o relatório completo: cada fonte tem o seu
 * painel, e as divergências aparecem antes dos painéis.
 */
export default function ResultsArea({ submittedParams, advisory, evaluate, onRetry, headingRef }) {
  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow>Resultados</Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-3xl leading-tight font-semibold text-forest"
        >
          Ainda sem consulta
        </h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-charcoal/80">
          Escolha a província, a cultura e a data, e seleccione «Consultar». A recomendação e a
          avaliação técnica do serviço aparecem aqui, cada uma com a sua origem identificada.
        </p>
      </section>
    );
  }

  const bothSucceeded = advisory.status === 'success' && evaluate.status === 'success';

  return (
    <section aria-labelledby="resultados-titulo">
      <Eyebrow>Resultados</Eyebrow>
      <h2
        id="resultados-titulo"
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-3xl leading-tight font-semibold text-forest"
      >
        Resultados da consulta
      </h2>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-charcoal/75">Província</dt>
          <dd className="font-semibold text-charcoal">{submittedParams.provincia}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-charcoal/75">Cultura</dt>
          <dd className="font-semibold text-charcoal">{submittedParams.cultura}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-charcoal/75">Data</dt>
          <dd className="font-semibold text-charcoal">
            {formatIsoDateLong(submittedParams.data_consulta)}
          </dd>
        </div>
      </dl>

      <p className="sr-only" role="status" aria-live="polite">
        {describeCompletion(advisory, evaluate)}
      </p>

      {bothSucceeded ? (
        <div className="mt-8">
          <DivergenceNotice advisoryResult={advisory.result} evaluateResult={evaluate.result} />
        </div>
      ) : null}

      <div className="mt-10 space-y-14">
        <SourcePanel
          id="fonte-recomendacao"
          title="Recomendação"
          sourceLabel="Serviço de recomendação"
          endpoint={API_PATHS.advisory}
          loadingLabel="A obter a recomendação…"
          state={advisory}
          onRetry={() => onRetry(RESULT_SOURCES.advisory)}
        />
        <SourcePanel
          id="fonte-avaliacao"
          title="Avaliação técnica"
          sourceLabel="Serviço de avaliação técnica"
          endpoint={API_PATHS.evaluate}
          loadingLabel="A obter a avaliação técnica…"
          state={evaluate}
          onRetry={() => onRetry(RESULT_SOURCES.evaluate)}
        />
      </div>

      <p className="mt-12 border-t border-charcoal/10 pt-5 text-sm leading-relaxed text-charcoal/80">
        O nível de confiança é uma pontuação atribuída pelo sistema, não uma garantia de sucesso da
        sementeira. O relatório detalhado — a recomendação de extensão e as justificações técnicas —
        será apresentado nesta área numa próxima versão.
      </p>
    </section>
  );
}
