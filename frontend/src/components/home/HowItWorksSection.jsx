import { STATUS_CODES, STATUS_DEFINITIONS } from '../../config/status.js';
import { ROUTES, SECTION_IDS } from '../../routing/routes.js';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';
import { StatusIcon } from '../ui/icons.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';

const STEPS = [
  {
    title: 'Seleccionar a província e a cultura',
    text: 'Escolha a província onde vai semear e a cultura que pretende instalar. As opções disponíveis são fornecidas pelo serviço.',
  },
  {
    title: 'Analisar as condições agroclimáticas',
    text: 'O serviço analisa indicadores agroclimáticos, como a chuva e a humidade do solo na zona das raízes, e devolve uma classificação para a província e a cultura escolhidas.',
  },
  {
    title: 'Consultar a recomendação',
    text: 'Recebe uma classificação, um nível de confiança e orientações práticas. O nível de confiança é uma pontuação do sistema, não uma garantia de sucesso.',
  },
];

const STATUS_ORDER = [STATUS_CODES.FAVORAVEL, STATUS_CODES.AGUARDAR, STATUS_CODES.DESFAVORAVEL];

export default function HowItWorksSection() {
  const headingId = `${SECTION_IDS.howItWorks}-titulo`;

  return (
    <section id={SECTION_IDS.howItWorks} aria-labelledby={headingId} className="bg-surface">
      <Container className="py-20 lg:py-28">
        <SectionHeading
          id={headingId}
          index="02"
          eyebrow="Funcionamento"
          eyebrowTone="onSurface"
          title="Três passos, do terreno à recomendação"
          className="max-w-3xl"
        />

        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t-2 border-line-strong pt-6">
              <span
                className="block font-display text-5xl leading-none text-line-strong tabular-nums"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl leading-snug font-semibold text-ink">
                <span className="sr-only">Passo {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{step.text}</p>

              {index === STEPS.length - 1 ? (
                <ul className="mt-6 space-y-2.5" aria-label="Classificações possíveis">
                  {STATUS_ORDER.map((code) => {
                    const { label, tone } = STATUS_DEFINITIONS[code];
                    return (
                      <li key={code} className="flex items-center gap-3 font-semibold text-ink">
                        <StatusIcon tone={tone} className="size-5 shrink-0" />
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-16 flex flex-col items-start gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-display text-xl leading-snug text-ink">
            Pronto para avaliar as condições da sua zona?
          </p>
          <ButtonLink to={ROUTES.consultation}>Iniciar consulta agrícola</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
