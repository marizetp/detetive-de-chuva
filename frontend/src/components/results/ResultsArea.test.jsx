import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api.js';
import {
  advisoryHuamboMilho,
  evaluateHuamboAguardar,
  evaluateHuamboMilho,
  evaluateHuilaDesfavoravel,
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
    expect(screen.getByText(/A consultar dados climatológicos de 25 anos da NASA/)).toBeInTheDocument();
  });

  it('em erro: apresenta mensagem clara e botão de tentar novamente', () => {
    const { onRetry } = renderReport({ advisory: failed('timeout') });
    expect(screen.getByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledWith('advisory');
  });

  it('sucesso FAVORÁVEL: exibe badge grande, confiança e descrição adequada', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'FAVORAVEL' }) });
    expect(screen.getByText('FAVORÁVEL PARA SEMEADURA')).toBeInTheDocument();
    expect(screen.getByText(/As condições climáticas e as reservas de humidade do solo são adequadas/)).toBeInTheDocument();
    expect(screen.getByText('Nível de Confiança')).toBeInTheDocument();
  });

  it('sucesso AGUARDAR: exibe badge de cautela e aviso para proteger recursos', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'AGUARDAR' }) });
    expect(screen.getByText('AGUARDAR MELHORES CONDIÇÕES')).toBeInTheDocument();
    expect(screen.getByText(/Transição ou humidade ainda incipiente na raiz/)).toBeInTheDocument();
  });

  it('sucesso DESFAVORÁVEL: exibe alerta de não recomendação para a época seca', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: 'DESFAVORAVEL' }) });
    expect(screen.getByText('NÃO RECOMENDADO / DESFAVORÁVEL')).toBeInTheDocument();
    expect(screen.getByText(/Risco elevado de perda do investimento e insumos/)).toBeInTheDocument();
  });

  it('apresenta os 3 cartões de indicadores chave com valores e unidades', () => {
    renderReport();
    expect(screen.getByText('Chuva Recente')).toBeInTheDocument();
    expect(screen.getByText('Humidade da Raiz')).toBeInTheDocument();
    expect(screen.getByText('Chuva Prevista')).toBeInTheDocument();
    expect(screen.getAllByText(/25.6 mm/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/48%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/51.2 mm/).length).toBeGreaterThan(0);
  });

  it('renderiza o parecer técnico do agrônomo formatado em Markdown', async () => {
    renderReport();
    expect(screen.getByText('Recomendação Técnica do Agrónomo')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 4, name: 'Justificações Técnicas:' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Reservas Hídricas no Solo:');
  });

  it('permite alterar dados da consulta com ligação rápida', () => {
    renderReport();
    const link = screen.getByRole('link', { name: 'Alterar dados da consulta' });
    expect(link).toHaveAttribute('href', '/consulta#consulta-formulario');
  });
});
