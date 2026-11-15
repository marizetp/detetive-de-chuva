import { fireEvent, render, screen, within } from '../../test/render.jsx';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api.js';
import {
  advisoryHuamboMilho,
  evaluateHuamboMilho,
} from '../../test/fixtures/liveResponses.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../../utils/mappers.js';
import ResultsArea from './ResultsArea.jsx';

const TODAY = '2026-11-12';
const PARAMS = { provincia: 'Huambo', cultura: 'Milho', data_consulta: TODAY };

const advisoryOk = (raw = advisoryHuamboMilho) => ({
  status: 'success',
  result: mapAdvisoryResponse(raw),
  error: null,
});
const evaluateOk = (raw = evaluateHuamboMilho) => ({
  status: 'success',
  result: mapEvaluateResponse(raw),
  error: null,
});
const failed = (kind = 'http', status = 500) => ({
  status: 'error',
  result: null,
  error: new ApiError(kind, 'x', { status }),
});
const loading = { status: 'loading', result: null, error: null };

function renderReport({ advisory = advisoryOk(), evaluate = evaluateOk(), params = PARAMS, onRetry = vi.fn() } = {}) {
  render(
    <ResultsArea
      submittedParams={params}
      advisory={advisory}
      evaluate={evaluate}
      onRetry={onRetry}
      today={TODAY}
    />,
  );
  return { onRetry };
}

describe('ResultsArea — Layout Agronómico Direto', () => {
  it('sem consulta: estado vazio informativo', () => {
    render(<ResultsArea submittedParams={null} advisory={loading} evaluate={loading} onRetry={() => {}} today={TODAY} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ainda sem consulta' })).toBeInTheDocument();
  });

  it('em carregamento: apresenta indicador de análise agroclimática', () => {
    renderReport({ advisory: loading });
    expect(
      screen.getByText('A analisar dados climáticos históricos e indicadores agrícolas...'),
    ).toBeInTheDocument();
    // Não sugere que a plataforma já usa dados NASA POWER.
    expect(screen.queryByText(/NASA/)).not.toBeInTheDocument();
  });

  it('em erro: apresenta mensagem clara e botão de tentar novamente', () => {
    const { onRetry } = renderReport({ advisory: failed('timeout'), evaluate: loading });
    expect(screen.getByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    expect(screen.getByText(/O servidor demorou demasiado a responder/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledWith('advisory');
  });

  it('sucesso FAVORÁVEL: exibe badge grande, confiança e descrição adequada', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'FAVORAVEL' }) });
    expect(screen.getByText('Favorável para semeadura')).toBeInTheDocument();
    expect(screen.getByText(/o serviço classifica as condições como favoráveis à sementeira/)).toBeInTheDocument();
    expect(screen.getByText(/não uma garantia de germinação nem de colheita/)).toBeInTheDocument();
    expect(screen.getByText('Nível de Confiança')).toBeInTheDocument();
  });

  it('sucesso AGUARDAR: exibe badge de cautela e aviso para proteger recursos', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'AGUARDAR' }) });
    expect(screen.getByText('Aguardar antes de semear')).toBeInTheDocument();
    expect(screen.getByText(/indica que é preferível aguardar/)).toBeInTheDocument();
  });

  it('sucesso DESFAVORÁVEL: exibe alerta de não recomendação para a época seca', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'DESFAVORAVEL' }) });
    expect(screen.getByText('Não recomendado / Desfavorável')).toBeInTheDocument();
    expect(screen.getByText(/classifica as condições como desfavoráveis à sementeira/)).toBeInTheDocument();
    // A descrição da plataforma (cartão do veredito) não afirma consequências nem causas; o texto do
    // backend, mais abaixo, é apresentado tal como recebido.
    const verdict = within(document.querySelector('.border-2'));
    expect(verdict.queryByText(/perda do investimento|estiagem/)).not.toBeInTheDocument();
  });

  it('estado ausente: apresentação neutra «Estado indisponível», sem assumir AGUARDAR', () => {
    const { status: _omitido, ...semEstado } = advisoryHuamboMilho;
    renderReport({ advisory: advisoryOk(semEstado) });
    expect(screen.getByText('Estado indisponível')).toBeInTheDocument();
    expect(screen.getByText(/O serviço não enviou o estado desta avaliação/)).toBeInTheDocument();
    expect(screen.queryByText('Aguardar antes de semear')).not.toBeInTheDocument();
    expect(screen.queryByText('Estado não reconhecido')).not.toBeInTheDocument();
  });

  it('estado não reconhecido: apresentação neutra com o valor recebido, sem assumir FAVORÁVEL', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'PENDENTE' }) });
    expect(screen.getByText('Estado não reconhecido')).toBeInTheDocument();
    expect(screen.getByText(/não reconhece \(«PENDENTE»\)/)).toBeInTheDocument();
    expect(screen.queryByText('Favorável para semeadura')).not.toBeInTheDocument();
    expect(screen.queryByText('Estado indisponível')).not.toBeInTheDocument();
  });

  it.each([
    ['FAVORAVEL', 'Favorável para semeadura', 'status-favorable'],
    ['AGUARDAR', 'Aguardar antes de semear', 'status-wait'],
    ['DESFAVORAVEL', 'Não recomendado / Desfavorável', 'status-unfavorable'],
  ])('cartão %s usa a cor semântica do estado no texto e no contorno', (code, title, token) => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: code }) });
    const badge = screen.getByText(title).parentElement;
    expect(badge).toHaveClass(`text-${token}`);
    expect(badge.closest('.border-2')).toHaveClass(`border-${token}`);
  });

  it('cartão de estado não reconhecido usa o contorno neutro tracejado', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'PENDENTE' }) });
    const badge = screen.getByText('Estado não reconhecido').parentElement;
    expect(badge).toHaveClass('text-ink-muted');
    expect(badge.closest('.border-2')).toHaveClass('border-dashed', 'border-line-strong');
  });

  it('apresenta os 3 cartões de indicadores chave com valores e unidades', () => {
    renderReport();
    expect(screen.getByText('Chuva Recente')).toBeInTheDocument();
    expect(screen.getByText('Humidade da Raiz')).toBeInTheDocument();
    expect(screen.getByText('Chuva Prevista')).toBeInTheDocument();
    // A unidade está num <span> próprio (cor Aurora): o texto completo do valor mantém-se igual.
    const valueWithUnit = (text) => (_, element) =>
      element?.textContent === text && [...element.children].every((child) => child.textContent !== text);
    // Português: vírgula decimal (pt-AO). Os valores são os da resposta (25.6, 0.48, 51.2).
    expect(screen.getByText(valueWithUnit('25,6 mm'))).toBeInTheDocument();
    expect(screen.getByText(valueWithUnit('48%'))).toBeInTheDocument();
    expect(screen.getByText(valueWithUnit('51,2 mm'))).toBeInTheDocument();
    expect(screen.getAllByText('mm', { exact: false, selector: 'span' }).length).toBeGreaterThan(0);
  });

  it('renderiza o parecer técnico do agrônomo formatado em Markdown', async () => {
    renderReport();
    expect(screen.getByText('Recomendação do serviço de avaliação')).toBeInTheDocument();
    expect(
      screen.getByText(/Texto gerado automaticamente a partir dos indicadores do serviço, podendo recorrer a inteligência artificial/),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 4, name: 'Justificações Técnicas:' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Reservas Hídricas no Solo:');
  });

  it('permite alterar dados da consulta com ligação rápida', () => {
    renderReport();
    const link = screen.getByRole('link', { name: 'Alterar dados da consulta' });
    expect(link).toHaveAttribute('href', '/consulta#consulta-formulario');
  });
});
