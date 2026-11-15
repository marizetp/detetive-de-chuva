import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advisoryLanguageParams,
  advisoryRequestedLanguage,
  postAdvisory,
  postEvaluate,
  startConsultation,
} from './consultation.js';

// Idioma da recomendação (docs/docs2.md §3): `lang: "en"` só no /advisory e só para inglês; em
// português omite-se (português por omissão do serviço). O /evaluate nunca recebe `lang`.

const PARAMS = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: '2026-11-15' };

function stubFetch() {
  const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => '{}' }));
  vi.stubGlobal('fetch', fetchSpy);
  const bodyOf = (call) => JSON.parse(call[1].body);
  return { fetchSpy, bodies: () => fetchSpy.mock.calls.map((call) => [new URL(call[0]).pathname, bodyOf(call)]) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parâmetro de idioma do /advisory', () => {
  it('só o inglês envia lang; português e valores desconhecidos usam o português por omissão', () => {
    expect(advisoryLanguageParams('en')).toEqual({ lang: 'en' });
    expect(advisoryLanguageParams('pt')).toEqual({});
    expect(advisoryLanguageParams(undefined)).toEqual({});
    expect(advisoryLanguageParams('fr')).toEqual({});
    expect(advisoryRequestedLanguage('en')).toBe('en');
    expect(advisoryRequestedLanguage('pt')).toBe('pt');
    expect(advisoryRequestedLanguage(undefined)).toBe('pt');
  });

  it('postAdvisory em inglês envia lang: "en" com os mesmos parâmetros', async () => {
    const { bodies } = stubFetch();
    await postAdvisory(PARAMS, { language: 'en' });
    expect(bodies()).toEqual([['/api/v1/advisory', { ...PARAMS, lang: 'en' }]]);
  });

  it('postAdvisory em português não envia lang', async () => {
    const { bodies } = stubFetch();
    await postAdvisory(PARAMS, { language: 'pt' });
    expect(bodies()).toEqual([['/api/v1/advisory', PARAMS]]);
  });

  it('postEvaluate nunca envia lang, mesmo se lhe for passado um idioma', async () => {
    const { bodies } = stubFetch();
    await postEvaluate(PARAMS, { language: 'en' });
    expect(bodies()).toEqual([['/api/v1/evaluate', PARAMS]]);
  });

  it('startConsultation em inglês: lang só no /advisory', async () => {
    const { bodies } = stubFetch();
    const consultation = startConsultation(PARAMS, { language: 'en' });
    await Promise.all([consultation.advisory, consultation.evaluate]);
    expect(bodies()).toEqual([
      ['/api/v1/advisory', { ...PARAMS, lang: 'en' }],
      ['/api/v1/evaluate', PARAMS],
    ]);
  });
});
