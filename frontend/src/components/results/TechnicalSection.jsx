import { RESULT_SOURCES } from '../../config/api.js';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS } from './reportStructure.js';
import SourceError from './SourceError.jsx';
import SourceLabel from './SourceLabel.jsx';

const SUBHEADING = 'text-xs font-semibold tracking-[0.16em] text-earth uppercase';
const EMPTY_TEXT = 'text-charcoal/80';

function Triggers({ triggers }) {
  if (triggers === null) {
    return <p className={EMPTY_TEXT}>O serviço não enviou esta informação.</p>;
  }
  if (triggers.length === 0) {
    return <p className={EMPTY_TEXT}>Nenhum trigger activado, segundo o serviço.</p>;
  }
  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label="Códigos dos triggers activados">
        {triggers.map((trigger, index) => (
          <li key={`${index}-${trigger}`}>
            <code className="inline-block rounded-md bg-sage px-2.5 py-1 font-mono text-sm text-forest">
              {trigger}
            </code>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-charcoal/80">
        Códigos técnicos devolvidos pelo serviço. O seu significado não está documentado, por isso
        são apresentados sem tradução nem interpretação.
      </p>
    </>
  );
}

function Justifications({ justifications }) {
  if (justifications === null) {
    return <p className={EMPTY_TEXT}>O serviço não enviou esta informação.</p>;
  }
  if (justifications.length === 0) {
    return <p className={EMPTY_TEXT}>O serviço não apresentou justificações.</p>;
  }
  return (
    <ul className="max-w-prose space-y-3">
      {justifications.map((justification, index) => (
        <li key={`${index}-${justification}`} className="flex gap-4 leading-relaxed">
          <span className="mt-3 h-px w-5 shrink-0 bg-rain" aria-hidden="true" />
          <span>{justification}</span>
        </li>
      ))}
    </ul>
  );
}

/** 04 — Fundamentação técnica: triggers e justificações de /evaluate, tal como recebidos. */
export default function TechnicalSection({ evaluate, onRetry }) {
  let content = null;
  if (evaluate.status === 'loading') {
    content = <LoadingIndicator label="A obter a avaliação técnica…" />;
  } else if (evaluate.status === 'error') {
    content = (
      <SourceError source={RESULT_SOURCES.evaluate} error={evaluate.error} onRetry={onRetry} />
    );
  } else if (evaluate.status === 'success' && evaluate.result) {
    content = (
      <div className="space-y-10">
        <p className="max-w-prose leading-relaxed text-charcoal/85">
          Informação da avaliação técnica, complementar à recomendação. Os códigos e as frases são
          apresentados tal como foram recebidos.
        </p>
        <div>
          <h4 className={SUBHEADING}>Triggers activados</h4>
          <div className="mt-4">
            <Triggers triggers={evaluate.result.triggers} />
          </div>
        </div>
        <div>
          <h4 className={SUBHEADING}>Justificações técnicas</h4>
          <div className="mt-4">
            <Justifications justifications={evaluate.result.justifications} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReportSection
      section={REPORT_SECTIONS.technical}
      source={<SourceLabel source={RESULT_SOURCES.evaluate} />}
    >
      {content}
    </ReportSection>
  );
}
