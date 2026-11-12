import { useRef, useState } from 'react';
import ConsultationForm from '../components/forms/ConsultationForm.jsx';
import ResultsArea from '../components/results/ResultsArea.jsx';
import Container from '../components/ui/Container.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import { useCatalogOptions } from '../hooks/useCatalogOptions.js';
import { useConsultation } from '../hooks/useConsultation.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getCrops, getProvinces } from '../services/catalog.js';
import { getLocalIsoDate } from '../utils/dates.js';

const STACKED_LAYOUT_QUERY = '(max-width: 1023px)';

/** Em ecrãs estreitos os resultados ficam abaixo do formulário: trazê-los à vista. */
function revealResults(heading) {
  if (!heading || !window.matchMedia?.(STACKED_LAYOUT_QUERY).matches) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

export default function ConsultationPage() {
  useDocumentTitle('Consulta agrícola');

  // Data de referência fixada ao abrir a página (data local do dispositivo).
  const [today] = useState(() => getLocalIsoDate());
  const provinces = useCatalogOptions(getProvinces);
  const crops = useCatalogOptions(getCrops);
  const consultation = useConsultation();
  const resultsHeadingRef = useRef(null);

  const handleSubmit = (params) => {
    const started = consultation.submit(params);
    if (started) requestAnimationFrame(() => revealResults(resultsHeadingRef.current));
  };

  return (
    <Container className="py-14 lg:py-20">
      <header className="max-w-3xl">
        <Eyebrow>Consulta agrícola</Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-forest sm:text-5xl">
          Avaliar as condições para semear
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-charcoal/80">
          Indique onde, o quê e para que data. O pedido é enviado a dois serviços — a recomendação e
          a avaliação técnica — e cada resposta é apresentada em separado.
        </p>
      </header>

      <div className="mt-12 grid gap-14 lg:mt-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="rounded-2xl bg-sage px-5 py-7 sm:px-7 lg:sticky lg:top-8">
            <ConsultationForm
              provinces={provinces}
              crops={crops}
              today={today}
              isPending={consultation.isPending}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          <ResultsArea
            submittedParams={consultation.submittedParams}
            advisory={consultation.advisory}
            evaluate={consultation.evaluate}
            onRetry={consultation.retrySource}
            headingRef={resultsHeadingRef}
          />
        </div>
      </div>
    </Container>
  );
}
