import { LANGUAGES } from '../../i18n/config.js';
import { createTranslator } from '../../i18n/translate.js';
import { useI18n } from '../../i18n/useI18n.js';
import Button from '../ui/Button.jsx';
import Container from '../ui/Container.jsx';
import { languageOptionId } from './languageOptionId.js';

const TITLE_ID = 'sugestao-idioma-titulo';
const tPortuguese = createTranslator(LANGUAGES.pt);

function focusLanguageOption(language) {
  // Depois de a faixa desaparecer, o foco passa para o selector de idioma (onde a escolha pode
  // ser mudada mais tarde), em vez de se perder no início do documento.
  requestAnimationFrame(() => document.getElementById(languageOptionId(language))?.focus());
}

/**
 * Sugestão de idioma: faixa no fluxo da página, logo abaixo do header (não flutua nem tapa
 * conteúdo). Aparece só na primeira visita, quando a preferência principal do navegador é
 * português e o utilizador ainda não escolheu nem recusou. Não é um diálogo: não prende nem rouba
 * o foco. Nunca muda o idioma sozinha.
 * A pergunta aparece também em português (`lang="pt"`), para quem tem o navegador nessa língua.
 */
export default function LanguageSuggestion() {
  const { t, suggestion } = useI18n();
  if (!suggestion.visible) return null;

  const accept = () => {
    suggestion.accept();
    focusLanguageOption(LANGUAGES.pt);
  };
  const dismiss = () => {
    suggestion.dismiss();
    focusLanguageOption(LANGUAGES.en);
  };

  return (
    <section aria-labelledby={TITLE_ID} className="border-b border-line bg-surface">
      <Container className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="border-l-aurora pl-4">
          <h2 id={TITLE_ID} className="font-display text-base leading-snug font-semibold text-ink">
            {t('suggestion.title')}
          </h2>
          <p lang="pt" className="mt-0.5 text-sm leading-relaxed text-ink-muted">
            {tPortuguese('suggestion.title')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={accept}>
            {t('suggestion.accept')}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}>
            {t('suggestion.dismiss')}
          </Button>
        </div>
      </Container>
    </section>
  );
}
