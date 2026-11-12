// Lógica pura do relatório. Não faz pedidos: trabalha só com os estados já recebidos.

import { RESULT_SOURCES } from '../config/api.js';
import { FIELD_LABELS, ISSUE_PROBLEM_LABELS } from '../config/fieldLabels.js';
import { isValidIsoDate } from './validators.js';

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
