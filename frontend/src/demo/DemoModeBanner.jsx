import Container from '../components/ui/Container.jsx';
import InlineNotice from '../components/ui/InlineNotice.jsx';
import { localizeCropValue } from '../i18n/catalogNames.js';
import { useI18n } from '../i18n/useI18n.js';
import { formatIsoDateLong } from '../utils/format.js';
import { mapCatalogOptions } from '../utils/mappers.js';
import { describeConsultation } from '../utils/report.js';
import { CAPTURE_DATE, listDemoConsultations, recordedCrops } from './recordings.js';

const CONSULTATIONS = listDemoConsultations();
const CROP_OPTIONS = mapCatalogOptions(recordedCrops()).options;

/**
 * Faixa permanente do modo de demonstração (não pode ser fechada). Indica a data da captura, que
 * os dados não representam condições actuais e as consultas disponíveis (derivadas do manifesto).
 * Usa os componentes e tokens existentes (InlineNotice informativo, superfície, linha).
 */
export default function DemoModeBanner() {
  const { t, language } = useI18n();
  const date = formatIsoDateLong(CAPTURE_DATE, language);

  return (
    <aside aria-label={t('demo.regionLabel')} className="border-b border-line bg-surface">
      <Container className="py-4">
        <InlineNotice tone="info" title={t('demo.title')}>
          <p>{t('demo.body', { date })}</p>
          <p className="mt-2 font-semibold text-ink">{t('demo.available')}</p>
          <ul className="mt-1 space-y-0.5">
            {CONSULTATIONS.map(({ params, sources }) => (
              <li key={JSON.stringify(params)}>
                {describeConsultation(params, {
                  language,
                  cropLabel: (value) => localizeCropValue(value, CROP_OPTIONS, language),
                })}
                {sources.includes('advisory') ? null : ` (${t('demo.assessmentOnly')})`}
              </li>
            ))}
          </ul>
        </InlineNotice>
      </Container>
    </aside>
  );
}
