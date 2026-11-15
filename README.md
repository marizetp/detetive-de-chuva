# AgroKairos

Agricultural decision-support application built for the **NASA Space Apps Challenge 2026**.
This repository contains both the **frontend** (`frontend/`, React) and the **backend**
(`backend/`, FastAPI). The backend has its own documentation in [backend/README.md](backend/README.md).

Web interface: the user selects a province, a crop and a date; the application queries the backend
and presents a report with the classification (`FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`), the
confidence level, the agroclimatic indicators and the extension recommendation.

> Independent project. **Not an official NASA service.**

Bilingual interface: English (default) and Portuguese (Angola). Code, identifiers and API field
names are kept unchanged in both languages.

## Status (2026-11-15)

| Component | Status | Evidence |
|---|---|---|
| Production frontend | **Published**: <https://agrokairos.netlify.app> (Netlify project `agrokairos`, built from `main`) | Live app serving `/`, `/mapa`, `/ciclo`, and `/consulta` |
| Production API | **Published**: <https://detetive-da-chuva.onrender.com> | Live FastAPI backend (`GET /compliance`, `/health`, `/api/v1/map-overview`, `/api/v1/optimal-planting`) |
| Backend in this repository (`backend/`) | **Synchronized & tested in CI** (`pytest`, startup and smoke test) | Matches latest API v1.1+ features; Render blueprint in `backend/render.yaml` |
| Bilingual support (`en` default / `pt`) | **Implemented & active** (`VITE_API_EVALUATE_LANG`, `VITE_API_IMERG_LANG`, `VITE_API_PLANTING_LANG = "true"` in `netlify.toml`) | `/advisory`, `/evaluate`, `/optimal-planting`, `/map-overview`, `/crops`, `/baseline`, and `/zonas/{zona}/decisao` accept `lang` |
| Interactive Map (`/mapa`) & Sowing Cycle (`/ciclo`) | **Implemented & live** | 3 Central Plateau provinces + 33 municipalities (`angola-municipios-planalto-2006.json`), 52-week radial ring & monthly phase calendar synced with backend |
| NASA Open Data & AI disclosure | **Implemented & machine-readable** | Documented below, in [backend/API_DOCS.md](backend/API_DOCS.md), and served at `GET /compliance` |

## Purpose

Help farmers and extension officers understand whether current conditions match the farming
calendar, presenting the backend's assessment clearly and honestly: without inventing values,
distinguishing the two sources (`/advisory` and `/evaluate`), showing any divergence between them
and communicating uncertainty (the confidence level is neither a probability nor a guarantee).

### Scientific mechanisms

The backend contains independent mechanisms that are never merged into a single decision:

- **Decision engine** (`/advisory` and `/evaluate`): operational assessment by crop and location,
  using a 25-year NASA POWER baseline, Open-Meteo data and crop profiles. When Open-Meteo data is
  unavailable, it uses NASA POWER historical climatology (2000–2024) and `/evaluate` reports
  `is_fallback_weather: true`; the interface then explains that the values are historical
  expectations, not current observations or forecasts.
- **IMERG engine** (`/zonas/{zona}/decisao`): independent assessment of the rainy-season onset and
  false-start risk using NASA GPM IMERG V07. It may return "no conclusion" (`SEM_BASE_FIAVEL`) when
  there is not enough reliable data; that is never shown as a planting decision.
- **Planting window** (`/api/v1/optimal-planting`): planning information combining IMERG indicators
  with crop profiles and NASA POWER historical data.

Only the decision engine, interactive map explorer, and annual sowing cycle are exposed in the interface today; all underlying scientific provenance and uncertainty bounds are preserved cleanly.

## NASA Open Data & AI Usage Disclosure

- **NASA Open Data & Resources (Core Analytical Foundation):**
  - **NASA GPM IMERG V07 (2000–2024):** 25 years of daily gridded precipitation powering rainy-season onset detection (`P50`/`P90`) and false-start risk estimation with Wilson 90% confidence intervals (`ciclo_diario.py v0.3.0`).
  - **NASA POWER / MERRA-2 (2000–2024):** 25 years of daily root-zone soil wetness (`GWETROOT`) and air temperature (`T2M`) establishing monthly percentiles (`P25`/`P50`/`P75`), 52-week suitability curves, and Mann-Kendall climate trend tests.
- **Complementary Sources (Kept Separate from NASA Climatology):** Open-Meteo Weather API (16-day deterministic forecast), Open-Meteo Seasonal API / ECMWF SEAS5 (6-month seasonal outlook), and Public Domain `geoBoundaries` ADM1/ADM2 polygons for Angola.
- **AI Usage Disclosure:** Generative AI (Google Gemini / OpenAI fallback via `backend/src/rag_service.py`) is used *strictly and optionally* to summarize deterministic metrics into farmer-friendly narrative text in `POST /api/v1/advisory` (with a deterministic local fallback when no API key is configured). All rainfall thresholds, soil indices, false-start probabilities, Wilson IC90 confidence bounds, and `ciclo_diario.py` verdicts are **100% deterministic**. AI coding assistants were also used to help draft documentation, UI adjustments, and test scaffolding reviewed by the team. No NASA logos, flags, or mission identifiers are used or modified.

## Technologies

| Area | Choice |
|---|---|
| UI | React 19 (JavaScript, no TypeScript) |
| Build / dev server | Vite 8 |
| Styles | Tailwind CSS 4 with the default palette disabled: only the project tokens exist, in `frontend/src/styles/index.css` |
| Visual identity | NASA Earth Science — Dark Technology with an Aurora Blue accent: Space Black and Mission Navy backgrounds, buttons with the Aurora gradient (violet → blue → cyan) and white text, labels and interactions in `#6F9BFD`, report statuses in green, orange and red; the original cyan is used only in the logo drop and the illustration (see `CLAUDE.md` §7). Not an official NASA service |
| Safe Markdown | `react-markdown` (HTML ignored) |
| Typography | Fontsource, self-hosted (Inter, Montserrat, Space Mono) |
| Tests | Vitest + Testing Library + jsdom |
| Lint | ESLint 10 |
| HTTP | Native `fetch` (no libraries) |
| Routing | Custom, on top of the History API (no React Router) |
| Backend | Python, FastAPI (see [backend/README.md](backend/README.md)) |

## Requirements

- **Node.js** `>=22.22.2 <23` or `>=24.15.0` (`engines` field in `frontend/package.json`;
  developed with 24.15.0).
- **npm** (`package-lock.json` is committed).
- Internet access to reach the backend.
- Optional, for the local backend: Python 3.11 (the version used by `backend/Dockerfile` and CI).

## Installation and local development

Frontend commands run inside `frontend/`:

```sh
cd frontend
npm ci            # install the exact dependencies from package-lock.json
npm run dev       # development server (http://localhost:5173 by default)
```

No environment variables are required: without them, the application uses the documented API.

### Local backend (optional)

The backend (`backend/`) is a Python FastAPI application. The `Dockerfile` and CI use Python 3.11.

```sh
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows; on Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # optional: LLM keys; without them, the text uses a fixed template
uvicorn main:app --reload --port 8000
pytest                            # backend tests
```

To point the frontend at the local backend, create `frontend/.env.local` with
`VITE_API_BASE_URL=http://localhost:8000` and restart `npm run dev`. The backend accepts requests
from any origin (CORS `*`).

- The data the engines need is in `backend/data/` (processed IMERG and NASA POWER series).
  The source NetCDF files (`data/IMERG_V07_2000-2024/`) are not committed.
- Render deployment from this repository is described in `backend/render.yaml` (`rootDir: backend`);
  see "Backend on Render" below.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run lint` | ESLint across the frontend project |
| `npm test` | All tests, once (`vitest run`) |
| `npm run test:watch` | Tests in watch mode |
| `npm run build` | Production build into `frontend/dist/` |
| `npm run preview` | Serve the contents of `dist/` locally |

Before proposing changes: `npm run lint && npm test && npm run build`.

Repository scripts (run from the repository root):

| Command | Purpose |
|---|---|
| `node scripts/smoke-backend.mjs [URL]` | Smoke test of a backend (read and computation requests only); defaults to the production API |
| `node scripts/check-demo-isolation.mjs <prod-dist> <demo-dist>` | Checks by SHA-256 that the production build contains no recordings and the demo build contains only the eligible ones |
| `node scripts/geo/build.mjs` | Geographic data preparation (see [scripts/geo/README.md](scripts/geo/README.md)) |

## Environment variables

Vite only reads `.env*` files **inside `frontend/`**. To configure them, copy
`frontend/.env.example` to `frontend/.env.local` (ignored by Git).

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://detetive-da-chuva.onrender.com` | Only `http(s)` is accepted; a trailing slash is removed. Invalid value → console warning and the default is used. |
| `VITE_API_TIMEOUT_MS` | `120000` (120 s) | Integer between `5000` and `300000`. Invalid value → default. |
| `VITE_API_EVALUATE_LANG` | `"true"` in `netlify.toml` (unset locally by default) | Sends `lang` to `/evaluate`. |
| `VITE_API_IMERG_LANG`, `VITE_API_PLANTING_LANG` | `"true"` in `netlify.toml` (unset locally by default) | Sends `lang` to `/zonas/{zona}/decisao`, `/api/v1/optimal-planting`, and `/api/v1/map-overview`. |
| `VITE_DEMO_MODE` | unset (**disabled**) | Only `true` enables demo mode (see below). Any other value, or no value, keeps the normal application. |

`VITE_*` variables are **embedded in the bundle** and are public: never put secrets in them. The API
requires no authentication. Changing a value in production requires a new build.

### Demo mode (`VITE_DEMO_MODE`)

Lets the application be presented when the backend is unavailable, **without inventing data**.

- **Disabled by default.** The application always talks to the API. Demo mode is never enabled
  automatically, not even when the API fails.
- **Enable:** build with `VITE_DEMO_MODE=true`, in `frontend/.env.local` or on the command line:

  ```sh
  cd frontend
  VITE_DEMO_MODE=true npm run build     # or: VITE_DEMO_MODE=true npm run dev
  ```

- **Disable:** remove the variable, or use another value, and build again. The value is read at
  build time, not at runtime.
- **When enabled:**
  - the application makes **no network requests**;
  - it answers only with **8 real responses** from API v1.1, recorded on **15 November 2026** and
    served unchanged (catalogues, service status, one complete consultation with the
    recommendation in Portuguese and in English, and two consultations with the technical
    assessment only);
  - any other consultation shows "not available in demo mode", with no invented result.
- **Nature of the data:** the responses are **historical**. They do not represent current
  conditions and are not updated. A permanent banner on every page shows the recording date and
  the available consultations.
- **Isolation:** in a normal build, the demo code and recordings **are not in the bundle**. In the
  demo build they are in a separate JS file containing only the 8 eligible responses. CI checks this
  with `scripts/check-demo-isolation.mjs`.
- **Provenance and integrity:** [frontend/src/demo/recordings/2026-11-15/PROVENIENCIA.md](frontend/src/demo/recordings/2026-11-15/PROVENIENCIA.md)
  (in Portuguese). All 50 recorded responses are kept in the repository for audit, with the SHA-256
  of each one in `manifest.json`; only the 8 eligible responses are used by the application.

## Backend

- Production API URL: `https://detetive-da-chuva.onrender.com`
- Main endpoints used by the interface: `GET /api/v1/provinces`, `GET /api/v1/crops`,
  `GET /api/v1/municipalities`, `GET /api/v1/map-overview`, `GET /api/v1/optimal-planting`,
  `GET /api/v1/baseline/{provincia}`, `POST /api/v1/advisory`, `POST /api/v1/evaluate`
  (plus `GET /compliance`, `GET /health`, and IMERG endpoints `/zonas/*`).
- Full backend API guide (with live schemas & Explorer sync fields):
  **[backend/API_DOCS.md](backend/API_DOCS.md)** and **[docs/RESUMO-MUDANCAS-FRONTEND.md](docs/RESUMO-MUDANCAS-FRONTEND.md)**.
- Integration notes and contracts: **[docs/API-INTEGRATION.md](docs/API-INTEGRATION.md)** and [docs/docs2.md](docs/docs2.md).

The service is hosted on Render and may take **about 50 s** to answer the first request after a
period of inactivity (cold start).

## Features

- **Home page** (`/`): introduction, how it works in three steps, data sources and limitations.
- **Interactive Map** (`/mapa`): Angola ADM1 overview + ADM2 municipal zoom across Huambo (11 municipalities), Bié (9), and Huíla (13), colored dynamically (`FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`) from `GET /api/v1/map-overview` with shared crop/location/date selection.
- **Sowing Cycle Explorer** (`/ciclo`): radial 52-ISO-week suitability ring + monthly phase-colored calendar (`>=65%` high, `35–64%` caution, `<35%` low) synchronized with `/api/v1/optimal-planting` and `/api/v1/map-overview`.
- **Traditional Consultation** (`/consulta`):
  - form with province, optional municipality and crop loaded from the API, and a date (today or a
    future date, for planning);
  - quick mode tabs (`Mapa` | `Ciclo` | `Consulta tradicional`) above each analysis screen;
  - parallel, independent requests to `/advisory` and `/evaluate`; the recommendation is requested in
    the interface language;
  - report: verdict and confidence, indicators (*Historical mean rainfall (7 days)*), alternative weather data notice, recommendation and
    technical details, with the scientific mechanism identified;
  - detection and display of divergences between the two sources;
  - notices when `/evaluate` reports substitute weather data (`is_fallback_weather`);
  - loading states (with a cold-start notice), errors, retry per source or for both, and a stale
    report notice when the form changes.
- **Not found page** for unknown paths.
- Accessibility: keyboard navigation, visible focus, statuses shown with text and icon (not colour
  alone), screen-reader announcements, and validated mobile viewport (`375×812`) without horizontal overflow.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:
- **frontend:** `npm test`, `npm run lint`, production build, demo build and
  `scripts/check-demo-isolation.mjs` (no recordings in production; only the eligible ones in the
  demo build);
- **backend:** Python 3.11, `pip install`, baseline initialisation, `pytest`, FastAPI startup and
  `scripts/smoke-backend.mjs` against the local API.

## Structure

```
.
├── AgroKairos_NASA_Space_Apps.pptx  # 7-slide NASA Space Apps Challenge presentation deck (EN)
├── CLAUDE.md                 # Project rules and decisions (also used by the AI assistant)
├── README.md
├── netlify.toml              # Netlify build configuration (frontend + VITE_API_*_LANG flags)
├── .github/workflows/ci.yml  # Continuous integration (frontend and backend)
├── docs/
│   ├── RESUMO-MUDANCAS-FRONTEND.md  # Team summary of interactive map & sowing cycle changes
│   ├── API-INTEGRATION.md    # Frontend/backend integration (read first)
│   ├── DEVELOPMENT-GUIDELINES.md
│   ├── docs2.md              # Current API contract (v1.1)
│   ├── backend-api.md        # Historical API contract (v1.0)
│   ├── DECISOES-ARQUITECTURAIS-API.md   # v1.1 integration decisions
│   ├── AUDITORIA-CONCLUSAO-AGROKAIROS.md # Completion audit and P0–P3 plan
│   ├── ESPECIFICACAO-BACKEND-I18N.md    # Language specification
│   ├── frontend.md           # Product and UX specification
│   └── Detetive_da_Chuva_Proposta_Formato_Dados.pdf  # Draft proposal for historical data
├── scripts/
│   ├── geo/                  # Builds and validates frontend/src/data/geo (outside the app; see its README)
│   ├── smoke-backend.mjs     # Backend smoke test (node scripts/smoke-backend.mjs <URL>)
│   └── check-demo-isolation.mjs  # Production/demo build isolation check
├── backend/                  # FastAPI API (see backend/README.md and backend/API_DOCS.md)
│   ├── main.py               # Application and routes
│   ├── ciclo_diario.py       # IMERG engine v0.3.0 (verified by SHA-256)
│   ├── src/                  # Decision engine, baseline, weather, text generation, schemas
│   ├── data/                 # Processed IMERG and NASA POWER series
│   ├── tests/                # pytest
│   └── render.yaml · Dockerfile · Procfile
└── frontend/
    ├── index.html
    ├── package.json · vite.config.js · eslint.config.js · .env.example
    ├── public/_redirects     # SPA fallback for Netlify
    └── src/
        ├── main.jsx · App.jsx        # Entry point, global layout, and ExplorerSelectionProvider
        ├── pages/                    # HomePage, CycleExplorerPage (/mapa & /ciclo), ConsultationPage, NotFoundPage
        ├── components/
        │   ├── explorer/             # AngolaInteractiveMap, AgroCycleRing, AgroCycleMonthGrid
        │   ├── home/                 # Home page sections
        │   ├── forms/                # Consultation form and fields
        │   ├── results/              # Report and its sections
        │   └── layout/ · ui/ · illustrations/
        ├── contexts/                 # ExplorerSelectionContext (shared state between /mapa and /ciclo)
        ├── services/                 # The only layer that talks to the API
        │   ├── api.js                #   JSON requests, timeout, cancellation, errors
        │   ├── catalog.js            #   /health, /provinces, /crops
        │   ├── consultation.js       #   /advisory, /evaluate
        │   ├── explorer.js           #   /map-overview, /optimal-planting, /baseline
        │   └── scientific.js         #   IMERG and planting window services
        ├── hooks/                    # useConsultation, useCatalogOptions, useExplorerSelection, routing
        ├── utils/                    # mappers, geoProjection, cropDisplay, validation, formatting, divergences
        ├── config/                   # URL/timeout, API paths, statuses, metrics, labels
        ├── i18n/                     # Language provider, EN/PT dictionaries, review list
        ├── demo/                     # Isolated demo mode and real recordings
        ├── routing/                  # Routes and navigation (History API + WORKSPACE_TABS)
        ├── styles/index.css          # Design tokens and fonts (Inter, Montserrat, Space Mono)
        ├── data/                     # municipalities.js (33) & geo/ (ADM1 + Central Plateau ADM2)
        └── test/                     # Test utilities and recorded real responses (tests only)
```

Layered architecture: **services** (API JSON, unchanged) → **utils/mappers** (view models; missing
values become `null`, nothing is invented) → **hooks** (consultation state) → **components**. State
is local (React hooks), with no state-management libraries.

## Build and deployment

```sh
cd frontend
npm run build     # produces frontend/dist/ (includes _redirects)
```

The `_redirects` file (`/* /index.html 200`) allows direct access to, and refresh of, `/consulta`.

### Backend on Render (new service, separate from production)

The existing service (`https://detetive-da-chuva.onrender.com`) is not changed. The new service has
**not been created yet**; it can be created in two ways:

- **Blueprint:** Render → New → Blueprint → this repository, path `backend/render.yaml`.
  This creates the `agrokairos-api` service and asks for the value of `GEMINI_API_KEY`.
- **Manual:** New → Web Service, with the values below (the same as in `backend/render.yaml`):

| Field | Value |
|---|---|
| Repository / branch | this repository / `main` |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt && python -c "from src.baseline_engine import BaselineEngine; BaselineEngine().load_baseline()"` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Variables | `PYTHON_VERSION=3.11.11` (the same version as the `Dockerfile`); `ENVIRONMENT=production`; `LLM_PROVIDER=gemini`; `LLM_MODEL=gemini-3.5-flash`; `GEMINI_API_KEY` (secret, optional: without it the recommendation text uses a fixed template) |

- With `ENVIRONMENT=production`, `/docs`, `/redoc` and `/openapi.json` are disabled by design. To
  view them on a validation service, set `ENVIRONMENT=development` temporarily.
- The data the engines need is in `backend/data/` and ships with the repository. At runtime, the
  backend verifies the SHA-256 of the IMERG engine (`ciclo_diario.py`).
- Validate the new service with the smoke test (read and computation requests only):

  ```sh
  node scripts/smoke-backend.mjs https://<new-service>.onrender.com
  ```

### Frontend on Netlify

`netlify.toml` (repository root): base `frontend`, `npm run build`, publish `dist`, SPA fallback,
`NODE_VERSION=24`. The API URL is **not** in the code: it comes from `VITE_API_BASE_URL` (the
documented API by default).

- To test the new backend, set `VITE_API_BASE_URL=https://<new-service>.onrender.com` only in the
  **Deploy Previews** (or **Branch deploys**) context of the site's environment variables, and open
  the deploy preview of a pull request. Production does not change.
- Once validated, set the same variable in the **Production** context and redeploy. To roll back,
  delete the variable (the documented API is used again) and redeploy.
- `NODE_VERSION=24` matches the `engines` field of `frontend/package.json` (Node `>=22.22.2 <23` or
  `>=24.15.0`).
- The value is read at build time: after changing the variable, a new deploy is required.

## Contributing

See **[docs/DEVELOPMENT-GUIDELINES.md](docs/DEVELOPMENT-GUIDELINES.md)**.
