import { useRef } from 'react';
import LanguageSuggestion from './components/layout/LanguageSuggestion.jsx';
import SiteFooter from './components/layout/SiteFooter.jsx';
import SiteHeader from './components/layout/SiteHeader.jsx';
import SkipLink from './components/layout/SkipLink.jsx';
import { useCurrentLocation } from './hooks/useCurrentLocation.js';
import { useRevealMotion } from './hooks/useRevealMotion.js';
import { useRouteFocus } from './hooks/useRouteFocus.js';
import ConsultationPage from './pages/ConsultationPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { ROUTE_IDS, resolveRouteId } from './routing/routes.js';

const MAIN_CONTENT_ID = 'conteudo';

const PAGES = {
  [ROUTE_IDS.home]: HomePage,
  [ROUTE_IDS.consultation]: ConsultationPage,
  [ROUTE_IDS.notFound]: NotFoundPage,
};

/**
 * @param {{ demo?: { Banner: import('react').ComponentType } | null }} props
 *   `demo` só existe no modo de demonstração (main.jsx); em produção é sempre `null`.
 */
export default function App({ demo = null }) {
  const DemoBanner = demo?.Banner ?? null;
  const location = useCurrentLocation();
  const mainRef = useRef(null);
  useRouteFocus(location, mainRef);
  useRevealMotion();

  const Page = PAGES[resolveRouteId(location.pathname)];

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <SiteHeader currentPath={location.pathname} />
      {DemoBanner ? <DemoBanner /> : null}
      <LanguageSuggestion />
      <main id={MAIN_CONTENT_ID} ref={mainRef} tabIndex={-1} className="flex-1">
        <Page />
      </main>
      <SiteFooter />
    </div>
  );
}
