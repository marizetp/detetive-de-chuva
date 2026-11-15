import ButtonLink from '../components/ui/ButtonLink.jsx';
import Container from '../components/ui/Container.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useI18n } from '../i18n/useI18n.js';
import { ROUTES } from '../routing/routes.js';

export default function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(t('documentTitle.notFound'));

  return (
    <Container className="py-20 lg:py-28">
      <div className="max-w-2xl">
        <Eyebrow data-reveal>{t('notFound.eyebrow')}</Eyebrow>
        <h1 data-reveal data-reveal-delay="1" className="mt-5 text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-muted" data-reveal data-reveal-delay="2">
          {t('notFound.body')}
        </p>
        <ButtonLink to={ROUTES.home} className="mt-10" data-reveal data-reveal-delay="3">
          {t('notFound.cta')}
        </ButtonLink>
      </div>
    </Container>
  );
}
