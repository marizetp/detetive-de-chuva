# AgroKairos — Frontend

Interface web de apoio à decisão agrícola desenvolvida para o **NASA Space Apps Challenge 2026**.
O utilizador escolhe uma província, uma cultura e uma data; a aplicação consulta o backend e
apresenta um relatório com a classificação (`FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`), o nível de
confiança, os indicadores agroclimáticos e a recomendação de extensão.

> Projecto independente. **Não é um serviço oficial da NASA.**

A língua da interface é o português (Angola). O código, os identificadores e os nomes de campos da
API mantêm-se inalterados.

## Objectivo

Ajudar agricultores e técnicos de extensão a perceber se as condições actuais acompanham o
calendário agrícola, apresentando a avaliação do backend de forma clara e honesta: sem inventar
valores, distinguindo as duas fontes (`/advisory` e `/evaluate`), mostrando divergências entre elas
e comunicando incerteza (o nível de confiança não é uma probabilidade nem uma garantia).

## Tecnologias

| Área | Escolha |
|---|---|
| UI | React 19 (JavaScript, sem TypeScript) |
| Build / dev server | Vite 8 |
| Estilos | Tailwind CSS 4, com a paleta por omissão desactivada: só existem os tokens do projecto, em `frontend/src/styles/index.css` |
| Identidade visual | NASA Earth Science — Dark Technology com destaque Aurora Blue: fundos Space Black e Mission Navy, botões com o gradiente Aurora (violeta → azul → cyan) e texto branco, rótulos e interacções em `#6F9BFD`, estados do relatório em verde, laranja e vermelho; o cyan original fica só na gota do logótipo e na ilustração (ver `CLAUDE.md` §7). Não é um serviço oficial da NASA |
| Markdown seguro | `react-markdown` (HTML ignorado) |
| Tipografia | Fontsource, alojamento próprio (Inter, Montserrat, Space Mono) |
| Testes | Vitest + Testing Library + jsdom |
| Lint | ESLint 10 |
| HTTP | `fetch` nativo (sem bibliotecas) |
| Routing | Próprio, sobre a History API (sem React Router) |

## Requisitos

- **Node.js** `>=22.22.2 <23` ou `>=24.15.0` (campo `engines` em `frontend/package.json`;
  desenvolvido com 24.15.0).
- **npm** (o `package-lock.json` está versionado).
- Acesso à Internet para consultar o backend.

## Instalação e execução local

Todos os comandos são executados dentro de `frontend/`:

```sh
cd frontend
npm ci            # instala as dependências exactas do package-lock.json
npm run dev       # servidor de desenvolvimento (por omissão em http://localhost:5173)
```

Não é obrigatório configurar variáveis de ambiente: sem elas, a aplicação usa o backend documentado.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarregamento |
| `npm run lint` | ESLint em todo o projecto |
| `npm test` | Todos os testes, uma vez (`vitest run`) |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run build` | Build de produção em `frontend/dist/` |
| `npm run preview` | Serve localmente o conteúdo de `dist/` |

Antes de propor alterações: `npm run lint && npm test && npm run build`.

## Variáveis de ambiente

O Vite só lê ficheiros `.env*` **dentro de `frontend/`**. Para configurar, copie
`frontend/.env.example` para `frontend/.env.local` (ignorado pelo Git).

| Variável | Predefinição | Notas |
|---|---|---|
| `VITE_API_BASE_URL` | `https://detetive-da-chuva.onrender.com` | Só aceita `http(s)`; a barra final é removida. Valor inválido → aviso na consola e uso da predefinição. |
| `VITE_API_TIMEOUT_MS` | `120000` (120 s) | Inteiro entre `5000` e `300000`. Valor inválido → predefinição. |
| `VITE_DEMO_MODE` | não definida (**desactivado**) | Só `true` activa o modo de demonstração (ver abaixo). Qualquer outro valor ou a ausência mantém a aplicação normal. |

As variáveis `VITE_*` ficam **embutidas no bundle** e são públicas: nunca coloque segredos nelas.
A API não requer autenticação. Para mudar um valor em produção é preciso gerar um novo build.

### Modo de demonstração (`VITE_DEMO_MODE`)

Permite apresentar a aplicação quando o backend não está disponível, **sem inventar dados**.

- **Por omissão está desactivado.** A aplicação fala sempre com a API. O modo nunca é activado
  automaticamente, nem quando a API falha.
- **Activar:** gerar o build com `VITE_DEMO_MODE=true`, em `frontend/.env.local` ou na linha de
  comandos:

  ```sh
  cd frontend
  VITE_DEMO_MODE=true npm run build     # ou: VITE_DEMO_MODE=true npm run dev
  ```

- **Desactivar:** retirar a variável, ou usar outro valor, e gerar um novo build. O valor é lido
  no build, não em tempo de execução.
- **Com o modo activo:**
  - a aplicação **não faz nenhum pedido à rede**;
  - responde só com **7 respostas reais** da API v1.1, gravadas em **15 de novembro de 2026** e
    servidas sem alterações (catálogos, estado do serviço, uma consulta completa e duas só com
    avaliação técnica);
  - qualquer outra consulta mostra «não disponível no modo de demonstração», sem resultado inventado.
- **Natureza dos dados:** são **históricos**. Não representam condições actuais e não são
  actualizados. Uma faixa permanente, em todas as páginas, indica a data da captura e as consultas
  disponíveis.
- **Isolamento:** num build normal, o código e as gravações de demonstração **não existem no
  bundle**. No build de demonstração ficam num ficheiro JS à parte, só com as 7 respostas
  elegíveis.
- **Origem e integridade:** [frontend/src/demo/recordings/2026-11-15/PROVENIENCIA.md](frontend/src/demo/recordings/2026-11-15/PROVENIENCIA.md).
  As 50 respostas gravadas ficam no repositório para auditoria, com o sha256 de cada uma em
  `manifest.json`; só as 7 elegíveis são usadas pela aplicação.

## Backend

- URL: `https://detetive-da-chuva.onrender.com`
- Endpoints usados: `GET /api/v1/provinces`, `GET /api/v1/crops`, `POST /api/v1/advisory`,
  `POST /api/v1/evaluate` (o serviço de `GET /health` existe, mas a interface não o usa).
- Contrato, comportamento observado e questões em aberto:
  **[docs/API-INTEGRATION.md](docs/API-INTEGRATION.md)**.
- **Contrato actual da API (v1.1):** [docs/docs2.md](docs/docs2.md), fornecido pela equipa de
  backend.
- Contrato histórico (v1.0): [docs/backend-api.md](docs/backend-api.md), mantido só para registo.
- Decisões da integração v1.1: [docs/DECISOES-ARQUITECTURAIS-API.md](docs/DECISOES-ARQUITECTURAIS-API.md).
- Auditoria de conclusão e plano: [docs/AUDITORIA-CONCLUSAO-AGROKAIROS.md](docs/AUDITORIA-CONCLUSAO-AGROKAIROS.md).
- Especificação funcional do motor IMERG (`docs/especificacao-funcional.pdf`): documento interno,
  **não publicado**, pendente de uma versão autorizada para publicação.

O serviço está alojado no Render e pode demorar **cerca de 50 s** a responder ao primeiro pedido
depois de um período sem uso (arranque a frio).

## Funcionalidades

- **Página inicial** (`/`): apresentação, funcionamento em três passos, fontes de dados e limites.
- **Consulta** (`/consulta`):
  - formulário com província e cultura carregadas da API e data (hoje ou anterior);
  - pedidos a `/advisory` e `/evaluate` em paralelo e independentes;
  - relatório em cinco secções: resumo, indicadores, recomendação, fundamentação técnica,
    transparência e limitações;
  - detecção e apresentação de divergências entre as duas fontes;
  - avisos quando `/evaluate` indica dados meteorológicos de substituição (`is_fallback_weather`);
  - estados de carregamento (com aviso de arranque a frio), erro, nova tentativa por fonte ou das
    duas, e aviso de relatório desactualizado quando o formulário muda.
- **Página não encontrada** para caminhos desconhecidos.
- Acessibilidade: navegação por teclado, foco visível, estados com texto e ícone (não só cor),
  anúncios para leitores de ecrã.

Não implementado (pendente de confirmação do backend): tendências históricas NASA POWER, mapas.

## Estrutura

```
.
├── CLAUDE.md                 # Regras e decisões do projecto (também usado pelo assistente de IA)
├── README.md
├── docs/
│   ├── API-INTEGRATION.md    # Integração frontend/backend (ler primeiro)
│   ├── DEVELOPMENT-GUIDELINES.md
│   ├── docs2.md              # Contrato actual da API (v1.1)
│   ├── backend-api.md        # Contrato histórico da API (v1.0)
│   ├── DECISOES-ARQUITECTURAIS-API.md   # Decisões da integração v1.1
│   ├── AUDITORIA-CONCLUSAO-AGROKAIROS.md # Auditoria de conclusão e plano P0–P3
│   ├── frontend.md           # Especificação de produto e UX
│   └── Detetive_da_Chuva_Proposta_Formato_Dados.pdf  # Proposta (rascunho) de dados históricos
├── scripts/geo/              # Gera e valida frontend/src/data/geo (fora da aplicação; ver o README)
└── frontend/
    ├── index.html
    ├── package.json · vite.config.js · eslint.config.js · .env.example
    ├── public/_redirects     # Fallback SPA para o Netlify
    └── src/
        ├── main.jsx · App.jsx        # Entrada e layout global
        ├── pages/                    # HomePage, ConsultationPage, NotFoundPage
        ├── components/
        │   ├── home/                 # Secções da página inicial
        │   ├── forms/                # Formulário de consulta e campos
        │   ├── results/              # Relatório e as suas secções
        │   ├── layout/ · ui/ · illustrations/
        ├── services/                 # Única camada que fala com a API
        │   ├── api.js                #   pedido JSON, timeout, cancelamento, erros
        │   ├── catalog.js            #   /health, /provinces, /crops
        │   └── consultation.js       #   /advisory, /evaluate
        ├── hooks/                    # useConsultation, useCatalogOptions, routing, etc.
        ├── utils/                    # mappers (API → view model), validação, formatação, divergências
        ├── config/                   # URL/timeout, caminhos da API, estados, métricas, rótulos
        ├── routing/                  # Rotas e navegação (History API)
        ├── styles/index.css          # Tokens de design e fontes
        ├── data/geo/                 # Limites provinciais (ainda não usados na interface)
        └── test/                     # Utilitários e respostas reais gravadas (só para testes)
```

Arquitectura em camadas: **services** (JSON da API sem alterações) → **utils/mappers**
(view models; valores em falta ficam `null`, nada é inventado) → **hooks** (estado da consulta) →
**components**. O estado é local (hooks do React), sem bibliotecas de gestão de estado.

## Build e publicação

```sh
cd frontend
npm run build     # gera frontend/dist/ (inclui _redirects)
```

O protótipo é publicado manualmente no **Netlify Drop**, arrastando a pasta `frontend/dist`.
O ficheiro `_redirects` (`/* /index.html 200`) permite o acesso directo e o refresh em `/consulta`.

## Colaboração

Ver **[docs/DEVELOPMENT-GUIDELINES.md](docs/DEVELOPMENT-GUIDELINES.md)**.
