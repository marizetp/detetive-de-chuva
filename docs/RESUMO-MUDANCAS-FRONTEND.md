# Resumo Simples das Mudanças no Frontend (AgroKairos)

Guia rápido para ajudar a equipa a situar-se nas alterações feitas ao frontend (até ao commit `c95c484` em `main`).

---

## 1. O que mudou para o utilizador

1. **Dois ecrãs visuais separados da Consulta Tradicional (`/mapa` e `/ciclo`):**
   - **`/mapa` (Mapa Interactivo):** mostra Angola e faz zoom às 3 províncias do Planalto Central (**Huambo — 11 municípios**, **Bié — 9 municípios**, **Huíla — 13 municípios**), colorindo cada zona por estado (`FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`) conforme a cultura e a data escolhidas. Ao lado mostra também a roda semanal da safra.
   - **`/ciclo` (Ciclo Agrícola):** calendário mensal por fases (inspirado em visualizadores de ciclo) que indica dias/períodos de **muita probabilidade** (`>= 65%`), **média / atenção a falsa partida** (`35–64%`) e **pouca probabilidade / fora de época** (`< 35%`).
   - **`/consulta` (Consulta Tradicional):** continua intacta para obter a recomendação extensa detalhada (`/advisory` e `/evaluate`).

2. **Menus de troca rápida logo acima da consulta:**
   - Foi criada a barra de separadores **`ConsultationModeTabs`** (`Mapa` | `Ciclo` | `Consulta tradicional`) no topo de `/mapa`, `/ciclo` e `/consulta`, permitindo alternar entre vistas e voltar sempre ao formulário tradicional com um clique.

3. **Dados sincronizados entre Mapa e Ciclo:**
   - Província, município, cultura e data passam a viver num contexto único (`ExplorerSelectionProvider`).
   - Alterar uma província, município, cultura ou data no Mapa reflecte-se imediatamente no Ciclo — e ambos usam a mesma avaliação determinística do backend (`avaliacao_atual` e `/api/v1/map-overview`), evitando números diferentes para a mesma selecção.

4. **Linguagem mais transparente e menos texto redundante:**
   - Nos cartões de métricas (`pt.js`, `en.js`, `ResultsArea.test.jsx`), **"Chuva Prevista"** passou a chamar-se **"Precipitação média histórica"** (*"Média histórica de precipitação para este período (2000–2024)"*), deixando claro que o indicador analisa séries históricas e não faz uma previsão determinística do tempo.
   - Foram limpos subtítulos e legendas repetitivas, mantendo os avisos obrigatórios de integridade NASA / IA.

5. **Validação mobile e deploy:**
   - Layout testado em viewport mobile (`375×812`) sem overflow horizontal nas rotas `/`, `/mapa`, `/ciclo` e `/consulta`.
   - `netlify.toml` actualizado com as flags `VITE_API_EVALUATE_LANG`, `VITE_API_IMERG_LANG` e `VITE_API_PLANTING_LANG` a `"true"`.

---

## 2. Mapa de ficheiros (onde mexer se precisar)

| Área | Ficheiro(s) | Para que serve |
|---|---|---|
| **Rotas e Tabs** | `frontend/src/routing/routes.js`<br>`frontend/src/App.jsx`<br>`frontend/src/components/layout/ConsultationModeTabs.jsx`<br>`frontend/src/pages/ConsultationPage.jsx` | Define `/mapa`, `/ciclo`, `/consulta` e renderiza os separadores acima de cada ecrã. |
| **Estado Partilhado** | `frontend/src/contexts/ExplorerSelectionContext.jsx`<br>`frontend/src/contexts/explorerSelectionContext.js`<br>`frontend/src/hooks/useExplorerSelection.js` | Mantém `{ province, municipality, crop, date }` sincronizados entre `/mapa` e `/ciclo`. |
| **Chamadas à API** | `frontend/src/config/api.js`<br>`frontend/src/services/explorer.js` | Liga aos endpoints `/api/v1/municipalities`, `/api/v1/map-overview` e `/api/v1/optimal-planting` (com fallback compatível caso algum endpoint novo falhe com `404`). |
| **Ecrã Principal** | `frontend/src/pages/CycleExplorerPage.jsx` | Orquestra `mode="map"` e `mode="cycle"` com filtros, cartão resumo, alertas de fallback e navegação. |
| **Componentes Visuais** | `frontend/src/components/explorer/AngolaInteractiveMap.jsx`<br>`frontend/src/components/explorer/AgroCycleRing.jsx`<br>`frontend/src/components/explorer/AgroCycleMonthGrid.jsx` | 1) Mapa SVG interactivo (Angola + 33 municípios);<br>2) Roda circular de 52 semanas ISO;<br>3) Calendário mensal colorido por probabilidade + painel da data escolhida. |
| **Dados Geográficos** | `frontend/src/utils/geoProjection.js`<br>`frontend/src/data/municipalities.js`<br>`frontend/src/data/geo/angola-municipios-planalto-2006.json`<br>`frontend/src/data/geo/PROVENIENCIA_ADM2.md` | Projecção SVG sem dependências pesadas e limites simplificados dos 33 municípios do Planalto Central. |
| **Trad./Texto & Config** | `frontend/src/utils/cropDisplay.js`<br>`frontend/src/i18n/messages/pt.js`<br>`frontend/src/i18n/messages/en.js`<br>`netlify.toml` | Nomes localizados das culturas, novas traduções `workspace.*` / `explorer.*`, texto de *Precipitação média histórica* e flags `VITE_API_*_LANG`. |
| **Testes** | `frontend/src/pages/CycleExplorerPage.test.jsx`<br>`frontend/src/pages/ConsultationPage.test.jsx`<br>`frontend/src/components/results/ResultsArea.test.jsx`<br>`frontend/src/routing/routes.test.js` | Testes automatizados das novas rotas, sincronização de dados, separadores e métricas. |

---

## 3. Como correr e testar localmente

No directório `frontend/` (`C:\Users\HP\Desktop\detetive-de-chuva\frontend`):

```bash
# 1. Arrancar servidor de desenvolvimento (ligado ao backend local ou Render)
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev

# 2. Correr testes unitários
npm test -- --run

# 3. Verificar lint e builds (produção + demo isolada)
npm run lint
npm run build
npm run build:demo
node ../scripts/check-demo-isolation.mjs
```

---

## 4. Ligação com o Backend (`Nasa Space Apps`)

- Para ver os detalhes exactos de parâmetros e respostas dos endpoints (`/api/v1/map-overview`, `/api/v1/municipalities`, `ciclo_anual_52s`, `ciclo_mensal_12m` e `avaliacao_atual`), consultar o ficheiro **`API_DOCS.md`** no repositório do backend (`Nasa Space Apps`).
