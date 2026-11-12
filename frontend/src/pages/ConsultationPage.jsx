import ButtonLink from '../components/ui/ButtonLink.jsx';
import Container from '../components/ui/Container.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import Tag from '../components/ui/Tag.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ROUTES, SECTION_IDS } from '../routing/routes.js';

/**
 * Página temporária (Fase 3). O formulário e o relatório chegam nas fases seguintes.
 * Não faz pedidos à API nem simula resultados.
 */
export default function ConsultationPage() {
  useDocumentTitle('Consulta agrícola');

  return (
    <Container className="py-20 lg:py-28">
      <div className="max-w-2xl">
        <Eyebrow>Apoio à decisão de sementeira</Eyebrow>
        <h1 className="mt-5 text-4xl leading-tight font-semibold text-forest sm:text-5xl">
          Consulta agrícola
        </h1>
        <div className="mt-6">
          <Tag tone="pending">Em preparação</Tag>
        </div>
        <p className="mt-6 text-lg leading-relaxed text-charcoal/85">
          Nesta página vai poder seleccionar a província e a cultura e receber a avaliação do
          serviço: a classificação, o nível de confiança, os indicadores e a recomendação.
        </p>
        <p className="mt-4 leading-relaxed text-charcoal/80">
          A página ainda está em construção. Por enquanto, nenhuma consulta é realizada aqui.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <ButtonLink to={ROUTES.home}>Voltar à página inicial</ButtonLink>
          <ButtonLink
            to={`${ROUTES.home}#${SECTION_IDS.howItWorks}`}
            variant="text"
            withArrow={false}
          >
            Ver como funciona
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
