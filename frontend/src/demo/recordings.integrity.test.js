import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_RECORDINGS, FULL_MANIFEST, RECORDINGS_DIR } from '../test/allRecordings.js';
import demoManifest from './recordings/2026-11-15/demo-manifest.json';
import { CAPTURE_DATE, DEMO_RECORDINGS, LOADED_FILES, listDemoConsultations } from './recordings.js';

// Integridade das gravações reais (2026-11-15): os 50 ficheiros são exactamente os bytes recebidos
// do servidor (sha256 do manifesto); a aplicação só carrega as 8 elegíveis, sem alterações.

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const ELIGIBLE = [
  'adv_en',
  'adv_pt',
  'eval_arroz_bie',
  'eval_future',
  'eval_pt',
  'get_api_v1_crops',
  'get_api_v1_provinces',
  'get_health',
];

describe('gravações da API v1.1 — integridade dos 50 ficheiros', () => {
  it('50 respostas, uma por entrada do manifesto, sem ficheiros a mais nem em falta', () => {
    expect(FULL_MANIFEST.entries).toHaveLength(50);
    expect(FULL_MANIFEST.capturedOn).toBe('2026-11-15');
    const files = readdirSync(RECORDINGS_DIR).filter(
      (name) => /\.(json|txt)$/.test(name) && !['manifest.json', 'demo-manifest.json'].includes(name),
    );
    expect(files.sort()).toEqual(FULL_MANIFEST.entries.map((entry) => entry.file).sort());
  });

  it('o sha256 de cada um dos 50 ficheiros confere com o manifesto (nenhum valor alterado)', () => {
    for (const entry of FULL_MANIFEST.entries) {
      expect(sha256(readFileSync(join(RECORDINGS_DIR, entry.file))), entry.file).toBe(entry.sha256);
    }
  });

  it('sem credenciais, tokens, emails ou endereços IP em nenhuma das 50 respostas', () => {
    const forbidden = /(api[_-]?key\s*[:=]|token\s*[:=]|password|passwd|bearer\s|authorization|set-cookie|[\w.+-]+@[\w-]+\.[\w.]+|\b\d{1,3}(\.\d{1,3}){3}\b)/i;
    for (const entry of ALL_RECORDINGS) {
      expect(forbidden.test(entry.text), entry.file).toBe(false);
    }
  });

  it('respostas a entradas inválidas e a pedidos com lang sem par completo nunca são elegíveis', () => {
    const excluded = ['adv_badcrop', 'adv_badmun', 'eval_baddate', 'adv_mandioca_en', 'eval_en'];
    for (const id of excluded) {
      expect(ALL_RECORDINGS.find((entry) => entry.id === id).demo, id).toBe(false);
    }
  });
});

describe('gravações carregadas pela aplicação — só as 8 elegíveis', () => {
  it('o manifesto completo marca exactamente 8 respostas como elegíveis', () => {
    expect(FULL_MANIFEST.entries.filter((entry) => entry.demo).map((entry) => entry.id).sort()).toEqual(ELIGIBLE);
  });

  it('o índice da demonstração é exactamente o subconjunto elegível do manifesto completo', () => {
    expect(demoManifest.capturedOn).toBe(FULL_MANIFEST.capturedOn);
    expect(demoManifest.entries).toEqual(FULL_MANIFEST.entries.filter((entry) => entry.demo === true));
  });

  it('a aplicação carrega só os 8 ficheiros elegíveis (nenhum dos outros 42)', () => {
    expect([...LOADED_FILES].sort()).toEqual(demoManifest.entries.map((entry) => entry.file).sort());
    expect(DEMO_RECORDINGS.map((entry) => entry.id).sort()).toEqual(ELIGIBLE);
    expect(CAPTURE_DATE).toBe('2026-11-15');
  });

  it('o corpo servido pela demonstração é o próprio ficheiro, byte a byte', () => {
    for (const entry of DEMO_RECORDINGS) {
      expect(sha256(Buffer.from(entry.text, 'utf8')), entry.file).toBe(entry.sha256);
    }
  });

  it('as consultas disponíveis derivam do índice (1 completa, 2 só com avaliação técnica)', () => {
    expect(listDemoConsultations()).toEqual([
      {
        params: { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' },
        sources: ['advisory', 'evaluate'],
        advisoryLanguages: ['en', 'pt'],
      },
      {
        params: { provincia: 'Bié', cultura: 'Arroz', data_consulta: '2026-06-15' },
        sources: ['evaluate'],
        advisoryLanguages: [],
      },
      {
        params: { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2027-10-20' },
        sources: ['evaluate'],
        advisoryLanguages: [],
      },
    ]);
  });
});
