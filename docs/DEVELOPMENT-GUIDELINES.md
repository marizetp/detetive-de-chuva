# Orientações de desenvolvimento

Regras simples para uma equipa pequena (frontend + backend) a trabalhar no mesmo repositório.

## 1. Branches

- `main` é a versão estável: é dela que sai o build publicado. **Não se faz commit directo em `main`.**
- Cada alteração é feita num ramo curto, criado a partir de `main` actualizado:

| Prefixo | Uso | Exemplo |
|---|---|---|
| `feat/` | Nova funcionalidade | `feat/health-indicator` |
| `fix/` | Correcção | `fix/date-validation-timezone` |
| `docs/` | Só documentação | `docs/api-integration-update` |
| `chore/` | Configuração, dependências, ferramentas | `chore/update-vite` |

- O ramo é integrado em `main` por **pull request**, revisto por outra pessoa sempre que possível,
  e apagado depois do merge.
- Ramos pequenos e de vida curta (idealmente dias, não semanas) evitam conflitos.

## 2. Antes de abrir uma pull request

Dentro de `frontend/`:

```sh
npm run lint
npm test
npm run build
```

Os três têm de passar. Se algum não puder ser executado, diga-o na descrição da PR.

## 3. Descrição da pull request

Inclua:

- **O quê:** resumo da alteração.
- **Porquê:** problema resolvido ou decisão tomada.
- **Como testar:** passos concretos (ex.: «consultar Huíla + Milho com data 2026-08-01»).
- **Impacto na API:** se a alteração depende de, ou altera, o contrato com o backend.
- **Verificações:** resultado de lint, testes e build; se foi visto em mobile e desktop.

## 4. Contrato da API

- `docs/API-INTEGRATION.md` descreve o que o frontend envia e espera. `docs/backend-api.md` é o
  contrato fornecido pelo backend.
- **Qualquer alteração ao contrato** (campos, tipos, nomes, códigos de estado, endpoints, formato de
  erros) é **comunicada antes de ser implementada**, numa issue ou numa PR só de documentação, e
  só depois aplicada nos dois lados.
- Campos novos devem ser **aditivos** sempre que possível, para não partir a versão publicada.
- Um campo só passa a ser usado pelo frontend depois de documentado. Campos observados mas não
  documentados (ex.: `detalhes_agroclimaticos`) são tratados como opcionais e instáveis.
- Ao confirmar uma questão da secção 9 de `API-INTEGRATION.md`, actualize o documento: mude a marca
  **[?]** para **[Doc]** e registe a resposta.

## 5. Camada de integração (`frontend/src/services/`)

- Todas as chamadas à API passam por `services/`. Componentes e páginas não chamam `fetch`.
- `services/` devolve o JSON **tal como recebido**. A conversão para a interface é feita em
  `utils/mappers.js`.
- Antes de alterar a integração, leia os testes que fixam o seu comportamento (timeout,
  cancelamento, erros, independência das duas fontes, campos em falta):

| Ficheiro | Testes |
|---|---|
| `services/api.js` | `services/api.test.js` |
| `services/catalog.js`, `services/consultation.js` | `services/catalog.test.js`, `services/consultation.test.js` |
| `utils/mappers.js` | `utils/mappers.test.js` |
| `hooks/useConsultation.js` (sem testes próprios) | `pages/ConsultationPage.test.jsx` |
- Caminhos de endpoints e constantes ficam em `config/api.js`; não os repita noutros ficheiros.

## 6. Dados e comunicação científica

- Não inventar valores, indicadores, justificações ou recomendações.
- Dados de teste ou demonstração nunca são apresentados como resultados reais. Os fixtures de
  `src/test/` não podem ser importados em código de produção (regra ESLint).
- O nível de confiança não é uma probabilidade nem uma garantia; uma data de sementeira não é
  apresentada como garantida.

## 7. Segredos e ficheiros locais

- Nunca versionar `.env`, `.env.local` ou credenciais. Só `frontend/.env.example` é versionado.
- Variáveis `VITE_*` são públicas (ficam no bundle): nunca contêm segredos.
- `node_modules/`, `dist/` e `coverage/` não são versionados.

## 8. Commits

Mensagens curtas, no imperativo, com prefixo:

```
feat: add health indicator to consultation page
fix: keep report when form anchor link is used
docs: record backend answer on data_consulta granularity
```

## 9. Publicação

O protótipo é publicado manualmente no Netlify Drop a partir de `frontend/dist`, gerado a partir de
`main` (ver `README.md`). Não publique builds feitos a partir de ramos não integrados.
