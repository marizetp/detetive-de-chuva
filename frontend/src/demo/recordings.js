// Gravações reais da API v1.1 (2026-11-15) para o modo de demonstração.
// Só as 7 respostas elegíveis entram na aplicação: o índice `demo-manifest.json` (derivado de
// `manifest.json`, `demo: true`) e os seus 7 ficheiros, listados explicitamente abaixo. As outras
// 43 respostas ficam no repositório para auditoria e testes de integridade, mas nunca são
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
 * agrupados pelos mesmos parâmetros. `sources` indica que respostas existem para cada consulta.
 * @returns {{ params: Record<string, string>, sources: ('advisory' | 'evaluate')[] }[]}
 */
export function listDemoConsultations(entries = DEMO_RECORDINGS) {
  const byParams = new Map();
  for (const entry of entries) {
    const source = CONSULTATION_PATHS[entry.path];
    if (entry.method !== 'POST' || !source || !entry.body) continue;
    const key = JSON.stringify(Object.keys(entry.body).sort().map((name) => [name, entry.body[name]]));
    if (!byParams.has(key)) byParams.set(key, { params: { ...entry.body }, sources: [] });
    byParams.get(key).sources.push(source);
  }
  return [...byParams.values()].map((item) => ({
    ...item,
    sources: ['advisory', 'evaluate'].filter((source) => item.sources.includes(source)),
  }));
}

/** Resposta gravada de /api/v1/crops (para mostrar os nomes das culturas no idioma activo). */
export function recordedCrops(entries = DEMO_RECORDINGS) {
  const crops = entries.find((entry) => entry.method === 'GET' && entry.path === '/api/v1/crops');
  return crops ? JSON.parse(crops.text) : [];
}
