import { STATUS_CODES, STATUS_DEFINITIONS } from '../../config/status.js';
import { useI18n } from '../../i18n/useI18n.js';
import { ROUTES, SECTION_IDS } from '../../routing/routes.js';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';
import { StatusIcon } from '../ui/icons.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';

// Chaves do dicionário (home.howItWorks.stepNTitle / stepNText).
const STEPS = ['step1', 'step2', 'step3'];

const STATUS_ORDER = [STATUS_CODES.FAVORAVEL, STATUS_CODES.AGUARDAR, STATUS_CODES.DESFAVORAVEL];

export default function HowItWorksSection() {
  const { t } = useI18n();
  const headingId = `${SECTION_IDS.howItWorks}-titulo`;

  return (
    <section id={SECTION_IDS.howItWorks} aria-labelledby={headingId} className="bg-surface">
      <Container className="py-20 lg:py-28">
        <SectionHeading
          id={headingId}
          title={t('home.howItWorks.title')}
          className="max-w-3xl"
        />

        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="border-t-aurora pt-6"
              data-reveal
              data-reveal-delay={String(Math.min(index + 1, 6))}
            >
              <span
                className="block font-display text-5xl leading-none text-label tabular-nums"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl leading-snug font-semibold text-ink">
                <span className="sr-only">{t('home.howItWorks.stepPrefix', { number: index + 1 })}</span>
                {t(`home.howItWorks.${step}Title`)}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{t(`home.howItWorks.${step}Text`)}</p>

              {index === STEPS.length - 1 ? (
                <ul className="mt-6 space-y-2.5" aria-label={t('home.howItWorks.statusListLabel')}>
                  {STATUS_ORDER.map((code) => {
                    const { tone } = STATUS_DEFINITIONS[code];
                    return (
                      <li key={code} className="flex items-center gap-3 font-semibold text-ink">
                        <StatusIcon tone={tone} className="size-5 shrink-0" />
                        <span>{t(`status.${code}`)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>

        <div data-reveal className="mt-16 flex flex-col items-start gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-display text-xl leading-snug text-ink">
            {t('home.howItWorks.ctaPrompt')}
          </p>
          <ButtonLink to={ROUTES.consultation}>{t('home.howItWorks.cta')}</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
