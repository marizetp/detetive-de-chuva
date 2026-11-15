#!/usr/bin/env node
// Verifica, por SHA-256, que respostas gravadas existem em cada build:
// - build de produção: nenhuma gravação;
// - build de demonstração: todas as elegíveis (demo: true) e nenhuma das outras.
// Avalia os literais de texto dos ficheiros JS do build e compara o sha256 de cada valor com o
// manifesto. Uso: node scripts/check-demo-isolation.mjs <dist-produção> <dist-demonstração>
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECORDINGS = join(ROOT, 'frontend', 'src', 'demo', 'recordings', '2026-11-15');
const [prodDir, demoDir] = process.argv.slice(2);
if (!prodDir || !demoDir) {
  console.error('Uso: node scripts/check-demo-isolation.mjs <dist-produção> <dist-demonstração>');
  process.exit(2);
}

const sha = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const manifest = JSON.parse(readFileSync(join(RECORDINGS, 'manifest.json'), 'utf8'));
const eligible = manifest.entries.filter((entry) => entry.demo);
const eligibleHashes = new Set(eligible.map((entry) => entry.sha256));
const others = manifest.entries.filter((entry) => !entry.demo && !eligibleHashes.has(entry.sha256));

function literalHashes(buildDir) {
  const hashes = new Set();
  const literal = /"(?:[^"\\\n]|\\.)*"|`(?:[^`\\$]|\\.|\$(?!\{))*`/g;
  for (const file of readdirSync(join(buildDir, 'assets')).filter((name) => name.endsWith('.js'))) {
    const js = readFileSync(join(buildDir, 'assets', file), 'utf8');
    for (const match of js.matchAll(literal)) {
      if (match[0].length < 60) continue;
      try {
        hashes.add(sha(Function(`"use strict"; return (${match[0]});`)()));
      } catch {
        /* literal parcial: ignorar */
      }
    }
  }
  return hashes;
}

const prod = literalHashes(prodDir);
const demo = literalHashes(demoDir);
const prodLeaks = manifest.entries.filter((entry) => prod.has(entry.sha256)).map((entry) => entry.id);
const demoFound = eligible.filter((entry) => demo.has(entry.sha256)).map((entry) => entry.id);
const demoLeaks = others.filter((entry) => demo.has(entry.sha256)).map((entry) => entry.id);

console.log(`Produção: ${prodLeaks.length} gravações ${JSON.stringify(prodLeaks)}`);
console.log(`Demonstração: ${demoFound.length}/${eligible.length} elegíveis; ${demoLeaks.length}/${others.length} não elegíveis ${JSON.stringify(demoLeaks)}`);
const ok = prodLeaks.length === 0 && demoFound.length === eligible.length && demoLeaks.length === 0;
console.log(ok ? 'Isolamento confirmado.' : 'FALHA no isolamento produção/demonstração.');
process.exitCode = ok ? 0 : 1;
