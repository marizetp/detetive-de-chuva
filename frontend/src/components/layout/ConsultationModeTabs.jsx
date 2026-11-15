import { useI18n } from '../../i18n/useI18n.js';
import { WORKSPACE_TABS } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';

/**
 * Barra de separadores (Mapa | Ciclo | Consulta tradicional) posicionada logo acima
 * da consulta tradicional e das vistas de Mapa e Ciclo para alternar facilmente e
 * regressar sempre ao ecrã da consulta tradicional.
 */
export default function ConsultationModeTabs({ activeTab }) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t('workspace.navLabel')}
      className="mb-8 flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5 sm:inline-flex sm:w-auto"
    >
      {WORKSPACE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <AppLink
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 rounded-xl px-3.5 py-2 text-center text-sm font-semibold transition-colors sm:flex-initial sm:px-4 ${
              isActive
                ? 'bg-action text-action-ink shadow-xs'
                : 'text-ink-muted hover:bg-canvas/70 hover:text-ink'
            }`}
          >
            {t(tab.labelKey)}
          </AppLink>
        );
      })}
    </nav>
  );
}
