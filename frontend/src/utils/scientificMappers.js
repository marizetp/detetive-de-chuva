// Mappers dos motores independentes do DecisionEngine: IMERG (`/zonas/{zona}/decisao`) e janela de
// plantio (`/api/v1/optimal-planting`). Ainda não integrados na interface (decisão D11).
// Regras: nada é inventado nem recalculado; valores científicos passam sem alteração; códigos ficam
// como recebidos; o texto livre fica no idioma em que veio (`contentLanguage`, se declarado).

import { normalizeContentLanguage } from '../i18n/config.js';
import { IMERG_CODE_OUTCOMES, IMERG_CONCLUSIVE_OUTCOMES, IMERG_OUTCOMES } from '../config/imerg.js';
import { isFiniteNumber, isNonEmptyString, isPlainObject } from './validators.js';

const text = (value) => (isNonEmptyString(value) ? value : null);
const number = (value) => (isFiniteNumber(value) ? value : null);
const object = (value) => (isPlainObject(value) ? value : {});

/** Texto ou lista de textos (`notas` não tem forma documentada). */
function textList(value) {
  if (isNonEmptyString(value)) return [value];
  if (Array.isArray(value)) {
    const items = value.filter(isNonEmptyString);
    return items.length > 0 ? items : null;
  }
  return null;
}

/**
 * Código do motor IMERG. Nas respostas observadas (2026-11-15) vem em `mensagem_agricultor.codigo`;
 * o docs2 §5 coloca-o em `estado_motor`. Aceitam-se os dois, com prioridade ao observado, e só
 * códigos da tabela oficial contam para `estado_motor` (que, na prática, traz outros valores).
 */
function readImergCode(source) {
  const fromMessage = text(object(source.mensagem_agricultor).codigo);
  if (fromMessage) return fromMessage;
  const fromState = text(source.estado_motor);
  return fromState && IMERG_CODE_OUTCOMES[fromState] ? fromState : null;
}

/** Desfecho de apresentação de um código IMERG. Nunca devolve um estado do DecisionEngine. */
export function classifyImergCode(code) {
  if (!isNonEmptyString(code)) return IMERG_OUTCOMES.missing;
  return IMERG_CODE_OUTCOMES[code] ?? IMERG_OUTCOMES.unknown;
}

/** GET /zonas/{zona}/decisao[/{data_ref}] → view model. */
export function mapImergDecisionResponse(raw) {
  const source = object(raw);
  const message = object(source.mensagem_agricultor);
  const code = readImergCode(source);
  const outcome = classifyImergCode(code);
  return {
    source: 'imerg',
    zone: text(source.zona),
    zoneName: text(source.zona_nome),
    season: text(source.epoca),
    referenceDate: text(source.data_ref),
    code,
    outcome,
    /** Falso para «sem conclusão», «fora da época», desconhecido ou em falta: não há decisão. */
    isConclusive: IMERG_CONCLUSIVE_OUTCOMES.includes(outcome),
    /** Valor bruto de `estado_motor`, preservado para auditoria (não interpretado). */
    engineState: text(source.estado_motor),
    // Texto livre do backend (localizável pelo backend; nunca traduzido no browser).
    answer: text(source.resposta),
    farmerMessage: text(message.texto),
    technicalReason: text(source.motivo_tecnico), // documentado; não observado em 2026-11-15
    notes: textList(source.notas), // pedido ao backend; não observado em 2026-11-15
    confidenceGrade: text(object(source.grau_confianca).grau),
    provisionalThresholds: source.limiares_provisorios === true,
    seasonsCount: number(source.n_epocas),
    contentLanguage: normalizeContentLanguage(source.content_language),
  };
}

/**
 * Chaves de mensagem para um desfecho IMERG sem decisão. Para «sem base fiável», «fora da época»,
 * desconhecido ou em falta, a interface explica a situação e nunca mostra uma indicação de plantio.
 * @returns {{ titleKey: string, bodyKey: string } | null} `null` para desfechos com indicação
 */
export function imergNoDecisionMessageKeys(outcome) {
  if (IMERG_CONCLUSIVE_OUTCOMES.includes(outcome)) return null;
  const key = Object.values(IMERG_OUTCOMES).includes(outcome) ? outcome : IMERG_OUTCOMES.unknown;
  return { titleKey: `imerg.noDecision.${key}.title`, bodyKey: `imerg.noDecision.${key}.body` };
}

/** GET /api/v1/optimal-planting → view model. Quantis, riscos e IC90 passam sem alteração. */
export function mapOptimalPlantingResponse(raw) {
  const source = object(raw);
  const window = object(source.janela_recomendada);
  const risk = object(source.risco_falsa_partida);
  const requirements = object(source.exigencia_cultura);
  const ic90 = Array.isArray(risk.ic90_pct) && risk.ic90_pct.length === 2 && risk.ic90_pct.every(isFiniteNumber)
    ? [...risk.ic90_pct]
    : null;
  return {
    source: 'optimalPlanting',
    zone: text(source.zona),
    province: text(source.provincia),
    crop: text(source.cultura),
    season: text(source.epoca_agricola),
    window: {
      start: text(window.inicio),
      end: text(window.fim),
      periodDescription: text(window.descricao_periodo),
      imergMedianOnset: text(window.inicio_chuvas_mediano_imerg),
      imergP90Consolidation: text(window.consolidacao_chuvas_p90_imerg),
    },
    favourableProbabilityPct: number(source.probabilidade_condicoes_favoraveis_pct),
    falseStartRisk: {
      referenceDate: text(risk.data_referencia),
      probabilityPct: number(risk.probabilidade_pct),
      ic90Pct: ic90,
      historicalFrequency: text(risk.frequencia_historica),
      note: text(risk.nota),
    },
    agronomicNotes: text(requirements.notas_agronomicas),
    warning: text(source.aviso),
    contentLanguage: normalizeContentLanguage(source.content_language),
  };
}
