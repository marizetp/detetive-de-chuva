# Especificação para o backend — idioma do conteúdo (i18n)

**Para:** quem desenvolve o backend do AgroKairos (`https://detetive-da-chuva.onrender.com`).
**De:** equipa de frontend. **Data:** 15/11/2026. **Estado:** pedido. Nada disto está ainda
implementado no backend.

O código do backend não está neste repositório. Por isso, esta especificação descreve o que o frontend
precisa e o que já preparou; não descreve o código do backend. O documento de clarificações do backend
(`AgroKairos_Respostas_Backend_Frontend.pdf`) também não está no repositório. As afirmações sobre a
arquitectura (secção 1) seguem a clarificação transmitida pelo responsável do projecto em 15/11/2026,
e devem ser confirmadas por quem mantém o backend.

## 1. Contexto

- **Motor de decisão (DecisionEngine).** É partilhado por `POST /api/v1/advisory` e `POST /api/v1/evaluate`.
  - Usa a linha de base NASA POWER de 25 anos, o Open-Meteo e os perfis das culturas.
  - O `/evaluate` é a referência determinística.
  - O `/advisory` acrescenta o texto de extensão (`recomendacao_extensao`).
- **Motor IMERG** (`GET /zonas/{zona}/decisao`): é independente do DecisionEngine. O frontend não o
  combina com os outros dois e, nesta versão, também não o integra.
- **Janela de plantio** (`GET /api/v1/optimal-planting`): combina os percentis P50 e P90 do IMERG, o
  risco IC90, os perfis das culturas e a linha de base NASA POWER. Nesta versão, o frontend também não
  a integra.
- **Dados alternativos:** sem Open-Meteo, o DecisionEngine usa a climatologia NASA POWER de 2000–2024
  e devolve `is_fallback_weather: true`. O frontend apresenta esses valores como expectativas
  históricas, não como observações actuais nem como previsões.

**Situação actual (API v1.1, `docs/docs2.md`, e respostas gravadas a 15/11/2026):**
- só o `/advisory` aceita `lang` (`"pt"` por omissão, ou `"en"`); `lang: "fr"` dá 422 com
  `loc: ["body","lang"]`;
- nenhuma resposta indica o idioma em que o texto foi entregue;
- o `/evaluate` com `lang: "en"` e o `/optimal-planting` com `?lang=en` devolveram respostas iguais,
  byte a byte, às respostas sem `lang`;
- no motor IMERG, o código da tabela do docs2 §5 (`SEM_BASE_FIAVEL`, `FAVORAVEL_INDICATIVO`…) vem em
  `mensagem_agricultor.codigo`, e não em `estado_motor`; `motivo_tecnico` e `notas` não aparecem nas
  respostas observadas. Pede-se que o contrato e a API fiquem coerentes.

## 2. Regras comuns a todos os endpoints

### 2.1 Parâmetro `lang`

**Valores aceites:** `pt`, `pt-AO`, `en`, `en-US`.
- Recomenda-se aceitá-los sem distinguir maiúsculas de minúsculas.
- `pt-AO` equivale a `pt`, e `en-US` equivale a `en`.

**Omissão:** sem `lang`, a resposta vem em português. Este é o comportamento actual, e tem de se
manter para os clientes que existem.

**Valor inválido:** qualquer outro valor (por exemplo `fr`, `pt-BR` ou `""`) dá **HTTP 422**.
- O idioma não é substituído em silêncio.
- O `detail` deve identificar o campo `lang`.

**Onde vai o parâmetro:**
- nos `POST`, no corpo JSON, como hoje no `/advisory`;
- nos `GET`, como parâmetro de consulta (`?lang=en`).

### 2.2 Campo `content_language` na resposta

Todas as respostas com texto livre devem incluir `content_language`: o idioma **efectivo** em que o
texto foi entregue.
- **Valores:** `pt` ou `en` (ou `pt-AO`/`en-US`; o frontend normaliza as quatro formas).
- **Deve reflectir o que foi entregue, não o que foi pedido.** Exemplo: se o gerador de texto falhar
  e o serviço voltar ao português, o valor é `pt`, mesmo que o pedido tenha sido `lang: "en"`.
- **Opcional:** quando a resposta mistura idiomas, devolver por campo (por exemplo,
  `content_language_by_field`). Se isto for implementado, documentar.

### 2.3 O que nunca muda com o idioma

São identificadores estáveis, iguais em todos os idiomas. O frontend traduz os códigos com o seu
próprio dicionário:
- `status`: `FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`;
- `estado_motor`;
- `triggers_ativados`;
- os nomes dos campos.

Também nunca mudam:
- os valores numéricos, as unidades e as datas ISO;
- `score_confianca` e as métricas.

Os mesmos parâmetros, com `lang` diferente, devem dar exactamente os mesmos valores. Só o texto livre
muda.

### 2.4 Tradução e geração

- O texto em inglês tem de preservar os valores, as unidades, as datas, as negações e as ressalvas do
  original (por exemplo, «não é certeza»).
- **Recomendado:** devolver também o original em português, quando o texto em inglês for gerado ou
  traduzido (por exemplo, `recomendacao_extensao_original`). Assim é possível auditá-lo.

## 3. Alterações por endpoint

| Endpoint | `lang` | Campos de texto a localizar | `content_language` |
|---|---|---|---|
| `POST /api/v1/advisory` | Já existe (`pt`/`en`). Alargar a `pt-AO`/`en-US` | `recomendacao_extensao` | **Novo** |
| `POST /api/v1/evaluate` | **Novo** | `justificacoes_tecnicas` | **Novo** |
| `GET /zonas/{zona}/decisao[/{data_ref}]` | **Novo** (consulta) | `resposta`, `motivo_tecnico`, `notas` (ver nota) | **Novo** |
| `GET /api/v1/optimal-planting` e `GET /zonas/{zona}/epoca-plantio` | **Novo** (consulta) | `descricao_periodo`, `frequencia_historica`, `nota`, `notas_agronomicas`, `aviso` | **Novo** |

**Notas:**
- **Motor IMERG:** `resposta` (por exemplo, `PLANTAR (indicativo)`) é um rótulo derivado de
  `estado_motor`.
  - O rótulo pode ser localizado; `estado_motor` mantém-se como código estável.
  - O `docs2.md` documenta também `mensagem_agricultor`. É texto livre, e por isso, se o backend a
    mantiver, deve ser localizada da mesma forma. Confirmar.
- **Janela de plantio:** `frequencia_historica` combina números e texto (por exemplo, «X de Y
  épocas»). Os números têm de ficar iguais. Se possível, devolver também os números em campos próprios.

### Exemplo — `/evaluate` em inglês (forma pedida, não observada)

```http
POST /api/v1/evaluate
Content-Type: application/json

{ "provincia": "Huambo", "cultura": "Milho", "data_consulta": "2026-11-15", "lang": "en" }
```

```json
{
  "status": "FAVORAVEL",
  "score_confianca": 95,
  "triggers_ativados": ["..."],
  "justificacoes_tecnicas": ["<texto em inglês>"],
  "metricas": { "...": "iguais à resposta em português" },
  "is_fallback_weather": false,
  "content_language": "en"
}
```

## 4. Critérios de aceitação (para o backend)

1. Sem `lang`: as respostas são iguais às actuais, com `content_language: "pt"` acrescentado.
2. Com `lang` em `en` ou `en-US`: o texto livre vem em inglês e `content_language` é `"en"`.
3. Com `lang` em `pt` ou `pt-AO`: o texto vem em português e `content_language` é `"pt"`.
4. `lang` inválido dá 422 e a mensagem identifica `lang`.
5. Entre idiomas, os códigos, os números, as unidades, as datas e as métricas são idênticos. Um teste
   automático deve comparar as respostas `pt` e `en` campo a campo, excepto o texto livre.
6. Se não houver texto em inglês, a resposta vem em português, com `content_language: "pt"`. Não é
   devolvido erro.
7. Os campos novos ficam documentados numa nova versão do contrato (v1.2), com exemplos reais.

## 5. O que o frontend já preparou

Estado a 15/11/2026: implementado e testado localmente, **por commitar e por publicar**.

- **`/advisory`:** envia `lang: "en"` com a interface em inglês e não envia `lang` com a interface em
  português.
  - Os valores `pt-AO` e `en-US` não são enviados: são aceites só na leitura.
- **`content_language`:**
  - **Leitura:** é lido em `/advisory` e `/evaluate` quando existe, e normalizado (`pt-AO` → `pt`,
    `en-US` → `en`); qualquer outro valor fica `null`.
  - **Prioridade:** quando existe, tem prioridade sobre o idioma pedido.
  - **Ausência:** o frontend usa o idioma pedido no `/advisory` e o português no `/evaluate`. Nunca
    tenta detectar o idioma a partir do texto.
  - **Idioma diferente do da interface:** a interface mostra um aviso e um painel com o texto original
    (com o atributo `lang`). O texto nunca é traduzido no browser.
- **`lang` no `/evaluate`:** está pronto, mas **desligado por omissão**. Liga-se com
  `VITE_API_EVALUATE_LANG=true`, depois de o backend publicar o suporte.
  - Ligado, envia `lang: "en"` com a interface em inglês.
  - Depois de o utilizador mudar de idioma, oferece «Obter as justificações em {idioma}», que repete
    só o `/evaluate`.
- **Mudança de idioma:**
  - nunca faz pedidos automáticos;
  - cada botão repete só o seu endpoint;
  - o botão não aparece se essa fonte já foi pedida no idioma da interface.
- **Aviso de dados alternativos:** diz que foi usada a climatologia NASA POWER de 2000–2024 e que os
  valores são expectativas históricas, não observações actuais nem previsões. O texto está marcado
  para revisão científica.
- **IMERG e janela de plantio:** sem ecrã. Os serviços e os mappers estão preparados e testados com
  as respostas reais. Enviam `?lang=en` só com `VITE_API_IMERG_LANG=true` ou
  `VITE_API_PLANTING_LANG=true`, e lêem `content_language` quando existir.
- **422 sobre `lang`:** a interface mostra «idioma não suportado», sem nova tentativa.

## 6. Perguntas em aberto

1. Confirmar a arquitectura da secção 1, nomeadamente o período 2000–2024 da climatologia alternativa.
2. O `is_fallback_weather` pode também ser devolvido pelo `/advisory`?
3. A que métricas se aplica o `is_fallback_weather`?
4. A lista estável de códigos de `triggers_ativados`, para o frontend os poder traduzir.
5. Quando o `/advisory` é pedido em `en`, o texto é gerado directamente em inglês ou traduzido do
   português? Em qualquer dos casos, pode ser devolvido o original?
