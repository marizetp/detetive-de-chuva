# Decisões arquitecturais da integração com a API v1.1 — AgroKairos

**Data:** 15 de novembro de 2026
**Âmbito:** frontend (`frontend/`), integração com `POST /api/v1/advisory` e `POST /api/v1/evaluate`
**Estado do backend:** inacessível durante esta análise. Nenhuma conclusão deste documento foi obtida por pedidos HTTP feitos nesta data.

## Como ler este documento

Cada afirmação está classificada pela sua origem:

| Etiqueta | Significado |
|---|---|
| **[Doc]** | Facto documentado em `docs/docs2.md` (API v1.1), em `docs/especificacao-funcional.pdf` (documento interno, **não publicado**, fora do Git, pendente de uma versão autorizada para publicação) ou numa decisão registada em `CLAUDE.md` |
| **[Código]** | Comportamento demonstrado pelo código ou pelos testes do frontend (commit `6c333fc`) |
| **[Obs 15-11]** | Comportamento observado em pedidos reais à API de produção em 15 de novembro de 2026, durante a auditoria anterior. É uma observação pontual, não uma garantia de contrato |
| **[Inferência]** | Conclusão técnica que não está documentada nem foi confirmada |
| **[Desconhecido]** | Informação que só o backend pode fornecer |

Estados possíveis de cada decisão:

- **Confirmado:** a decisão assenta em factos documentados e não depende de esclarecimento do backend.
- **Decisão provisória:** a decisão é segura e reversível, mas parte de uma incerteza que o backend deve esclarecer.
- **Bloqueado:** não é possível decidir sem o backend.

---

## Q1 — Autoridade de `/advisory` e `/evaluate`

### Questão

Qual dos dois endpoints é a fonte principal da recomendação apresentada ao utilizador? Qual é o papel de cada um? O que acontece quando um responde e o outro falha? Há fundamento para apresentar `/evaluate` como recomendação principal?

### Evidências documentais

- **[Doc]** `docs2.md` linha 31 classifica `/advisory` como «Date-Specific Agricultural Advisory (Original Core)».
- **[Doc]** `docs2.md` linha 127: `/advisory` «evaluates agronomic viability […] then generates formal farmer extension guidance (`recomendacao_extensao`)».
- **[Doc]** `docs2.md` linha 167: `/evaluate` é uma «deterministic rule evaluation **without LLM narrative generation**. Fast and ideal for compact summaries, divergence checks against `/advisory`, or offline/low-bandwidth mode».
- **[Doc]** `docs2.md` linha 169: o pedido de `/evaluate` é igual ao de `/advisory`.
- **[Doc]** `docs2.md` linha 293: «Separate `/advisory` vs `/evaluate` if both are displayed: Highlight any divergence honestly without overriding either result».
- **[Doc]** `CLAUDE.md` §11 (decisão do responsável do projecto, 2026-11-12):
  - `/advisory` fornece a recomendação principal;
  - `/evaluate` fornece a avaliação técnica complementar;
  - a falha de um não pode bloquear o outro;
  - as divergências são mostradas, nunca reconciliadas.
- **[Doc]** Especificação funcional §1 e §4: «o motor é a única fonte da decisão». Este princípio diz respeito ao motor IMERG (`/zonas/{zona}/decisao`) e não a `/advisory` nem a `/evaluate`.

### Estado do conhecimento

| Tipo | Conteúdo |
|---|---|
| Facto | `/advisory` é o núcleo original e o único que produz a recomendação textual. `/evaluate` é determinístico, compacto e documentado como verificação de divergência e modo de baixa largura de banda |
| Facto | O projecto já atribuiu os papéis (recomendação vs avaliação técnica complementar) |
| Facto | A documentação manda mostrar divergências sem sobrepor um resultado ao outro |
| [Código] | `ResultsArea.jsx` aplica estes papéis. Quando `/advisory` falha e `/evaluate` responde (linha 429), mostra apenas a avaliação técnica, sem o cartão de veredito (`TechnicalAssessmentOnly`, linha 345) |
| [Obs 15-11] | Para os mesmos parâmetros, `/advisory` e `/evaluate` devolveram o mesmo estado. Para Huambo hoje, o motor IMERG respondeu «SEM CONCLUSÃO» enquanto ambos responderam `FAVORAVEL` |
| [Desconhecido] | Se `/advisory` e `/evaluate` partilham a mesma lógica de decisão |
| [Desconhecido] | Qual dos três sistemas (advisory, evaluate, motor) é a fonte de decisão oficial do produto |

### Alternativas consideradas

1. **`/advisory` como principal e `/evaluate` como complementar** (situação actual). Coincide com a documentação e com a decisão do projecto.
2. **`/evaluate` como principal**, por ser determinístico e mais rápido. A documentação descreve-o como resumo e verificação, não como recomendação. Mudaria uma decisão do projecto sem fundamento novo.
3. **Combinar os dois num único resultado.** É proibido pela documentação («without overriding either result») e pelo `CLAUDE.md` §11.
4. **Quando `/advisory` falha, promover `/evaluate` a recomendação.** O «offline/low-bandwidth mode» dá algum apoio a usar `/evaluate` como resumo, mas não como recomendação. Promovê-lo atribuir-lhe-ia uma autoridade que nenhum documento lhe dá.

### Decisão recomendada

**Manter a alternativa 1:**

- `/advisory` é a fonte da recomendação apresentada ao utilizador.
- `/evaluate` é a avaliação técnica complementar.
- Quando só `/evaluate` responde, é apresentado como **avaliação técnica**, com o seu estado, confiança e indicadores identificados como tal, e nunca com o cartão de veredito nem com o título da recomendação.

**Não existe fundamento documental para apresentar `/evaluate` como recomendação principal.** O que a documentação permite é usá-lo como resumo compacto, e é isso que o frontend faz.

### Justificação

- **Fiabilidade:** cada fonte é pedida, tratada e repetida de forma independente. Uma falha nunca esconde a outra.
- **Transparência:** o utilizador sabe sempre de que fonte vem cada valor.
- **Integridade científica:** nenhum resultado é escolhido, combinado ou promovido sem fundamento.
- **Experiência:** num caso de falha, o utilizador continua a ter informação útil, claramente rotulada.

### Comportamento esperado do frontend

| Situação | Comportamento |
|---|---|
| Ambos com sucesso e coincidentes | Recomendação completa; sem aviso de divergência |
| Ambos com sucesso e divergentes | Recomendação completa e aviso com os dois valores lado a lado (estado, confiança, métricas), sem escolher |
| Campos em falta numa das respostas | «Não comparados»; nunca apresentado como concordância |
| `/advisory` com sucesso, `/evaluate` falhou | Recomendação completa; aviso de avaliação técnica indisponível, com nova tentativa própria se o erro o permitir |
| `/advisory` falhou, `/evaluate` com sucesso | Aviso de recomendação indisponível; avaliação técnica rotulada como tal, sem cartão de veredito |
| Ambos falharam | Um aviso de erro por fonte, cada um com a sua nova tentativa |

É o comportamento actual ([Código] `ResultsArea.jsx`; testes em `ResultsArea.sources.test.jsx`). Não exige alterações.

### Riscos e limitações

- **Terceiro sistema de decisão.** O motor IMERG (`/zonas`) pode contradizer os outros dois ([Obs 15-11]). Esta decisão não o abrange: o frontend não o integra. Integrá-lo exige primeiro resolver a autoridade entre os três.
- Se o backend vier a declarar `/evaluate` como fonte oficial, a apresentação do cenário de falha muda. A estrutura actual permite essa mudança sem reescrever a integração.

### Confirmação futura necessária do backend

1. `/advisory` e `/evaluate` usam a mesma lógica de decisão (o mesmo estado e a mesma confiança para os mesmos dados)?
2. Qual é a fonte de decisão oficial do produto: `/advisory`, `/evaluate` ou o motor IMERG (`/zonas/{zona}/decisao`)?
3. Quando `/advisory` falha, o backend considera aceitável apresentar o estado de `/evaluate`, rotulado como avaliação técnica?

### Estado

**Decisão provisória.** Os papéis estão confirmados pela documentação e pela decisão do projecto. A relação com o motor IMERG continua por esclarecer.

---

## Q2 — Proveniência dos indicadores e dados alternativos

### Questão

O que significa `is_fallback_weather`? A que resposta e a que indicadores se aplica? Os indicadores de `/advisory` e `/evaluate` usam a mesma origem meteorológica? Como comunicar o uso de climatologia histórica ou sazonal sem induzir em erro?

### Evidências documentais

- **[Doc]** `docs2.md` linha 170: `is_fallback_weather` faz parte da resposta de `/evaluate`.
- **[Doc]** `docs2.md` linha 171: «If `is_fallback_weather === true`, show a notice that real-time Open-Meteo data was unavailable and historical/seasonal climatology was used as fallback».
- **[Doc]** `docs2.md` §3: a resposta de `/advisory` tem `status`, `score_confianca`, `metricas` e `recomendacao_extensao`. **Não tem `is_fallback_weather`.**
- **[Doc]** `docs2.md` linha 74: Open-Meteo Weather API (previsão a 16 dias) e Open-Meteo Seasonal (6 meses) são fontes meteorológicas complementares.
- **[Doc]** `docs2.md` não diz que fonte alimenta cada métrica (`chuva_acumulada_recente_mm`, `humidade_solo_raiz`, `previsao_7dias_mm`).

### Estado do conhecimento

| Tipo | Conteúdo |
|---|---|
| Facto | O indicador pertence a `/evaluate`; `true` significa que os dados Open-Meteo em tempo real não estavam disponíveis e foi usada climatologia histórica ou sazonal |
| Facto | `/advisory` não declara a origem dos seus dados |
| [Código] | `mapEvaluateResponse` guarda o campo como `isFallbackWeather` (`true`, `false` ou `null`) (`mappers.js` linha 157). `getFallbackStatus` (`report.js` linha 61) devolve `confirmed`, `denied`, `unconfirmed` ou `pending`, sem assumir substituição |
| [Código] | `FallbackNotice` (`ResultsArea.jsx` linha 204) atribui a indicação à avaliação técnica. Usa uma variante própria quando os cartões mostram os indicadores de `/evaluate` |
| [Obs 15-11] | Para os mesmos parâmetros, as métricas de `/advisory` e `/evaluate` foram numericamente iguais. `is_fallback_weather` foi `true` para a data actual |
| [Inferência] | A igualdade numérica sugere uma origem comum, mas não a prova: duas fontes diferentes podem coincidir, e uma observação não define o contrato |
| [Desconhecido] | Se `/advisory` usa os mesmos dados que `/evaluate` para a mesma consulta |
| [Desconhecido] | Que métricas de `/evaluate` usaram a alternativa quando o indicador é `true` |

### Alternativas consideradas

1. **Aplicar o aviso a todos os indicadores mostrados**, incluindo os de `/advisory`. Atribuiria a `/advisory` uma origem que nenhum documento confirma.
2. **Ignorar o indicador quando se mostram os indicadores de `/advisory`.** Esconderia uma informação relevante e documentada, contra a regra do docs2.
3. **Mostrar o aviso atribuído à avaliação técnica, com a ressalva de que a origem dos outros indicadores não está confirmada** (situação actual).

### Decisão recomendada

**Manter a alternativa 3:**

- O aviso diz sempre de onde vem a indicação («Segundo a avaliação técnica…»).
- Quando os cartões mostram os indicadores da recomendação, o aviso diz que não foi possível confirmar se esses indicadores usaram a mesma origem.
- Quando mostram os indicadores da avaliação técnica (falha de `/advisory`), diz que a avaliação técnica não indica quais dos seus indicadores usaram a alternativa.
- Sem indicação (campo em falta ou `/evaluate` com erro): nota neutra «origem dos dados por confirmar».
- `false` e `/evaluate` a carregar: nada.

**Não há fundamento para afirmar que `/advisory` e `/evaluate` usam a mesma origem meteorológica.**

### Justificação

- **Integridade científica:** cumpre a regra documentada sem estender a origem a dados que a documentação não abrange.
- **Transparência:** o utilizador é informado de que os valores podem não corresponder a observações actuais, que é a consequência prática do uso de climatologia.
- **Fiabilidade:** a lógica nunca assume substituição nem dados reais sem indicação explícita.

### Comportamento esperado do frontend

| `is_fallback_weather` | Indicadores nos cartões | Mensagem |
|---|---|---|
| `true` | `/advisory` | «Segundo a avaliação técnica […] foi usada climatologia histórica ou sazonal […]. Não foi possível confirmar se os indicadores da recomendação usaram a mesma origem […]» |
| `true` | `/evaluate` | «[…] A avaliação técnica não indica quais dos seus indicadores usaram essa alternativa […]» |
| `false` | qualquer | Nada |
| em falta | qualquer | «Origem dos dados por confirmar», com «A avaliação técnica não indicou […]» |
| `/evaluate` falhou | `/advisory` | «Origem dos dados por confirmar», com «A avaliação técnica não está disponível […]» |
| `/evaluate` a carregar | `/advisory` | Nada |

É o comportamento actual. Não exige alterações.

### Riscos e limitações

- Se `/advisory` usar de facto os mesmos dados, o aviso é mais prudente do que o necessário. Esse erro é mais seguro do que o contrário.
- Os textos do aviso estão marcados para revisão científica (`reviewRequired.js`).
- As legendas dos cartões («Expectativa para os próximos 7 dias») não mudam com o aviso. A descrição na página inicial já diz que podem ser valores de referência.

### Confirmação futura necessária do backend

1. As métricas de `/advisory` e de `/evaluate` vêm da mesma origem, para os mesmos parâmetros?
2. `is_fallback_weather` aplica-se a todas as métricas de `/evaluate` ou só a algumas? A quais?
3. Pode `/advisory` passar a devolver o seu próprio `is_fallback_weather`?

### Estado

**Decisão provisória.** O significado e a regra de apresentação estão documentados. O âmbito exacto, isto é, a que indicadores se aplica, depende do backend.

---

## Q3 — Divulgação da utilização de inteligência artificial

### Questão

O que garante a documentação sobre a geração do texto da recomendação? Há algum campo que identifique o uso efectivo de IA generativa? O frontend consegue distinguir texto de IA de texto de template?

### Evidências documentais

- **[Doc]** `docs2.md` linha 75: `ai_usage_disclosure` declara IA generativa **opcional** («Google Gemini / OpenAI fallback») usada «strictly for extension text synthesis in `POST /api/v1/advisory`». Todos os cálculos quantitativos são determinísticos.
- **[Doc]** `docs2.md` linha 167: `/evaluate` não gera narrativa com LLM. As justificações técnicas não são texto gerado por IA.
- **[Doc]** `docs2.md` linha 298: a interface deve mostrar a divulgação do uso de IA (via `/compliance` ou `/fontes/saude`).
- **[Doc]** `docs2.md` §3: a resposta de `/advisory` não tem nenhum campo que indique o método de geração.
- **[Obs 15-11]** A resposta real de `/compliance` acrescenta: «with a local deterministic template fallback when no LLM API key is configured».

### Estado do conhecimento

| Tipo | Conteúdo |
|---|---|
| Facto | Só `recomendacao_extensao` pode ser gerado por IA; tudo o resto é determinístico |
| Facto | A IA é opcional; há uma alternativa por template [Obs 15-11] |
| Facto | Não existe campo por resposta que indique o método |
| [Código] | Subtítulo da recomendação: «Texto gerado automaticamente a partir dos indicadores do serviço, podendo recorrer a inteligência artificial» (`ResultsArea.jsx` linha 572; `results.recommendationSubtitle`). Texto explicativo em `home.sources.nature3`. Nenhum dos dois nomeia fornecedores |
| [Código] | Um teste (`messages.test.js`) garante que nenhum texto atribui a recomendação a um agrónomo e que a divulgação é condicional («pode») |
| [Desconhecido] | Se a instância de produção tem uma chave de LLM configurada, e em que respostas foi usada |

### Alternativas consideradas

1. **Afirmar que o texto é gerado por IA.** Seria falso quando o template é usado.
2. **Não divulgar.** Viola a regra de conformidade do docs2.
3. **Nomear os fornecedores.** O docs2 apresenta-os como opção com alternativa; um nome pode ficar desactualizado ou ser incorrecto numa dada resposta.
4. **Divulgação condicional, sem fornecedores, a dizer que o texto é automático e baseado nos indicadores do serviço** (situação actual).
5. **Mostrar dinamicamente o conteúdo de `/compliance`.** Este endpoint só existe em inglês, o que entra em conflito com a interface bilingue. Exige uma integração nova.

### Decisão recomendada

**Manter a alternativa 4.** O frontend **não consegue** distinguir texto de IA de texto de template, e não deve tentar fazê-lo a partir do conteúdo.

A divulgação aparece:
- junto ao texto, na versão curta;
- na página inicial, em «Natureza da plataforma», na versão explicativa, que menciona os dois métodos possíveis.

Não se divulga IA nas justificações técnicas, que são determinísticas.

### Justificação

- **Transparência:** o utilizador sabe que o texto é automático e pode envolver IA.
- **Exactidão:** não se afirma IA quando pode não ter sido usada, nem se nomeia um fornecedor que pode não ser o usado.
- **Integridade:** a divulgação é separada dos valores, que a documentação garante serem determinísticos.

### Comportamento esperado do frontend

- O título da recomendação é neutro: «Recomendação do serviço de avaliação» / «Recommendation from the assessment service».
- O subtítulo é condicional, nos dois idiomas.
- A página inicial explica que o texto pode ser redigido com IA generativa ou a partir de um modelo de texto fixo, e que não substitui um técnico de extensão.
- Nenhum texto atribui a recomendação a um agrónomo.

É o comportamento actual. Não exige alterações.

### Riscos e limitações

- A divulgação é menos precisa do que seria com um campo por resposta, mas não é incorrecta.
- `/compliance` não é consultado em tempo real. Se a política de IA do backend mudar, os textos têm de ser revistos manualmente.

### Confirmação futura necessária do backend

1. Pode `/advisory` devolver um campo com o método de geração (por exemplo, IA ou template), sem expor o fornecedor? Com esse campo, o frontend passaria a uma divulgação exacta por resposta.
2. Pode `/compliance` ter também uma versão em português?

### Estado

**Confirmado.** A divulgação actual decorre directamente da documentação e não depende do backend. Um campo por resposta seria uma melhoria opcional.

---

## Q5 — Tratamento de HTTP 400 e 422

### Questão

Que erros estão associados a cada código? Como devem ser apresentados? Devem permitir nova tentativa? Como evitar classificar erros de validação como falhas do servidor?

### Evidências documentais

- **[Doc]** `docs2.md` linha 307: **400** «Invalid input value»: zona desconhecida, `data_ref` mal formatada ou província não suportada.
- **[Doc]** `docs2.md` linha 309: **422** «Pydantic validation error»: falta `provincia` em `POST /api/v1/advisory` ou `lang` inválido.
- **[Doc]** `docs2.md` linhas 308 e 310: 404 (recurso inexistente ou desactivado) e 503 (CSV IMERG histórico em falta).
- **[Doc]** O docs2 não documenta o formato do corpo dos erros. Os exemplos FastAPI usam `detail` em texto ou em lista.

### Estado do conhecimento

| Tipo | Conteúdo |
|---|---|
| Facto | 400 e 422 são erros dos dados do pedido, não falhas do servidor |
| [Obs 15-11] | Os endpoints GET (`/zonas`, `/optimal-planting`) devolveram 400 com `detail` em texto, incluindo uma mensagem técnica crua do Python («Invalid isoformat string») |
| [Obs 15-11] | `POST /advisory` com província não suportada devolveu **422** e não 400. A linha «unsupported provincia → 400» aplica-se, portanto, pelo menos aos endpoints GET |
| [Obs 15-11] | `POST /advisory` e `POST /evaluate` devolveram **400** («There was an error parsing the body») quando o corpo não era JSON válido (codificação incorrecta do cliente de teste). **Os POST podem devolver 400** |
| [Código] | `requestJson` classifica 422 como `validation` e os restantes não-2xx como `http` (`api.js` linha 148) |
| [Código] | `getUserErrorMessage`: 422 dá «Os dados da consulta não são válidos» (sem nova tentativa); 400 dá «O pedido não foi aceite pelo servidor» com indicação para corrigir os dados (sem nova tentativa); 404 sem nova tentativa; 503 e outros 5xx com nova tentativa (`errorMessages.js` linhas 23–32 e 78) |
| [Código] | O `detail` do servidor nunca é mostrado na interface. Testes em `errorMessages.http.test.js` e `CatalogSelectField.test.jsx` |
| [Desconhecido] | A lista completa de situações que produzem 400 nos POST |

### Alternativas consideradas

1. **Tratar 400 como falha do servidor, com nova tentativa.** Classificação errada: repetir o mesmo pedido dá o mesmo erro.
2. **Mostrar o `detail` do servidor.** Expõe mensagens técnicas (Python, Pydantic), muitas vezes só em português ou em inglês, e possivelmente em bruto.
3. **Tratar 400 e 422 como erros dos dados, com mensagens próprias e sem nova tentativa** (situação actual).

### Decisão recomendada

**Manter a alternativa 3:**

- **422:** problema de validação dos dados da consulta. Pede ao utilizador que reveja a província, a cultura e a data. Sem nova tentativa.
- **400:** pedido não aceite. Pede para verificar e corrigir os dados antes de voltar a enviar. Sem nova tentativa.
- Nenhum dos dois é apresentado como falha do servidor (as mensagens de servidor estão reservadas para 5xx).
- O `detail` do servidor não aparece na interface.

### Justificação

- **Classificação correcta:** os dois códigos são documentados como erros de entrada.
- **Experiência:** não se oferece um botão que repetiria o mesmo erro.
- **Segurança e clareza:** sem mensagens técnicas do servidor na interface.

### Comportamento esperado do frontend

| Código | Mensagem | Nova tentativa |
|---|---|---|
| 422 | Os dados da consulta não são válidos. Verifique a província, a cultura e a data seleccionadas […] | Não |
| 400 | O pedido não foi aceite pelo servidor. Verifique os dados da consulta e corrija o que for necessário […] | Não |
| 404 | A informação solicitada não foi encontrada. O recurso poderá não estar disponível nesta versão do serviço. | Não |
| 500 / 5xx | O servidor encontrou um problema […] | Sim |
| 503 | O serviço está temporariamente indisponível […] | Sim |

Aplica-se ao relatório e aos catálogos. É o comportamento actual. Não exige alterações.

### Riscos e limitações

- **Um 400 num POST pode não ser culpa do utilizador.** Pode ser um corpo mal formado por defeito do cliente. A mensagem «verifique os dados» seria então enganadora. Como o frontend valida os dados antes de enviar e serializa com `JSON.stringify`, um 400 em POST indica provavelmente um defeito técnico. Fica registado; não justifica, por agora, uma mensagem diferente.
- O mesmo vale para um 422 por `lang` inválido, que seria defeito do frontend. Hoje o frontend não envia `lang`.

### Confirmação futura necessária do backend

1. Que situações produzem 400 em `POST /advisory` e `POST /evaluate` (além de um corpo que não é JSON válido)?
2. Pode o backend uniformizar a província não suportada num só código (400 ou 422) em todos os endpoints?
3. Pode o backend substituir as mensagens técnicas cruas (por exemplo, «Invalid isoformat string») por códigos de erro estáveis?

### Estado

**Confirmado.** A classificação decorre da documentação e da observação de 15 de novembro, e o comportamento está implementado e testado. As confirmações acima melhorariam a precisão, mas não alteram a decisão.

---

## Tabela consolidada

| Questão | Decisão | Base principal | Alterações ao frontend | Estado |
|---|---|---|---|---|
| **Q1** Autoridade | `/advisory` = recomendação; `/evaluate` = avaliação técnica complementar, nunca promovida; divergências lado a lado; cada fonte independente | `docs2.md` 31, 127, 167, 293; `CLAUDE.md` §11 | Nenhuma | **Decisão provisória** (falta a autoridade face ao motor IMERG) |
| **Q2** Dados alternativos | Aviso atribuído à avaliação técnica, com ressalva sobre a origem dos outros indicadores; nota neutra quando não há indicação | `docs2.md` 170–171 | Nenhuma | **Decisão provisória** (falta o âmbito exacto do indicador) |
| **Q3** Divulgação de IA | Divulgação condicional, sem fornecedores, só para o texto da recomendação | `docs2.md` 75, 167, 298 | Nenhuma | **Confirmado** |
| **Q5** 400 e 422 | Erros de dados, sem nova tentativa, mensagens próprias, nunca como falha do servidor nem com `detail` cru | `docs2.md` 307–310; [Obs 15-11] | Nenhuma | **Confirmado** |

## Observações fora do âmbito destas questões

- **Idioma da recomendação.** O docs2 (§3) documenta `lang: "pt" | "en"` em `/advisory`, mas o frontend ainda não o envia. Por isso, em inglês, a recomendação aparece em português atrás do painel do original. Integrar `lang` é uma decisão separada: o texto em inglês é gerado, não traduzido, e não vem acompanhado do original em português.
- **Motor IMERG.** A especificação funcional define-o como a única fonte da decisão. Antes de qualquer integração, a autoridade entre ele e `/advisory` tem de ser resolvida (Q1, ponto 2).

## Pedidos a fazer ao backend quando estiver disponível

1. Fonte de decisão oficial: `/advisory`, `/evaluate` ou o motor IMERG (Q1).
2. Mesma lógica e mesma origem de dados em `/advisory` e `/evaluate` (Q1 e Q2).
3. Âmbito de `is_fallback_weather`, e o mesmo campo em `/advisory` (Q2).
4. Campo com o método de geração do texto; `/compliance` em português (Q3).
5. Situações que produzem 400 nos POST; código uniforme para província não suportada; códigos de erro estáveis (Q5).
