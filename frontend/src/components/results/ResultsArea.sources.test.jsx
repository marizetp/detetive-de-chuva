import { fireEvent, render, screen, within } from '../../test/render.jsx';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api.js';
import { advisoryHuamboMilho, evaluateHuamboMilho } from '../../test/fixtures/liveResponses.js';
import { mapAdvisoryResponse, mapEvaluateResponse } from '../../utils/mappers.js';
import ResultsArea from './ResultsArea.jsx';

// Fase 1 da adaptação à API v1.1: erros por tipo, falha de uma fonte sem esconder a outra,
// divergências entre /advisory e /evaluate e aviso de dados alternativos (is_fallback_weather).
// Nenhuma das fontes tem autoridade sobre a outra.

const PARAMS = { provincia: 'Huambo', cultura: 'Milho', data_consulta: '2026-11-12' };
const ok = (map, raw) => ({ status: 'success', result: map(raw), error: null });
const advisoryOk = (raw = advisoryHuamboMilho) => ok(mapAdvisoryResponse, raw);
const evaluateOk = (raw = evaluateHuamboMilho) => ok(mapEvaluateResponse, raw);
const failed = (kind, status = null) => ({
  status: 'error',
  result: null,
  error: new ApiError(kind, 'x', { status }),
});
const loading = { status: 'loading', result: null, error: null };

function renderReport({ advisory = advisoryOk(), evaluate = evaluateOk(), language = 'pt' } = {}) {
  const onRetry = vi.fn();
  const view = render(
    <ResultsArea submittedParams={PARAMS} advisory={advisory} evaluate={evaluate} onRetry={onRetry} />,
    { language },
  );
  return { ...view, onRetry };
}

describe('Recomendação com erro', () => {
  it.each([
    ['validation', 422, 'Os dados da consulta não são válidos.', false],
    ['http', 400, 'O pedido não foi aceite pelo servidor.', false],
    ['http', 404, 'A informação solicitada não foi encontrada.', false],
    ['http', 500, 'O servidor encontrou um problema.', true],
    ['http', 503, 'O serviço está temporariamente indisponível.', true],
    ['network', null, 'Não foi possível ligar ao servidor.', true],
    ['timeout', null, 'O servidor demorou demasiado a responder.', true],
    ['malformed', null, 'Não foi possível interpretar a resposta do servidor.', true],
  ])('%s %s → mensagem própria; nova tentativa só se for útil', (kind, status, title, canRetry) => {
    const { onRetry } = renderReport({ advisory: failed(kind, status), evaluate: loading });
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    expect(within(alert).getByText(new RegExp(title.replace(/[.]/g, '\\.')))).toBeInTheDocument();
    const retry = within(alert).queryByRole('button', { name: 'Tentar novamente' });
    if (canRetry) {
      fireEvent.click(retry);
      expect(onRetry).toHaveBeenCalledWith('advisory');
    } else {
      expect(retry).toBeNull();
    }
  });

  it('a mensagem fixa antiga («demorou a responder ou falha de ligação») já não é usada', () => {
    renderReport({ advisory: failed('validation', 422), evaluate: loading });
    expect(screen.queryByText(/demorou a responder ou ocorreu uma falha de ligação/)).not.toBeInTheDocument();
  });

  it('as duas fontes falharam: um aviso por fonte, cada um com a sua nova tentativa', () => {
    const { onRetry } = renderReport({ advisory: failed('http', 500), evaluate: failed('network') });
    expect(screen.getByText('Não foi possível obter a recomendação.')).toBeInTheDocument();
    expect(screen.getByText('Avaliação técnica indisponível')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Tentar novamente' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(onRetry).toHaveBeenCalledWith('evaluate');
  });

  it('em inglês, as mensagens seguem o idioma', () => {
    renderReport({ advisory: failed('http', 404), evaluate: loading, language: 'en' });
    expect(screen.getByText('The recommendation could not be retrieved.')).toBeInTheDocument();
    expect(screen.getByText(/This resource may not be available in this version of the service/)).toBeInTheDocument();
  });
});

describe('Recomendação falhou, avaliação técnica disponível (cenário 5)', () => {
  it('mostra só a avaliação técnica, identificada como tal, sem o cartão de veredito', () => {
    const { container } = renderReport({ advisory: failed('http', 500) });
    expect(screen.getByText('Recomendação indisponível')).toBeInTheDocument();
    expect(screen.getByText(/Mostramos abaixo apenas a avaliação técnica, identificada como tal/)).toBeInTheDocument();
    expect(screen.getByText('Estado segundo a avaliação técnica')).toBeInTheDocument();
    expect(screen.getByText('Favorável')).toBeInTheDocument();
    // Sem cartão de veredito nem título/descrição da recomendação.
    expect(container.querySelector('.border-2')).toBeNull();
    expect(screen.queryByText('Favorável para semeadura')).not.toBeInTheDocument();
    expect(screen.queryByText('Recomendação do serviço de avaliação')).not.toBeInTheDocument();
  });

  it('em inglês', () => {
    renderReport({ advisory: failed('http', 500), language: 'en' });
    expect(screen.getByText('Recommendation unavailable')).toBeInTheDocument();
    expect(screen.getByText('Status according to the technical assessment')).toBeInTheDocument();
  });

  it.each([
    [
      'pt',
      /A avaliação técnica não indica quais dos seus indicadores usaram essa alternativa/,
      /indicadores da recomendação/,
    ],
    [
      'en',
      /The technical assessment does not state which of its indicators used this alternative/,
      /recommendation's indicators/,
    ],
  ])('%s: dados alternativos referem-se aos indicadores da avaliação técnica', (language, variant, recommendationVariant) => {
    renderReport({ advisory: failed('http', 500), language });
    expect(screen.getByText(variant)).toBeInTheDocument();
    // A ressalva sobre a origem mantém-se, sem mencionar os indicadores da recomendação.
    expect(screen.getByText(/podem não corresponder a observações actuais|may not reflect current observations/)).toBeInTheDocument();
    expect(screen.queryByText(recommendationVariant)).not.toBeInTheDocument();
  });

  it('sem is_fallback_weather: nota neutra, sem assumir substituição', () => {
    const { is_fallback_weather: _omitido, ...semIndicacao } = evaluateHuamboMilho;
    renderReport({ advisory: failed('http', 500), evaluate: evaluateOk(semIndicacao) });
    expect(screen.getByText('Origem dos dados por confirmar')).toBeInTheDocument();
    expect(screen.queryByText('Dados meteorológicos alternativos')).not.toBeInTheDocument();
  });
});

describe('Divergências entre /advisory e /evaluate', () => {
  const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

  it('resultados iguais: sem aviso', () => {
    renderReport();
    expect(screen.queryByText(/estados diferentes|valores são diferentes|comparar todos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('estados diferentes: os dois valores lado a lado, sem escolher', () => {
    renderReport({ evaluate: evaluateOk({ ...evaluateHuamboMilho, status: 'AGUARDAR' }) });
    expect(screen.getByText('A recomendação e a avaliação técnica indicam estados diferentes')).toBeInTheDocument();
    expect(screen.getByText(/a plataforma não escolhe entre eles/)).toBeInTheDocument();
    const [row] = tableRows();
    expect(within(row).getByText('Estado')).toBeInTheDocument();
    expect(within(row).getByText('Favorável')).toBeInTheDocument();
    expect(within(row).getByText('Aguardar')).toBeInTheDocument();
  });

  it('mesmo estado, valores diferentes: só os campos que diferem, formatados por idioma', () => {
    renderReport({
      evaluate: evaluateOk({
        ...evaluateHuamboMilho,
        score_confianca: 80,
        metricas: { ...evaluateHuamboMilho.metricas, chuva_acumulada_recente_mm: 30.5 },
      }),
      language: 'en',
    });
    expect(screen.getByText('The statuses match, but some values differ')).toBeInTheDocument();
    const rows = tableRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Confidence level')).toBeInTheDocument();
    expect(within(rows[0]).getByText('95/100')).toBeInTheDocument();
    expect(within(rows[0]).getByText('80/100')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Recent accumulated rainfall')).toBeInTheDocument();
    expect(within(rows[1]).getByText(/^30\.5/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Recommendation' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Technical assessment' })).toBeInTheDocument();
  });

  it('campos em falta: «não comparados», nunca apresentados como concordância', () => {
    const { score_confianca: _omitida, ...semPontuacao } = evaluateHuamboMilho;
    renderReport({ evaluate: evaluateOk(semPontuacao) });
    expect(screen.getByText('Não foi possível comparar todos os valores')).toBeInTheDocument();
    expect(screen.getByText(/por isso não foram comparados: Nível de confiança\. Isto não significa que os valores coincidam/)).toBeInTheDocument();
  });

  it('avaliação técnica falhou: recomendação apresentada sem comparação, com nova tentativa da avaliação', () => {
    const { onRetry } = renderReport({ evaluate: failed('timeout') });
    expect(screen.getByText('Favorável para semeadura')).toBeInTheDocument();
    expect(screen.getByText('Avaliação técnica indisponível')).toBeInTheDocument();
    expect(screen.getByText(/a recomendação é apresentada sem essa comparação/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledWith('evaluate');
  });

  it('avaliação técnica a carregar: sem aviso até haver as duas respostas', () => {
    renderReport({ evaluate: loading });
    expect(screen.queryByText(/Avaliação técnica indisponível|estados diferentes/)).not.toBeInTheDocument();
  });
});

describe('Aviso de dados meteorológicos alternativos (is_fallback_weather)', () => {
  it('true: aviso atribuído à avaliação técnica, sem o estender à recomendação', () => {
    renderReport();
    expect(screen.getByText('Dados meteorológicos alternativos')).toBeInTheDocument();
    expect(screen.getByText(/Segundo a avaliação técnica, os dados meteorológicos em tempo real \(Open-Meteo\)/)).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível confirmar se os indicadores da recomendação usaram a mesma origem/)).toBeInTheDocument();
  });

  it('false: sem aviso nem nota', () => {
    renderReport({ evaluate: evaluateOk({ ...evaluateHuamboMilho, is_fallback_weather: false }) });
    expect(screen.queryByText('Dados meteorológicos alternativos')).not.toBeInTheDocument();
    expect(screen.queryByText('Origem dos dados por confirmar')).not.toBeInTheDocument();
  });

  it('campo em falta: nota neutra, sem assumir substituição', () => {
    const { is_fallback_weather: _omitido, ...semIndicacao } = evaluateHuamboMilho;
    renderReport({ evaluate: evaluateOk(semIndicacao) });
    expect(screen.getByText('Origem dos dados por confirmar')).toBeInTheDocument();
    expect(screen.getByText(/A avaliação técnica não indicou se foram usados/)).toBeInTheDocument();
    expect(screen.queryByText('Dados meteorológicos alternativos')).not.toBeInTheDocument();
  });

  it('avaliação técnica falhou: nota neutra de origem por confirmar', () => {
    renderReport({ evaluate: failed('network') });
    expect(screen.getByText(/A avaliação técnica não está disponível, por isso não foi possível confirmar/)).toBeInTheDocument();
  });

  it('avaliação técnica a carregar: nada', () => {
    renderReport({ evaluate: loading });
    expect(screen.queryByText(/Dados meteorológicos alternativos|Origem dos dados por confirmar/)).not.toBeInTheDocument();
  });

  it('em inglês', () => {
    renderReport({ language: 'en' });
    expect(screen.getByText('Alternative weather data')).toBeInTheDocument();
    expect(screen.getByText(/According to the technical assessment, real-time weather data \(Open-Meteo\)/)).toBeInTheDocument();
  });
});

describe('Identificação da recomendação', () => {
  it.each([
    ['pt', 'Recomendação do serviço de avaliação', /podendo recorrer a inteligência artificial/],
    ['en', 'Recommendation from the assessment service', /artificial intelligence may be used/],
  ])('%s: título neutro e divulgação prudente do uso de IA', (language, title, disclosure) => {
    renderReport({ language });
    expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
    expect(screen.getByText(disclosure)).toBeInTheDocument();
    expect(screen.queryByText(/agrónomo|agronomist/i)).not.toBeInTheDocument();
  });
});
