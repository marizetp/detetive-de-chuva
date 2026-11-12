import ButtonLink from '../components/ui/ButtonLink.jsx';
import Container from '../components/ui/Container.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ROUTES } from '../routing/routes.js';

export default function NotFoundPage() {
  useDocumentTitle('Página não encontrada');

  return (
    <Container className="py-20 lg:py-28">
      <div className="max-w-2xl">
        <Eyebrow>Erro 404</Eyebrow>
        <h1 className="mt-5 text-4xl leading-tight font-semibold text-forest sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-charcoal/85">
          O endereço que procurou não existe ou foi alterado.
        </p>
        <ButtonLink to={ROUTES.home} className="mt-10">
          Ir para a página inicial
        </ButtonLink>
      </div>
    </Container>
  );
}
