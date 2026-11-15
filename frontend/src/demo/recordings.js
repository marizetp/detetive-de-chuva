// Gravações reais da API v1.1 (2026-11-15) para o modo de demonstração.
// Só as 8 respostas elegíveis entram na aplicação: o índice `demo-manifest.json` (derivado de
// `manifest.json`, `demo: true`) e os seus 8 ficheiros, listados explicitamente abaixo. As outras
// 42 respostas ficam no repositório para auditoria e testes de integridade, mas nunca são
// carregadas nem distribuídas no bundle. Os corpos são carregados em bruto (`?raw`) e servidos
// byte a byte, tal como foram recebidos do servidor; nada aqui é gerado, aproximado ou alterado.
// Este módulo só é alcançável a partir de demo/index.js (import dinâmico em main.jsx).

import demoManifest from './recordings/2026-11-15/demo-manifest.json';

// Lista explícita (o import.meta.glob exige padrões literais). Um teste garante que coincide com
// as entradas de demo-manifest.json e com as entradas `demo: true` de manifest.json.
const RAW_BODIES = import.meta.glob(
  [
    './recordings/2026-11-15/get_health.json',
    './recordings/2026-11-15/get_api_v1_provinces.json',
    './recordings/2026-11-15/get_api_v1_crops.json',
    './recordings/2026-11-15/adv_pt.json',
    './recordings/2026-11-15/adv_en.json',
    './recordings/2026-11-15/eval_pt.json',
    './recordings/2026-11-15/eval_arroz_bie.json',
    './recordings/2026-11-15/eval_future.json',
  ],
  { query: '?raw', import: 'default', eager: true },
);

/** Ficheiros carregados pela aplicação (para os testes de isolamento). */
export const LOADED_FILES = Object.freeze(
  Object.keys(RAW_BODIES).map((path) => path.split('/').pop()),
);

/** Data da captura (AAAA-MM-DD), mostrada sempre na faixa do modo de demonstração. */
export const CAPTURE_DATE = demoManifest.capturedOn;

/** As respostas elegíveis (`demo: true`), com o corpo bruto (`text`) de cada uma. */
export const DEMO_RECORDINGS = Object.freeze(
  demoManifest.entries.map((entry) => {
    const text = RAW_BODIES[`./recordings/2026-11-15/${entry.file}`];
    if (entry.demo !== true || typeof text !== 'string') {
      throw new Error(`[demo] Gravação não elegível ou em falta: ${entry.file}`);
    }
    return Object.freeze({ ...entry, text });
  }),
);

const CONSULTATION_PATHS = Object.freeze({
  '/api/v1/advisory': 'advisory',
  '/api/v1/evaluate': 'evaluate',
});

/**
 * Consultas disponíveis, derivadas do índice: pedidos POST elegíveis a /advisory e /evaluate,
 * agrupados pelos mesmos parâmetros da consulta. O `lang` (só no /advisory) não define uma
 * consulta diferente: indica em que idiomas a recomendação está gravada (`advisoryLanguages`).
 * @returns {{ params: Record<string, string>, sources: ('advisory' | 'evaluate')[], advisoryLanguages: string[] }[]}
 */
export function listDemoConsultations(entries = DEMO_RECORDINGS) {
  const byParams = new Map();
  for (const entry of entries) {
    const source = CONSULTATION_PATHS[entry.path];
    if (entry.method !== 'POST' || !source || !entry.body) continue;
    const { lang, ...params } = entry.body;
    const key = JSON.stringify(Object.keys(params).sort().map((name) => [name, params[name]]));
    if (!byParams.has(key)) byParams.set(key, { params, sources: new Set(), advisoryLanguages: new Set() });
    const item = byParams.get(key);
    item.sources.add(source);
    if (source === 'advisory') item.advisoryLanguages.add(lang ?? 'pt');
  }
  return [...byParams.values()].map((item) => ({
    params: item.params,
    sources: ['advisory', 'evaluate'].filter((source) => item.sources.has(source)),
    advisoryLanguages: ['en', 'pt'].filter((language) => item.advisoryLanguages.has(language)),
  }));
}

/** Resposta gravada de /api/v1/crops (para mostrar os nomes das culturas no idioma activo). */
export function recordedCrops(entries = DEMO_RECORDINGS) {
  const crops = entries.find((entry) => entry.method === 'GET' && entry.path === '/api/v1/crops');
  return crops ? JSON.parse(crops.text) : [];
}
