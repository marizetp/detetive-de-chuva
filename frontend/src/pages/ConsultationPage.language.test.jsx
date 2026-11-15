import { act, fireEvent, render, screen, waitFor, within } from '../test/render.jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useI18n } from '../i18n/useI18n.js';
import { ALL_RECORDINGS } from '../test/allRecordings.js';
import ConsultationPage from './ConsultationPage.jsx';

// Fluxo de idioma da recomendação, com respostas REAIS da API v1.1 gravadas em 2026-11-15:
// adv_en (lang=en), adv_pt (sem lang), eval_pt e os catálogos.

const body = (id) => ALL_RECORDINGS.find((entry) => entry.id === id).text;
const ADV_EN = JSON.parse(body('adv_en'));
const ADV_PT = JSON.parse(body('adv_pt'));
const EN_TEXT_START = 'FAVORABLE: November 2026 presents favorable conditions';
const PT_TEXT_START = 'FAVORÁVEL: O período de Novembro de 2026';

function setupApi({ advisoryFailures = 0 } = {}) {
  let failuresLeft = advisoryFailures;
  const fetchSpy = vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname;
    const payload = init.body ? JSON.parse(init.body) : null;
    let text;
    let status = 200;
    if (path === '/api/v1/provinces') text = body('get_api_v1_provinces');
    else if (path === '/api/v1/crops') text = body('get_api_v1_crops');
    else if (path === '/api/v1/evaluate') text = body('eval_pt');
    else if (path === '/api/v1/advisory') {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        status = 500;
        text = '{"detail":"erro"}';
      } else text = payload.lang === 'en' ? body('adv_en') : body('adv_pt');
    } else throw new Error(`Rota não prevista: ${path}`);
    return { ok: status === 200, status, text: async () => text };
  });
  vi.stubGlobal('fetch', fetchSpy);
  const calls = (path) =>
    fetchSpy.mock.calls
      .filter(([url]) => new URL(url).pathname === path)
      .map(([, init]) => JSON.parse(init.body));
  return { fetchSpy, calls };
}

function LanguageSwitch() {
  const { setLanguage } = useI18n();
  return (
    <>
      <button type="button" onClick={() => setLanguage('en')}>
        mudar-para-en
      </button>
      <button type="button" onClick={() => setLanguage('pt')}>
        mudar-para-pt
      </button>
    </>
  );
}

const LABELS = {
  pt: { province: 'Província', crop: 'Cultura', date: /Data da consulta/, submit: /Consultar/ },
  en: { province: 'Province', crop: 'Crop', date: /Intended sowing date/, submit: /Check suitability/ },
};

async function submitConsultation(language) {
  const labels = LABELS[language];
  await screen.findByRole('option', { name: 'Huambo' });
  await screen.findByRole('option', { name: language === 'en' ? 'Maize' : 'Milho' });
  fireEvent.change(screen.getByLabelText(labels.province), { target: { value: 'Huambo' } });
  fireEvent.change(screen.getByLabelText(labels.crop), { target: { value: 'Milho' } });
  fireEvent.change(screen.getByLabelText(labels.date), { target: { value: '2026-11-15' } });
  fireEvent.click(screen.getByRole('button', { name: labels.submit }));
}

/** Cartão da recomendação (onde está o título da recomendação). */
const recommendationCard = (title) => screen.getByRole('heading', { level: 3, name: title }).closest('div.rounded-2xl');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('recomendação no idioma da interface', () => {
  it('inglês: pede lang=en só ao /advisory e mostra a recomendação em inglês, sem aviso', async () => {
    const { calls } = setupApi();
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');

    expect(await screen.findByText(new RegExp(EN_TEXT_START))).toBeInTheDocument();
    expect(calls('/api/v1/advisory')).toEqual([
      { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15', lang: 'en' },
    ]);
    expect(calls('/api/v1/evaluate')).toEqual([
      { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15' },
    ]);
    const card = recommendationCard('Recommendation from the assessment service');
    expect(within(card).queryByText(/not yet available in English/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/View the original text/)).not.toBeInTheDocument();
  });

  it('português: não envia lang e mostra a recomendação em português, sem aviso', async () => {
    const { calls } = setupApi();
    render(<ConsultationPage />, { language: 'pt' });
    await submitConsultation('pt');

    expect(await screen.findByText(new RegExp(PT_TEXT_START))).toBeInTheDocument();
    expect(calls('/api/v1/advisory')).toEqual([
      { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15' },
    ]);
    const card = recommendationCard('Recomendação do serviço de avaliação');
    expect(within(card).queryByText(/ainda não está disponível em/)).not.toBeInTheDocument();
  });

  it('estado, confiança e métricas são os mesmos nos dois idiomas (só muda a apresentação)', async () => {
    expect(ADV_EN.status).toBe(ADV_PT.status);
    expect(ADV_EN.score_confianca).toBe(ADV_PT.score_confianca);
    expect(ADV_EN.metricas).toEqual(ADV_PT.metricas);

    setupApi();
    const { unmount } = render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    await screen.findByText(new RegExp(EN_TEXT_START));
    const confidenceEn = screen.getByText('Confidence level').parentElement.textContent;
    unmount();

    setupApi();
    render(<ConsultationPage />, { language: 'pt' });
    await submitConsultation('pt');
    await screen.findByText(new RegExp(PT_TEXT_START));
    const confidencePt = screen.getByText('Nível de Confiança').parentElement.textContent;
    expect(confidenceEn).toContain(`${ADV_EN.score_confianca}/100`);
    expect(confidencePt).toContain(`${ADV_PT.score_confianca}/100`);
  });
});

describe('mudar de idioma depois de uma consulta', () => {
  it('pt → en: o original fica disponível; «Get the recommendation in English» repete só o /advisory com lang=en', async () => {
    const { calls } = setupApi();
    render(
      <>
        <LanguageSwitch />
        <ConsultationPage />
      </>,
      { language: 'pt' },
    );
    await submitConsultation('pt');
    await screen.findByText(new RegExp(PT_TEXT_START));

    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-en' }));
    const card = recommendationCard('Recommendation from the assessment service');
    expect(within(card).getByText('The detailed recommendation is not yet available in English.')).toBeInTheDocument();
    expect(within(card).getByText(/This recommendation was requested from the assessment service in Portuguese/)).toBeInTheDocument();
    // O texto original (português) continua disponível, intacto e marcado com lang="pt".
    const original = card.querySelector('[lang="pt"]');
    expect(original).not.toBeNull();
    expect(original.textContent).toContain(PT_TEXT_START);

    fireEvent.click(within(card).getByRole('button', { name: 'Get the recommendation in English' }));
    expect(await screen.findByText(new RegExp(EN_TEXT_START))).toBeInTheDocument();

    expect(calls('/api/v1/advisory')).toEqual([
      { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15' },
      { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15', lang: 'en' },
    ]);
    expect(calls('/api/v1/evaluate')).toHaveLength(1); // o /evaluate não é repetido
    const cardEn = recommendationCard('Recommendation from the assessment service');
    expect(within(cardEn).queryByText(/not yet available in English/)).not.toBeInTheDocument();
  });

  it('en → pt: aviso em português e «Obter a recomendação em português» pede sem lang', async () => {
    const { calls } = setupApi();
    render(
      <>
        <LanguageSwitch />
        <ConsultationPage />
      </>,
      { language: 'en' },
    );
    await submitConsultation('en');
    await screen.findByText(new RegExp(EN_TEXT_START));

    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-pt' }));
    const card = recommendationCard('Recomendação do serviço de avaliação');
    expect(within(card).getByText(/Esta recomendação foi pedida ao serviço de avaliação em inglês/)).toBeInTheDocument();
    expect(card.querySelector('[lang="en"]').textContent).toContain(EN_TEXT_START);

    fireEvent.click(within(card).getByRole('button', { name: 'Obter a recomendação em português' }));
    expect(await screen.findByText(new RegExp(PT_TEXT_START))).toBeInTheDocument();
    expect(calls('/api/v1/advisory').at(-1)).toEqual({
      provincia: 'Huambo',
      cultura: 'Milho',
      data_consulta: '2026-11-15',
    });
    expect(calls('/api/v1/evaluate')).toHaveLength(1);
  });

  it('mudar várias vezes não altera nem duplica o texto, e não faz pedidos sem acção do utilizador', async () => {
    const { calls } = setupApi();
    render(
      <>
        <LanguageSwitch />
        <ConsultationPage />
      </>,
      { language: 'pt' },
    );
    await submitConsultation('pt');
    await screen.findByText(new RegExp(PT_TEXT_START));

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'mudar-para-en' }));
      fireEvent.click(screen.getByRole('button', { name: 'mudar-para-pt' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-en' }));
    await act(async () => {});

    expect(calls('/api/v1/advisory')).toHaveLength(1);
    const original = recommendationCard('Recommendation from the assessment service').querySelector('[lang="pt"]');
    expect(original.textContent.match(new RegExp(PT_TEXT_START, 'g'))).toHaveLength(1);
  });

  it('a nova tentativa do /advisory usa o idioma da submissão', async () => {
    const { calls } = setupApi({ advisoryFailures: 1 });
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText(new RegExp(EN_TEXT_START))).toBeInTheDocument());
    expect(calls('/api/v1/advisory').map((payload) => payload.lang)).toEqual(['en', 'en']);
    expect(calls('/api/v1/evaluate')).toHaveLength(1);
  });
});
