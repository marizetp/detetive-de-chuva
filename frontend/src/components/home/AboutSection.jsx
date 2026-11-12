import { METRIC_DEFINITIONS, METRIC_UNIT_LABELS } from '../../config/metrics.js';
import { SECTION_IDS } from '../../routing/routes.js';
import Container from '../ui/Container.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';

export default function AboutSection() {
  const headingId = `${SECTION_IDS.about}-titulo`;

  return (
    <section id={SECTION_IDS.about} aria-labelledby={headingId} className="border-t border-line">
      <Container className="grid gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <SectionHeading
          id={headingId}
          index="01"
          eyebrow="Apresentação"
          title="Informação agroclimática para decidir quando semear"
          className="lg:col-span-5"
        />

        <div className="lg:col-span-7">
          <div className="max-w-prose space-y-5 text-lg leading-relaxed text-ink-muted">
            <p>
              O calendário agrícola tradicional orienta a sementeira no Planalto Central há
              gerações. O Detetive da Chuva parte de uma pergunta simples: as condições deste
              momento acompanham esse calendário?
            </p>
            <p>
              Para cada província e cultura, a plataforma consulta um serviço de avaliação
              agroclimática e apresenta o resultado de forma clara: uma classificação, um nível de
              confiança, os indicadores em que se baseia e orientações práticas para o terreno.
            </p>
          </div>

          <h3 className="mt-14 font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase">
            Indicadores considerados
          </h3>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {METRIC_DEFINITIONS.map((metric) => (
              <div key={metric.key} className="grid gap-2 py-5 sm:grid-cols-12 sm:gap-6">
                <dt className="flex items-baseline justify-between gap-4 sm:col-span-5 sm:block">
                  <span className="font-display text-xl leading-snug text-ink">
                    {metric.label}
                  </span>
                  <span className="font-mono text-sm text-accent sm:mt-1 sm:block">
                    {METRIC_UNIT_LABELS[metric.unit]}
                  </span>
                </dt>
                <dd className="text-base leading-relaxed text-ink-muted sm:col-span-7">
                  {metric.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
