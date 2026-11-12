import { lazy, Suspense } from 'react';
import { RESULT_SOURCES } from '../../config/api.js';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS } from './reportStructure.js';
import SourceError from './SourceError.jsx';
import SourceLabel from './SourceLabel.jsx';

// Carregado só quando há uma recomendação para mostrar: o renderizador de Markdown não pesa
// na página inicial nem no primeiro carregamento da consulta (ligações lentas).
const MarkdownContent = lazy(() => import('./MarkdownContent.jsx'));

/** 03 — Recomendação de extensão: o texto de /advisory, integral e sem alterações. */
export default function RecommendationSection({ advisory, onRetry }) {
  let content;
  if (advisory.status === 'loading') {
    content = <LoadingIndicator label="A obter a recomendação…" />;
  } else if (advisory.status === 'error') {
    content = (
      <SourceError source={RESULT_SOURCES.advisory} error={advisory.error} onRetry={onRetry} />
    );
  } else if (advisory.status === 'success' && advisory.result?.recommendationText) {
    content = (
      <>
        <div className="max-w-prose border-l-2 border-sage pl-5 sm:pl-7">
          <Suspense fallback={<LoadingIndicator label="A preparar o texto da recomendação…" />}>
            <MarkdownContent text={advisory.result.recommendationText} />
          </Suspense>
        </div>
        <p className="mt-8 max-w-prose text-sm leading-relaxed text-charcoal/80">
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
