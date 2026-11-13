# Integração frontend/backend — Detetive da Chuva

Documento de referência para quem trabalha no backend ou na integração. Descreve **o que o
frontend envia, o que espera receber e como reage**, e lista o que ainda precisa de confirmação.

- Base URL: `https://detetive-da-chuva.onrender.com` (substituível por `VITE_API_BASE_URL`).
- Código da integração: `frontend/src/services/` (pedidos) e `frontend/src/utils/mappers.js`
  (interpretação das respostas). Constantes em `frontend/src/config/api.js`.
- Contrato original fornecido pela equipa de backend: [`backend-api.md`](backend-api.md).

## Como ler este documento

Cada afirmação indica a sua origem:

| Marca | Significado |
|---|---|
| **[Doc]** | Consta de `docs/backend-api.md` (contrato fornecido pelo backend). |
| **[Obs]** | Observado em pedidos reais ao serviço em **2026-11-12** (reconhecimento inicial; respostas gravadas em `frontend/src/test/fixtures/liveResponses.js`). Pode ter mudado desde então. |
| **[Front]** | Comportamento implementado no frontend (verificável no código e nos testes). |
| **[?]** | Não confirmado. Depende de resposta do backend. Não deve ser tratado como facto. |

---

## 1. Comportamento comum a todos os pedidos [Front]

Implementado em `frontend/src/services/api.js` (`requestJson`).

| Aspecto | Comportamento |
|---|---|
| Cabeçalhos | `Accept: application/json`; nos POST também `Content-Type: application/json`. Sem autenticação nem cookies. |
| Timeout | **120 000 ms** por pedido (todos os endpoints), configurável com `VITE_API_TIMEOUT_MS` (5 000–300 000). Ao expirar, o pedido é abortado. |
| Cancelamento | `AbortController`. Pedidos em curso são cancelados quando a página de consulta é desmontada. Cancelamentos não são mostrados como erro. |
| Repetição | **Não há repetição automática.** O utilizador pode repetir manualmente cada fonte, ou as duas, quando o erro o permite. |
| Corpo vazio ou não-JSON numa resposta 2xx | Erro `malformed`. |
| Resposta 2xx com tipo errado (ex.: objecto onde se espera lista) | Erro `malformed` (`catalog.js`, `consultation.js`). |

### Tipos de erro

| `kind` | Quando | Mensagem ao utilizador | Permite repetir |
|---|---|---|---|
| `network` | `fetch` falha (sem ligação, DNS, CORS bloqueado…) | «Não foi possível ligar ao servidor.» | Sim |
| `timeout` | Excedeu o timeout | «O servidor demorou demasiado a responder.» (menciona arranque a frio) | Sim |
| `validation` | **HTTP 422** | «A consulta não foi aceite pelo servidor.» + mensagens `detail[].msg` do servidor, sem o prefixo `Value error, ` | **Não** |
| `http` | Outro estado não-2xx | ≥ 500: «O servidor encontrou um problema.» · 4xx: «O pedido não foi aceite pelo servidor.» | Sim |
| `malformed` | 2xx sem JSON válido ou com estrutura errada | «Não foi possível interpretar a resposta do servidor.» | Sim |
| `aborted` | Cancelado pelo próprio cliente | (nada é mostrado) | — |

Mensagens de erro do servidor: o frontend lê `detail` quando é uma `string` ou uma lista de objectos
com `msg` (formato FastAPI observado [Obs]). Outros formatos são ignorados. O contrato não define o
esquema de erros HTTP [Doc].

---

## 2. `GET /health`

- **Finalidade [Doc]:** disponibilidade e prontidão do serviço.
- **Uso no frontend [Front]:** existem `getHealth()` (`services/catalog.js`) e `mapHealthResponse()`
  (`utils/mappers.js`), mas **a interface não chama este endpoint** neste momento.
- **Resposta observada [Obs]** (igual ao exemplo documentado [Doc]):

```json
{
  "status": "healthy",
  "baseline_ready": true,
  "provincias_ativas": ["Huambo", "Bié", "Huíla"],
  "culturas_ativas": ["Milho", "Feijão", "Soja"],
  "data_servidor": "2026-11-12"
}
```

- `mapHealthResponse` considera o serviço pronto quando `status === "healthy"` e
  `baseline_ready === true` [Front].
- O frontend **não** usa `data_servidor` como data de referência: a validação da data usa a data
  local do dispositivo [Front].

---

## 3. `GET /api/v1/provinces`

- **Finalidade:** preencher o selector de província.
- **Resposta documentada [Doc]:** lista de `{ "id", "nome" }`.
- **Resposta observada [Obs]:** a mesma lista, com campos adicionais **não documentados**:

```json
[
  {
    "id": "huambo",
    "nome": "Huambo",
    "latitude": -12.7761,
    "longitude": 15.7392,
    "altitude_m": 1700,
    "zona_agroecologica": "Planalto Central Tropical de Altitude"
  }
]
```

(Observados também `bie`/`Bié` e `huila`/`Huíla`, com os mesmos campos.)

- **Campos consumidos [Front]:** apenas `id` e `nome`. Os campos extra são ignorados.
- **Validação [Front]:** entradas sem `id` ou `nome` (strings não vazias) são descartadas; `id`
  repetidos são descartados. Lista vazia → «Não há províncias disponíveis de momento.», com opção
  de verificar novamente. Resposta que não é lista → erro `malformed`.
- **Valor enviado depois:** o `nome` (ex.: `"Huíla"`, com acento), tal como nos exemplos
  documentados, **não** o `id`.

## 4. `GET /api/v1/crops`

- **Finalidade:** preencher o selector de cultura.
- **Resposta documentada [Doc]:** lista de `{ "id", "nome" }`.
- **Resposta observada [Obs]:** com campos adicionais **não documentados**:

```json
[
  {
    "id": "milho",
    "nome": "Milho",
    "nome_cientifico": "Zea mays",
    "icone": "🌽",
    "profundidade_sementeira_cm": 5,
    "min_chuva_abertura_mm": 20.0,
    "notas_agronomicas": "Cultura base de segurança alimentar no Planalto Central. Exige solo húmido até 5 cm."
  }
]
```

(Observados também `feijao`/`Feijão` e `soja`/`Soja`.)

- **Campos consumidos [Front]:** apenas `id` e `nome`, com as mesmas regras das províncias.

---

## 5. `POST /api/v1/advisory` — recomendação principal

### Pedido [Front]

O corpo é construído em `utils/validators.js` (`buildConsultationPayload`) e é **o mesmo** para
`/advisory` e `/evaluate`:

```json
{
  "provincia": "Huambo",
  "cultura": "Milho",
  "data_consulta": "2026-11-12"
}
```

| Campo | No contrato [Doc] | No frontend [Front] |
|---|---|---|
| `provincia` | Obrigatório | Obrigatório; valor vindo de `/provinces` (`nome`), sem espaços nas pontas |
| `cultura` | Opcional, predefinição `Milho` | **Sempre enviado**; valor vindo de `/crops` (`nome`) |
| `data_consulta` | Opcional, `YYYY-MM-DD`, predefinição: data actual | **Sempre enviado**; hoje ou anterior (datas futuras bloqueadas), segundo a data local do dispositivo |

### Resposta

Documentada [Doc] e observada [Obs] com a mesma forma (4 campos de topo):

```json
{
  "status": "FAVORAVEL",
  "score_confianca": 95,
  "metricas": {
    "chuva_acumulada_recente_mm": 25.6,
    "humidade_solo_raiz": 0.48,
    "previsao_7dias_mm": 51.2
  },
  "recomendacao_extensao": "**FAVORÁVEL: O período atual é favorável para a sementeira de Milho na província do Huambo.**\n\n### Justificações Técnicas:\n* … [texto encurtado]"
}
```

(Resposta real a `{ "provincia": "Huambo", "cultura": "Milho" }` em 2026-11-12, texto encurtado.)

`/advisory` **não** devolve `triggers_ativados`, `justificacoes_tecnicas` nem
`is_fallback_weather` [Obs].

### Campos consumidos [Front] (`mapAdvisoryResponse`)

| Campo | Tratamento |
|---|---|
| `status` | `FAVORAVEL` → «Favorável», `AGUARDAR` → «Aguardar», `DESFAVORAVEL` → «Desfavorável». Outro valor → «Estado não reconhecido» (o código é mostrado). Ausente → «Estado indisponível». |
| `score_confianca` | Número 0–100, mostrado como `N/100` com a nota de que não é uma probabilidade nem uma garantia. Fora do intervalo → tratado como inválido. |
| `metricas.chuva_acumulada_recente_mm` | Número ≥ 0, em mm. |
| `metricas.humidade_solo_raiz` | Número 0–1; **mostrado** como percentagem (×100). O valor original é preservado. |
| `metricas.previsao_7dias_mm` | Número ≥ 0, em mm. |
| `recomendacao_extensao` | Texto tipo Markdown, renderizado com `react-markdown` com HTML ignorado e só elementos de texto permitidos. |

### Timeout e tempos observados

- Timeout: 120 s [Front].
- Tempos observados [Obs]: arranque a frio do serviço ~49–54 s; `/advisory` entre 8 e 22 s em
  condições normais, com pedidos isolados acima de 60 s e de 90 s (o limite anterior, de 90 s,
  cortou uma resposta real). `/evaluate` respondeu bastante mais depressa do que `/advisory`.

---

## 6. `POST /api/v1/evaluate` — avaliação técnica complementar

### Pedido [Front]

Igual ao de `/advisory` (mesmo corpo, mesmo momento, em paralelo). O exemplo documentado [Doc] não
inclui `data_consulta`; o frontend envia-o sempre.

### Resposta

Documentada [Doc] com 6 campos. Observada [Obs] com esses 6 e um 7.º **não documentado**,
`detalhes_agroclimaticos`:

```json
{
  "status": "FAVORAVEL",
  "score_confianca": 95,
  "triggers_ativados": ["RECENT_RAIN_TRIGGER_SATISFIED"],
  "justificacoes_tecnicas": [
    "Reserva de água na raiz favorável (0.48), superior ao limiar mínimo histórico (0.43).",
    "Acumulação recente de chuvas atingiu 25.6 mm nos últimos dias, garantindo solo bem humedecido.",
    "Previsão de 7 dias com 51.2 mm e sem risco de estiagem severa, propício para germinação uniforme do Milho."
  ],
  "metricas": {
    "chuva_acumulada_recente_mm": 25.6,
    "humidade_solo_raiz": 0.48,
    "previsao_7dias_mm": 51.2
  },
  "is_fallback_weather": true,
  "detalhes_agroclimaticos": {
    "provincia": "Huambo",
    "cultura": "Milho",
    "data_consulta": "2026-11-12",
    "mes": 11,
    "semana_iso": 46,
    "p25_root": 0.432,
    "p50_raiz_historico": 0.48,
    "p75_raiz_historico": 0.54,
    "prob_sementeira_semanal": 72.0,
    "chuva_media_mensal_mm": 219.5,
    "temperatura_media_c": 20.5,
    "temperatura_max_c": 25.8,
    "surface_moisture": 0.54
  }
}
```

(Resposta real a `{ "provincia": "Huambo", "cultura": "Milho" }` em 2026-11-12.)

Os três estados documentados foram observados [Obs]: `FAVORAVEL` (Huambo, Milho, 2026-11-12),
`AGUARDAR` (Huambo, Milho, `data_consulta` 2026-09-10) e `DESFAVORAVEL` (Huíla, Milho,
`data_consulta` 2026-08-01). Nestes dois últimos, `triggers_ativados` veio como lista vazia `[]`.

### Campos consumidos [Front] (`mapEvaluateResponse`)

| Campo | Tratamento |
|---|---|
| `status`, `score_confianca`, `metricas` | Como em `/advisory`. |
| `triggers_ativados` | Lista de strings, mostrada **tal como recebida** (códigos técnicos, sem tradução). Lista vazia → «Nenhum gatilho activado, segundo o serviço.» Ausente → «O serviço não enviou esta informação.» |
| `justificacoes_tecnicas` | Lista de strings, mostrada tal como recebida. Mesma distinção entre vazio e ausente. |
| `is_fallback_weather` | `true` → aviso «Valores de substituição» nos indicadores. `false` → sem aviso. Ausente ou `/evaluate` falhou → aviso de que **não foi possível confirmar** a natureza dos valores. |
| `detalhes_agroclimaticos` | **Não documentado.** Guardado só se for um objecto, e só os valores simples. **Não é mostrado nem interpretado.** |

Elementos não-string em listas são descartados e a resposta é marcada como incompleta.

---

## 7. Contrato de comunicação frontend/backend

### 7.1 Parâmetros enviados

| Campo | Tipo | Origem do valor | Enviado a |
|---|---|---|---|
| `provincia` | string | `nome` de `/provinces` | `/advisory`, `/evaluate` |
| `cultura` | string | `nome` de `/crops` | `/advisory`, `/evaluate` |
| `data_consulta` | string `YYYY-MM-DD` | escolhida pelo utilizador (hoje ou anterior) | `/advisory`, `/evaluate` |

### 7.2 Campos esperados nas respostas

«Obrigatório» significa: se faltar, o frontend mostra «valor indisponível» e assinala a resposta
como incompleta. **Nenhum campo em falta interrompe a apresentação do resto.**

| Campo | `/advisory` | `/evaluate` | Estado no contrato |
|---|---|---|---|
| `status` | esperado | esperado | [Doc] |
| `score_confianca` | esperado | esperado | [Doc] |
| `metricas` (3 chaves) | esperado | esperado | [Doc] |
| `recomendacao_extensao` | esperado | — | [Doc] |
| `triggers_ativados` | — | esperado | [Doc] |
| `justificacoes_tecnicas` | — | esperado | [Doc]; **[?]** se pode faltar quando não há justificações |
| `is_fallback_weather` | — | esperado | [Doc] |
| `detalhes_agroclimaticos` | — | opcional, ignorado | **não documentado** [Obs] |
| campos extra em `/provinces`, `/crops` | — | — | **não documentados** [Obs], ignorados |

### 7.3 Respostas incompletas ou inesperadas [Front]

- Campo em falta ou com tipo/intervalo inválido → `null` na interface («indisponível») e aviso na
  secção «Transparência e limitações», com o nome do campo. Nenhum valor é estimado ou preenchido.
- Estado desconhecido → apresentado como «Estado não reconhecido», com o código recebido.
- Resposta que não é um objecto JSON → erro `malformed`, com opção de repetir.

### 7.4 Quando só um dos serviços responde [Front]

- Os dois pedidos são independentes: a falha de um **não** impede a apresentação do outro.
- O resumo usa `/advisory`. Só se `/advisory` falhar é que usa `/evaluate`, sempre identificado como
  tal. Enquanto `/advisory` carrega, o resumo espera por ele.
- A comparação entre as fontes fica «indisponível: só uma das fontes respondeu».
- Sem `/evaluate`, a natureza dos indicadores (`is_fallback_weather`) fica «por confirmar».
- Cada fonte em erro tem o seu botão «Tentar novamente» (se o erro o permitir).

### 7.5 Quando os dois falham [Front]

- O resumo mostra «Nenhuma das fontes respondeu.» e um botão «Tentar novamente as duas fontes»,
  que repete **apenas** as fontes cujo erro permite repetição (um 422 não é repetido).
- A comparação fica «indisponível: nenhuma das fontes respondeu».

### 7.6 Quando os dois respondem: divergências [Front]

O frontend compara `status`, `score_confianca` e as três métricas das duas respostas
(`utils/divergences.js`). Diferenças são **mostradas, nunca reconciliadas**. Um campo em falta numa
das respostas é listado como «não comparável», para não sugerir concordância.

### 7.7 Concorrência

- Não é aceite nova consulta enquanto algum pedido estiver em curso.
- Repetir uma fonte usa os parâmetros da consulta apresentada no relatório.

---

## 8. Limitações conhecidas

### 8.1 Factos (contrato ou código)

- O contrato não define o esquema de erros HTTP nem explica se `/advisory` e `/evaluate` usam a
  mesma lógica [Doc].
- Só `/evaluate` informa `is_fallback_weather`; `/advisory` não o devolve [Obs, verificado ao vivo].
- O contrato não descreve endpoints de tendências históricas NASA POWER. A proposta em
  `docs/Detetive_da_Chuva_Proposta_Formato_Dados.pdf` é um **rascunho**, não uma API disponível.
- A interface não chama `/health` [Front].

### 8.2 Comportamentos observados em testes (2026-11-12) [Obs]

- **Dados de substituição:** em todas as respostas de `/evaluate` observadas,
  `is_fallback_weather` era `true`.
- **Datas diferentes:** nos testes, os valores das métricas variaram com a província e com o
  **mês** da `data_consulta`, mas não com o **dia** dentro do mesmo mês.
- **Validação de entrada no backend:**
  - província não suportada (ex.: `"Luanda"`) → **422** com `detail[].msg`;
  - corpo sem `provincia` → **422** (`"Field required"`);
  - **cultura arbitrária é aceite sem erro**;
  - **data inválida é aceite sem aviso** e o serviço usa a data actual.
- **Texto gerado:** o texto de `recomendacao_extensao` variou entre pedidos.
- **Arranque a frio:** ~49–54 s até à primeira resposta; `/advisory` com tempos muito variáveis
  (8–22 s, por vezes > 60 s e > 90 s).
- **CORS:** o serviço devolve `Access-Control-Allow-Origin` igual à origem do pedido,
  `Access-Control-Allow-Credentials: true`, e aceita o preflight de `POST` com `content-type`
  (verificado com uma origem `*.netlify.app`).
- **Campos não documentados** em `/provinces`, `/crops` e `/evaluate` (ver secções 3, 4 e 6).

### 8.3 Hipóteses não confirmadas [?]

Estas leituras **não** são suportadas por documentação e **não** devem ser apresentadas como factos:

- Que os indicadores, com `is_fallback_weather: true`, sejam médias ou valores de referência
  mensais em vez de dados meteorológicos do dia consultado.
- Que `previsao_7dias_mm` seja uma previsão meteorológica para os dias seguintes à data
  consultada (a interface chama-lhe «Chuva indicada para 7 dias» e avisa que pode ser um valor de
  referência).
- Que `detalhes_agroclimaticos` (percentis, probabilidade semanal, temperatura) seja estável ou
  destinado ao frontend.

A interface já comunica estas incertezas ao utilizador.

---

## 9. Questões para o backend

Nenhuma destas questões foi respondida por suposição no frontend.

**Metodologia e significado**

1. A `data_consulta` altera efectivamente os indicadores? Com que granularidade (dia, semana ISO,
   mês)? Porque é que, nos testes, os valores mudaram com o mês e não com o dia?
2. A `cultura` influencia a recomendação e os indicadores? De que forma?
3. Como são calculados os três indicadores e qual é a origem de cada um (observação, reanálise,
   previsão, climatologia)?
4. Em que circunstâncias são usados dados de substituição (`is_fallback_weather`)? Que dados os
   substituem? Porque é que estava `true` em todos os testes?
5. `previsao_7dias_mm` é uma previsão meteorológica real? De que fonte, e a partir de que data?
6. O que representa `score_confianca`? Como é calculado? Pode ser comparado entre consultas?
7. Qual é a diferença exacta entre `/advisory` e `/evaluate`? Usam a mesma lógica? Em que casos
   podem divergir em `status`, `score_confianca` ou `metricas`?
8. Existem limiares ou descrições aprovadas para os indicadores, que possam ser mostrados ao
   utilizador?
9. Qual é o catálogo completo de `triggers_ativados`, e o significado de cada código?

**Contrato**

10. `justificacoes_tecnicas` pode faltar na resposta? Se não houver justificações, deve vir `[]`?
11. Que campos são garantidos em cada resposta? Podem vir `null`?
12. Qual é o formato das respostas de erro (além do 422 do FastAPI)? Que códigos podem ocorrer?
13. `detalhes_agroclimaticos` e os campos extra de `/provinces` e `/crops` fazem parte do contrato?
    São estáveis? Devem ser usados pelo frontend?
14. O backend vai validar `cultura` e `data_consulta` (rejeitar valores inválidos com 422) em vez de
    os aceitar silenciosamente?
15. O frontend deve enviar o `nome` (ex.: `"Huíla"`) ou o `id` (ex.: `"huila"`)?
16. Que data de referência deve ser usada para «hoje»: a do dispositivo ou `data_servidor`?

**Infra-estrutura**

17. É possível reduzir o arranque a frio do Render durante demonstrações e avaliações?
18. Qual é o tempo máximo esperado de `/advisory`? O timeout de 120 s é adequado?
19. Quando houver autenticação ou cookies, o CORS será restringido ao domínio do frontend?
20. Haverá dados históricos NASA POWER disponíveis para o frontend nesta edição? Em que formato?
