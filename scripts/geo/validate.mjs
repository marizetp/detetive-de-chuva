// Validação topológica, de integridade e de fidelidade da geometria simplificada face à fonte.
// Uso isolado: node scripts/geo/validate.mjs [ficheiro-simplificado]   (descarrega/usa a fonte da cache)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { CRITERIA, PATHS, SOURCE } from './config.mjs';
import {
  fetchVerified,
  geometryAreaKm2,
  nearBoundary,
  pointInGeometry,
  polygonsOf,
  readFeatures,
  ringAreaKm2,
  runMapshaper,
  selfIntersections,
  signedPlanarArea,
} from './lib.mjs';

const unionOf = (path, workDir, label) => {
  const target = join(workDir, `${label}-uniao.json`);
  runMapshaper(['-i', path, '-dissolve', '-o', target, 'format=geojson']);
  return readFeatures(target);
};

function topology(features, unionFeatures) {
  let vertices = 0, rings = 0, invalidRings = 0, crossings = 0;
  for (const feature of features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const ring of polygon) {
        rings++;
        vertices += ring.length;
        const first = ring[0], last = ring[ring.length - 1];
        if (ring.length < 4 || first[0] !== last[0] || first[1] !== last[1]) invalidRings++;
        crossings += selfIntersections(ring);
      }
    }
  }
  const sumKm2 = features.reduce((total, f) => total + geometryAreaKm2(f.geometry), 0);
  const unionKm2 = unionFeatures.reduce((total, f) => total + geometryAreaKm2(f.geometry), 0);
  const unionHoles = unionFeatures.reduce((t, f) => t + polygonsOf(f.geometry).reduce((u, p) => u + p.length - 1, 0), 0);
  return { vertices, rings, invalidRings, crossings, sumKm2, unionKm2, overlapKm2: sumKm2 - unionKm2, unionHoles };
}

/** Cobertura das partes pequenas do original (ilhas e faixas costeiras) pela versão simplificada. */
function smallPartCoverage(sourceFeatures, outputFeatures) {
  const results = [];
  for (const feature of sourceFeatures) {
    const iso = feature.properties.shapeISO;
    const simplified = outputFeatures.find((f) => f.properties.iso === iso)?.geometry;
    if (!simplified) continue;
    for (const polygon of polygonsOf(feature.geometry)) {
      const areaKm2 = ringAreaKm2(polygon[0]);
      if (areaKm2 < CRITERIA.minPartKm2 || areaKm2 >= CRITERIA.maxPartKm2) continue;
      const ring = polygon[0];
      const covered = ring.filter(
        (v) => pointInGeometry(v, simplified) || nearBoundary(v, simplified, CRITERIA.coverageToleranceKm),
      ).length;
      const [x, y] = ring.reduce(([sx, sy], [px, py]) => [sx + px / ring.length, sy + py / ring.length], [0, 0]);
      results.push({ iso, areaKm2, coveragePct: (covered / ring.length) * 100, centre: [x, y] });
    }
  }
  return results;
}

export async function validate({ sourcePath, outputPath, workDir }) {
  const failures = [];
  const check = (ok, message) => { if (!ok) failures.push(message); };

  const raw = readFileSync(outputPath, 'utf8');
  const data = JSON.parse(raw);
  const source = readFeatures(sourcePath);
  const output = data.features;

  // Identidade e estrutura
  check(data.type === 'FeatureCollection', 'O ficheiro final não é uma FeatureCollection.');
  check(!('crs' in data) && !('bbox' in data), 'RFC 7946: o ficheiro final não deve ter "crs" nem "bbox".');
  check(output.length === CRITERIA.expectedProvinces, `Esperadas ${CRITERIA.expectedProvinces} províncias, encontradas ${output.length}.`);
  const isoCodes = output.map((f) => f.properties.iso);
  check(new Set(isoCodes).size === output.length, 'Há códigos ISO repetidos.');
  for (const [iso, nome] of Object.entries(CRITERIA.pilotProvinces)) {
    check(output.some((f) => f.properties.iso === iso && f.properties.nome === nome), `Falta ${iso} = ${nome}.`);
  }
  const properties = new Set(output.flatMap((f) => Object.keys(f.properties)));
  check([...properties].every((p) => CRITERIA.allowedProperties.includes(p)), `Propriedades inesperadas: ${[...properties].join(', ')}.`);
  for (const feature of output) {
    const original = source.find((f) => f.properties.shapeISO === feature.properties.iso);
    check(original?.properties.shapeName === feature.properties.nome, `Nome alterado para ${feature.properties.iso}.`);
  }
  check(JSON.stringify(isoCodes) === JSON.stringify([...isoCodes].sort()), 'As províncias não estão ordenadas por ISO.');

  // RFC 7946: anéis exteriores anti-horários, buracos horários; precisão das coordenadas
  let windingErrors = 0, maxDecimals = 0;
  for (const feature of output) {
    for (const polygon of polygonsOf(feature.geometry)) {
      polygon.forEach((ring, index) => {
        const area = signedPlanarArea(ring);
        if ((index === 0 && area <= 0) || (index > 0 && area >= 0)) windingErrors++;
        for (const coordinate of ring) for (const value of coordinate) maxDecimals = Math.max(maxDecimals, (String(value).split('.')[1] ?? '').length);
      });
    }
  }
  check(windingErrors === 0, `RFC 7946: ${windingErrors} anéis com orientação errada.`);
  check(maxDecimals <= CRITERIA.maxDecimals, `Coordenadas com ${maxDecimals} casas decimais (máx. ${CRITERIA.maxDecimals}).`);

  // Topologia: original e final, com o mesmo método
  const sourceTopology = topology(source, unionOf(sourcePath, workDir, 'origem'));
  const outputTopology = topology(output, unionOf(outputPath, workDir, 'final'));
  check(outputTopology.invalidRings === 0, `${outputTopology.invalidRings} anéis inválidos.`);
  check(outputTopology.crossings === 0, `${outputTopology.crossings} auto-intersecções.`);
  check(outputTopology.overlapKm2 <= CRITERIA.maxOverlapKm2 + 0.5, `Sobreposição entre províncias: ${outputTopology.overlapKm2.toFixed(2)} km².`);
  check(outputTopology.unionHoles <= sourceTopology.unionHoles, `Falhas novas entre províncias: ${outputTopology.unionHoles} buracos na união (origem: ${sourceTopology.unionHoles}).`);

  // Desvio de área por província
  const deviations = output.map((feature) => {
    const original = source.find((f) => f.properties.shapeISO === feature.properties.iso);
    const a = geometryAreaKm2(original.geometry);
    return { iso: feature.properties.iso, pct: (Math.abs(geometryAreaKm2(feature.geometry) - a) / a) * 100 };
  });
  const worstDeviation = deviations.reduce((w, d) => (d.pct > w.pct ? d : w));
  check(worstDeviation.pct <= CRITERIA.maxAreaDeviationPct, `Desvio de área de ${worstDeviation.pct.toFixed(3)}% em ${worstDeviation.iso}.`);

  // Fidelidade das partes pequenas
  const coverage = smallPartCoverage(source, output);
  for (const part of coverage) {
    check(
      part.coveragePct >= CRITERIA.minCoveragePct,
      `${part.iso}: parte de ${part.areaKm2.toFixed(2)} km² com ${part.coveragePct.toFixed(0)}% de cobertura (mín. ${CRITERIA.minCoveragePct}%).`,
    );
  }

  return {
    failures,
    report: {
      provincias: output.length,
      bytes: Buffer.byteLength(raw),
      gzipBytes: gzipSync(raw).length,
      origem: sourceTopology,
      final: outputTopology,
      piorDesvioArea: worstDeviation,
      maxDecimals,
      coberturaPartesPequenas: coverage,
    },
  };
}

export function printReport({ failures, report }) {
  const km2 = (v) => `${Math.round(v).toLocaleString('pt-PT')} km²`;
  const { origem: o, final: f } = report;
  console.log(`  províncias: ${report.provincias} | ${report.bytes} bytes (gzip ${report.gzipBytes} bytes)`);
  console.log(`  vértices: ${o.vertices} → ${f.vertices} | anéis: ${o.rings} → ${f.rings}`);
  console.log(`  anéis inválidos: ${o.invalidRings} → ${f.invalidRings} | auto-intersecções: ${o.crossings} → ${f.crossings}`);
  console.log(`  sobreposição: ${o.overlapKm2.toFixed(2)} → ${f.overlapKm2.toFixed(2)} km² | buracos na união: ${o.unionHoles} → ${f.unionHoles}`);
  console.log(`  área total: ${km2(o.sumKm2)} → ${km2(f.sumKm2)} | pior desvio por província: ${report.piorDesvioArea.pct.toFixed(3)}% (${report.piorDesvioArea.iso})`);
  console.log(`  casas decimais máx.: ${report.maxDecimals}`);
  for (const p of report.coberturaPartesPequenas) {
    console.log(`  parte pequena ${p.iso} ${p.areaKm2.toFixed(2)} km² (${p.centre[0].toFixed(2)}, ${p.centre[1].toFixed(2)}): cobertura ${p.coveragePct.toFixed(0)}%`);
  }
  if (failures.length) {
    for (const message of failures) console.error(`  ✗ ${message}`);
    return false;
  }
  console.log('  ✓ todas as validações cumpridas');
  return true;
}

// Execução directa
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputPath = process.argv[2] ?? PATHS.output;
  console.log(`Fonte fixada (${SOURCE.commit.slice(0, 7)}):`);
  const sourcePath = await fetchVerified(SOURCE.files.geojson, PATHS.work);
  console.log(`Validação de ${outputPath}:`);
  const ok = printReport(await validate({ sourcePath, outputPath, workDir: PATHS.work }));
  process.exit(ok ? 0 : 1);
}
