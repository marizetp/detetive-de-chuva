import { useId, useRef, useState } from 'react';
import { NAV_ITEMS, ROUTES, normalizePathname } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';
import BrandMark from '../ui/BrandMark.jsx';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';
import { CloseIcon, MenuIcon } from '../ui/icons.jsx';

const NAV_LINK =
  'rounded-sm text-sm font-medium text-charcoal/80 transition-colors hover:text-forest ' +
  'aria-[current=page]:text-forest aria-[current=page]:underline aria-[current=page]:decoration-2 ' +
  'aria-[current=page]:underline-offset-8';

/** Só ligações para páginas (não âncoras) recebem aria-current="page". */
function isCurrentPage(to, currentPath) {
  return !to.includes('#') && normalizePathname(to) === normalizePathname(currentPath);
}

export default function SiteHeader({ currentPath }) {
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
    <header className="border-b border-charcoal/10 bg-ivory" onKeyDown={handleKeyDown}>
      <Container className="flex h-18 items-center justify-between gap-6">
        <AppLink
          to={ROUTES.home}
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-sm text-forest"
        >
          <BrandMark className="size-8 shrink-0" />
          <span className="font-display text-xl leading-none font-semibold tracking-tight">
            Detetive da Chuva
          </span>
          <span className="sr-only">— página inicial</span>
        </AppLink>

        <div className="hidden items-center gap-10 md:flex">
          <nav aria-label="Principal">
            <ul className="flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <AppLink
                    to={item.to}
                    className={NAV_LINK}
                    aria-current={isCurrentPage(item.to, currentPath) ? 'page' : undefined}
                  >
                    {item.label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink
            to={ROUTES.consultation}
            size="sm"
            withArrow={false}
            aria-current={onConsultationPage ? 'page' : undefined}
          >
            Iniciar consulta
          </ButtonLink>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="-mr-2 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-forest md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          <span>{isMenuOpen ? 'Fechar' : 'Menu'}</span>
        </button>
      </Container>

      <div id={menuId} hidden={!isMenuOpen} className="border-t border-charcoal/10 md:hidden">
        <Container as="nav" aria-label="Principal (telemóvel)" className="py-4">
          <ul className="divide-y divide-charcoal/10">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <AppLink
                  to={item.to}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center text-base font-medium text-charcoal aria-[current=page]:text-forest"
                  aria-current={isCurrentPage(item.to, currentPath) ? 'page' : undefined}
                >
                  {item.label}
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
            Iniciar consulta agrícola
          </ButtonLink>
        </Container>
      </div>
    </header>
  );
}
