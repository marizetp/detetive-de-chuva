import { useI18n } from '../../i18n/useI18n.js';
import { NAV_ITEMS, ROUTES } from '../../routing/routes.js';
import AppLink from '../ui/AppLink.jsx';
import BrandMark from '../ui/BrandMark.jsx';
import Container from '../ui/Container.jsx';

const FOOTER_LINK =
  'inline-block rounded-sm py-1 text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-interactive hover:decoration-interactive';

const FOOTER_HEADING = 'type-label font-display text-label';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-line bg-surface text-ink-muted">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="flex items-center gap-3 text-ink">
              <BrandMark className="size-8 shrink-0" />
              <span className="font-display text-xl font-semibold">AgroKairos</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <nav aria-label={t('footer.navLabel')} className="md:col-span-3">
            <h2 className={FOOTER_HEADING}>{t('footer.navHeading')}</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <AppLink to={item.to} className={FOOTER_LINK}>
                    {t(item.labelKey)}
                  </AppLink>
                </li>
              ))}
              <li>
                <AppLink to={ROUTES.consultation} className={FOOTER_LINK}>
                  {t('footer.consultation')}
                </AppLink>
              </li>
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className={FOOTER_HEADING}>{t('footer.dataHeading')}</h2>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold text-ink">{t('footer.advisoryTerm')}</dt>
                <dd>{t('footer.advisoryDescription')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">{t('footer.trendsTerm')}</dt>
                <dd>{t('footer.trendsDescription')}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted md:flex-row md:justify-between md:gap-8">
          <p className="max-w-2xl">
            {t('footer.disclaimer')}
          </p>
          <p className="shrink-0">{t('footer.decisionSupport')}</p>
        </div>
      </Container>
    </footer>
  );
}
