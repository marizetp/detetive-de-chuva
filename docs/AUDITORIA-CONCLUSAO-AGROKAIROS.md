# Auditoria de conclusão — AgroKairos (frontend)

**Data:** 15 de novembro de 2026
**Estado auditado:** branch `feat/aurora-blue-identity`, commit `6c333fc` (precedido de `fc4a612`, `168a911`, `e8eb058`)
**Backend:** inacessível durante esta auditoria. Não foi feito nenhum pedido à API.
**Documentos de base:** `docs/docs2.md` (API v1.1), `docs/especificacao-funcional.pdf`, `docs/DECISOES-ARQUITECTURAIS-API.md`, `docs/frontend.md`, `docs/API-INTEGRATION.md`, `docs/backend-api.md`, `README.md`, `CLAUDE.md`

### Etiquetas usadas

| Etiqueta | Significado |
|---|---|
| **[Doc]** | Documentado num dos documentos de base |
| **[Código]** | Verificado no código ou nos testes do commit `6c333fc` |
| **[Obs 15-11]** | Observado em pedidos reais à API em 15 de novembro de 2026 (auditoria anterior). Não é contrato |
| **[Inferência]** | Conclusão técnica não confirmada |

---

## 1. Resumo executivo

O frontend está **funcionalmente completo para o fluxo de consulta**:
- formulário;
- pedidos paralelos a `/advisory` e `/evaluate`;
- relatório com divergências, dados alternativos e erros por fonte;
- interface bilingue;
- identidade Aurora Blue;
- 322 testes a passar e build de produção a funcionar.

**O que impede concluir e apresentar o produto não é código em falta, é a dependência de um backend que neste momento não responde.** Sem a API, a aplicação publicada mostra o formulário mas não carrega províncias nem culturas e não produz relatórios. Faz isto de forma correcta: com mensagens de erro e nova tentativa, sem inventar nada.

Para concluir sem o programador backend, a equipa precisa de resolver três coisas:

1. **Preservar a única evidência real da API v1.1:** 50 respostas gravadas a 15 de novembro, hoje numa pasta temporária fora do projecto. Sem elas, não há forma de testar a integração v1.1 enquanto o backend estiver em baixo.
2. **Decidir como demonstrar o produto sem backend.** A opção segura é um **modo de demonstração explícito**, que reproduz apenas respostas reais gravadas, com uma etiqueta permanente e visível de que não são dados actuais. É compatível com o `CLAUDE.md` §6: dados de demonstração identificados e isolados dos serviços de produção.
3. **Alinhar a documentação com o produto real.** README, `CLAUDE.md` e `docs/frontend.md` contradizem o código em pontos concretos: regra das datas futuras, estrutura do relatório e fonte do contrato da API.

As funcionalidades novas da API v1.1 (janela de plantio, motor IMERG, linha de base de 25 anos) **não são necessárias para concluir o produto actual**. O motor IMERG está bloqueado por razões externas: não há dados observados da época actual, e a sua autoridade face ao `/advisory` não está definida. A janela de plantio é implementável a partir da documentação, mas não pode ser verificada enquanto o backend estiver em baixo.

---

## 2. Estado actual do projecto

| Área | Estado | Evidência |
|---|---|---|
| Identidade visual Aurora Blue, tipografia, animações | Concluída e aprovada | Commits `fe15e8b`, `e8eb058`; `CLAUDE.md` §7 |
| Interface bilingue (EN predefinido, PT) | Concluída | Commit `168a911`; `frontend/src/i18n/` |
| Página inicial, consulta, relatório, 404 | Concluídos | `pages/`, `components/` |
| Integração v1.1 (fase 1): 5 culturas, erros por código, falhas parciais, divergências, dados alternativos, divulgação de IA | Concluída | Commit `fc4a612` |
| Nome AgroKairos | Concluído | Commit `6c333fc` |
| Testes | 322 em 28 ficheiros, todos a passar | `npx vitest run` |
| ESLint | 4 erros já existentes (variáveis sem uso) | `npx eslint .` |
| Build | Passa; JS 442 kB (134 kB gzip), CSS 46 kB (9 kB gzip) | `npx vite build` |
| Publicação | Netlify configurado (`netlify.toml`, `public/_redirects`); sem cabeçalhos de segurança | — |
| Backend | Inacessível; nenhuma resposta disponível neste momento | — |
| Documentos de trabalho fora do Git | `docs2.md`, `especificacao-funcional.pdf`, `DECISOES-ARQUITECTURAIS-API.md` e este documento | `git status` |

---

## 3. Matriz de requisitos

**Estados:** Implementado · Parcial · Em falta · Bloqueado (depende de algo externo).

### 3.1 Produto actual (`docs/frontend.md` §3 e §10, `CLAUDE.md`)

| Requisito | Fonte | Estado | Observação |
|---|---|---|---|
| Página inicial com explicação e chamada à acção | frontend.md §3 | Implementado | — |
| Províncias e culturas carregadas da API | frontend.md §3, §10 | Implementado | Depende do backend em tempo real |
| Data da consulta | frontend.md §3; `CLAUDE.md` §11 | **Parcial: contradição** | O código e o docs2 (§3) aceitam datas futuras; `CLAUDE.md` §11, `docs/frontend.md` §11 e o README dizem «só hoje ou passado» |
| Município opcional | docs2 §3 | Implementado | Lista fixa no frontend (`data/municipalities.js`); a API não tem catálogo de municípios [Doc] e aceita qualquer valor [Obs 15-11] |
| Estado, confiança `N/100` com legenda, três métricas | frontend.md §3, §7; `CLAUDE.md` §11 | Implementado | — |
| Recomendação Markdown renderizada com segurança | frontend.md §3; `CLAUDE.md` §5 | Implementado | `react-markdown` com `skipHtml` e lista de elementos permitidos |
| Carregamento, erro, vazio, nova tentativa | frontend.md §10 | Implementado | Por fonte; respeita `canRetry` |
| `/advisory` e `/evaluate` independentes, divergências visíveis | `CLAUDE.md` §11; docs2 §6.4 | Implementado | — |
| Aviso de dados alternativos | docs2 §3 | Implementado | Atribuído à avaliação técnica |
| Interface bilingue com `lang` correcto | `CLAUDE.md` §11 | Implementado | — |
| Texto do backend em inglês | `CLAUDE.md` §11 (fase 5 do i18n) | **Parcial** | docs2 documenta `lang` em `/advisory`; o frontend não o envia. Em inglês, o texto aparece em português atrás de um painel |
| Divulgação de IA e créditos de dados | docs2 §6.6 | **Parcial** | Divulgação estática nos dicionários; `/compliance` não é consultado |
| Mobile e desktop, teclado, foco, contraste | frontend.md §9 | Implementado | Verificado a 320, 768 e 1280px nas fases anteriores |
| Nenhum dado fictício apresentado como real | `CLAUDE.md` §6 | Implementado | — |

### 3.2 Funcionalidades da API v1.1 (`docs/docs2.md`)

| Funcionalidade | Endpoint | Estado | Motivo |
|---|---|---|---|
| Recomendação em inglês | `POST /advisory` com `lang` | Em falta | Decisão pendente (secção 6, D3) |
| Janela de plantio por época | `GET /api/v1/optimal-planting` | Em falta | `docs/frontend.md` §8 manda esperar por confirmação. O docs2 traz um exemplo de esquema, mas a resposta real diferiu em `previsao_sazonal_6m` [Obs 15-11] |
| Linha de base de 25 anos e tendências Mann-Kendall | `GET /api/v1/baseline/{provincia}` | Em falta | Os gráficos exigem aprovar uma dependência (Recharts); a página inicial diz «em preparação» |
| Conformidade dinâmica | `GET /compliance`, `/fontes/saude` | Em falta | Só em inglês; a divulgação estática cobre o essencial |
| Estado do serviço | `GET /health` | Em falta | `getHealth` e `mapHealthResponse` existem mas não são usados [Código] |

### 3.3 Especificação funcional (motor IMERG)

| Funcionalidade | Endpoint | Estado | Motivo |
|---|---|---|---|
| Decisão PLANTAR / AGUARDAR / SEM CONCLUSÃO | `/zonas/{z}/decisao` | **Bloqueado** | (a) Não há observado IMERG da época actual: responde sempre SEM CONCLUSÃO para datas actuais [Obs 15-11]. (b) A autoridade face ao `/advisory` não está definida (`DECISOES-ARQUITECTURAIS-API.md`, Q1) |
| Risco de falsa partida (k de n épocas, IC90) | `/zonas/{z}/curva-risco` | Bloqueado | Igual; com dados só para datas de arquivo (2024/25) |
| Falsa partida identificada | `/zonas/{z}/falsa-partida` | Bloqueado | Igual |
| Indicadores complementares «não entram na decisão» | `/zonas/{z}/indicadores` | Bloqueado | Valores `null` para datas actuais |
| Previsão meteorológica separada | `/zonas/{z}/previsao` | **Bloqueado** | Respondia 500 em todos os casos [Obs 15-11] |
| Abordagens B, C e D, CHIRPS3, código de início confirmado | — | Fora do âmbito | Marcadas «Futuro» na especificação; não implementadas no backend |

### 3.4 Requisitos contraditórios ou ambíguos

| # | Contradição | Fontes | Resolução proposta |
|---|---|---|---|
| C1 | Datas futuras: permitidas ou não | Código e docs2 §3 permitem; `CLAUDE.md` §11, `docs/frontend.md` §11 e README proíbem | Seguir o docs2, que é o contrato mais recente, e o comportamento já aprovado na interface («hoje ou qualquer data futura»). Actualizar os três documentos (P1.4) |
| C2 | Fonte única da decisão | Especificação: o motor IMERG; `CLAUDE.md` §11: `/advisory` | Manter `/advisory` no produto actual; o motor não é integrado até haver esclarecimento (`DECISOES-ARQUITECTURAIS-API.md`, Q1) |
| C3 | Códigos `AGUARDAR_*` do motor | docs2 §5 e especificação §4 listam códigos diferentes | Só relevante se o motor for integrado; bloqueado |
| C4 | Contrato de referência da API | `CLAUDE.md` §3 aponta para `backend-api.md` (v1.0); o contrato actual é `docs2.md` (v1.1), fora do Git | Versionar o `docs2.md` e actualizar o `CLAUDE.md` §3 (P0.3) |
| C5 | Cores dos estados | docs2 §6.5 sugere outras cores | **Ignorar:** a identidade visual está congelada (`CLAUDE.md` §7) |
| C6 | «Nunca 0%» | docs2 §6.1 e especificação §9 vs `risco_falsa_partida.probabilidade_pct: 0.0` [Obs 15-11] | Só relevante para a janela de plantio: mostrar sempre com IC90 e frequência, nunca isolado |

---

## 4. Problemas identificados

### 4.1 Integração com o backend

| # | Problema | Gravidade | Evidência |
|---|---|---|---|
| I1 | Sem backend, nenhuma consulta funciona e não há alternativa de demonstração | **Crítica** | Arquitectura: `services/api.js` só fala com a API real |
| I2 | A evidência real da v1.1 (50 respostas de 15 de novembro) só existe numa pasta temporária do sistema | **Crítica** | Fora do repositório; pode perder-se |
| I3 | As fixtures dos testes são de 12 de novembro (v1.0): 3 culturas, sem os campos v1.1 das províncias e culturas, sem os novos códigos de `triggers_ativados` | Alta | `test/fixtures/liveResponses.js` (`RECORDED_ON = '2026-11-12'`) |
| I4 | O `lang` documentado não é enviado ao `/advisory` | Média | `utils/validators.js` (`buildConsultationPayload`) |
| I5 | `GET /health` não é usado: o arranque a frio (~50 s) só se nota depois de o utilizador submeter | Média | `services/catalog.js`; README |
| I6 | Contratos assumidos e não documentados: esquema de `detalhes_agroclimaticos`, lista completa de `triggers_ativados`, formato dos corpos de erro, situações que dão 400 nos POST, âmbito de `is_fallback_weather` | Média | `DECISOES-ARQUITECTURAIS-API.md` |
| I7 | O backend aceita entradas inválidas (cultura «Batata», data 2026-02-30, município arbitrário) | Baixa para o frontend | [Obs 15-11]. A validação local impede-as a partir da interface |

### 4.2 Comunicação científica e de dados

| # | Problema | Risco de interpretação | Onde |
|---|---|---|---|
| S1 | As legendas dos cartões do relatório («Chuva Recente», «Chuva Prevista — Expectativa para os próximos 7 dias») apresentam os valores como observação ou previsão. As descrições da página inicial dizem que «pode ser um valor de referência, e não uma medição». Com `is_fallback_weather: true` (observado em todas as consultas para a data actual) são climatologia | **Estimativa lida como observação ou previsão.** Atenuado pelo aviso de dados alternativos, mas o cartão sozinho induz em erro | `results.rainRecent.caption`, `results.forecastRain.caption` |
| S2 | As justificações técnicas aparecem tal como recebidas e podem conter linguagem causal ou absoluta. Exemplo observado: «causará perda de 100% dos recursos» | Avaliação técnica lida como certeza | `TechnicalDetails` em `ResultsArea.jsx` |
| S3 | O texto da recomendação (gerado) pode conter afirmações não suportadas («Over the past 25 years», «risco reduzido de perdas») | Recomendação lida como definitiva | Atenuado pela divulgação de IA e pelo título neutro; o texto não pode ser reescrito |
| S4 | Consultas de datas futuras mostram o veredito como se fosse actual; não há indicação própria de que os indicadores de uma data futura são de referência | Planeamento lido como previsão | Só o aviso de dados alternativos (se o `/evaluate` o indicar) cobre este caso |
| S5 | Textos científicos em inglês e descrições dos estados aguardam revisão humana | Formulação não validada | `i18n/reviewRequired.js` (49 chaves e 5 culturas) |

### 4.3 Técnicos

| # | Problema | Gravidade | Evidência |
|---|---|---|---|
| T1 | README desactualizado: diz «data (hoje ou anterior)» e «relatório em cinco secções»; não menciona i18n, v1.1, culturas novas nem o modelo de erros | Alta para a apresentação | `README.md`, secção «Funcionalidades» |
| T2 | Documentos fonte fora do Git (`docs2.md`, PDF, decisões, auditoria) | Alta | `git status` |
| T3 | 6 componentes de resultados sem uso, e utilitários e etiquetas portuguesas usados só por eles | Média (manutenção) | `IndicatorsSection`, `RecommendationSection`, `ReportContents`, `SummarySection`, `TechnicalSection`, `TransparencySection`; `DivergenceNotice`, `SourceError`, `StatusDisplay`, `MissingValue`, `SourceLabel`, `ReportSection`, `reportStructure.js`, `config/fieldLabels.js`, `describeIssues`/`selectSummarySource` |
| T4 | 4 erros de ESLint (variáveis sem uso, incluindo o `today` em `validators.js`, que sobrou de quando as datas futuras eram rejeitadas) | Baixa | `npx eslint .` |
| T5 | Sem cabeçalhos de segurança na publicação (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) | Média | `netlify.toml` |
| T6 | Sem favicon (o pedido a `/favicon.ico` dá 404) nem metadados Open Graph; a meta description é estática em inglês | Baixa | `frontend/index.html`, `frontend/public/` |
| T7 | Bundle JS único de 134 kB gzip (inclui `react-markdown`) | Baixa | Aceitável para o âmbito; só precisa de optimização se o desempenho em redes lentas for requisito |
| T8 | `docs/API-INTEGRATION.md` descreve a v1.0 (observações de 12 de novembro) | Média | — |
| T9 | Sem testes de ponta a ponta nem medição de cobertura (exigem dependências novas) | Baixa | `package.json` |

**Sem problemas encontrados em:**
- gestão de estado: hooks locais, sem bibliotecas, adequada ao tamanho;
- segurança do conteúdo: Markdown sem HTML, ligações com `noopener`, sem segredos, `VITE_API_BASE_URL` validado;
- acessibilidade: ligação de salto, gestão de foco, `aria-live`, `lang` por conteúdo, movimento reduzido;
- responsividade: verificada nas fases anteriores.

---

## 5. Limitações relacionadas com o backend

| Dependência | Classificação | Consequência e tratamento |
|---|---|---|
| Disponibilidade da API para qualquer consulta | **Resolúvel com adaptação** (demonstração) / **Bloqueio externo** (uso real) | Um modo de demonstração por reprodução de respostas reais gravadas permite apresentar o fluxo sem inventar dados. Não substitui o uso real: só cobre os pedidos que foram gravados |
| Arranque a frio (~50 s) | Resolúvel no frontend | Pedir `GET /health` ao abrir a página de consulta para «acordar» o serviço e mostrar o seu estado |
| Texto da recomendação em inglês | Resolúvel no frontend | Enviar `lang` (documentado). Exige decidir como tratar a falta do original em português (D3) |
| Justificações e textos do motor só em português | Bloqueio externo | Mantém-se o painel do original; só o backend pode traduzir |
| Âmbito de `is_fallback_weather`; mesma origem de dados nos dois endpoints | Bloqueio externo (informação) | Tratado de forma prudente (`DECISOES-ARQUITECTURAIS-API.md`, Q2); sem alterações |
| Autoridade entre `/advisory`, `/evaluate` e o motor | Bloqueio externo (decisão) | `/advisory` mantém-se como recomendação (Q1) |
| Motor IMERG com dados actuais | **Bloqueio externo** (dados IMERG Late da época) | Não é resolúvel pelo frontend nem por um backend próprio sem os dados e sem validação |
| Janela de plantio, linha de base | Resolúvel no frontend com risco | Implementável a partir do docs2 e das respostas gravadas, mas não verificável ao vivo até o backend voltar |
| Backend próprio que substitua o actual | **Exige backend próprio — não recomendado** | Implicaria reimplementar regras e cálculos científicos fora do motor auditado, o que contraria a especificação («o motor é a única fonte da decisão»; «o backend não recalcula probabilidades») e o `CLAUDE.md` §6. Só seria aceitável instalar o **mesmo** backend (código original, sem alterações) noutro alojamento, e não é possível determinar se a equipa tem acesso a esse código |

**Consequências do modo de demonstração para a arquitectura e a integridade dos dados:**
- **Isolamento:** um adaptador em `services/` substitui `requestJson` só quando o modo é activado explicitamente (por exemplo, `VITE_DEMO_MODE=true`). Não existe nos builds de produção normais e nunca liga sozinho quando a API falha.
- **Só respostas reais:** cada resposta reproduzida é uma resposta real gravada, sem alterações, com a data de gravação.
- **Pedidos não gravados:** devolvem um erro explícito («não disponível no modo de demonstração»), nunca uma resposta aproximada.
- **Etiqueta permanente:** uma faixa visível em todas as páginas indica «Modo de demonstração: respostas reais gravadas em [data]; não são dados actuais».
- **Integridade:** os valores são reais mas datados. O risco é serem lidos como actuais, e a faixa e a data no relatório existem para o evitar.

---

## 6. Decisões que a equipa pode tomar autonomamente

Todas são reversíveis, não inventam comportamento do backend e preservam os dados. As marcadas com **(aprovar)** mudam um comportamento já aprovado e precisam de confirmação explícita.

| # | Decisão | Fundamento |
|---|---|---|
| D1 | Versionar as respostas reais de 15 de novembro como fixtures v1.1, com registo de origem (data, pedido, método) | Preserva a única evidência da v1.1 |
| D2 | Criar o modo de demonstração por reprodução, isolado e etiquetado **(aprovar)** | `CLAUDE.md` §6 permite dados de demonstração identificados e isolados |
| D3 | Enviar `lang` ao `/advisory`; em inglês, mostrar o texto gerado em inglês identificado como «gerado em inglês pelo serviço» e retirar o painel do original para a recomendação (o texto inglês é ele próprio um original, não uma tradução) **(aprovar)** | docs2 §3. Muda a regra aprovada do «original disponível», por isso exige confirmação |
| D4 | Pedir `GET /health` ao abrir a consulta, para acordar o serviço e mostrar o estado | Endpoint documentado; não altera dados |
| D5 | Seguir o docs2 nas datas futuras e corrigir a documentação | O docs2 é o contrato mais recente; a interface já o aplica |
| D6 | Versionar `docs2.md`, a especificação, as decisões e esta auditoria; fazer do `docs2.md` a referência da API no `CLAUDE.md` §3 **(aprovar: ficheiros hoje deliberadamente fora do Git)** | Fonte de verdade rastreável |
| D7 | Legendas dos cartões do relatório alinhadas com as descrições da página inicial («valor indicado pelo serviço; pode ser um valor de referência») | Coerência com textos já aprovados; requer revisão científica |
| D8 | Identificar as justificações técnicas como «texto do serviço, apresentado sem alterações» | Transparência; não altera o texto |
| D9 | Remover os componentes antigos sem uso | Já identificados; a limpeza foi adiada para uma tarefa própria **(aprovar)** |
| D10 | Cabeçalhos de segurança no Netlify, favicon a partir da marca existente e metadados Open Graph | Sem impacto funcional nem visual na interface |
| D11 | Não integrar o motor IMERG, a janela de plantio nem a linha de base para a conclusão | Não são necessários para o produto actual; os dois últimos podem ser uma fase seguinte |

---

## 7. Plano de conclusão

### P0 — Bloqueadores da conclusão

| ID | Problema | Solução | Dependências | Ficheiros / módulos | Critério de conclusão |
|---|---|---|---|---|---|
| P0.1 | Evidência v1.1 só numa pasta temporária (I2) | Copiar as 50 respostas gravadas para `frontend/src/test/fixtures/v1.1/`, com um `PROVENIENCIA.md` (data, pedido exacto, código HTTP, observações). Excluir as respostas a pedidos inválidos de propósito e as do cliente com codificação errada, ou marcá-las como tal | Nenhuma | `test/fixtures/v1.1/` | Ficheiros no repositório; cada resposta associada ao seu pedido e à data 2026-11-15 |
| P0.2 | Produto não demonstrável sem backend (I1) | Modo de demonstração por reprodução (D2): adaptador em `services/`, activado só por variável de ambiente, faixa permanente bilingue, erro explícito para pedidos não gravados | P0.1; aprovação de D2 | `services/api.js` (ponto de injecção), novo `services/demoReplay.js`, `config/env.js`, faixa no layout (componentes existentes), dicionários | Com o modo activo, uma consulta gravada produz o relatório completo com a faixa visível; uma consulta não gravada mostra «não disponível no modo de demonstração»; com o modo desactivado, nenhum código de demonstração entra no comportamento; testes para os três casos |
| P0.3 | Fontes de verdade fora do Git e contrato de referência desactualizado (T2, C4) | Versionar os documentos de trabalho (D6); `CLAUDE.md` §3 passa a indicar o `docs2.md` como contrato da API v1.1 | Aprovação de D6 | `docs/`, `CLAUDE.md` | `git status` sem documentos de referência por versionar; `CLAUDE.md` §3 actualizado |

### P1 — Essencial

| ID | Problema | Solução | Dependências | Ficheiros / módulos | Critério de conclusão |
|---|---|---|---|---|---|
| P1.1 | Fixtures v1.0 nos testes (I3) | Testes de mapeamento e do relatório também com as fixtures v1.1 (5 culturas, campos extra de províncias e culturas, novos `triggers_ativados`, `is_fallback_weather: true`) | P0.1 | `utils/mappers.test.js`, `ResultsArea.*.test.jsx`, `catalogNames.test.js` | Testes passam com as duas gerações de fixtures |
| P1.2 | Arranque a frio invisível (I5) | `GET /health` ao abrir a consulta (D4), com uma indicação discreta de «a ligar ao serviço» / «serviço indisponível» através de `InlineNotice` | Nenhuma | `pages/ConsultationPage.jsx`, novo hook `useServiceHealth`, `services/catalog.js`, dicionários | Testes: serviço disponível, a arrancar, indisponível e erro de ligação, nos dois idiomas; sem bloquear o formulário |
| P1.3 | Legendas dos indicadores e atribuição das justificações (S1, S2) | D7 e D8: novos textos nos dois dicionários, marcados para revisão científica | Aprovação dos textos | `i18n/messages/*.js`, `reviewRequired.js`, `ResultsArea.jsx` | Textos aprovados; nenhum cartão sugere observação ou previsão sem ressalva; testes |
| P1.4 | Documentação contraditória ou desactualizada (T1, C1, T8) | Actualizar o README (funcionalidades reais, i18n, v1.1, modo de demonstração), a regra das datas no `CLAUDE.md` §11 e no `docs/frontend.md` §11, e passar o `docs/API-INTEGRATION.md` à v1.1, com remissão para `DECISOES-ARQUITECTURAIS-API.md` | P0.3 | `README.md`, `CLAUDE.md`, `docs/frontend.md`, `docs/API-INTEGRATION.md` | Nenhuma afirmação documental contradiz o código |
| P1.5 | Recomendação em português na interface inglesa (I4) | D3, se aprovada: `lang` no corpo do `/advisory`; `localizedContent` por fonte; o `/evaluate` mantém o painel do original | Aprovação de D3 | `utils/validators.js`, `services/consultation.js`, `utils/localizedContent.js`, `SourceLanguageContent.jsx`, testes | Em inglês, o texto da recomendação vem em inglês e está identificado; em português nada muda; as justificações continuam com o painel |
| P1.6 | Revisão científica humana pendente (S5) | Sessão de revisão das 49 chaves e 5 culturas; registar o resultado | Pessoa da equipa com competência agronómica | `i18n/reviewRequired.js`, dicionários | Lista revista e aprovada (ou alterada) e registada; ou, explicitamente, «revisão pendente» assumida na apresentação |

### P2 — Qualidade e robustez

| ID | Problema | Solução | Dependências | Ficheiros / módulos | Critério de conclusão |
|---|---|---|---|---|---|
| P2.1 | Componentes e utilitários antigos sem uso (T3) | Remover depois de aprovado (D9), incluindo as etiquetas portuguesas só usadas por eles | Aprovação de D9 | `components/results/*` antigos, `config/fieldLabels.js`, partes de `utils/report.js` e `utils/divergences.js` | Nenhum módulo sem uso; testes e build passam |
| P2.2 | 4 erros de ESLint (T4) | Remover importações e variáveis sem uso, sem alterar comportamento | P2.1 (alguns ficheiros sobrepõem-se) | `ResultsArea.test.jsx`, `ConsultationPage.test.jsx`, `validators.js` | `npx eslint .` sem erros |
| P2.3 | Consultas de datas futuras (S4) | Nota informativa quando `data_consulta` é futura: os indicadores podem ser valores de referência e não previsão para essa data. Texto para revisão científica | Aprovação do texto | `ResultsArea.jsx`, dicionários | Nota visível só para datas futuras; testes nos dois idiomas |
| P2.4 | Sem cabeçalhos de segurança (T5) | `[[headers]]` no `netlify.toml`: CSP com `connect-src` para o URL da API, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'` | Nenhuma | `netlify.toml` | Cabeçalhos presentes no deploy de pré-visualização; aplicação funcional com CSP activa |
| P2.5 | Favicon e metadados (T6) | Favicon SVG a partir da marca existente (lupa com gota), `og:title`/`og:description`, `twitter:card` | Nenhuma | `frontend/public/`, `index.html` | Sem 404 do favicon; pré-visualização de partilha correcta |

### P3 — Opcional (fase seguinte)

| ID | Funcionalidade | Solução | Dependências | Critério de conclusão |
|---|---|---|---|---|
| P3.1 | Janela de plantio | Serviço, mapper tolerante e secção própria a partir do docs2 §4 e das respostas gravadas; climatologia, risco (com IC90 e «k de n épocas») e previsão sazonal em blocos separados | Backend disponível para verificar; confirmação de `docs/frontend.md` §8 | Funcionalidade verificada contra respostas reais actuais |
| P3.2 | Linha de base e tendências | Médias mensais e Mann-Kendall com significância (`significativo_alfa_005`); gráficos | Aprovação de uma biblioteca de gráficos | Dados reais apresentados sem inferência causal |
| P3.3 | Motor IMERG | Decisão por `codigo`, curva de risco e falsa partida em blocos rotulados | Fim dos bloqueios externos (dados actuais, autoridade, códigos `AGUARDAR_*`) | — |
| P3.4 | Conformidade dinâmica | Consultar `/compliance` | Versão portuguesa ou tratamento do texto só em inglês | — |
| P3.5 | Testes E2E e cobertura | Playwright e `@vitest/coverage-v8` | Aprovação das dependências | Fluxo principal coberto por E2E |
| P3.6 | Divisão do bundle | Carregar `react-markdown` só no relatório | Nenhuma | Bundle inicial menor, sem regressões |

### Ordem e dependências

```
P0.1 ──► P0.2 ──► (apresentação possível sem backend)
  │
  └──► P1.1
P0.3 ──► P1.4
P1.2, P1.3, P1.5 (independentes entre si; P1.3 e P1.5 dependem de aprovação)
P2.1 ──► P2.2
P1.6 em paralelo com tudo o resto (revisão humana)
```

---

## 8. Critérios de aceitação para considerar o projecto concluído

O AgroKairos (frontend) está concluído quando se cumprem todos:

1. **Fluxo real:** com o backend disponível, uma consulta completa (província, cultura, data) produz o relatório com as duas fontes, divergências, dados alternativos e erros tratados, nos dois idiomas.
2. **Sem backend:**
   - a aplicação publicada comunica a indisponibilidade de forma clara;
   - se o modo de demonstração estiver aprovado e activo, só mostra respostas reais gravadas, com a faixa de demonstração e a data sempre visíveis.
3. **Integridade de dados:** nenhum valor é inventado, aproximado ou apresentado como actual sem o ser. Verificado por testes e por revisão do modo de demonstração.
4. **Comunicação científica:**
   - os textos de `reviewRequired.js` estão revistos, ou a revisão pendente está assumida explicitamente;
   - nenhum cartão apresenta uma estimativa como observação sem ressalva;
   - nenhuma recomendação é atribuída a um agrónomo.
5. **Qualidade:** todos os testes passam, o build passa e o ESLint não tem erros (ou os erros restantes estão aceites e registados).
6. **Interface:**
   - verificação visual a 320, 768 e 1280px nos dois idiomas, nas quatro páginas e no menu do telemóvel;
   - sem scroll horizontal;
   - identidade Aurora Blue intacta.
7. **Acessibilidade:** navegação completa por teclado, foco visível, `lang` correcto no documento e nos conteúdos noutro idioma.
8. **Documentação:**
   - README, `CLAUDE.md` e `docs/` coerentes com o código;
   - contrato v1.1 versionado;
   - decisões e limitações registadas.
9. **Publicação:** deploy Netlify com redirecionamento SPA, cabeçalhos de segurança e variáveis de ambiente documentadas.
10. **Limitações declaradas:** o que depende do backend (motor IMERG, tradução das justificações, âmbito dos dados alternativos) está registado e visível para quem avalia o projecto.

---

## Actualização de 15/11/2026 (após `ae46675`)

Esta secção acrescenta o estado do plano depois dos commits posteriores à auditoria. **O texto
original acima não foi alterado:** é o retrato do commit `6c333fc`.

**Commits desde a auditoria:**
- `ae46675` — `feat: add isolated API demo mode with recorded responses`.
- O commit documental D6 está em preparação.

**Estado do repositório depois de `ae46675`:**
- 358 testes a passar (eram 322);
- build de produção igual byte a byte ao anterior;
- 4 erros de ESLint já existentes;
- branch linear sobre `origin/main` (6 commits à frente, 0 atrás, confirmado por `git fetch` em 15/11).

### Decisões (secção 6)

| # | Decisão | Estado |
|---|---|---|
| D1 | Versionar as respostas reais de 15/11 | **Concluída** (`ae46675`) |
| D2 | Modo de demonstração | **Concluída** (`ae46675`) |
| D3 | Enviar `lang` ao `/advisory` | **Adiada** por decisão do responsável do projecto. Mantêm-se o comportamento actual e o painel do original em português |
| D4 | `GET /health` ao abrir a consulta | Pendente (P1.2) |
| D5 | Seguir o docs2 nas datas futuras e corrigir a documentação | Pendente (P1.4) |
| D6 | Versionar documentos de referência | **Em curso.** `docs2.md`, `DECISOES-ARQUITECTURAIS-API.md` e esta auditoria são versionados. **`especificacao-funcional.pdf` fica fora do Git:** é um documento interno que menciona um membro da equipa pelo nome, e só será publicado numa versão autorizada. Referências ao contrato actualizadas (`CLAUDE.md`, `README.md`, `docs/backend-api.md`, `docs/API-INTEGRATION.md`, `docs/DEVELOPMENT-GUIDELINES.md`) |
| D7 | Legendas dos indicadores | Pendente (P1.3), com revisão científica |
| D8 | Identificar as justificações técnicas | Pendente (P1.3), com revisão científica |
| D9 | Remover os componentes antigos | **Adiada** por decisão do responsável do projecto |
| D10 | Cabeçalhos de segurança, favicon e metadados | Pendente (P2.4, P2.5) |
| D11 | Não integrar o motor IMERG, a janela de plantio nem a linha de base | Mantida |

### Plano (secção 7)

| ID | Tarefa | Estado |
|---|---|---|
| P0.1 | Preservar a evidência v1.1 | **Concluída.** 50 respostas em `frontend/src/demo/recordings/2026-11-15/`, com manifesto, sha256 e `PROVENIENCIA.md` |
| P0.2 | Modo de demonstração | **Concluída.** Activo só com `VITE_DEMO_MODE=true`; só as 7 respostas elegíveis entram no bundle de demonstração; código e dados ausentes do build de produção; documentado no README e no `.env.example` |
| P0.3 | Fontes de verdade versionadas; contrato de referência | **Em curso (D6)**, com a excepção do PDF acima |
| P1.1 | Testes com fixtures v1.1 | **Parcial.** Os testes de integridade e de reprodução usam as gravações v1.1; os testes de mapeamento e do relatório continuam com as fixtures v1.0 |
| P1.2 | Estado do serviço (`/health`) | Pendente |
| P1.3 | Legendas dos indicadores e atribuição das justificações | Pendente. Os textos serão propostos para revisão científica antes da integração |
| P1.4 | README, regra das datas, `API-INTEGRATION.md` para a v1.1 | Pendente. Nesta etapa só foram actualizadas as referências ao contrato; a regra das datas e a descrição das funcionalidades no README continuam por corrigir |
| P1.5 | `lang` no `/advisory` | **Adiada** (D3) |
| P1.6 | Revisão científica humana | Pendente |
| P2.1 | Remover componentes antigos | **Adiada** (D9) |
| P2.2 | ESLint sem erros | Pendente (4 erros) |
| P2.3 | Nota para consultas de datas futuras | Pendente |
| P2.4 | Cabeçalhos de segurança | Pendente |
| P2.5 | Favicon e metadados | Pendente |
| P3.1–P3.6 | Funcionalidades opcionais | Não iniciadas |

### Problemas da secção 4

| # | Estado |
|---|---|
| I1 (sem demonstração sem backend) | **Resolvido** para apresentação (modo de demonstração). O uso real continua a depender do backend |
| I2 (evidência v1.1 só numa pasta temporária) | **Resolvido** (P0.1) |
| I3 (fixtures v1.0 nos testes) | **Parcial** (P1.1) |
| T2 (documentos fora do Git) | **Em curso** (D6). O PDF fica fora por decisão |
| Restantes | Sem alteração |
