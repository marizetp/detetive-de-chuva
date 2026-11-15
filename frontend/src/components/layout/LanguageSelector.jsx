import { LANGUAGE_AUTONYMS, LANGUAGES, SUPPORTED_LANGUAGES } from '../../i18n/config.js';
import { useI18n } from '../../i18n/useI18n.js';
import { languageOptionId } from './languageOptionId.js';

const SHORT_LABELS = Object.freeze({ [LANGUAGES.en]: 'EN', [LANGUAGES.pt]: 'PT' });

/**
 * Selector de idioma do header, sempre visível (desktop e telemóvel). Dois botões com
 * `aria-pressed`; o nome acessível contém o texto visível ("EN English", "PT Português") e cada
 * opção tem o `lang` da sua língua. Opção activa: fundo selection (#2B6AFD) com texto branco
 * (4,58:1); a activa também se distingue pelo estado `aria-pressed`, não só pela cor.
 * A escolha é guardada como manual e tem prioridade sobre a detecção do navegador.
 */
export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('language.selectorLabel')}
      className={`flex shrink-0 items-center rounded-full border border-line-strong p-0.5 ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((option) => {
        const isActive = option === language;
        return (
          <button
            key={option}
            id={languageOptionId(option)}
            type="button"
            lang={option === LANGUAGES.pt ? 'pt' : 'en'}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) setLanguage(option);
            }}
            className="inline-flex min-h-10 min-w-9 items-center justify-center rounded-full px-1.5 type-meta sm:min-w-10 sm:px-2 text-ink-muted transition-colors hover:text-interactive aria-pressed:bg-selection aria-pressed:text-action-ink aria-pressed:hover:text-action-ink"
          >
            <span aria-hidden="true">{SHORT_LABELS[option]}</span>
            <span className="sr-only">
              {SHORT_LABELS[option]} {LANGUAGE_AUTONYMS[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
