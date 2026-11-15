#!/usr/bin/env node
// Teste de fumo do backend AgroKairos (só pedidos de leitura ou de cálculo, sem efeitos colaterais).
// Uso: node scripts/smoke-backend.mjs [URL]   (por omissão: a API documentada no Render)
// Sai com código 1 se alguma verificação falhar. Não precisa de dependências.

const BASE = (process.argv[2] || 'https://detetive-da-chuva.onrender.com').replace(/\/+$/, '');
const TIMEOUT_MS = 150_000; // arranque a frio do plano gratuito do Render
const MOTOR_SHA256 = 'b0f0ed5d336339d64e577b0a52ca6d54a1e7a919f89ffcfa1416f09bc7148feb';
const STATUSES = ['FAVORAVEL', 'AGUARDAR', 'DESFAVORAVEL'];
const CONSULTATION = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };

let failures = 0;
const results = [];

async function call(method, path, body) {
  const started = Date.now();
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* corpo não JSON */ }
  return { status: response.status, json, ms: Date.now() - started };
}

async function check(name, method, path, body, assert) {
  try {
    const res = await call(method, path, body);
    const problem = assert(res);
    if (problem) throw new Error(problem);
    results.push(`PASS  ${name}  (${res.status}, ${res.ms} ms)`);
    return res;
  } catch (error) {
    failures += 1;
    results.push(`FAIL  ${name}  — ${error.message}`);
    return null;
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const metricsOk = (m) => isObj(m) && ['chuva_acumulada_recente_mm', 'humidade_solo_raiz', 'previsao_7dias_mm'].every((k) => typeof m[k] === 'number');

await check('GET /health', 'GET', '/health', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : json?.status !== 'healthy' ? `status=${json?.status}` : json.baseline_ready !== true ? 'baseline_ready não é true' : null);
await check('GET /', 'GET', '/', null, ({ status, json }) => (status !== 200 || !isObj(json) ? `HTTP ${status}` : null));
await check('GET /compliance', 'GET', '/compliance', null, ({ status, json }) => (status !== 200 || !isObj(json) ? `HTTP ${status}` : null));
await check('GET /api/v1/provinces', 'GET', '/api/v1/provinces', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !Array.isArray(json) || json.length < 3 ? 'lista com menos de 3 províncias' : null);
await check('GET /api/v1/crops', 'GET', '/api/v1/crops', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !Array.isArray(json) || json.length < 5 ? 'lista com menos de 5 culturas' : null);

const evaluate = await check('POST /api/v1/evaluate', 'POST', '/api/v1/evaluate', CONSULTATION, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !STATUSES.includes(json?.status) ? `status=${json?.status}` : !metricsOk(json.metricas) ? 'métricas em falta' : typeof json.is_fallback_weather !== 'boolean' ? 'is_fallback_weather em falta' : !Array.isArray(json.justificacoes_tecnicas) ? 'justificacoes_tecnicas em falta' : null);
const advisoryPt = await check('POST /api/v1/advisory (pt)', 'POST', '/api/v1/advisory', CONSULTATION, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !STATUSES.includes(json?.status) ? `status=${json?.status}` : typeof json.recomendacao_extensao !== 'string' || !json.recomendacao_extensao ? 'recomendacao_extensao vazia' : null);
await check('POST /api/v1/advisory (lang=en)', 'POST', '/api/v1/advisory', { ...CONSULTATION, lang: 'en' }, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !STATUSES.includes(json?.status) ? `status=${json?.status}` : advisoryPt?.json && json.status !== advisoryPt.json.status ? 'estado diferente do pedido em pt' : null);
await check('POST /api/v1/advisory (lang=fr → 422)', 'POST', '/api/v1/advisory', { ...CONSULTATION, lang: 'fr' }, ({ status }) => (status !== 422 ? `esperado 422, recebido ${status}` : null));
if (evaluate?.json && advisoryPt?.json) {
  const same = evaluate.json.status === advisoryPt.json.status && JSON.stringify(evaluate.json.metricas) === JSON.stringify(advisoryPt.json.metricas);
  results.push(`${same ? 'INFO' : 'WARN'}  /advisory e /evaluate ${same ? 'coincidem' : 'DIVERGEM'} em estado e métricas`);
}

await check('GET /api/v1/optimal-planting', 'GET', '/api/v1/optimal-planting?provincia=Huambo&cultura=Milho&epoca_agricola=2025/2026', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !isObj(json?.janela_recomendada) ? 'janela_recomendada em falta' : !Array.isArray(json?.risco_falsa_partida?.ic90_pct) ? 'ic90_pct em falta' : null);
await check('GET /zonas', 'GET', '/zonas', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : !Array.isArray(json?.zonas) || json.zonas.some((z) => z.historico_imerg_pronto !== true) ? 'histórico IMERG não pronto em todas as zonas' : null);
for (const zona of ['huambo', 'bie', 'huila']) {
  await check(`GET /zonas/${zona}/decisao`, 'GET', `/zonas/${zona}/decisao`, null, ({ status, json }) =>
    status !== 200 ? `HTTP ${status}` : typeof json?.resposta !== 'string' ? 'resposta em falta' : null);
}
await check('GET /zonas/huambo/decisao/2024-11-15', 'GET', '/zonas/huambo/decisao/2024-11-15', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : json?.mensagem_agricultor?.codigo !== 'FAVORAVEL_INDICATIVO' ? `codigo=${json?.mensagem_agricultor?.codigo} (gravado a 2026-11-15: FAVORAVEL_INDICATIVO)` : null);
await check('GET /fontes/saude (integridade do motor)', 'GET', '/fontes/saude', null, ({ status, json }) =>
  status !== 200 ? `HTTP ${status}` : json?.motor?.sha256 !== MOTOR_SHA256 ? `sha256 do motor=${json?.motor?.sha256}` : json?.motor?.integro !== true ? 'motor.integro não é true' : null);

console.log(`Backend: ${BASE}\n${results.join('\n')}\n\n${failures === 0 ? 'Todas as verificações passaram.' : `${failures} verificação(ões) falharam.`}`);
process.exitCode = failures === 0 ? 0 : 1;
