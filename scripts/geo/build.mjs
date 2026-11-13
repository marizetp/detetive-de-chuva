// Prepara `frontend/src/data/geo/angola-provincias-2021.json` a partir da fonte fixada.
//
//   node scripts/geo/build.mjs           gera, valida e (só se válido) escreve o ficheiro final
//   node scripts/geo/build.mjs --check   gera numa pasta temporária e confirma que coincide byte a byte
//                                        com o ficheiro existente (reprodutibilidade); não escreve nada
//
// Requer Node ≥ 22 e acesso à rede na primeira execução. Sem dependências no projecto.

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAPSHAPER, PATHS, SIMPLIFICATION, SOURCE, mapshaperArgs } from './config.mjs';
import { fail, fetchVerified, runMapshaper, sha256 } from './lib.mjs';
import { printReport, validate } from './validate.mjs';

const checkOnly = process.argv.includes('--check');

console.log(`1. Fonte fixada: ${SOURCE.repository}@${SOURCE.commit}`);
const sourcePath = await fetchVerified(SOURCE.files.geojson, PATHS.work);
const metadataPath = await fetchVerified(SOURCE.files.metadata, PATHS.work);

console.log('2. Metadados do commit (licença, ano, origem):');
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
for (const [key, expected] of Object.entries(SOURCE.expectedMetadata)) {
  if (metadata[key] !== expected) fail(`metadados: ${key} = "${metadata[key]}", esperado "${expected}"`);
  console.log(`  ${key}: ${metadata[key]}`);
}

console.log(`3. Simplificação: ${MAPSHAPER.package}@${MAPSHAPER.version}, interval=${SIMPLIFICATION.intervalMetres} m`);
const candidatePath = join(PATHS.work, 'angola-provincias-2021.candidato.json');
const log = runMapshaper(mapshaperArgs(sourcePath, candidatePath));
for (const line of log.split('\n')) if (/\[(filter-islands|explode|dissolve)\]/.test(line)) console.log(`  ${line.trim()}`);

console.log('4. Validação:');
const ok = printReport(await validate({ sourcePath, outputPath: candidatePath, workDir: PATHS.work }));
if (!ok) fail('a geometria gerada não cumpre os critérios; o ficheiro final não foi alterado');

const candidateHash = sha256(readFileSync(candidatePath));
console.log(`5. SHA-256 gerado: ${candidateHash}`);

if (checkOnly) {
  if (!existsSync(PATHS.output)) fail(`não existe ${PATHS.output}`);
  const currentHash = sha256(readFileSync(PATHS.output));
  if (currentHash !== candidateHash) fail(`o ficheiro existente (${currentHash}) difere do gerado: não é reprodutível com estes parâmetros`);
  console.log('✓ reprodutível: o ficheiro existente coincide byte a byte com a geração');
} else {
  copyFileSync(candidatePath, PATHS.output);
  console.log(`✓ escrito: ${PATHS.output}`);
}
