// Dicionário Português (pt-AO). As chaves têm de coincidir com en.js (teste de paridade).
// Interpolação: {nome}. Nomes técnicos da API e o nome da marca não se traduzem.

const pt = {
  common: {
    retry: 'Tentar novamente',
    checkAgain: 'Verificar novamente',
  },
  documentTitle: {
    consultation: 'Consulta agrícola',
    notFound: 'Página não encontrada',
  },
  skipLink: 'Saltar para o conteúdo',
  header: {
    homeLink: '— página inicial',
    navLabel: 'Principal',
    navMobileLabel: 'Principal (telemóvel)',
    menuOpen: 'Menu',
    menuClose: 'Fechar',
    cta: 'Iniciar consulta',
    ctaMobile: 'Iniciar consulta agrícola',
  },
  nav: {
    home: 'Início',
    howItWorks: 'Como funciona',
    sources: 'Fontes de dados',
  },
  language: {
    selectorLabel: 'Idioma',
    changed: 'Idioma alterado para Português.',
  },
  suggestion: {
    regionLabel: 'Sugestão de idioma',
    title: 'Prefere ver o site em português?',
    accept: 'Mudar para Português',
    dismiss: 'Manter English',
  },
  footer: {
    tagline: 'Inteligência agroclimática para apoiar decisões agrícolas em Angola.',
    navLabel: 'Rodapé',
    navHeading: 'Navegar',
    consultation: 'Consulta agrícola',
    dataHeading: 'Dados',
    advisoryTerm: 'Avaliações e recomendações',
    advisoryDescription:
      'Serviço de avaliação do projecto. Fontes segundo a sua documentação: NASA GPM IMERG, NASA POWER e Open-Meteo.',
    trendsTerm: 'Tendências históricas',
    trendsDescription: 'NASA POWER (reanálise MERRA-2) — em preparação, ainda não disponível.',
    disclaimer:
      'Projecto desenvolvido no âmbito do NASA Space Apps Challenge 2026. O AgroKairos não é um serviço oficial da NASA.',
    decisionSupport: 'Ferramenta de apoio à decisão — não garante resultados agrícolas.',
  },
  home: {
    hero: {
      question: 'O calendário agrícola de sempre ainda é fiável?',
      lead: 'Uma plataforma de apoio à decisão agrícola que apresenta os indicadores agroclimáticos disponibilizados pelo sistema, como a chuva e a humidade do solo, para ajudar a decidir quando semear.',
      cta: 'Iniciar consulta agrícola',
      howItWorks: 'Como funciona',
    },
    about: {
      title: 'Informação agroclimática para decidir quando semear',
      paragraph1:
        'O calendário agrícola tradicional orienta a sementeira no Planalto Central há gerações. O AgroKairos parte de uma pergunta simples: as condições deste momento acompanham esse calendário?',
      paragraph2:
        'Para cada província e cultura, a plataforma consulta um serviço de avaliação agroclimática e apresenta o resultado de forma clara: uma classificação, um nível de confiança, os indicadores em que se baseia e orientações práticas para o terreno.',
      indicatorsHeading: 'Indicadores considerados',
    },
    howItWorks: {
      title: 'Três passos, do terreno à recomendação',
      stepPrefix: 'Passo {number}: ',
      step1Title: 'Seleccionar a província e a cultura',
      step1Text:
        'Escolha a província onde vai semear e a cultura que pretende instalar. As opções disponíveis são fornecidas pelo serviço.',
      step2Title: 'Analisar as condições agroclimáticas',
      step2Text:
        'O serviço analisa indicadores agroclimáticos, como a chuva e a humidade do solo na zona das raízes, e devolve uma classificação para a província e a cultura escolhidas.',
      step3Title: 'Consultar a recomendação',
      step3Text:
        'Recebe uma classificação, um nível de confiança e orientações práticas. O nível de confiança é uma pontuação do sistema, não uma garantia de sucesso.',
      statusListLabel: 'Classificações possíveis',
      ctaPrompt: 'Pronto para avaliar as condições da sua zona?',
      cta: 'Iniciar consulta agrícola',
    },
    sources: {
      title: 'De onde vêm os dados, e o que ainda não sabemos',
      sourcesHeading: 'Fontes de dados',
      available: 'Disponível',
      pending: 'Em preparação',
      serviceTitle: 'Serviço de avaliação do AgroKairos',
      serviceText:
        'Serviço do projecto que devolve, para cada consulta, a classificação, o nível de confiança, os indicadores e a recomendação, bem como uma avaliação técnica complementar. Segundo a sua documentação, usa dados abertos de precipitação, humidade do solo e temperatura, e previsões meteorológicas de um serviço externo; as fontes estão identificadas no rodapé. A documentação não indica que fonte alimenta cada indicador apresentado.',
      trendsTitle: 'Tendências agroclimáticas históricas',
      trendsText:
        'Análise de tendências de longo prazo a partir de dados de reanálise — um produto de modelo, não uma medição directa. Ainda não está disponível na plataforma.',
      natureHeading: 'Natureza da plataforma',
      nature1: 'É uma ferramenta de apoio à decisão. Não garante o sucesso da sementeira.',
      nature2:
        'O nível de confiança é uma pontuação atribuída pelo sistema, não uma probabilidade confirmada.',
      nature3:
        'O texto da recomendação é produzido automaticamente pelo serviço de avaliação, a partir dos indicadores desta consulta. Pode ser redigido com recurso a inteligência artificial generativa ou a partir de um modelo de texto fixo, e a redacção pode variar entre consultas. Não substitui o aconselhamento de um técnico de extensão agrícola.',
      nature4:
        'Não substitui o conhecimento local nem o acompanhamento de técnicos de extensão agrícola.',
    },
  },
  status: {
    FAVORAVEL: 'Favorável',
    AGUARDAR: 'Aguardar',
    DESFAVORAVEL: 'Desfavorável',
    unknown: 'Estado não reconhecido',
    missing: 'Estado indisponível',
  },
  metrics: {
    chuva_acumulada_recente_mm: {
      label: 'Chuva acumulada recente',
      description:
        'Chuva acumulada antes da data consultada, segundo o serviço. Pode ser um valor de referência, e não uma medição.',
    },
    humidade_solo_raiz: {
      label: 'Humidade do solo na zona das raízes',
      description:
        'Água disponível na camada de solo onde a raiz se desenvolve, segundo o serviço, numa escala de 0 a 1 (aqui em percentagem). Pode ser um valor de referência, e não uma medição.',
    },
    previsao_7dias_mm: {
      label: 'Chuva indicada para 7 dias',
      description:
        'Chuva indicada pelo serviço para os sete dias seguintes à data consultada. Pode ser um valor de referência, e não uma previsão meteorológica.',
    },
  },
  consultation: {
    eyebrow: 'Consulta agrícola',
    title: 'Avaliar as condições para semear',
    lead: 'Indique a província, o município (opcional), a cultura e a data pretendida, imediata ou de planeamento de safra. Obtenha a recomendação do serviço e os indicadores climáticos de apoio à decisão.',
    form: {
      title: 'Dados da consulta',
      lead: 'Indique a localização, a cultura e a data pretendida para avaliar as condições de sementeira.',
      loadingProvinces: 'A carregar as províncias do serviço…',
      loadingCrops: 'A carregar as culturas do serviço…',
      loadingBoth: 'A carregar as províncias e as culturas do serviço…',
      province: {
        label: 'Província',
        placeholder: 'Seleccione a província',
        loading: 'A carregar as províncias…',
        loadError: 'Não foi possível carregar as províncias.',
        empty: 'Não há províncias disponíveis de momento.',
      },
      municipality: {
        label: 'Município',
        hint: 'Opcional. Permite maior precisão geográfica da previsão.',
        wholeProvince: 'Sede provincial / Toda a província',
        seat: '{name} (Sede)',
      },
      crop: {
        label: 'Cultura',
        placeholder: 'Seleccione a cultura',
        loading: 'A carregar as culturas…',
        loadError: 'Não foi possível carregar as culturas.',
        empty: 'Não há culturas disponíveis de momento.',
      },
      date: {
        label: 'Data da consulta para sementeira',
        hint: 'Hoje ou qualquer data futura de planeamento de safra.',
      },
      submit: 'Consultar Viabilidade',
      submitPending: 'A avaliar viabilidade…',
      submitUpdate: 'Actualizar Viabilidade',
      hintPending: 'A consulta está em curso. Aguarde a resposta do serviço.',
      hintCatalogs: 'Disponível quando as províncias e as culturas estiverem carregadas.',
      staleTitle: 'Dados alterados',
      staleBody:
        'O relatório ao lado mostra a consulta anterior ({consultation}). Seleccione «{action}» para obter um relatório com os novos dados.',
    },
  },
  validation: {
    provinceRequired: 'Seleccione uma província.',
    cropRequired: 'Seleccione uma cultura.',
    dateRequired: 'Indique a data da consulta.',
    dateInvalid: 'Indique uma data válida no formato AAAA-MM-DD.',
    provinceFromList: 'Seleccione uma província da lista.',
    cropFromList: 'Seleccione uma cultura da lista.',
  },
  errors: {
    inputTitle: 'Verifique os dados da consulta.',
    unexpectedTitle: 'Ocorreu um erro inesperado.',
    unexpectedDescription: 'Tente novamente. Se o problema continuar, volte mais tarde.',
    timeoutTitle: 'O servidor demorou demasiado a responder.',
    timeoutDescription:
      'O serviço pode estar a arrancar após um período sem utilização. Aguarde alguns instantes e tente novamente.',
    networkTitle: 'Não foi possível ligar ao servidor.',
    networkDescription: 'Verifique a sua ligação à Internet e tente novamente.',
    validationTitle: 'Os dados da consulta não são válidos.',
    validationDescription:
      'Verifique a província, a cultura e a data seleccionadas e corrija o que for necessário antes de voltar a enviar.',
    badRequestTitle: 'O pedido não foi aceite pelo servidor.',
    badRequestDescription:
      'Verifique os dados da consulta e corrija o que for necessário antes de voltar a enviar.',
    notFoundTitle: 'A informação solicitada não foi encontrada.',
    notFoundDescription: 'O recurso poderá não estar disponível nesta versão do serviço.',
    unavailableTitle: 'O serviço está temporariamente indisponível.',
    unavailableDescription: 'Tente novamente dentro de alguns minutos.',
    malformedTitle: 'Não foi possível interpretar a resposta do servidor.',
    malformedDescription: 'Tente novamente dentro de alguns instantes.',
    serverTitle: 'O servidor encontrou um problema.',
    serverDescription: 'Tente novamente dentro de alguns instantes.',
    rejectedTitle: 'O pedido não foi aceite pelo servidor.',
    rejectedDescription: 'Reveja os dados da consulta e tente novamente.',
  },
  loading: {
    slow: 'Está a demorar mais do que o habitual. O serviço pode estar a arrancar depois de um período sem utilização — pode levar até dois minutos.',
  },
  results: {
    eyebrow: 'Resultado da Avaliação',
    emptyTitle: 'Ainda sem consulta',
    emptyBody:
      'Preencha a província, a cultura e a data pretendida, e seleccione «{action}». A recomendação e os indicadores de apoio à decisão serão apresentados aqui.',
    loadingTitle: 'A avaliar viabilidade…',
    loadingLabel: 'A analisar dados climáticos históricos e indicadores agrícolas...',
    errorTitle: 'Erro na consulta',
    errorNoticeTitle: 'Não foi possível obter a recomendação.',
    reportTitle: 'Relatório da consulta',
    changeData: 'Alterar dados da consulta',
    staleTitle: 'Dados alterados no formulário',
    staleBody:
      'Os dados do formulário foram alterados. Seleccione «{action}» para obter a avaliação com os novos dados.',
    verdict: {
      FAVORAVEL: {
        title: 'Favorável para semeadura',
        description:
          'Segundo os indicadores desta consulta, o serviço classifica as condições como favoráveis à sementeira. É uma indicação de apoio à decisão, não uma garantia de germinação nem de colheita.',
      },
      AGUARDAR: {
        title: 'Aguardar antes de semear',
        description:
          'Segundo os indicadores desta consulta, o serviço ainda não classifica as condições como favoráveis à sementeira e indica que é preferível aguardar. Pode voltar a consultar mais tarde.',
      },
      DESFAVORAVEL: {
        title: 'Não recomendado / Desfavorável',
        description:
          'Segundo os indicadores desta consulta, o serviço classifica as condições como desfavoráveis à sementeira neste período. Antes de decidir, confirme as condições no terreno e, se possível, com um técnico de extensão agrícola.',
      },
      missingDescription:
        'O serviço não enviou o estado desta avaliação. Nenhuma classificação é assumida.',
      unknownDescription:
        'O serviço devolveu um estado que a plataforma não reconhece («{value}»). É apresentado sem interpretação.',
    },
    confidence: 'Nível de Confiança',
    confidenceUnavailable: 'Não disponível',
    // Espaço não separável (U+00A0) antes de «·»: o separador nunca começa uma linha.
    confidenceCaption: 'Pontuação de confiança do sistema · Não representa uma probabilidade',
    indicatorsTitle: 'Indicadores Agroclimáticos Chave',
    rainRecent: {
      label: 'Chuva Recente',
      caption: 'Precipitação recente ou média histórica da época',
    },
    rootMoisture: {
      label: 'Humidade da Raiz',
      caption: 'Água disponível na zona radicular do solo',
    },
    forecastRain: {
      label: 'Chuva Prevista',
      caption: 'Expectativa para os próximos 7 dias',
    },
    recommendationTitle: 'Recomendação do serviço de avaliação',
    recommendationSubtitle:
      'Texto gerado automaticamente a partir dos indicadores do serviço, podendo recorrer a inteligência artificial.',
    detailsSummary: 'Ver detalhes e verificações agronómicas adicionais do modelo',
    triggersLabel: 'Gatilhos identificados: ',
    fallback: {
      confirmedTitle: 'Dados meteorológicos alternativos',
      confirmedBody:
        'Segundo a avaliação técnica, os dados meteorológicos em tempo real (Open-Meteo) não estavam disponíveis para esta consulta e foi usada climatologia histórica ou sazonal como alternativa. Não foi possível confirmar se os indicadores da recomendação usaram a mesma origem; por isso, os valores apresentados podem não corresponder a observações actuais.',
      confirmedBodyAssessment:
        'Segundo a avaliação técnica, os dados meteorológicos em tempo real (Open-Meteo) não estavam disponíveis para esta consulta e foi usada climatologia histórica ou sazonal como alternativa. A avaliação técnica não indica quais dos seus indicadores usaram essa alternativa; por isso, os valores apresentados podem não corresponder a observações actuais.',
      unconfirmedTitle: 'Origem dos dados por confirmar',
      evaluateUnavailable:
        'A avaliação técnica não está disponível, por isso não foi possível confirmar se foram usados dados meteorológicos em tempo real ou alternativos.',
      notIndicated:
        'A avaliação técnica não indicou se foram usados dados meteorológicos em tempo real ou alternativos.',
    },
    divergence: {
      recommendation: 'Recomendação',
      assessment: 'Avaliação técnica',
      field: 'Campo',
      status: 'Estado',
      confidence: 'Nível de confiança',
      tableCaption: 'Valores diferentes entre a recomendação e a avaliação técnica',
      statusTitle: 'A recomendação e a avaliação técnica indicam estados diferentes',
      statusBody:
        'Os dois resultados são apresentados tal como foram recebidos do serviço; a plataforma não escolhe entre eles. Antes de decidir, considere ambos e, se possível, confirme as condições no terreno.',
      valuesTitle: 'Os estados coincidem, mas alguns valores são diferentes',
      valuesBody:
        'A recomendação e a avaliação técnica indicam o mesmo estado, mas devolveram valores diferentes nos campos abaixo. Ambos são apresentados sem alterações.',
      notComparableTitle: 'Não foi possível comparar todos os valores',
      notComparableBody:
        'Um dos resultados não incluiu estes campos, por isso não foram comparados: {fields}. Isto não significa que os valores coincidam.',
      assessmentUnavailableTitle: 'Avaliação técnica indisponível',
      assessmentUnavailableBody:
        'Não foi possível obter a avaliação técnica, por isso a recomendação é apresentada sem essa comparação.',
      recommendationUnavailableTitle: 'Recomendação indisponível',
      recommendationUnavailableBody:
        'Não foi possível obter a recomendação. Mostramos abaixo apenas a avaliação técnica, identificada como tal; sem a recomendação, não é possível comparar os dois resultados.',
      assessmentStatusLabel: 'Estado segundo a avaliação técnica',
    },
    sourceLanguage: {
      recommendationTitle: 'A recomendação detalhada ainda não está disponível em Português.',
      justificationsTitle: 'As justificações técnicas ainda não estão disponíveis em Português.',
      body: 'Este texto é produzido pelo serviço de avaliação noutro idioma e ainda não foi traduzido. O texto original está disponível abaixo, para consulta.',
      viewOriginal: 'Ver o texto original ({language})',
    },
  },
  notFound: {
    eyebrow: 'Erro 404',
    title: 'Página não encontrada',
    body: 'O endereço que procurou não existe ou foi alterado.',
    cta: 'Ir para a página inicial',
  },
  languageNames: {
    en: 'inglês',
    pt: 'português',
  },
};

export default pt;
