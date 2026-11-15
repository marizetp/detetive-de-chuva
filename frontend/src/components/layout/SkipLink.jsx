import { useI18n } from '../../i18n/useI18n.js';

/** Primeira paragem do teclado: salta a navegação e coloca o foco no conteúdo principal. */
export default function SkipLink({ targetId }) {
  const { t } = useI18n();
  const handleClick = (event) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only rounded-full bg-action px-5 py-3 font-semibold text-action-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      {t('skipLink')}
    </a>
  );
}
