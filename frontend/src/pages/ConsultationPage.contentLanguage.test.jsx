import { fireEvent, render, screen, within } from '../test/render.jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useI18n } from '../i18n/useI18n.js';
import { ALL_RECORDINGS } from '../test/allRecordings.js';
import ConsultationPage from './ConsultationPage.jsx';

// Preparação para o contrato de i18n pedido ao backend (docs/ESPECIFICACAO-BACKEND-I18N.md), com
// respostas REAIS gravadas em 2026-11-15 (adv_en, adv_pt, eval_pt, catálogos). O campo
// `content_language`, quando aparece, é ACRESCENTADO pelo teste: simula o contrato pedido; a API
// v1.1 ainda não o devolve. Nenhum outro valor das gravações é alterado.

const body = (id) => ALL_RECORDINGS.find((entry) => entry.id === id).text;
const EN_TEXT_START = 'FAVORABLE: November 2026 presents favorable conditions';
const PT_TEXT_START = 'FAVORÁVEL: O período de Novembro de 2026';
const PT_JUSTIFICATION = 'Período agroclimático favorável e estável para sementeira de Milho';
const BASE = { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-15' };

/** @param {{ advisoryContentLanguage?: (payload) => string, evaluateContentLanguage?: string }} options */
function setupApi({ advisoryFor = (payload) => (payload.lang === 'en' ? 'adv_en' : 'adv_pt'), advisoryContentLanguage, evaluateContentLanguage } = {}) {
  const fetchSpy = vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname;
    const payload = init.body ? JSON.parse(init.body) : null;
    let text;
    if (path === '/api/v1/provinces') text = body('get_api_v1_provinces');
    else if (path === '/api/v1/crops') text = body('get_api_v1_crops');
    else if (path === '/api/v1/evaluate') {
      text = body('eval_pt');
      if (evaluateContentLanguage) text = JSON.stringify({ ...JSON.parse(text), content_language: evaluateContentLanguage });
    } else if (path === '/api/v1/advisory') {
      text = body(advisoryFor(payload));
      if (advisoryContentLanguage) {
        text = JSON.stringify({ ...JSON.parse(text), content_language: advisoryContentLanguage(payload) });
      }
    } else throw new Error(`Rota não prevista: ${path}`);
    return { ok: true, status: 200, text: async () => text };
  });
  vi.stubGlobal('fetch', fetchSpy);
  const calls = (path) =>
    fetchSpy.mock.calls.filter(([url]) => new URL(url).pathname === path).map(([, init]) => JSON.parse(init.body));
  return { calls };
}

function LanguageSwitch() {
  const { setLanguage } = useI18n();
  return (
    <>
      <button type="button" onClick={() => setLanguage('en')}>mudar-para-en</button>
      <button type="button" onClick={() => setLanguage('pt')}>mudar-para-pt</button>
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

const recommendationCard = (title) => screen.getByRole('heading', { level: 3, name: title }).closest('div.rounded-2xl');
const detailsPanel = () => screen.getByText(/additional agronomic details|detalhes e verificações agronómicas/).closest('details');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('content_language: idioma efectivo declarado pelo backend', () => {
  it('backend declara en: recomendação em inglês mostrada directamente', async () => {
    setupApi({ advisoryContentLanguage: () => 'en-US' });
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    expect(await screen.findByText(new RegExp(EN_TEXT_START))).toBeInTheDocument();
    const card = recommendationCard('Recommendation from the assessment service');
    expect(within(card).queryByText(/not yet available in English/)).not.toBeInTheDocument();
  });

  it('pedido em inglês, mas o backend declara pt: aviso e original em pt, sem repetir o mesmo pedido', async () => {
    // Simula um backend que ignorou `lang` e o declarou: o texto real em português é servido.
    setupApi({ advisoryFor: () => 'adv_pt', advisoryContentLanguage: () => 'pt-AO' });
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    await screen.findByText('Favourable for sowing');
    const card = recommendationCard('Recommendation from the assessment service');
    expect(within(card).getByText('The detailed recommendation is not yet available in English.')).toBeInTheDocument();
    expect(card.querySelector('[lang="pt"]').textContent).toContain(PT_TEXT_START);
    // Já foi pedida em inglês: o botão repetiria um pedido que o serviço não cumpriu.
    expect(within(card).queryByRole('button', { name: 'Get the recommendation in English' })).not.toBeInTheDocument();
  });

  it('sem content_language: comportamento actual (idioma pedido), sem aviso', async () => {
    setupApi();
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    expect(await screen.findByText(new RegExp(EN_TEXT_START))).toBeInTheDocument();
    expect(within(recommendationCard('Recommendation from the assessment service')).queryByText(/not yet available/)).not.toBeInTheDocument();
  });

  it('justificações com content_language pt numa interface em inglês: aviso e original em pt', async () => {
    setupApi({ evaluateContentLanguage: 'pt' });
    render(<ConsultationPage />, { language: 'en' });
    await submitConsultation('en');
    await screen.findByText(new RegExp(EN_TEXT_START));
    const panel = detailsPanel();
    expect(within(panel).getByText('The technical justifications are not yet available in English.')).toBeInTheDocument();
    expect(panel.querySelector('[lang="pt"]').textContent).toContain(PT_JUSTIFICATION);
  });
});

describe('lang no /evaluate', () => {
  it('capacidade desactivada (omissão): /evaluate sem lang e sem botão para as justificações', async () => {
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
    expect(calls('/api/v1/evaluate')).toEqual([BASE]);
    const panel = detailsPanel();
    expect(within(panel).getByText('The technical justifications are not yet available in English.')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Get the justifications/ })).not.toBeInTheDocument();
  });

  it('capacidade activa: lang=en no /evaluate; depois de mudar para pt, o botão repete só o /evaluate sem lang', async () => {
    vi.stubEnv('VITE_API_EVALUATE_LANG', 'true');
    // eval_pt não tem versão inglesa gravada: o backend declara pt, como faria se ainda não a gerasse.
    const { calls } = setupApi({ evaluateContentLanguage: 'pt' });
    render(
      <>
        <LanguageSwitch />
        <ConsultationPage />
      </>,
      { language: 'en' },
    );
    await submitConsultation('en');
    await screen.findByText(new RegExp(EN_TEXT_START));
    expect(calls('/api/v1/evaluate')).toEqual([{ ...BASE, lang: 'en' }]);
    // Pedidas em inglês e entregues em pt: aviso, sem botão para repetir o mesmo pedido.
    expect(within(detailsPanel()).queryByRole('button', { name: /Get the justifications/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-pt' }));
    // Em português o texto (pt) está no idioma da interface: mostrado directamente.
    expect(within(detailsPanel()).queryByText(/ainda não estão disponíveis/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-en' }));
    expect(calls('/api/v1/evaluate')).toHaveLength(1); // mudar de idioma não faz pedidos
    expect(calls('/api/v1/advisory')).toHaveLength(1);
  });

  it('capacidade activa: pt → en mostra «Get the justifications in English», que repete só o /evaluate com lang=en', async () => {
    vi.stubEnv('VITE_API_EVALUATE_LANG', 'true');
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
    expect(calls('/api/v1/evaluate')).toEqual([BASE]);

    fireEvent.click(screen.getByRole('button', { name: 'mudar-para-en' }));
    const panel = detailsPanel();
    expect(within(panel).getByText(/These justifications were requested from the assessment service in Portuguese/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Get the justifications in English' }));
    await screen.findByText(/additional agronomic details/);
    expect(calls('/api/v1/evaluate')).toEqual([BASE, { ...BASE, lang: 'en' }]);
    expect(calls('/api/v1/advisory')).toEqual([BASE]); // o /advisory não é repetido
  });
});
