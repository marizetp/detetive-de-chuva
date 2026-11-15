import { BACKEND_CONTENT_LANGUAGE } from '../../i18n/config.js';
import { useI18n } from '../../i18n/useI18n.js';
import { DYNAMIC_CONTENT_MODES, resolveDynamicContentMode } from '../../utils/localizedContent.js';
import { ChevronDownIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';

/**
 * Texto livre do backend. No idioma do backend, mostra-o directamente. Noutro idioma, nunca o
 * mistura em silêncio com a interface: mostra um aviso claro (no idioma da interface) e um painel
 * fechado com o texto original, marcado com `lang`, que continua disponível para auditoria.
 * O texto original nunca é alterado.
 *
 * @param {{ unavailableTitleKey: string, children: import('react').ReactNode }} props
 */
export default function SourceLanguageContent({ unavailableTitleKey, children }) {
  const { language, t } = useI18n();

  if (resolveDynamicContentMode(language) === DYNAMIC_CONTENT_MODES.native) return children;

  return (
    <div>
      <InlineNotice tone="info" title={t(unavailableTitleKey)}>
        {t('results.sourceLanguage.body')}
      </InlineNotice>
      <details className="group mt-5 rounded-xl border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm font-semibold text-ink hover:text-interactive [&::-webkit-details-marker]:hidden">
          <span>
            {t('results.sourceLanguage.viewOriginal', {
              language: t(`languageNames.${BACKEND_CONTENT_LANGUAGE}`),
            })}
          </span>
          <ChevronDownIcon className="size-5 shrink-0 text-label transition-transform group-open:rotate-180" />
        </summary>
        <div lang={BACKEND_CONTENT_LANGUAGE} className="border-t border-line px-4 py-5">
          {children}
        </div>
      </details>
    </div>
  );
}
