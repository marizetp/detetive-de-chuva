# AgroKairos — Agroclimatic Decision Support System (Backend)

### Central Plateau of Angola (Huambo, Bié, and Huíla)

> **Independent Hackathon Project (NASA Space Apps Challenge).** This platform is **not an official NASA service** and does not use, contain, or modify any NASA logos, flags, or mission identifiers.

**AgroKairos** is an open-source analytical backend and decision-support API built to help smallholder farmers and rural extension workers in Angola's Central Plateau decide **when it is safe to sow** and identify the **optimal planting window** for five food crops (**Maize/Milho**, **Common Bean/Feijão**, **Soybean/Soja**, **Cassava/Mandioca**, and **Rice/Arroz**), protecting households against **false starts of the rainy season** and seed loss.

---

## NASA Open Data & Resources Used

The system uses NASA Earth observation and reanalysis datasets as the **core analytical foundation**:

1. **NASA GPM IMERG V07 (2000–2024):**
   - 25 seasonal NetCDF files (`data/IMERG_V07_2000-2024/imerg_2000.nc` … `imerg_2024.nc`) covering Angola's Central Plateau (`0.1°` spatial grid, September–February agricultural seasons).
   - Processed via `src/extract_imerg.py` into verified historical series (`data/hist_imerg_huambo.csv`, `data/hist_imerg_bie.csv`, `data/hist_imerg_huila.csv`) powering Kaplan-Meier rainfall onset quantiles (`P50`, `P90`) and false-start risk curves with **Wilson 90% confidence intervals (IC90)** in `ciclo_diario.py v0.3.0`.
2. **NASA POWER / MERRA-2 (2000–2024):**
   - 25 years of daily root-zone soil wetness (`GWETROOT`) and air temperature (`T2M`) establishing monthly percentiles (`P25`/`P50`/`P75`), weekly sowing curves, and **Mann-Kendall** climate trend analysis (`src/baseline_engine.py`).
3. **Complementary Weather & Seasonal Forecasts (Strictly Separated from NASA Climatology):**
   - **Open-Meteo Weather API:** 16-day deterministic short/medium-range forecast (`src/weather_service.py`).
   - **Open-Meteo Seasonal API (ECMWF SEAS5):** 6-month seasonal outlook for upcoming crop planning.

---

## AI Usage Disclosure (Code, Data, and Advisory Text)

In strict compliance with NASA Space Apps transparency guidelines:

- **Generative AI for Extension Text (`POST /api/v1/advisory`):** When an API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`) is configured, `src/rag_service.py` uses **Google Gemini** (or OpenAI fallback) to synthesize formal, jargon-free agricultural guidance (`recomendacao_extensao`) in Portuguese (`pt-AO`, default) or English (`en`) strictly from pre-computed deterministic indicators. When no LLM key is set, a deterministic local template generates the guidance.
- **100% Deterministic Scientific & Statistical Core:** Generative AI is **never** used to compute rainfall thresholds, soil moisture suitability, false-start probabilities, Wilson IC90 confidence bounds, Mann-Kendall trends, or `ciclo_diario.py v0.3.0` verdicts. Those outputs are 100% deterministic and reproducible, with engine integrity verified via SHA-256 (`b0f0ed5d336339d64e577b0a52ca6d54a1e7a919f89ffcfa1416f09bc7148feb`).
- **AI-Assisted Development:** AI coding assistants were used to assist in drafting documentation, wrapper boilerplate, and automated test scaffolding, all reviewed, integrated, and verified by the engineering team.
- **Machine-Readable Metadata:** The API exposes this disclosure and NASA dataset attribution directly via `GET /`, `GET /compliance`, and `GET /fontes/saude`.

---

## Key Capabilities & Scientific Principles ("Rule of Gold")

- **False-Start Risk Protection (`ciclo_diario.py v0.3.0`):** Strict mapping of official motor codes (`FAVORAVEL_INDICATIVO` → `PLANTAR (indicativo)`, `AGUARDAR_*` → `AGUARDAR`, `SEM_BASE_FIAVEL` → `SEM CONCLUSÃO`, `FORA_DA_EPOCA` → `SEM CONCLUSÃO (fora da época)`).
- **No False Certainty:** Historical favorable planting probabilities and false-start risks use conservative **Wilson 90% confidence interval bounds** (clamped between `5.0%` and `95.0%`), never reporting `0%` or `100%` as certainty.
- **Strict Data Provenance Separation:** 16-day Open-Meteo deterministic forecasts, 6-month ECMWF SEAS5 outlooks, 25-year NASA GPM IMERG V07 rainfall, and NASA POWER auxiliary soil indicators are labeled separately and never mixed or misrepresented as IMERG observations.
- **Bilingual Support:** Primary documentation and technical endpoints are documented in English, while supporting both **Portuguese (Angola, `lang="pt"` default)** and **English (`lang="en"`)** in `POST /api/v1/advisory`.

---

## Architecture Overview

```text
main.py                      # FastAPI application, CORS, security (/docs off in production), REST routes
ciclo_diario.py              # Official deterministic IMERG motor v0.3.0 (SHA-256 verified, unmodified)
src/
├── config.py                # Provinces, municipalities, 5 crop profiles, NASA & AI compliance metadata
├── schemas.py               # Pydantic v2 request/response contracts (incl. optional lang='pt'|'en')
├── extract_imerg.py         # Extracts 25 NASA GPM IMERG V07 NetCDF files + POWER into verified CSVs
├── baseline_engine.py       # 25-year NASA POWER statistics, weekly curves, Mann-Kendall trends
├── weather_service.py       # Open-Meteo 16-day deterministic forecast + 6-month ECMWF SEAS5 outlook
├── decision_engine.py       # Deterministic rule engine for /api/v1/evaluate & /api/v1/advisory
├── ciclo_engine_adapter.py  # Thread-safe orchestrator for ciclo_diario.py & optimal planting windows
└── rag_service.py           # Bilingual (PT/EN) narrative synthesis (Gemini/OpenAI + deterministic fallback)
tests/                       # Automated pytest suite (API, baseline, decision, weather, IMERG motor)
```

---

## Complete API Reference

For full request/response schemas, error handling, frontend UI/UX badge mapping rules, and live `curl` / `fetch` examples across all **17 endpoints**, see **[API_DOCS.md](API_DOCS.md)**.

### Quick Endpoint Summary

| Group | Endpoint | Purpose |
|---|---|---|
| **Compliance & Health** | `GET /`, `GET /health`, `GET /compliance`, `GET /fontes/saude` | Service health, SHA-256 integrity, NASA open-data attribution, AI usage disclosure |
| **Catalog Metadata** | `GET /api/v1/provinces`, `GET /api/v1/crops` | Active provinces (`Huambo`, `Bié`, `Huíla`) & 5 crops (`Milho`, `Feijão`, `Soja`, `Mandioca`, `Arroz`) |
| **Date-Specific Advisory** | `POST /api/v1/advisory`, `POST /api/v1/evaluate` | Deterministic evaluation + optional PT/EN RAG advisory narrative |
| **Historical Baseline** | `GET /api/v1/baseline/{provincia}` | 25-year NASA POWER monthly percentiles, weekly curves, Mann-Kendall trends |
| **Optimal Planting Window** | `GET /api/v1/optimal-planting`, `GET /zonas/{zona}/epoca-plantio` | Recommended crop sowing window, Wilson IC90 probability, 26-week curve & 6m outlook |
| **IMERG Motor (Sec. 7)** | `GET /zonas`, `/decisao`, `/curva-risco`, `/falsa-partida`, `/indicadores`, `/previsao` | Official `ciclo_diario.py v0.3.0` outputs, IC90 risk curve, dry-day breakdown & 16-day forecast |

---

## Local Setup & Running Tests

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the API Server Locally
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI (available when `ENVIRONMENT != production`): `http://127.0.0.1:8000/docs`
- Compliance & AI disclosure JSON: `http://127.0.0.1:8000/compliance`

### 3. Run the Automated Test Suite
```bash
pytest -v
```

### 4. Production Deployment (Render / Docker / Railway)
Configuration files (`render.yaml`, `Procfile`, `Dockerfile`) are included. Set `ENVIRONMENT=production` in production to automatically disable `/docs`, `/redoc`, and `/openapi.json`.
