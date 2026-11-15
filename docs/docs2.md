# AgroKairos — Complete API & Frontend Integration Guide

> **Primary Language:** English (with Portuguese `pt-AO` agricultural output labels documented for Angola's Central Plateau UI).  
> **Project Status Notice:** Independent hackathon project for the **NASA Space Apps Challenge**. **Not an official NASA service.**

---

## Base URLs & Transport

| Environment | Base URL | Swagger / OpenAPI | Notes |
|---|---|---|---|
| **Local Development** | `http://127.0.0.1:8000` | Enabled (`/docs`, `/redoc`, `/openapi.json`) | Recommended for local frontend testing (`VITE_API_BASE_URL=http://127.0.0.1:8000`) |
| **Production (Render)** | `https://detetive-da-chuva.onrender.com` | **Disabled (`404`)** when `ENVIRONMENT=production` | Free-tier cold start can take ~50s on the first request; set frontend timeout `>= 60000ms` (recommended `120000ms`) |

- **Content Type:** `application/json` (UTF-8)
- **Authentication:** None required (public, password-unrestricted read/query endpoints)
- **CORS:** Enabled (`allow_origins=["*"]`)

---

## Table of Contents

1. [Monitoring, Compliance & AI Disclosure Endpoints](#1-monitoring-compliance--ai-disclosure-endpoints)
   - `GET /`
   - `GET /health`
   - `GET /compliance`
   - `GET /fontes/saude`
2. [Catalog Endpoints (Dropdowns & Crop Metadata)](#2-catalog-endpoints)
   - `GET /api/v1/provinces`
   - `GET /api/v1/crops` *(5 crops: Milho, Feijão, Soja, Mandioca, Arroz)*
3. [Date-Specific Agricultural Advisory (Original Core)](#3-date-specific-agricultural-advisory)
   - `POST /api/v1/advisory` *(supports `lang: "pt"` or `"en"`)*
   - `POST /api/v1/evaluate`
   - `GET /api/v1/baseline/{provincia}`
4. [Optimal Planting Window / Crop Season Planner (New Feature)](#4-optimal-planting-window--crop-season-planner)
   - `GET /api/v1/optimal-planting` and `GET /zonas/{zona}/epoca-plantio`
5. [IMERG Scientific Motor Endpoints (`ciclo_diario.py v0.3.0`)](#5-imerg-scientific-motor-endpoints-ciclo_diariopy-v030)
   - `GET /zonas`
   - `GET /zonas/{zona}/decisao` and `GET /zonas/{zona}/decisao/{data_ref}`
   - `GET /zonas/{zona}/curva-risco[/{data_ref}]`
   - `GET /zonas/{zona}/falsa-partida[/{data_ref}]`
   - `GET /zonas/{zona}/indicadores[/{data_ref}]`
   - `GET /zonas/{zona}/previsao[/{data_ref}]`
6. [Frontend UI/UX Rules & Scientific Guardrails ("Rule of Gold")](#6-frontend-uiux-rules--scientific-guardrails)
7. [HTTP Error Codes & Resilience](#7-http-error-codes--resilience)

---

## 1. Monitoring, Compliance & AI Disclosure Endpoints

### `GET /`
Returns API operational status, supported languages, NASA open-data list, AI usage disclosure summary, and endpoint map.

### `GET /health`
Verifies server readiness and active catalogs.

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "baseline_ready": true,
  "provincias_ativas": ["Huambo", "Bié", "Huíla"],
  "culturas_ativas": ["Milho", "Feijão", "Soja", "Mandioca", "Arroz"],
  "data_servidor": "2026-11-15"
}
```

### `GET /compliance`
Machine-readable **NASA Space Apps compliance & transparency payload**. The frontend can fetch this endpoint to dynamically display verified NASA data citations, non-affiliation notices, and mandatory AI usage disclosures.

**Response (`200 OK`) — Key Fields:**
- `independent_project_notice`: `"Independent hackathon project. Not an official NASA service. Does not use, contain, or modify any NASA logos, flags, or mission identifiers."`
- `nasa_open_data_and_resources`: Array detailing `NASA GPM IMERG V07 (2000-2024)` and `NASA POWER / MERRA-2 (2000-2024)`.
- `complementary_weather_sources`: Array detailing `Open-Meteo Weather API` (16-day forecast) and `Open-Meteo Seasonal API (ECMWF SEAS5)` (6-month outlook).
- `ai_usage_disclosure`: Declares optional generative AI (`Google Gemini / OpenAI fallback`) used strictly for extension text synthesis in `POST /api/v1/advisory` + AI-assisted drafting, while confirming all quantitative calculations (`ciclo_diario.py`, Wilson IC90, Mann-Kendall, thresholds) are 100% deterministic.
- `motor_integrity`: `{ "versao": "0.3.0", "sha256": "b0f0ed5d...", "integro": true }`.

### `GET /fontes/saude`
Returns integrity status of `ciclo_diario.py` (SHA-256), per-source status (`imerg_historico`, `imerg_observado`, `open_meteo`, `sazonal`), last zone executions, NASA open-data attribution, and `ai_usage_disclosure`.

---

## 2. Catalog Endpoints

### `GET /api/v1/provinces`
Returns supported provinces for selectors.

**Response (`200 OK`):**
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
*(Also returns `bie` / `Bié` and `huila` / `Huíla`.)*

### `GET /api/v1/crops`
Returns all **5 supported crops** with agronomic thresholds and UI icons.

**Response (`200 OK`):**
```json
[
  {
    "id": "milho",
    "nome": "Milho",
    "nome_cientifico": "Zea mays",
    "icone": "🌽",
    "profundidade_sementeira_cm": 5,
    "min_chuva_abertura_mm": 20.0,
    "notas_agronomicas": "Cultura base de segurança alimentar no Planalto Central. Exige boa humidade inicial até 5 cm."
  }
]
```
Supported `nome` values: `"Milho"`, `"Feijão"`, `"Soja"`, `"Mandioca"`, `"Arroz"`.

---

## 3. Date-Specific Agricultural Advisory

### `POST /api/v1/advisory`
Evaluates agronomic viability for a province (and optional municipality), crop, and target date, then generates formal farmer extension guidance (`recomendacao_extensao`).

#### Request Body (`application/json`)
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `provincia` | `string` | **Yes** | — | `"Huambo"`, `"Bié"`, `"Huíla"` (accent-insensitive: `"Bie"`, `"Huila"` accepted) |
| `municipio` | `string` | No | Province center | e.g. `"Caála"`, `"Bailundo"`, `"Kuito"`, `"Matala"` |
| `cultura` | `string` | No | `"Milho"` | `"Milho"`, `"Feijão"`, `"Soja"`, `"Mandioca"`, `"Arroz"` |
| `data_consulta` | `string` | No | Today (`YYYY-MM-DD`) | Past, current, or future strategic planning date |
| `lang` | `string` | No | `"pt"` | `"pt"` (Portuguese - Angola) or `"en"` (English) |

#### Example Request (English output)
```json
{
  "provincia": "Huambo",
  "municipio": "Caála",
  "cultura": "Milho",
  "data_consulta": "2026-11-15",
  "lang": "en"
}
```

#### Response (`200 OK`)
```json
{
  "status": "FAVORAVEL",
  "score_confianca": 86,
  "metricas": {
    "chuva_acumulada_recente_mm": 38.4,
    "humidade_solo_raiz": 0.46,
    "previsao_7dias_mm": 44.2
  },
  "recomendacao_extensao": "**FAVORABLE: November 2026 presents favorable conditions for planning and sowing Milho in Huambo province.**\n\n..."
}
```
> **Important for Frontend:** `status` is always one of `"FAVORAVEL"`, `"AGUARDAR"`, or `"DESFAVORAVEL"` regardless of `lang`.

---

### `POST /api/v1/evaluate`
Deterministic rule evaluation **without LLM narrative generation**. Fast and ideal for compact summaries, divergence checks against `/advisory`, or offline/low-bandwidth mode.

- **Request Body:** Same as `POST /api/v1/advisory` (`provincia`, `municipio`, `cultura`, `data_consulta`).
- **Response (`200 OK`):** Returns `status`, `score_confianca`, `triggers_ativados`, `justificacoes_tecnicas`, `metricas`, `is_fallback_weather`, and `detalhes_agroclimaticos`.
- **Frontend Rule:** If `is_fallback_weather === true`, show a notice that real-time Open-Meteo data was unavailable and historical/seasonal climatology was used as fallback.

---

### `GET /api/v1/baseline/{provincia}`
Returns the full **25-year NASA POWER (2000–2024)** statistical baseline for `Huambo`, `Bié`, or `Huíla`:
- `linha_base_mensal` (months `1`..`12`: `chuva_media_mensal_mm`, `probabilidade_dia_chuvoso_pct`, `gwetroot_p25`, `gwetroot_p50`, `gwetroot_p75`, `temperatura_media_c`)
- `curva_sementeira_semanal` (ISO weeks `1`..`52`: `probabilidade_sementeira_pct`, `humidade_raiz_mediana`, `chuva_semanal_media_mm`)
- `analise_tendencias_mann_kendall` (`precipitacao_anual`, `temperatura_media_anual`)

---

## 4. Optimal Planting Window / Crop Season Planner

### `GET /api/v1/optimal-planting` *(alias: `GET /zonas/{zona}/epoca-plantio`)*
Automatically computes the recommended sowing window for a given agricultural season (`Safra`), crop, and province by crossing **25 years of NASA GPM IMERG V07** Kaplan-Meier onset quantiles (`P50`/`P90`) + false-start risk curves with **NASA POWER** soil/temperature curves and an optional **6-month ECMWF SEAS5** seasonal outlook.

#### Query Parameters
| Parameter | Required | Default | Example | Notes |
|---|---|---|---|---|
| `zona` / `provincia` | No | `"huambo"` | `Huambo` or `huambo` | Accepts `"Huambo"`, `"Bié"`, `"Huíla"`, `"bie"`, `"huila"`, `"kuito"`, `"lubango"` |
| `cultura` | No | `"Milho"` | `Arroz` | `"Milho"`, `"Feijão"`, `"Soja"`, `"Mandioca"`, `"Arroz"` |
| `epoca_agricola` | No | `"2024/2025"` | `2025/2026` | Format `YYYY/YYYY` |

#### Example Request
```bash
curl "http://127.0.0.1:8000/api/v1/optimal-planting?provincia=Huambo&cultura=Milho&epoca_agricola=2024/2025"
```

#### Response (`200 OK`) — Verified Schema
```json
{
  "zona": "huambo",
  "provincia": "Huambo",
  "cultura": "Milho",
  "icone_cultura": "🌽",
  "epoca_agricola": "2024/2025",
  "janela_recomendada": {
    "inicio": "2024-10-12",
    "fim": "2024-12-05",
    "descricao_periodo": "12/10/2024 a 05/12/2024",
    "inicio_chuvas_mediano_imerg": "2024-09-30",
    "consolidacao_chuvas_p90_imerg": "2024-10-19"
  },
  "probabilidade_condicoes_favoraveis_pct": 89.9,
  "risco_falsa_partida": {
    "data_referencia": "15 Out",
    "probabilidade_pct": 0.0,
    "ic90_pct": [0.0, 10.1],
    "frequencia_historica": "0 de 24 épocas",
    "nota": "risco estimado a partir de épocas passadas (IMERG V07); não é certeza"
  },
  "condicoes_historicas_epoca": {
    "outubro_chuva_mm": 79.8,
    "novembro_chuva_mm": 219.5,
    "dezembro_chuva_mm": 178.0,
    "humidade_solo_raiz_nov_p50": 0.48,
    "temperatura_media_nov_c": 20.5
  },
  "exigencia_cultura": {
    "chuva_abertura_3d_mm": 20.0,
    "chuva_mensal_min_mm": 80.0,
    "humidade_raiz_min": 0.35,
    "limite_encharcamento": 0.78,
    "profundidade_cm": 5,
    "notas_agronomicas": "..."
  },
  "curva_semanal_safra": [
    {
      "semana_iso": 36,
      "probabilidade_favoravel_pct": 12.0,
      "humidade_raiz_mediana": 0.29,
      "chuva_semanal_media_mm": 4.2
    }
  ],
  "previsao_sazonal_6m": {
    "fonte": "Open-Meteo Seasonal (ECMWF SEAS5)",
    "meses": []
  },
  "fontes": {
    "precipitacao": "NASA GPM IMERG V07 (2000-2024)",
    "solo_e_temperatura": "NASA POWER / MERRA-2 (2000-2024)",
    "motor_estatistico": "ciclo_diario.py v0.3.0"
  },
  "aviso": "Indicativo baseado em análise probabilística histórica de 25 épocas; sem validação agronómica local de campo."
}
```
> **Scientific Note:** `probabilidade_condicoes_favoraveis_pct` is derived conservatively from the **Wilson IC90 upper bound** of false-start risk (`clamped [5.0, 95.0]`), ensuring the backend **never presents `0%` or `100%` as certainty**.

---

## 5. IMERG Scientific Motor Endpoints (`ciclo_diario.py v0.3.0`)

These endpoints expose the audited outputs of the unmodified `ciclo_diario.py v0.3.0` engine (`zona` accepts `"huambo"`, `"bie"`, `"huila"` and `data_ref` uses `YYYY-MM-DD`).

| Endpoint | Purpose & Key Returned Data |
|---|---|
| `GET /zonas` | Lists active IMERG zones (`huambo`, `bie`, `huila`), CSV readiness, engine version (`0.3.0`), and latest cycle metadata. |
| `GET /zonas/{zona}/decisao[/{data_ref}]` | Official mapped decision: `estado_motor`, `resposta` (`PLANTAR (indicativo)` \| `AGUARDAR` \| `SEM CONCLUSÃO` \| `SEM CONCLUSÃO (fora da época)`), `grau_confianca`, `mensagem_agricultor`, `motivo_tecnico`, `sha256_saida`. |
| `GET /zonas/{zona}/curva-risco[/{data_ref}]` | False-start risk curve by date with Wilson `ic90`, historical frequency (`X de Y épocas`), and first safe date below risk tolerance. |
| `GET /zonas/{zona}/falsa-partida[/{data_ref}]` | Candidate rain start detection, whether a false start occurred, and informative dry-day series (distinguishing `dry_day` from `missing_observation`). |
| `GET /zonas/{zona}/indicadores[/{data_ref}]` | Complementary NASA POWER indicators (`GWETROOT`, `T2M`) labeled `"não entram na decisão"` (`decisao_integrada: false`). |
| `GET /zonas/{zona}/previsao[/{data_ref}]` | 16-day Open-Meteo deterministic forecast explicitly labeled `"previsão meteorológica, não é climatologia"`. |

### Official Code-to-Label Mapping (`ciclo_diario.py` → Frontend)

| `estado_motor` (Raw Motor Code) | `resposta` (Mapped Backend Verdict) | Recommended UI Meaning |
|---|---|---|
| `FAVORAVEL_INDICATIVO` | `PLANTAR (indicativo)` | Conditions favorable based on historical IMERG criteria (always accompanied by local soil check caveat) |
| `AGUARDAR_CHUVA_INSUFICIENTE` | `AGUARDAR` | Wait for stronger cumulative rainfall onset |
| `AGUARDAR_FALSA_PARTIDA` | `AGUARDAR` | High risk of false start; wait to protect seeds |
| `AGUARDAR_ESTIAGEM_EM_CURSO` | `AGUARDAR` | Dry spell / hiatus in progress; do not sow yet |
| `SEM_BASE_FIAVEL` | `SEM CONCLUSÃO` | Insufficient reliable historical/observational basis |
| `FORA_DA_EPOCA` | `SEM CONCLUSÃO (fora da época)` | Query date is outside the regional rainy season |

---

## 6. Frontend UI/UX Rules & Scientific Guardrails

1. **Never fabricate or round probabilities to `0%` or `100%`:** Always display `probabilidade_condicoes_favoraveis_pct` alongside `risco_falsa_partida.ic90_pct` and `risco_falsa_partida.frequencia_historica`.
2. **Never mix forecasts with climatology:** Render 16-day forecast (`GET /zonas/{zona}/previsao`) and 6-month seasonal outlook (`previsao_sazonal_6m`) in visually separate blocks from 25-year **NASA GPM IMERG V07** / **NASA POWER** baselines.
3. **Never label auxiliary indicators as IMERG:** Indicators from `/zonas/{zona}/indicadores` come from **NASA POWER** and carry `decisao_integrada: false`.
4. **Separate `/advisory` vs `/evaluate` if both are displayed:** Highlight any divergence honestly without overriding either result.
5. **Status Badges (`POST /api/v1/advisory` & `/evaluate`):**
   - `FAVORAVEL` → Green (`#16A34A` / `#DCFCE7`)
   - `AGUARDAR` → Amber (`#D97706` / `#FEF3C7`)
   - `DESFAVORAVEL` → Red (`#DC2626` / `#FEE2E2`)
6. **Compliance Attribution in UI:** Fetch `GET /compliance` (or `GET /fontes/saude`) to display NASA Open Data credits, the non-official NASA disclaimer, and AI usage disclosure.

---

## 7. HTTP Error Codes & Resilience

| Status Code | Meaning | Common Cause |
|---|---|---|
| `200 OK` | Success | Valid request processed |
| `400 Bad Request` | Invalid input value | Unknown `zona`, invalid `data_ref` format (`YYYY-MM-DD`), or unsupported `provincia` |
| `404 Not Found` | Resource missing or disabled | Unknown province on `/baseline/{provincia}`, or `/docs` / `/openapi.json` accessed in `ENVIRONMENT=production` |
| `422 Unprocessable Entity` | Pydantic validation error | Missing `provincia` in `POST /api/v1/advisory` or invalid `lang` (must be `'pt'` or `'en'`) |
| `503 Service Unavailable` | Historical IMERG CSV missing | `data/hist_imerg_<zona>.csv` not generated yet |

### Quick Browser `fetch` Snippet for Frontend
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchOptimalPlanting({ provincia = 'Huambo', cultura = 'Milho', epoca = '2024/2025' }) {
  const params = new URLSearchParams({ provincia, cultura, epoca_agricola: epoca });
  const res = await fetch(`${API_BASE}/api/v1/optimal-planting?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
```
