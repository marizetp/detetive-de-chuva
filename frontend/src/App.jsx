import { useRef } from 'react';
import SiteFooter from './components/layout/SiteFooter.jsx';
import SiteHeader from './components/layout/SiteHeader.jsx';
import SkipLink from './components/layout/SkipLink.jsx';
import { useCurrentLocation } from './hooks/useCurrentLocation.js';
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

export default function App() {
  const location = useCurrentLocation();
  const mainRef = useRef(null);
  useRouteFocus(location, mainRef);

  const Page = PAGES[resolveRouteId(location.pathname)];

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <SiteHeader currentPath={location.pathname} />
      <main id={MAIN_CONTENT_ID} ref={mainRef} tabIndex={-1} className="flex-1">
        <Page />
      </main>
      <SiteFooter />
    </div>
  );
}
