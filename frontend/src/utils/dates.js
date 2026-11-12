/**
 * Data local do dispositivo em YYYY-MM-DD.
 * Não usa toISOString(), que devolve a data UTC e pode estar um dia desfasada perto da meia-noite.
 *
 * Limitação conhecida (decisão de 2026-11-12, CLAUDE.md §11): é a referência para recusar datas
 * futuras. Se o relógio ou o fuso horário do dispositivo estiverem errados, a validação pode
 * recusar o dia actual ou aceitar um dia que já é futuro para o servidor (`data_servidor`).
 */
export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
