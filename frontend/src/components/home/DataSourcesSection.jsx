import { useI18n } from '../../i18n/useI18n.js';
import { SECTION_IDS } from '../../routing/routes.js';
import Container from '../ui/Container.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';
import Tag from '../ui/Tag.jsx';

// Só se descreve o que está confirmado (CLAUDE.md §6). A origem dos dados meteorológicos do
// serviço ainda não está documentada; as tendências NASA POWER são uma proposta em rascunho.
// Textos em home.sources.* (dicionários i18n).
const SOURCES = [
  { key: 'service', status: 'available' },
  { key: 'trends', status: 'pending' },
];

const PLATFORM_NATURE = ['nature1', 'nature2', 'nature3', 'nature4'];

export default function DataSourcesSection() {
  const { t } = useI18n();
  const headingId = `${SECTION_IDS.sources}-titulo`;

  return (
    <section id={SECTION_IDS.sources} aria-labelledby={headingId}>
      <Container className="py-20 lg:py-28">
        <SectionHeading
          id={headingId}
          title={t('home.sources.title')}
          className="max-w-3xl"
        />

        <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h3 className="type-label font-display text-label" data-reveal>
              {t('home.sources.sourcesHeading')}
            </h3>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {SOURCES.map((source, index) => (
                <li
                  key={source.key}
                  className="py-7"
                  data-reveal
                  data-reveal-delay={String(Math.min(index + 1, 6))}
                >
                  <Tag tone={source.status}>{t(`home.sources.${source.status}`)}</Tag>
                  <h4 className="mt-4 font-display text-2xl leading-snug text-ink">
                    {t(`home.sources.${source.key}Title`)}
                  </h4>
                  <p className="mt-3 max-w-prose leading-relaxed text-ink-muted">{t(`home.sources.${source.key}Text`)}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-5" aria-labelledby="natureza-titulo">
            <h3
              id="natureza-titulo"
              className="type-label font-display text-label"
              data-reveal
            >
              {t('home.sources.natureHeading')}
            </h3>
            <ul className="mt-5 space-y-5">
              {PLATFORM_NATURE.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-4 leading-relaxed text-ink-muted"
                  data-reveal
                  data-reveal-delay={String(Math.min(index + 1, 6))}
                >
                  <span className="mt-3 h-px w-5 shrink-0 bg-aurora" aria-hidden="true" />
                  <span>{t(`home.sources.${item}`)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </section>
  );
}
