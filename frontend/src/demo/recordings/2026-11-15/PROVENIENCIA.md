# Respostas reais da API v1.1 — gravadas em 15 de novembro de 2026

## Origem

- **Serviço:** `https://detetive-da-chuva.onrender.com` (API v1.1.0, motor `ciclo_diario.py` v0.3.0).
- **Data da captura:** 2026-11-15, durante a auditoria da API v1.1 (ver `docs/AUDITORIA-CONCLUSAO-AGROKAIROS.md` e `docs/DECISOES-ARQUITECTURAIS-API.md`).
- **Método:** pedidos `curl` feitos a partir do ambiente de desenvolvimento, só com dados fictícios. Os corpos das respostas foram guardados tal como recebidos.
- **Total:** 50 respostas (47 JSON e 3 em texto: o `Internal Server Error` do `/zonas/{zona}/previsao`).

## Integridade

- Cada ficheiro é uma cópia exacta da resposta recebida, **sem nenhuma alteração** de valores, texto ou formatação. O `sha256` de cada ficheiro está registado em `manifest.json`.
- **Revisão de informação sensível (2026-11-15):** sem credenciais, tokens, cookies, endereços de email, dados pessoais, IPs nem caminhos locais. As respostas incluem só informação pública do serviço: nomes de ficheiros de dados (por exemplo, `hist_imerg_huambo.csv`), hashes sha256 do motor e das saídas, e datas de geração.
- **O código HTTP e o pedido não vêm nas respostas.** Foram reconstruídos a partir dos registos dos comandos da auditoria e estão em `manifest.json` (`method`, `path`, `body`, `status`).

## Conteúdo de `manifest.json`

| Campo | Significado |
|---|---|
| `id`, `file` | Identificador e ficheiro da resposta |
| `method`, `path`, `body` | Pedido exacto (o `path` inclui a query tal como enviada) |
| `status`, `contentType` | Código HTTP e tipo do corpo |
| `category` | `catalogo`, `consulta`, `motor-imerg`, `janela-plantio`, `linha-base`, `metadados`, `contrato-erro` |
| `demo` | `true` se a resposta pode ser usada pelo modo de demonstração |
| `sha256`, `note` | Verificação de integridade e observações |

## Uso no modo de demonstração

Só 8 respostas são elegíveis (`demo: true`). Só essas entram no bundle da aplicação, através de `demo-manifest.json`, o subconjunto elegível de `manifest.json`, e de uma lista explícita de 8 ficheiros em `demo/recordings.js`. As outras 42 respostas e o manifesto completo ficam no repositório para auditoria e testes de integridade. Os testes garantem que `demo-manifest.json` coincide com as entradas `demo: true` de `manifest.json` e que os ficheiros carregados são exactamente esses 8.

| Pedido | Uso |
|---|---|
| `GET /health` | Estado do serviço |
| `GET /api/v1/provinces`, `GET /api/v1/crops` | Catálogos do formulário |
| `POST /api/v1/advisory` + `POST /api/v1/evaluate`: Huambo, Caála, Milho, 2026-11-15 | **A única consulta com as duas fontes** (recomendação em português, sem `lang`) |
| `POST /api/v1/advisory` com `lang: "en"`: Huambo, Caála, Milho, 2026-11-15 | A mesma consulta com a recomendação em inglês (interface em inglês). O `/evaluate` não recebe `lang` e usa a mesma resposta |
| `POST /api/v1/evaluate`: Bié, Arroz, 2026-06-15 | Só avaliação técnica (não há `/advisory` gravado) |
| `POST /api/v1/evaluate`: Huambo, Milho, 2027-10-20 | Só avaliação técnica (não há `/advisory` gravado) |

**Excluídas do modo de demonstração, de propósito:**
- **Respostas a entradas inválidas.** Por exemplo, a recomendação para a cultura inexistente «Batata», um município inexistente ou uma data impossível. Mostrá-las como consulta seria apresentar um resultado sem fundamento.
- **As outras respostas a pedidos com `lang: "en"`.** `adv_mandioca_en` não tem `/evaluate` nem versão em português correspondentes, e `eval_en` nunca é pedida, porque o frontend não envia `lang` ao `/evaluate`. Só `adv_en` é elegível (decisão D3, 2026-11-15).
- **Endpoints que o frontend não usa:** motor IMERG, janela de plantio, linha de base e conformidade.

Todas continuam disponíveis como evidência do contrato v1.1, por exemplo para testes.

## Limitações

- O texto de `recomendacao_extensao` varia entre pedidos (texto gerado). Estas respostas são **uma** amostra.
- As métricas são as do dia da captura. Na data actual, o `/evaluate` indicou `is_fallback_weather: true`, ou seja, climatologia e não observação.
- Estas respostas **não representam condições actuais** e só podem ser apresentadas com a data de captura visível.
