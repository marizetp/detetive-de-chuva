import { ROUTES, SECTION_IDS } from '../../routing/routes.js';
import PlanaltoIllustration from '../illustrations/PlanaltoIllustration.jsx';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';

export default function HeroSection() {
  return (
    <section aria-labelledby="hero-title">
      <Container className="grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7">
          <h1
            id="hero-title"
            data-reveal
            className="text-5xl leading-[0.98] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            Detetive da Chuva
          </h1>

          <p
            className="motion-question mt-8 max-w-xl border-l-aurora pl-5 font-display text-2xl leading-snug font-medium text-ink sm:text-3xl"
            data-reveal
            data-reveal-delay="2"
          >
            <span className="motion-question-text">O calendário agrícola de sempre ainda é fiável?</span>
          </p>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-muted" data-reveal data-reveal-delay="4">
            Uma plataforma de apoio à decisão agrícola que apresenta os indicadores agroclimáticos
            disponibilizados pelo sistema, como a chuva e a humidade do solo, para ajudar a decidir
            quando semear.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <ButtonLink to={ROUTES.consultation} data-reveal data-reveal-delay="5">
              Iniciar consulta agrícola
            </ButtonLink>
            <ButtonLink
              to={`${ROUTES.home}#${SECTION_IDS.howItWorks}`}
              variant="text"
              withArrow={false}
              data-reveal
              data-reveal-delay="6"
            >
              Como funciona
            </ButtonLink>
          </div>
        </div>

        <figure
          className="mx-auto w-full max-w-sm sm:max-w-md lg:col-span-5 lg:max-w-none"
          data-reveal="scale"
          data-reveal-delay="2"
          data-inview-scope
        >
          <PlanaltoIllustration className="motion-float h-auto w-full" />
        </figure>
      </Container>
    </section>
  );
}
