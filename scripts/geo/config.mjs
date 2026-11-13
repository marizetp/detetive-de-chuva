// Parâmetros fixos da preparação de `frontend/src/data/geo/angola-provincias-2021.json`.
// Alterar qualquer valor aqui altera o resultado: actualizar também PROVENIENCIA.md.

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = Object.freeze({
  repository: 'wmgeolab/geoBoundaries',
  commit: '9469f09592ced973a3448cf66b6100b741b64c0d',
  path: 'releaseData/gbOpen/AGO/ADM1',
  // Os ficheiros estão em Git LFS: descarregam-se pelo endpoint "media" no mesmo commit.
  files: Object.freeze({
    geojson: Object.freeze({
      name: 'geoBoundaries-AGO-ADM1.geojson',
      sha256: '205b8b63b0ac0819e964b129f25e67f5af9c092afbc0504f1f28c15b6e44cfd8',
      bytes: 5808891,
    }),
    metadata: Object.freeze({
      name: 'geoBoundaries-AGO-ADM1-metaData.json',
      sha256: '6897df4120622fef7043056b39a4e389bf8b8575431cb51844f9e06ec7bb89f3',
      bytes: 931,
    }),
  }),
  // Valores que os metadados do commit têm de declarar; a preparação pára se divergirem.
  expectedMetadata: Object.freeze({
    boundaryID: 'AGO-ADM1-26408823',
    boundaryYear: '2021',
    boundaryLicense: 'Public Domain',
    boundarySource: 'U.S. Census Bureau',
    admUnitCount: '18',
  }),
});

export function sourceUrl(fileName) {
  return `https://media.githubusercontent.com/media/${SOURCE.repository}/${SOURCE.commit}/${SOURCE.path}/${fileName}`;
}

export const MAPSHAPER = Object.freeze({ package: 'mapshaper', version: '0.7.101' });

/** Passos do mapshaper, por ordem. Ver a justificação de cada um em PROVENIENCIA.md. */
export const SIMPLIFICATION = Object.freeze({
  islandMinArea: '1km2',
  intervalMetres: 300,
  precision: '0.0001',
});

export function mapshaperArgs(inputPath, outputPath) {
  return [
    '-i', inputPath,
    '-filter-islands', `min-area=${SIMPLIFICATION.islandMinArea}`,
    '-explode',
    '-simplify', `interval=${SIMPLIFICATION.intervalMetres}`, 'keep-shapes',
    '-dissolve', 'shapeISO', 'copy-fields=shapeName',
    '-filter-fields', 'shapeISO,shapeName',
    '-rename-fields', 'iso=shapeISO,nome=shapeName',
    '-sort', 'iso',
    '-o', outputPath, 'format=geojson', `precision=${SIMPLIFICATION.precision}`, 'rfc7946',
  ];
}

/** Critérios de validação. O processo falha se algum não for cumprido. */
export const CRITERIA = Object.freeze({
  expectedProvinces: 18,
  pilotProvinces: Object.freeze({ 'AO-HUA': 'Huambo', 'AO-BIE': 'Bié', 'AO-HUI': 'Huíla' }),
  allowedProperties: Object.freeze(['iso', 'nome']),
  maxDecimals: 4,
  maxAreaDeviationPct: 0.5,
  maxOverlapKm2: 0,
  // Fidelidade das partes pequenas (ilhas e faixas costeiras):
  // cada parte do original com área ≥ minPartKm2 (e < maxPartKm2) tem de manter ≥ minCoveragePct
  // dos seus vértices dentro, ou a menos de coverageToleranceKm, da geometria simplificada.
  minPartKm2: 5,
  maxPartKm2: 1000,
  minCoveragePct: 90,
  coverageToleranceKm: 1,
});

const here = fileURLToPath(new URL('.', import.meta.url));
export const PATHS = Object.freeze({
  output: join(here, '..', '..', 'frontend', 'src', 'data', 'geo', 'angola-provincias-2021.json'),
  // Fora do repositório: não é preciso alterar o .gitignore. Substituível por GEO_WORK_DIR.
  work: process.env.GEO_WORK_DIR ?? join(tmpdir(), 'detetive-da-chuva-geo'),
});
