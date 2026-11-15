import { fireEvent, render, screen, within } from '../../test/render.jsx';
import { describe, expect, it } from 'vitest';
import { advisoryHuamboMilho, evaluateHuamboMilho } from '../../test/fixtures/liveResponses.js';
import { mapAdvisoryResponse, mapEvaluateResponse, mapCatalogOptions } from '../../utils/mappers.js';
import ResultsArea from './ResultsArea.jsx';

const TODAY = '2026-11-12';
const PARAMS = { provincia: 'Huambo', municipio: 'Caála', cultura: 'Milho', data_consulta: TODAY };
const CROPS = { status: 'success', ...mapCatalogOptions([{ id: 'milho', nome: 'Milho' }]) };

function renderReport(language, { advisoryRaw = advisoryHuamboMilho } = {}) {
  return render(
    <ResultsArea
      submittedParams={PARAMS}
      advisory={{ status: 'success', result: mapAdvisoryResponse(advisoryRaw), error: null }}
      evaluate={{ status: 'success', result: mapEvaluateResponse(evaluateHuamboMilho), error: null }}
      crops={CROPS}
      onRetry={() => {}}
      today={TODAY}
    />,
    { language },
  );
}

/** Cartão do veredito da recomendação (a tabela de divergências pode repetir valores). */
const verdictCard = () => within(document.querySelector('.border-2'));

const valueWithUnit = (text) => (_, element) =>
  element?.textContent === text && [...element.children].every((child) => child.textContent !== text);

describe('ResultsArea em English — conteúdo dinâmico do backend (Português)', () => {
  it('a interface está em inglês, com números e datas no formato inglês', () => {
    renderReport('en');
    expect(screen.getByRole('heading', { level: 2, name: 'Consultation report' })).toBeInTheDocument();
    expect(screen.getByText('Huambo (Caála) · Maize · 12 November 2026')).toBeInTheDocument();
    expect(screen.getByText(valueWithUnit('25.6 mm'))).toBeInTheDocument();
    expect(screen.getByText(valueWithUnit('48%'))).toBeInTheDocument();
    expect(screen.getByText(valueWithUnit('51.2 mm'))).toBeInTheDocument();
    expect(screen.getByText('Favourable for sowing')).toBeInTheDocument();
  });

  it('a recomendação não é misturada com a interface: aviso + painel fechado com o original', () => {
    const { container } = renderReport('en');
    expect(
      screen.getByText('The detailed recommendation is not yet available in English.'),
    ).toBeInTheDocument();

    const summaries = screen.getAllByText('View the original text (Portuguese)');
    const panel = summaries[0].closest('details');
    expect(panel).not.toHaveAttribute('open');
    const original = panel.querySelector('[lang="pt"]');
    expect(original).not.toBeNull();
    // O texto original fica intacto e disponível para auditoria.
    expect(within(original).getByText(/Reservas Hídricas no Solo:/)).toBeInTheDocument();

    // Fora dos painéis do original, não há texto do backend.
    const outside = [...container.querySelectorAll('p, h2, h3, span')].filter(
      (element) => !element.closest('[lang="pt"]'),
    );
    expect(outside.some((element) => /Reservas Hídricas/.test(element.textContent))).toBe(false);
  });

  it('o painel do original pode ser aberto pelo teclado (summary nativo)', () => {
    renderReport('en');
    const summary = screen.getAllByText('View the original text (Portuguese)')[0].closest('summary');
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
  });

  it('as justificações técnicas também ficam no painel do original, com lang="pt"', () => {
    renderReport('en');
    expect(
      screen.getByText('The technical justifications are not yet available in English.'),
    ).toBeInTheDocument();
    const justification = screen.getByText(/Reserva de água na raiz favorável \(0\.48\)/);
    expect(justification.closest('[lang="pt"]')).not.toBeNull();
  });

  it('o estado, a confiança e os indicadores mantêm os valores da resposta', () => {
    renderReport('en', { advisoryRaw: { ...advisoryHuamboMilho, status: 'DESFAVORAVEL' } });
    expect(screen.getByText('Not recommended / Unfavourable')).toBeInTheDocument();
    expect(
      verdictCard().getByText(valueWithUnit(`${advisoryHuamboMilho.score_confianca}/100`)),
    ).toBeInTheDocument();
  });
});

describe('ResultsArea — nível de confiança', () => {
  const withoutScore = (() => {
    const { score_confianca: _omitida, ...rest } = advisoryHuamboMilho;
    return rest;
  })();

  it.each([['pt'], ['en']])('%s: pontuação válida no formato N/100, nunca em percentagem', (language) => {
    renderReport(language, { advisoryRaw: { ...advisoryHuamboMilho, score_confianca: 72 } });
    expect(verdictCard().getByText(valueWithUnit('72/100'))).toBeInTheDocument();
    expect(screen.queryByText('72%')).not.toBeInTheDocument();
  });

  it.each([
    ['pt', 'Pontuação de confiança do sistema · Não representa uma probabilidade'],
    ['en', 'System confidence score · Not a probability'],
  ])('%s: pontuação válida mostra a legenda «%s»', (language, caption) => {
    renderReport(language, { advisoryRaw: { ...advisoryHuamboMilho, score_confianca: 72 } });
    const legend = screen.getByText(caption);
    expect(legend).toHaveClass('font-sans', 'text-xs', 'text-ink-muted');
    // O separador «·» fica preso à palavra anterior por um espaço não separável (U+00A0).
    expect(legend.textContent).toContain(`${String.fromCharCode(0xa0)}·`);
    // Hierarquia: a legenda vem depois da pontuação, no mesmo cartão.
    const score = verdictCard().getByText(valueWithUnit('72/100'));
    expect(score.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('decimais seguem o idioma (82,5/100 em pt, 82.5/100 em en)', () => {
    const { unmount } = renderReport('pt', { advisoryRaw: { ...advisoryHuamboMilho, score_confianca: 82.5 } });
    expect(verdictCard().getByText(valueWithUnit('82,5/100'))).toBeInTheDocument();
    unmount();
    renderReport('en', { advisoryRaw: { ...advisoryHuamboMilho, score_confianca: 82.5 } });
    expect(verdictCard().getByText(valueWithUnit('82.5/100'))).toBeInTheDocument();
  });

  it.each([
    ['pt', 'Não disponível'],
    ['en', 'Not available'],
  ])('%s: sem pontuação → «%s», sem valor assumido nem barra', (language, text) => {
    const { container } = renderReport(language, { advisoryRaw: withoutScore });
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/85/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    expect(container.querySelector('.motion-fill')).toBeNull();
    expect(screen.queryByText(/Not a probability|Não representa uma probabilidade/)).not.toBeInTheDocument();
  });

  it.each([[null], [150], [-1], ['95'], [Number.NaN]])(
    'pontuação inválida (%s) → «Not available»',
    (score) => {
      renderReport('en', { advisoryRaw: { ...advisoryHuamboMilho, score_confianca: score } });
      expect(screen.getByText('Not available')).toBeInTheDocument();
      expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
      expect(screen.queryByText(/System confidence score/)).not.toBeInTheDocument();
    },
  );

  it('a resposta original da API não é alterada', () => {
    const raw = { ...advisoryHuamboMilho, score_confianca: 150 };
    const snapshot = JSON.stringify(raw);
    renderReport('pt', { advisoryRaw: raw });
    expect(JSON.stringify(raw)).toBe(snapshot);
    expect(raw.score_confianca).toBe(150);
  });
});

describe('ResultsArea em Português — texto do backend apresentado directamente', () => {
  it('sem aviso de tradução nem painel do original', () => {
    renderReport('pt');
    expect(screen.queryByText(/ainda não está disponível em/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ver o texto original/)).not.toBeInTheDocument();
    expect(screen.getByText(/Reservas Hídricas no Solo:/)).toBeInTheDocument();
    expect(screen.getByText('Huambo (Caála) · Milho · 12 de novembro de 2026')).toBeInTheDocument();
  });
});
