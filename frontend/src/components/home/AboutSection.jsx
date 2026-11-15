import { METRIC_DEFINITIONS, METRIC_UNIT_LABELS } from '../../config/metrics.js';
import { useI18n } from '../../i18n/useI18n.js';
import { SECTION_IDS } from '../../routing/routes.js';
import Container from '../ui/Container.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';

export default function AboutSection() {
  const { t } = useI18n();
  const headingId = `${SECTION_IDS.about}-titulo`;

  return (
    <section id={SECTION_IDS.about} aria-labelledby={headingId} className="border-t border-line">
      <Container className="grid gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <SectionHeading
          id={headingId}
          title={t('home.about.title')}
          className="lg:col-span-5"
        />

        <div className="lg:col-span-7">
          <div className="max-w-prose space-y-5 text-lg leading-relaxed text-ink-muted" data-reveal data-reveal-delay="1">
            <p>{t('home.about.paragraph1')}</p>
            <p>{t('home.about.paragraph2')}</p>
          </div>

          <h3 className="mt-14 type-label font-display text-label" data-reveal>
            {t('home.about.indicatorsHeading')}
          </h3>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {METRIC_DEFINITIONS.map((metric, index) => (
              <div
                key={metric.key}
                className="grid gap-2 py-5 sm:grid-cols-12 sm:gap-6"
                data-reveal
                data-reveal-delay={String(Math.min(index + 1, 6))}
              >
                <dt className="flex items-baseline justify-between gap-4 sm:col-span-5 sm:block">
                  <span className="font-display text-xl leading-snug text-ink">
                    {t(`metrics.${metric.key}.label`)}
                  </span>
                  <span className="text-sm text-label sm:mt-1 sm:block">
                    {METRIC_UNIT_LABELS[metric.unit]}
                  </span>
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted sm:col-span-7">
                  {t(`metrics.${metric.key}.description`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
