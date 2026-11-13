import { RESULT_SOURCES } from '../../config/api.js';
import { formatIsoDateLong } from '../../utils/format.js';
import { getFallbackStatus, isPastIsoDate } from '../../utils/report.js';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import MarkdownContent from './MarkdownContent.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS } from './reportStructure.js';
import SourceError from './SourceError.jsx';
import SourceLabel from './SourceLabel.jsx';

/**
 * Contexto a mostrar antes do texto, sem o alterar. O serviço pode escrever «período atual»
 * seja qual for a data consultada (observado a 2026-11-12).
 */
function contextNotes({ params, today, evaluate }) {
  const notes = [];
  if (isPastIsoDate(params?.data_consulta, today)) {
    notes.push(
      `A consulta é para ${formatIsoDateLong(params.data_consulta)}, uma data passada. O texto abaixo pode referir-se ao «período actual» e não descreve necessariamente as condições meteorológicas desse dia.`,
    );
  }
  const fallbackStatus = evaluate ? getFallbackStatus(evaluate) : 'pending';
  if (fallbackStatus === 'unconfirmed') {
    notes.push(
      'Não foi possível confirmar a natureza dos valores em que o texto se apoia: a avaliação técnica não os classificou. Não devem ser lidos como medições nem como previsões reais.',
    );
  }
  if (fallbackStatus === 'confirmed') {
    notes.push(
      'A avaliação técnica indica que os indicadores desta consulta são valores de substituição. O texto pode apoiar-se nesses valores, que não correspondem necessariamente a medições ou previsões reais.',
    );
  }
  return notes;
}

/** 03 — Recomendação de extensão: o texto de /advisory, integral e sem alterações. */
export default function RecommendationSection({ advisory, evaluate, params, today, onRetry }) {
  let content;
  if (advisory.status === 'loading') {
    content = <LoadingIndicator label="A obter a recomendação…" slowNotice={false} live={false} />;
  } else if (advisory.status === 'error') {
    content = (
      <SourceError source={RESULT_SOURCES.advisory} error={advisory.error} onRetry={onRetry} />
    );
  } else if (advisory.status === 'success' && advisory.result?.recommendationText) {
    const notes = contextNotes({ params, today, evaluate });
    content = (
      <>
        {notes.length > 0 ? (
          <InlineNotice tone="info" title="Contexto para ler esta recomendação" className="mb-8">
            {notes.map((note) => (
              <p key={note} className="mt-1 first:mt-0">
                {note}
              </p>
            ))}
          </InlineNotice>
        ) : null}
        <div className="max-w-prose border-l-2 border-line-strong pl-5 sm:pl-7">
          <MarkdownContent text={advisory.result.recommendationText} />
        </div>
        <p className="mt-8 max-w-prose text-sm leading-relaxed text-ink-muted">
          Texto produzido pelo serviço de recomendação e apresentado sem alterações. A redacção
          pode variar entre consultas. É uma orientação de apoio à decisão, não uma garantia de
          produtividade.
        </p>
      </>
    );
  } else if (advisory.status === 'success') {
    content = (
      <InlineNotice tone="info" title="O serviço não enviou o texto da recomendação.">
        Os restantes valores da recomendação, se recebidos, aparecem nas secções 01 e 02.
      </InlineNotice>
    );
  } else {
    content = null;
  }

  return (
    <ReportSection
      section={REPORT_SECTIONS.recommendation}
      source={<SourceLabel source={RESULT_SOURCES.advisory} />}
    >
      {content}
    </ReportSection>
  );
}
