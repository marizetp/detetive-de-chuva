import { ROUTES } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';
import { REPORT_SECTION_ORDER } from './reportStructure.js';

/** Índice do relatório: leitura progressiva, mas com acesso directo a cada secção. */
export default function ReportContents() {
  return (
    <nav aria-label="Secções do relatório">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {REPORT_SECTION_ORDER.map((section) => (
          <li key={section.id}>
            <AppLink
              to={`${ROUTES.consultation}#${section.id}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-sm text-charcoal/85 hover:text-forest"
            >
              <span className="font-mono text-xs text-earth" aria-hidden="true">
                {section.index}
              </span>
              <span className="underline decoration-charcoal/20 underline-offset-4">{section.title}</span>
            </AppLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
