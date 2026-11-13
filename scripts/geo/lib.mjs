// Funções partilhadas: descarga verificada, execução do mapshaper fixado e cálculos geométricos.
// Só módulos nativos do Node; o mapshaper corre com `npx` na versão fixada (não é dependência).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAPSHAPER, sourceUrl } from './config.mjs';

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

export function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Descarrega (ou reutiliza da cache) um ficheiro da fonte fixada e confirma o SHA-256. */
export async function fetchVerified(file, workDir) {
  mkdirSync(workDir, { recursive: true });
  const target = join(workDir, file.name);
  if (existsSync(target) && sha256(readFileSync(target)) === file.sha256) {
    console.log(`  ${file.name}: em cache, SHA-256 confere`);
    return target;
  }
  const response = await fetch(sourceUrl(file.name), { signal: AbortSignal.timeout(300_000) });
  if (!response.ok) fail(`${file.name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = sha256(buffer);
  if (digest !== file.sha256) fail(`${file.name}: SHA-256 ${digest} ≠ esperado ${file.sha256}`);
  if (buffer.length !== file.bytes) fail(`${file.name}: ${buffer.length} bytes ≠ esperado ${file.bytes}`);
  writeFileSync(target, buffer);
  console.log(`  ${file.name}: descarregado, ${buffer.length} bytes, SHA-256 confere`);
  return target;
}

/**
 * Corre o mapshaper fixado. Em Windows o `npx` é um .cmd e exige shell; por isso a linha de comando
 * é montada aqui, com cada argumento entre aspas. Os argumentos vêm só de config.mjs e de caminhos locais.
 */
export function runMapshaper(args) {
  const quote = (arg) => `"${String(arg).replace(/"/g, '\\"')}"`;
  const command = ['npx', '--yes', `${MAPSHAPER.package}@${MAPSHAPER.version}`, ...args.map(quote)].join(' ');
  const result = spawnSync(command, { shell: true, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) fail(`mapshaper terminou com código ${result.status}\n${output}`);
  return output;
}

// ——— Geometria (WGS 84, graus) ———
const EARTH_RADIUS_M = 6371008.8;
const rad = (degrees) => (degrees * Math.PI) / 180;

export const polygonsOf = (geometry) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];

/** Área esférica de um anel, em km² (fórmula de Chamberlain & Duquette). */
export function ringAreaKm2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) / 1e6;
}

export const polygonAreaKm2 = (polygon) =>
  ringAreaKm2(polygon[0]) - polygon.slice(1).reduce((total, hole) => total + ringAreaKm2(hole), 0);

export const geometryAreaKm2 = (geometry) =>
  polygonsOf(geometry).reduce((total, polygon) => total + polygonAreaKm2(polygon), 0);

/** Área com sinal no plano lon/lat: positiva = anti-horário (RFC 7946 para anéis exteriores). */
export function signedPlanarArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  return -sum / 2;
}

/** Número de cruzamentos entre segmentos não adjacentes do mesmo anel (grelha espacial). */
export function selfIntersections(ring) {
  const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const cross = (a, b, c, d) => orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
  const segments = ring.length - 1;
  const cellSize = 0.05;
  const grid = new Map();
  let hits = 0;
  for (let i = 0; i < segments; i++) {
    const keys = new Set([ring[i], ring[i + 1]].map(([x, y]) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`));
    for (const key of keys) {
      const bucket = grid.get(key) ?? [];
      for (const j of bucket) {
        const adjacent = Math.abs(i - j) <= 1 || (i === segments - 1 && j === 0) || (j === segments - 1 && i === 0);
        if (!adjacent && cross(ring[i], ring[i + 1], ring[j], ring[j + 1])) hits++;
      }
      bucket.push(i);
      grid.set(key, bucket);
    }
  }
  return hits;
}

const pointInRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const pointInGeometry = (point, geometry) =>
  polygonsOf(geometry).some((polygon) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole)));

/** Distância aproximada (km) de um ponto ao contorno de uma geometria, em escala local. */
export function nearBoundary(point, geometry, toleranceKm) {
  const kmPerDegreeLat = 110.57;
  const kmPerDegreeLon = 111.32 * Math.cos(rad(point[1]));
  const [px, py] = [point[0] * kmPerDegreeLon, point[1] * kmPerDegreeLat];
  for (const polygon of polygonsOf(geometry)) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        const ax = ring[i][0] * kmPerDegreeLon, ay = ring[i][1] * kmPerDegreeLat;
        const bx = ring[i + 1][0] * kmPerDegreeLon, by = ring[i + 1][1] * kmPerDegreeLat;
        const dx = bx - ax, dy = by - ay;
        const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
        if (Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) < toleranceKm) return true;
      }
    }
  }
  return false;
}

/** Lê GeoJSON e normaliza para uma lista de features (a união do mapshaper vem como GeometryCollection). */
export function readFeatures(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.type === 'FeatureCollection') return data.features;
  if (data.type === 'GeometryCollection') return data.geometries.map((geometry) => ({ geometry, properties: {} }));
  return [{ geometry: data.geometry ?? data, properties: data.properties ?? {} }];
}
