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
            className="text-5xl leading-[0.98] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            Detetive da Chuva
          </h1>

          <p className="mt-8 max-w-xl border-l-2 border-accent pl-5 font-display text-2xl leading-snug font-medium text-ink sm:text-3xl">
            O calendário agrícola de sempre ainda é fiável?
          </p>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-muted">
            Uma plataforma de apoio à decisão agrícola que apresenta os indicadores agroclimáticos
            disponibilizados pelo sistema, como a chuva e a humidade do solo, para ajudar a decidir
            quando semear.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <ButtonLink to={ROUTES.consultation}>Iniciar consulta agrícola</ButtonLink>
            <ButtonLink
              to={`${ROUTES.home}#${SECTION_IDS.howItWorks}`}
              variant="text"
              withArrow={false}
            >
              Como funciona
            </ButtonLink>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-sm sm:max-w-md lg:col-span-5 lg:max-w-none">
          <PlanaltoIllustration className="h-auto w-full" />
        </figure>
      </Container>
    </section>
  );
}
