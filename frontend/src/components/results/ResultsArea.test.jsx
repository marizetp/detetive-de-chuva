import { render, screen, within } from '@testing-library/react';
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

// Formas reais gravadas a 2026-11-12 (fixtures de teste); variações construídas a partir delas.
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

const section = (name) => screen.getByRole('region', { name });

describe('ResultsArea — estrutura', () => {
  it('sem consulta: estado vazio, sem secções', () => {
    render(<ResultsArea submittedParams={null} advisory={loading} evaluate={loading} onRetry={() => {}} today={TODAY} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ainda sem consulta' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo da avaliação' })).not.toBeInTheDocument();
  });

  it('apresenta as cinco secções por ordem, com índice navegável', () => {
    renderReport();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Resumo da avaliação',
      'Indicadores agroclimáticos',
      'Recomendação de extensão',
      'Fundamentação técnica',
      'Transparência e limitações',
    ]);
    const nav = screen.getByRole('navigation', { name: 'Secções do relatório' });
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/consulta#relatorio-resumo',
      '/consulta#relatorio-indicadores',
      '/consulta#relatorio-recomendacao',
      '/consulta#relatorio-fundamentacao',
      '/consulta#relatorio-transparencia',
    ]);
  });

  it('identifica a fonte de cada secção', () => {
    renderReport();
    expect(within(section('Recomendação de extensão')).getByText('/api/v1/advisory')).toBeInTheDocument();
    expect(within(section('Fundamentação técnica')).getByText('/api/v1/evaluate')).toBeInTheDocument();
  });
});

describe('01 — Resumo: os três estados documentados', () => {
  it.each([
    ['FAVORAVEL', 'Favorável'],
    ['AGUARDAR', 'Aguardar'],
    ['DESFAVORAVEL', 'Desfavorável'],
  ])('%s → «%s» como estado da recomendação', (code, label) => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, status: code }) });
    const summary = section('Resumo da avaliação');
    expect(within(summary).getByText('Estado da recomendação')).toBeInTheDocument();
    expect(within(summary).getAllByText(label).length).toBeGreaterThan(0);
  });

  it('usa fixtures reais de AGUARDAR e DESFAVORAVEL na avaliação técnica', () => {
    renderReport({ evaluate: evaluateOk(evaluateHuamboAguardar) });
    expect(within(section('Resumo da avaliação')).getByText('Aguardar')).toBeInTheDocument();
  });

  it('mostra província, cultura, data e a ressalva sobre a confiança', () => {
    renderReport();
    const summary = section('Resumo da avaliação');
    expect(within(summary).getByText('Huambo')).toBeInTheDocument();
    expect(within(summary).getByText('Milho')).toBeInTheDocument();
    expect(within(summary).getByText('12 de novembro de 2026')).toBeInTheDocument();
    expect(within(summary).getByText(/Não é uma probabilidade nem uma garantia/)).toBeInTheDocument();
  });

  it("apresenta a confiança como «N/100», nunca como percentagem", () => {
    renderReport();
    const summary = section("Resumo da avaliação");
    const primaryScore = within(summary).getByText("95/100", { selector: "p" });
    expect(primaryScore).toBeInTheDocument();
    expect(within(summary).queryByText("95%")).not.toBeInTheDocument();
    expect(within(summary).getByText(/Pontuação de 0 a 100 atribuída pelo sistema/)).toBeInTheDocument();
  });

  it('enquanto as duas fontes carregam, o resumo indica a espera', () => {
    renderReport({ advisory: loading, evaluate: loading });
    expect(within(section('Resumo da avaliação')).getByText('A obter o resultado da avaliação…')).toBeInTheDocument();
  });

  it('se as duas fontes falharem, di-lo claramente', () => {
    renderReport({ advisory: failed(), evaluate: failed('network', null) });
    expect(within(section('Resumo da avaliação')).getByText('Nenhuma das fontes respondeu.')).toBeInTheDocument();
  });
});

describe('02 — Indicadores', () => {
  it('resposta completa: valores das duas fontes, com unidades', () => {
    renderReport();
    const table = within(section('Indicadores agroclimáticos')).getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getAllByText(/^25,6.mm$/)).toHaveLength(2);
    expect(within(rows[1]).getAllByText('48%')).toHaveLength(2);
    expect(within(rows[2]).getAllByText(/^51,2.mm$/)).toHaveLength(2);
    expect(within(table).queryByText('Sem dado')).not.toBeInTheDocument();
  });

  it('valores em falta aparecem como «Sem dado», nunca como 0', () => {
    renderReport({
      advisory: advisoryOk({
        ...advisoryHuamboMilho,
        metricas: { chuva_acumulada_recente_mm: 0, previsao_7dias_mm: 51.2 },
      }),
    });
    const table = within(section('Indicadores agroclimáticos')).getByRole('table');
    const [rainRow, moistureRow] = within(table).getAllByRole('row').slice(1);
    expect(within(rainRow).getByText(/^0.mm$/)).toBeInTheDocument(); // 0 real continua 0
    expect(within(moistureRow).getByText('Sem dado')).toBeInTheDocument();
    expect(within(section('Indicadores agroclimáticos')).getByText(/«Sem dado»: o serviço não enviou/)).toBeInTheDocument();
  });

  it('consulta de data passada: não apresenta os valores como observações desse dia', () => {
    renderReport({ params: { ...PARAMS, data_consulta: '2026-08-01' } });
    const indicators = section('Indicadores agroclimáticos');
    expect(within(indicators).getByText('Consulta para uma data passada')).toBeInTheDocument();
    expect(
      within(indicators).getByText(/O serviço não confirma que estes valores sejam observações de 1 de agosto de 2026/),
    ).toBeInTheDocument();
    expect(
      within(section('Resumo da avaliação')).getByText(
        'Data passada: os valores podem não corresponder às condições observadas nesse dia.',
      ),
    ).toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).getByText(
        /O serviço não confirma que os indicadores sejam observações desse dia/,
      ),
    ).toBeInTheDocument();
  });

  it('data actual: sem nota de data passada', () => {
    renderReport();
    expect(
      within(section('Indicadores agroclimáticos')).queryByText('Consulta para uma data passada'),
    ).not.toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).getByText(/Consulta para hoje, 12 de novembro de 2026/),
    ).toBeInTheDocument();
  });
});

describe('03 — Recomendação de extensão', () => {
  it('renderiza o Markdown recebido (títulos e listas)', async () => {
    renderReport();
    const recommendation = section('Recomendação de extensão');
    expect(
      await within(recommendation).findByRole('heading', { level: 4, name: 'Justificações Técnicas:' }),
    ).toBeInTheDocument();
    expect(within(recommendation).getByRole('listitem')).toHaveTextContent('Reservas Hídricas no Solo:');
  });

  it('erro: mensagem específica e nova tentativa só da recomendação', () => {
    const { onRetry } = renderReport({ advisory: failed('timeout') });
    const alert = within(section('Recomendação de extensão')).getByRole('alert');
    expect(alert).toHaveTextContent('Recomendação indisponível. O servidor demorou demasiado a responder.');
    within(alert).getByRole('button', { name: 'Tentar novamente' }).click();
    expect(onRetry).toHaveBeenCalledWith('advisory');
  });

  it('data passada: nota contextual antes do texto, que se mantém inalterado', async () => {
    renderReport({ params: { ...PARAMS, data_consulta: '2026-08-01' } });
    const recommendation = section('Recomendação de extensão');
    const note = within(recommendation).getByText('Contexto para ler esta recomendação');
    expect(
      within(recommendation).getByText(
        /A consulta é para 1 de agosto de 2026, uma data passada\. O texto abaixo pode referir-se ao «período actual»/,
      ),
    ).toBeInTheDocument();
    const heading = await within(recommendation).findByRole('heading', { level: 4, name: 'Justificações Técnicas:' });
    expect(note.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // O texto do serviço continua presente tal como veio, incluindo a primeira frase.
    expect(
      within(recommendation).getByText(
        'FAVORÁVEL: O período atual é favorável para a sementeira de Milho na província do Huambo.',
      ),
    ).toBeInTheDocument();
  });

  it('dados de substituição: a nota contextual indica-o também na recomendação', () => {
    renderReport();
    expect(
      within(section('Recomendação de extensão')).getByText(
        /os indicadores desta consulta são valores de substituição/,
      ),
    ).toBeInTheDocument();
  });

  it('data actual sem substituição: sem nota contextual', () => {
    renderReport({ evaluate: evaluateOk({ ...evaluateHuamboMilho, is_fallback_weather: false }) });
    expect(
      within(section('Recomendação de extensão')).queryByText('Contexto para ler esta recomendação'),
    ).not.toBeInTheDocument();
  });

  it('resposta sem texto: avisa em vez de inventar', () => {
    renderReport({ advisory: advisoryOk({ ...advisoryHuamboMilho, recomendacao_extensao: null }) });
    expect(
      within(section('Recomendação de extensão')).getByText('O serviço não enviou o texto da recomendação.'),
    ).toBeInTheDocument();
  });
});

describe('04 — Fundamentação técnica', () => {
  it('mostra triggers e justificações tal como recebidos', () => {
    renderReport();
    const technical = section('Fundamentação técnica');
    const triggers = within(technical).getByRole('list', { name: 'Códigos dos triggers activados' });
    expect(within(triggers).getByText('RECENT_RAIN_TRIGGER_SATISFIED')).toBeInTheDocument();
    for (const justification of evaluateHuamboMilho.justificacoes_tecnicas) {
      expect(within(technical).getByText(justification)).toBeInTheDocument();
    }
    expect(within(technical).getByText(/O seu significado não está documentado/)).toBeInTheDocument();
  });

  it('distingue lista vazia de campo ausente', () => {
    renderReport({ evaluate: evaluateOk(evaluateHuilaDesfavoravel) }); // triggers [], sem justificações
    const technical = section('Fundamentação técnica');
    expect(within(technical).getByText('Nenhum trigger activado, segundo o serviço.')).toBeInTheDocument();
    expect(within(technical).getByText('O serviço não enviou esta informação.')).toBeInTheDocument();
  });

  it('erro: nova tentativa só da avaliação técnica', () => {
    const { onRetry } = renderReport({ evaluate: failed() });
    within(within(section('Fundamentação técnica')).getByRole('alert'))
      .getByRole('button', { name: 'Tentar novamente' })
      .click();
    expect(onRetry).toHaveBeenCalledWith('evaluate');
  });
});

describe('05 — Transparência e limitações', () => {
  it('fontes coincidentes: di-lo explicitamente', () => {
    renderReport();
    expect(
      within(section('Transparência e limitações')).getByText(/coincidem nas duas\s+fontes/),
    ).toBeInTheDocument();
  });

  it('divergências: assinaladas no resumo, nos indicadores e comparadas lado a lado', () => {
    renderReport({
      evaluate: evaluateOk({
        ...evaluateHuamboMilho,
        status: 'AGUARDAR',
        metricas: { ...evaluateHuamboMilho.metricas, humidade_solo_raiz: 0.32 },
      }),
    });
    expect(within(section('Resumo da avaliação')).getByText('As duas fontes não coincidem')).toBeInTheDocument();
    expect(
      within(section('Indicadores agroclimáticos')).getByText(/Valores diferentes entre as fontes/),
    ).toBeInTheDocument();
    const table = within(section('Transparência e limitações')).getByRole('table', {
      name: 'Valores divergentes entre as duas fontes',
    });
    expect(within(table).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
      'EstadoFavorávelAguardar',
      'Humidade do solo na zona das raízes48%32%',
    ]);
  });

  it('dados de substituição: aviso junto da tabela de indicadores e na transparência', () => {
    renderReport();
    const indicators = section('Indicadores agroclimáticos');
    const notice = within(indicators).getByText('Valores de substituição');
    const table = within(indicators).getByRole('table');
    // O aviso aparece antes da tabela, para ser lido antes dos valores.
    expect(notice.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(indicators).getByText(
        /não correspondem necessariamente a medições nem a previsões meteorológicas para\s+12 de novembro de 2026/,
      ),
    ).toBeInTheDocument();
    expect(within(indicators).getByText(/A\s+fonte e o método não estão documentados/)).toBeInTheDocument();
    expect(
      within(indicators).getByText(/Os valores da recomendação coincidem com os da avaliação técnica/),
    ).toBeInTheDocument();

    const transparency = section('Transparência e limitações');
    expect(within(transparency).getByText('Valores de substituição')).toBeInTheDocument();
    expect(
      within(transparency).getByText('O serviço de recomendação não indica se usou dados de substituição.'),
    ).toBeInTheDocument();
  });

  it('dados de substituição com métricas divergentes: não afirma que as fontes coincidem', () => {
    renderReport({
      evaluate: evaluateOk({
        ...evaluateHuamboMilho,
        metricas: { ...evaluateHuamboMilho.metricas, humidade_solo_raiz: 0.32 },
      }),
    });
    const indicators = section('Indicadores agroclimáticos');
    expect(within(indicators).getByText('Valores de substituição')).toBeInTheDocument();
    expect(within(indicators).queryByText(/coincidem com os da avaliação técnica/)).not.toBeInTheDocument();
    expect(
      within(indicators).getByText('O serviço de recomendação não indica se usou dados de substituição.'),
    ).toBeInTheDocument();
  });

  it('is_fallback_weather = false: sem aviso de substituição', () => {
    renderReport({ evaluate: evaluateOk({ ...evaluateHuamboMilho, is_fallback_weather: false }) });
    expect(
      within(section('Indicadores agroclimáticos')).queryByText('Valores de substituição'),
    ).not.toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).queryByText('Valores de substituição'),
    ).not.toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).getByText(
        'A avaliação técnica indica que não usou dados de substituição.',
      ),
    ).toBeInTheDocument();
  });

  it('resposta incompleta e estado desconhecido: listados por fonte, com nomes legíveis', () => {
    renderReport({
      advisory: advisoryOk({
        status: 'PLANTAR_JA',
        metricas: { chuva_acumulada_recente_mm: 10, humidade_solo_raiz: 0.3, previsao_7dias_mm: 5 },
        recomendacao_extensao: 'Texto',
      }),
    });
    const summary = section('Resumo da avaliação');
    // Estado principal e linha da fonte: ambos neutros, nenhum inventa uma classificação.
    expect(within(summary).getAllByText('Estado não reconhecido')).toHaveLength(2);
    expect(within(summary).getByText('PLANTAR_JA')).toBeInTheDocument();
    expect(within(summary).getAllByText('Sem dado').length).toBeGreaterThan(0); // confiança

    const transparency = section('Transparência e limitações');
    expect(within(transparency).getByText('Recomendação: Nível de confiança — não enviado.')).toBeInTheDocument();
    expect(within(transparency).getByText(/estado com valor não reconhecido \(«PLANTAR_JA»\)/)).toBeInTheDocument();
  });

  it('resposta completa: confirma que todos os campos documentados foram recebidos', () => {
    renderReport();
    expect(
      within(section('Transparência e limitações')).getByText(
        'As respostas recebidas incluem todos os campos documentados.',
      ),
    ).toBeInTheDocument();
  });

  it('inclui os limites: confiança não é probabilidade e não há garantia de sucesso', () => {
    renderReport();
    const transparency = section('Transparência e limitações');
    expect(within(transparency).getByText(/Não é uma probabilidade de sucesso/)).toBeInTheDocument();
    expect(within(transparency).getByText(/não garante a germinação, a produtividade/)).toBeInTheDocument();
  });
});

describe('Linguagem: valores de referência não são apresentados como observações', () => {
  // Expressões que apresentariam os indicadores como medições ou previsões da data consultada.
  const FORBIDDEN = [
    /retrospectiv/i,
    /registad[oa]s? na data/i,
    /valores registados/i,
    /previsão para os próximos 7 dias/i,
    /chuva prevista para os próximos 7 dias/i,
    /referem-se a \d/i,
    /descrevem as condições/i,
    /climatológic/i,
  ];

  it.each([
    ['data actual', TODAY],
    ['data passada', '2026-08-01'],
  ])('%s: nenhuma expressão proibida no relatório', async (_label, date) => {
    const { container } = render(
      <ResultsArea
        submittedParams={{ ...PARAMS, data_consulta: date }}
        advisory={advisoryOk()}
        evaluate={evaluateOk()}
        onRetry={() => {}}
        today={TODAY}
      />,
    );
    await screen.findByRole('heading', { level: 4, name: 'Justificações Técnicas:' });

    // O texto do serviço é excluído: é apresentado sem alterações e não é da responsabilidade
    // da interface (pode conter, por exemplo, «período atual»).
    const ownText = [...container.querySelectorAll('section[id^="relatorio-"]')]
      .filter((element) => element.id !== 'relatorio-recomendacao')
      .map((element) => element.textContent)
      .join(' ');
    const recommendationNotes = container.querySelector('#relatorio-recomendacao [class*="border-l-4"]');
    const textToCheck = `${ownText} ${recommendationNotes?.textContent ?? ''}`;

    for (const pattern of FORBIDDEN) expect(textToCheck).not.toMatch(pattern);
  });

  it('o rótulo do campo de 7 dias não promete uma previsão', () => {
    renderReport();
    const table = within(section('Indicadores agroclimáticos')).getByRole('table');
    expect(within(table).getByText('Chuva indicada para 7 dias')).toBeInTheDocument();
    expect(within(table).getByText(/Pode ser um valor de referência, e não uma previsão meteorológica/)).toBeInTheDocument();
  });
});

describe('Falha da avaliação técnica: natureza dos dados por confirmar', () => {
  it('/evaluate falha e /advisory responde: avisa que a natureza não foi confirmada, sem assumir substituição', () => {
    renderReport({ evaluate: failed() });
    const indicators = section('Indicadores agroclimáticos');
    expect(within(indicators).getByText('Natureza dos dados por confirmar')).toBeInTheDocument();
    expect(
      within(indicators).getByText(
        /A avaliação técnica não está disponível, por isso não foi possível confirmar se estes valores são de substituição/,
      ),
    ).toBeInTheDocument();
    expect(
      within(indicators).getByText(/Não devem ser lidos como medições nem como previsões meteorológicas/),
    ).toBeInTheDocument();
    // Não é classificado automaticamente como substituição confirmada.
    expect(within(indicators).queryByText('Valores de substituição')).not.toBeInTheDocument();

    const transparency = section('Transparência e limitações');
    expect(
      within(transparency).getByText(/Sem informação: a avaliação técnica não está disponível/),
    ).toBeInTheDocument();
    expect(within(transparency).queryByText('Valores de substituição')).not.toBeInTheDocument();
    expect(within(transparency).getByText('Avaliação técnica: sem resposta do serviço.')).toBeInTheDocument();

    expect(
      within(section('Recomendação de extensão')).getByText(
        /Não foi possível confirmar a natureza dos valores em que o texto se apoia/,
      ),
    ).toBeInTheDocument();
  });

  it('/evaluate responde sem is_fallback_weather: também fica por confirmar', () => {
    renderReport({ evaluate: evaluateOk({ ...evaluateHuamboMilho, is_fallback_weather: undefined }) });
    const indicators = section('Indicadores agroclimáticos');
    expect(within(indicators).getByText('Natureza dos dados por confirmar')).toBeInTheDocument();
    expect(within(indicators).getByText(/não indicou se usou dados de substituição/)).toBeInTheDocument();
    expect(within(indicators).queryByText('Valores de substituição')).not.toBeInTheDocument();
  });

  it('/evaluate ainda a carregar: nenhuma conclusão antecipada', () => {
    renderReport({ evaluate: loading });
    expect(
      within(section('Indicadores agroclimáticos')).queryByText('Natureza dos dados por confirmar'),
    ).not.toBeInTheDocument();
    expect(
      within(section('Transparência e limitações')).getByText(
        'A aguardar a avaliação técnica para confirmar a natureza dos dados.',
      ),
    ).toBeInTheDocument();
  });

  it('as duas fontes falham: sem aviso sobre valores que não existem', () => {
    renderReport({ advisory: failed(), evaluate: failed() });
    expect(
      within(section('Indicadores agroclimáticos')).queryByText('Natureza dos dados por confirmar'),
    ).not.toBeInTheDocument();
  });
});
