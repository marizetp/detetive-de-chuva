import { useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/useI18n.js';
import { NAV_ITEMS, ROUTES, normalizePathname } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';
import BrandMark from '../ui/BrandMark.jsx';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';
import { CloseIcon, MenuIcon } from '../ui/icons.jsx';
import LanguageSelector from './LanguageSelector.jsx';

// Página actual: texto ink (mais claro que os restantes, ink-muted) + barra Aurora decorativa.
// A barra nunca é a única pista: a mudança de cor do texto e aria-current também a indicam.
const NAV_LINK =
  'rounded-sm text-sm font-medium whitespace-nowrap text-ink-muted transition-colors hover:text-interactive ' +
  'aria-[current=page]:text-ink aria-[current=page]:indicator-aurora';

/** Só ligações para páginas (não âncoras) recebem aria-current="page". */
function isCurrentPage(to, currentPath) {
  return !to.includes('#') && normalizePathname(to) === normalizePathname(currentPath);
}

export default function SiteHeader({ currentPath }) {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef(null);

  const closeMenu = () => setIsMenuOpen(false);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  };

  const onConsultationPage = isCurrentPage(ROUTES.consultation, currentPath);

  return (
    <header className="border-b border-line bg-canvas" onKeyDown={handleKeyDown}>
      <Container className="flex h-18 items-center justify-between gap-3 sm:gap-6">
        <AppLink
          to={ROUTES.home}
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-3 rounded-sm text-ink"
        >
          <BrandMark className="size-8 shrink-0" />
          <span className="font-display text-xl leading-none font-semibold tracking-tight">
            Detetive da Chuva
          </span>
          <span className="sr-only">{t('header.homeLink')}</span>
        </AppLink>

        {/* Navegação completa só a partir de 1024 px: abaixo disso não cabe numa linha com o
            selector de idioma (em inglês e em português); usa-se o menu. */}
        <div className="hidden items-center gap-10 lg:flex">
          <nav aria-label={t('header.navLabel')}>
            <ul className="flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <AppLink
                    to={item.to}
                    className={NAV_LINK}
                    aria-current={isCurrentPage(item.to, currentPath) ? 'page' : undefined}
                  >
                    {t(item.labelKey)}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink
            to={ROUTES.consultation}
            size="sm"
            withArrow={false}
            className="whitespace-nowrap"
            aria-current={onConsultationPage ? 'page' : undefined}
          >
            {t('header.cta')}
          </ButtonLink>
        </div>

        {/* Selector de idioma: sempre visível no header, em qualquer largura. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSelector />
          <button
            ref={menuButtonRef}
            type="button"
            className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-semibold text-ink sm:px-3 lg:hidden"
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
            {/* Texto visível a partir de 640 px; abaixo, só o ícone (o nome acessível mantém-se). */}
            <span className="sr-only sm:not-sr-only">
              {isMenuOpen ? t('header.menuClose') : t('header.menuOpen')}
            </span>
          </button>
        </div>
      </Container>

      <div id={menuId} hidden={!isMenuOpen} className="border-t border-line lg:hidden">
        <Container as="nav" aria-label={t('header.navMobileLabel')} className="py-4">
          <ul className="divide-y divide-line">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <AppLink
                  to={item.to}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center text-base font-medium text-ink aria-[current=page]:text-interactive"
                  aria-current={isCurrentPage(item.to, currentPath) ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </AppLink>
              </li>
            ))}
          </ul>
          <ButtonLink
            to={ROUTES.consultation}
            onClick={closeMenu}
            className="mt-4 w-full justify-center"
            aria-current={onConsultationPage ? 'page' : undefined}
          >
            {t('header.ctaMobile')}
          </ButtonLink>
        </Container>
      </div>
    </header>
  );
}
