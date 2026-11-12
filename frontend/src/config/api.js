// Constantes da integração com a API. Fonte: docs/backend-api.md.

/** URL documentada; usada quando VITE_API_BASE_URL não está definida (decisão de 2026-11-12). */
export const DEFAULT_API_BASE_URL = 'https://detetive-da-chuva.onrender.com';

/**
 * Tempo máximo por pedido, substituível por VITE_API_TIMEOUT_MS (decisão de 2026-11-12).
 * Observado em 2026-11-12: arranque a frio ~54 s; /advisory 8–22 s, com pedidos acima de 60 s
 * e de 90 s (o anterior limite de 90 s cortou uma resposta real).
 */
export const DEFAULT_API_TIMEOUT_MS = 120_000;

/** Limites aceites para VITE_API_TIMEOUT_MS, para evitar valores absurdos. */
export const MIN_API_TIMEOUT_MS = 5_000;
export const MAX_API_TIMEOUT_MS = 300_000;

export const API_PATHS = Object.freeze({
  health: '/health',
  provinces: '/api/v1/provinces',
  crops: '/api/v1/crops',
  advisory: '/api/v1/advisory',
  evaluate: '/api/v1/evaluate',
});

/** Fontes de resultados da consulta. A interface deve distinguir sempre uma da outra. */
export const RESULT_SOURCES = Object.freeze({
  advisory: 'advisory',
  evaluate: 'evaluate',
});
