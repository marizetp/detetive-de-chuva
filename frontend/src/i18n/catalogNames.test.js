import { describe, expect, it } from 'vitest';
import { mapCatalogOptions } from '../utils/mappers.js';
import { CROP_TRANSLATIONS, localizeCropName, localizeCropValue } from './catalogNames.js';
import { CROP_NAMES_REVIEW_REQUIRED } from './reviewRequired.js';

// Catálogo da API v1.1 (docs/docs2.md §2: 5 culturas). Os `id` de mandioca e arroz seguem o padrão
// dos restantes e foram observados na API em 2026-11-15; não são uma resposta gravada.
const CROPS_V11 = mapCatalogOptions([
  { id: 'milho', nome: 'Milho' },
  { id: 'feijao', nome: 'Feijão' },
  { id: 'soja', nome: 'Soja' },
  { id: 'mandioca', nome: 'Mandioca' },
  { id: 'arroz', nome: 'Arroz' },
]).options;

describe('localizeCropName', () => {
  it.each([
    ['milho', 'Maize'],
    ['feijao', 'Beans'],
    ['soja', 'Soybean'],
    ['mandioca', 'Cassava'],
    ['arroz', 'Rice'],
  ])('en: %s → %s', (id, english) => {
    const option = CROPS_V11.find((item) => item.id === id);
    expect(localizeCropName(option, 'en')).toEqual({ text: english, lang: undefined });
  });

  it('pt: usa sempre o nome devolvido pela API', () => {
    for (const option of CROPS_V11) {
      expect(localizeCropName(option, 'pt')).toEqual({ text: option.label, lang: undefined });
    }
  });

  it('id sem tradução: nome original, marcado com lang="pt" (nunca adivinhado)', () => {
    expect(localizeCropName({ id: 'batata-doce', label: 'Batata-doce' }, 'en')).toEqual({
      text: 'Batata-doce',
      lang: 'pt',
    });
  });

  it('a tradução não altera o valor enviado à API (o `nome` original)', () => {
    expect(CROPS_V11.map((option) => option.value)).toEqual([
      'Milho',
      'Feijão',
      'Soja',
      'Mandioca',
      'Arroz',
    ]);
    expect(localizeCropValue('Mandioca', CROPS_V11, 'en')).toBe('Cassava');
    expect(localizeCropValue('Arroz', CROPS_V11, 'en')).toBe('Rice');
    expect(localizeCropValue('Arroz', CROPS_V11, 'pt')).toBe('Arroz');
  });

  it('todas as traduções inglesas estão listadas para revisão humana', () => {
    expect(Object.keys(CROP_TRANSLATIONS.en).sort()).toEqual([...CROP_NAMES_REVIEW_REQUIRED].sort());
  });
});
