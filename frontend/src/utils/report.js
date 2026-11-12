// Lógica pura do relatório. Não faz pedidos: trabalha só com os estados já recebidos.

import { RESULT_SOURCES } from '../config/api.js';
import { FIELD_LABELS, ISSUE_PROBLEM_LABELS } from '../config/fieldLabels.js';
import { formatIsoDateLong } from './format.js';
import { isValidIsoDate } from './validators.js';

const CONSULTATION_FIELDS = ['provincia', 'cultura', 'data_consulta'];

/** "Huambo · Milho · 12 de novembro de 2026" — identificação curta de uma consulta. */
export function describeConsultation(params) {
  if (!params) return '';
  return [params.provincia, params.cultura, formatIsoDateLong(params.data_consulta)].join(' · ');
}

/**
 * `true` quando dois conjuntos de parâmetros descrevem a mesma consulta.
 * Serve para avisar quando o formulário já não corresponde ao relatório apresentado.
 */
export function isSameConsultation(a, b) {
  if (!a || !b) return false;
  const norm = (value) => (typeof value === 'string' ? value.trim() : value ?? '');
  return CONSULTATION_FIELDS.every((field) => norm(a[field]) === norm(b[field]));
}

/** `true` quando a data consultada é anterior à data de referência (YYYY-MM-DD). */
export function isPastIsoDate(isoDate, today) {
  return isValidIsoDate(isoDate) && isValidIsoDate(today) && isoDate < today;
}

/**
 * O que o resumo (secção 01) apresenta como resultado principal.
 * - A recomendação é a fonte principal; enquanto carrega, o resumo espera por ela (não salta
 *   para a avaliação técnica e depois muda).
 * - Só se a recomendação falhar é que o resumo usa a avaliação técnica, sempre identificada.
 * @returns {'advisory' | 'evaluate' | 'loading' | 'unavailable'}
 */
export function selectSummarySource(advisory, evaluate) {
  if (advisory.status === 'success' && advisory.result) return RESULT_SOURCES.advisory;
  if (advisory.status === 'loading' || advisory.status === 'idle') return 'loading';
  if (evaluate.status === 'success' && evaluate.result) return RESULT_SOURCES.evaluate;
  if (evaluate.status === 'loading') return 'loading';
  return 'unavailable';
}

/**
 * O que se sabe sobre a natureza dos indicadores, segundo `is_fallback_weather` (só o /evaluate
 * o devolve). Nunca se assume substituição sem confirmação, nem dados reais sem confirmação.
 * - confirmed:   /evaluate indica dados de substituição
 * - denied:      /evaluate indica que não usou dados de substituição
 * - unconfirmed: /evaluate falhou ou não indicou o campo — natureza por confirmar
 * - pending:     /evaluate ainda não respondeu
 * @returns {'confirmed' | 'denied' | 'unconfirmed' | 'pending'}
 */
export function getFallbackStatus(evaluate) {
  if (evaluate.status === 'success') {
    const flag = evaluate.result?.isFallbackWeather;
    if (flag === true) return 'confirmed';
    if (flag === false) return 'denied';
    return 'unconfirmed';
  }
  if (evaluate.status === 'error') return 'unconfirmed';
  return 'pending';
}

/**
 * Converte os `issues` dos mappers em avisos legíveis, sem repetir o mesmo campo.
 * @param {{ field: string, problem: 'missing' | 'invalid' }[]} issues
 * @returns {{ field: string, label: string, problem: string }[]}
 */
export function describeIssues(issues) {
  const seen = new Set();
  const described = [];
  for (const { field, problem } of issues ?? []) {
    const key = `${field}:${problem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    described.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      problem: ISSUE_PROBLEM_LABELS[problem] ?? problem,
    });
  }
  return described;
}
