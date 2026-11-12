# Backend API — Detetive da Chuva

**Source:** API integration guide supplied by the project team.  
**Base URL:** `https://detetive-da-chuva.onrender.com`  
**Format:** `application/json`  
**Authentication:** Not required according to the supplied guide.  
**CORS:** Enabled for any origin according to the supplied guide.

## 1. Healthcheck

`GET /health`

Example:
```json
{
  "status": "healthy",
  "baseline_ready": true,
  "provincias_ativas": ["Huambo", "Bié", "Huíla"],
  "culturas_ativas": ["Milho", "Feijão", "Soja"],
  "data_servidor": "2026-11-12"
}
```

## 2. List provinces

`GET /api/v1/provinces`

Example:
```json
[
  { "id": "huambo", "nome": "Huambo" },
  { "id": "bie", "nome": "Bié" },
  { "id": "huila", "nome": "Huíla" }
]
```

## 3. List crops

`GET /api/v1/crops`

Example:
```json
[
  { "id": "milho", "nome": "Milho" },
  { "id": "feijao", "nome": "Feijão" },
  { "id": "soja", "nome": "Soja" }
]
```

## 4. Full agricultural advisory

`POST /api/v1/advisory`

Header: `Content-Type: application/json`

Request:
```json
{
  "provincia": "Huambo",
  "cultura": "Milho",
  "data_consulta": "2026-11-12"
}
```

- `provincia`: required string. Documented names: `Huambo`, `Bié`, `Huíla`.
- `cultura`: optional string. Documented names: `Milho`, `Feijão`, `Soja`. Default: `Milho`.
- `data_consulta`: optional `YYYY-MM-DD`. Default: current date according to the API guide.

Example response:
```json
{
  "status": "AGUARDAR",
  "score_confianca": 82,
  "metricas": {
    "chuva_acumulada_recente_mm": 48.2,
    "humidade_solo_raiz": 0.34,
    "previsao_7dias_mm": 83.4
  },
  "recomendacao_extensao": "**AGUARDAR: ...**"
}
```

Documented status values:
- `FAVORAVEL`
- `AGUARDAR`
- `DESFAVORAVEL`

`score_confianca`: number from 0 to 100.

Metrics:
- `chuva_acumulada_recente_mm`: recent accumulated rainfall in millimetres.
- `humidade_solo_raiz`: root-zone soil moisture from 0.0 to 1.0.
- `previsao_7dias_mm`: expected rainfall over the next seven days in millimetres.

`recomendacao_extensao`: formatted explanatory text with practical guidance.

## 5. Compact evaluation

`POST /api/v1/evaluate`

Header: `Content-Type: application/json`

Request:
```json
{
  "provincia": "Bié",
  "cultura": "Feijão"
}
```

Example response:
```json
{
  "status": "AGUARDAR",
  "score_confianca": 85,
  "triggers_ativados": [
    "CRITICAL_ROOT_MOISTURE_DEFICIT",
    "RECENT_RAIN_TRIGGER_SATISFIED"
  ],
  "justificacoes_tecnicas": [
    "Humidade do solo em fase de recarga.",
    "Precipitação prevista favorável nos próximos dias."
  ],
  "metricas": {
    "chuva_acumulada_recente_mm": 35.0,
    "humidade_solo_raiz": 0.32,
    "previsao_7dias_mm": 60.5
  },
  "is_fallback_weather": false
}
```

The guide describes this endpoint as a compact response without the long recommendation message.

## 6. Integration notes

- These examples describe the supplied API contract; verify live responses before relying on optional fields or exact shapes.
- The guide does not explain whether `/advisory` and `/evaluate` share identical logic.
- The guide does not specify response schemas for HTTP errors.
- The guide does not describe historical NASA POWER trend endpoints or static JSON export locations.
