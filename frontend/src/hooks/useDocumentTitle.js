import { useEffect } from 'react';

export const SITE_NAME = 'Detetive da Chuva';

/**
 * Define o título do separador: "Página · Detetive da Chuva", ou só o nome do site.
 * O nome da marca não se traduz; passar o título da página já traduzido (actualiza ao mudar de idioma).
 */
export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
  }, [pageTitle]);
}
