import { SECTION_IDS } from '../../routing/routes.js';
import Container from '../ui/Container.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';
import Tag from '../ui/Tag.jsx';

// Só se descreve o que está confirmado (CLAUDE.md §6). A origem dos dados meteorológicos do
// serviço ainda não está documentada; as tendências NASA POWER são uma proposta em rascunho.
const SOURCES = [
  {
    status: 'available',
    statusLabel: 'Disponível',
    title: 'Serviço de avaliação do Detetive da Chuva',
    text: 'API do projecto que devolve, para cada consulta, a classificação, o nível de confiança, os indicadores e a recomendação, bem como uma avaliação técnica complementar. A origem detalhada dos dados meteorológicos utilizados pelo serviço ainda não está documentada nesta versão.',
  },
  {
    status: 'pending',
    statusLabel: 'Em preparação',
    title: 'Tendências agroclimáticas históricas',
    detail: 'NASA POWER · reanálise MERRA-2',
    text: 'Análise de tendências de longo prazo a partir de dados de reanálise — um produto de modelo, não uma medição directa. Ainda não está disponível na plataforma.',
  },
];

const PLATFORM_NATURE = [
  'É uma ferramenta de apoio à decisão. Não garante o sucesso da sementeira.',
  'O nível de confiança é uma pontuação atribuída pelo sistema, não uma probabilidade confirmada.',
  'O texto da recomendação é produzido pelo serviço e a sua redacção pode variar entre consultas.',
  'Não substitui o conhecimento local nem o acompanhamento de técnicos de extensão agrícola.',
];

export default function DataSourcesSection() {
  const headingId = `${SECTION_IDS.sources}-titulo`;

  return (
    <section id={SECTION_IDS.sources} aria-labelledby={headingId}>
      <Container className="py-20 lg:py-28">
        <SectionHeading
          id={headingId}
          title="De onde vêm os dados, e o que ainda não sabemos"
          className="max-w-3xl"
        />

        <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h3 className="font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase">
              Fontes de dados
            </h3>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {SOURCES.map((source) => (
                <li key={source.title} className="py-7">
                  <Tag tone={source.status}>{source.statusLabel}</Tag>
                  <h4 className="mt-4 font-display text-2xl leading-snug text-ink">
                    {source.title}
                  </h4>
                  {source.detail ? (
                    <p className="mt-1 font-mono text-sm text-accent">{source.detail}</p>
                  ) : null}
                  <p className="mt-3 max-w-prose leading-relaxed text-ink-muted">{source.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-5" aria-labelledby="natureza-titulo">
            <h3
              id="natureza-titulo"
              className="font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase"
            >
              Natureza da plataforma
            </h3>
            <ul className="mt-5 space-y-5">
              {PLATFORM_NATURE.map((item) => (
                <li key={item} className="flex gap-4 leading-relaxed text-ink-muted">
                  <span className="mt-3 h-px w-5 shrink-0 bg-accent" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </section>
  );
}
