import { useEffect } from 'react';

export const SITE_NAME = 'Detetive da Chuva';

/** Define o título do separador: "Página · Detetive da Chuva", ou só o nome do site. */
export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
  }, [pageTitle]);
}
