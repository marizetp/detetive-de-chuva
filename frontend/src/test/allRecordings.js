// Só para testes: as 50 gravações de 2026-11-15, lidas do disco com o manifesto completo.
// A aplicação nunca importa este módulo (carrega apenas as 7 elegíveis, em demo/recordings.js).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORDINGS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'demo',
  'recordings',
  '2026-11-15',
);

export const FULL_MANIFEST = JSON.parse(readFileSync(join(RECORDINGS_DIR, 'manifest.json'), 'utf8'));

/** As 50 entradas do manifesto, com o corpo bruto (`text`) lido do ficheiro. */
export const ALL_RECORDINGS = Object.freeze(
  FULL_MANIFEST.entries.map((entry) =>
    Object.freeze({ ...entry, text: readFileSync(join(RECORDINGS_DIR, entry.file), 'utf8') }),
  ),
);
