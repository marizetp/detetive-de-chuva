import { NAV_ITEMS, ROUTES } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';
import BrandMark from '../ui/BrandMark.jsx';
import Container from '../ui/Container.jsx';

const FOOTER_LINK =
  'rounded-sm text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-accent hover:decoration-accent';

const FOOTER_HEADING = 'font-mono text-xs font-medium tracking-[0.14em] text-ink-subtle uppercase';

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-ink-muted">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="flex items-center gap-3 text-ink">
              <BrandMark className="size-8 shrink-0" />
              <span className="font-display text-xl font-semibold">Detetive da Chuva</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Inteligência agroclimática para apoiar decisões agrícolas em Angola.
            </p>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-3">
            <h2 className={FOOTER_HEADING}>Navegar</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <AppLink to={item.to} className={FOOTER_LINK}>
                    {item.label}
                  </AppLink>
                </li>
              ))}
              <li>
                <AppLink to={ROUTES.consultation} className={FOOTER_LINK}>
                  Consulta agrícola
                </AppLink>
              </li>
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className={FOOTER_HEADING}>Dados</h2>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold text-ink">Avaliações e recomendações</dt>
                <dd>Serviço de avaliação do Detetive da Chuva (API do projecto).</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Tendências históricas</dt>
                <dd>NASA POWER (reanálise MERRA-2) — em preparação, ainda não disponível.</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted md:flex-row md:justify-between md:gap-8">
          <p className="max-w-2xl">
            Projecto desenvolvido no âmbito do NASA Space Apps Challenge 2026. O Detetive da Chuva
            não é um serviço oficial da NASA.
          </p>
          <p className="shrink-0">Ferramenta de apoio à decisão — não garante resultados agrícolas.</p>
        </div>
      </Container>
    </footer>
  );
}
