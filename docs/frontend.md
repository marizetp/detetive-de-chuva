# Frontend Specification — Detetive da Chuva

**Status:** Initial implementation specification  
**Product language:** Portuguese (Angola)  
**Frontend:** React + JavaScript  
**Backend:** Existing public REST API

## 1. Product purpose

The frontend provides an accessible interface for consulting agricultural guidance by province and crop. It should help a user understand the backend's assessment, supporting metrics, confidence score, and practical explanation.

The application must not overstate what the backend knows. It is a decision-support interface, not a guarantee of planting success.

## 2. Current backend capabilities

Base URL: `https://detetive-da-chuva.onrender.com`

| Endpoint | Method | Frontend purpose |
|---|---|---|
| `/health` | GET | Check service availability and readiness |
| `/api/v1/provinces` | GET | Populate province selector |
| `/api/v1/crops` | GET | Populate crop selector |
| `/api/v1/advisory` | POST | Request full advisory |
| `/api/v1/evaluate` | POST | Request compact assessment |

### Province and crop data

Province example:
```json
[
  { "id": "huambo", "nome": "Huambo" },
  { "id": "bie", "nome": "Bié" },
  { "id": "huila", "nome": "Huíla" }
]
```

Crop example:
```json
[
  { "id": "milho", "nome": "Milho" },
  { "id": "feijao", "nome": "Feijão" },
  { "id": "soja", "nome": "Soja" }
]
```

### Full advisory request

`POST /api/v1/advisory`

```json
{
  "provincia": "Huambo",
  "cultura": "Milho",
  "data_consulta": "2026-11-12"
}
```

`provincia` is required. `cultura` defaults to `Milho`; `data_consulta` defaults to the server's current date according to the supplied API guide.

Example response shape:
```json
{
  "status": "AGUARDAR",
  "score_confianca": 82,
  "metricas": {
    "chuva_acumulada_recente_mm": 48.2,
    "humidade_solo_raiz": 0.34,
    "previsao_7dias_mm": 83.4
  },
  "recomendacao_extensao": "..."
}
```

### Compact evaluation request

`POST /api/v1/evaluate`

```json
{
  "provincia": "Bié",
  "cultura": "Feijão"
}
```

The supplied response includes:
- `status`
- `score_confianca`
- `triggers_ativados`
- `justificacoes_tecnicas`
- `metricas`
- `is_fallback_weather`

The API guide does not specify whether `/evaluate` and `/advisory` use identical calculations or how their outputs should be reconciled. Do not combine the results without confirmation.

### Healthcheck

`GET /health`

The supplied example includes:
- `status`
- `baseline_ready`
- `provincias_ativas`
- `culturas_ativas`
- `data_servidor`

Use it for a connection/readiness indicator if useful. Do not block the entire interface solely because a healthcheck request fails unless the product owner decides that behaviour.

## 3. Proposed information architecture

Initial scope:

1. **Home**
   - Project name and concise explanation.
   - Primary call to action to start a consultation.
   - Short explanation of the decision-support purpose.
2. **Agricultural consultation**
   - Province selector populated by the API.
   - Crop selector populated by the API.
   - Optional consultation date only if the product flow needs it.
   - Submit action with loading and validation states.
3. **Results**
   - Clear assessment status.
   - Confidence score with explanatory label.
   - Three key metrics:
     - Recent accumulated rainfall (mm)
     - Root-zone soil moisture (display as percentage)
     - Seven-day rainfall forecast (mm)
   - Link or action to view the detailed recommendation.
4. **Detailed recommendation**
   - Render `recomendacao_extensao` safely, preserving headings and lists if practical.
   - Show practical advice and justifications.
   - Show data caveats where provided by the backend.

Navigation and whether results should be a separate route or an in-page state can be decided during architecture review.

## 4. Status presentation

Documented values:

| API value | Suggested Portuguese label | Visual treatment |
|---|---|---|
| `FAVORAVEL` | Favorável | Positive, but not a guarantee |
| `AGUARDAR` | Aguardar | Caution / wait |
| `DESFAVORAVEL` | Desfavorável | Warning |

Do not rely on colour alone. Include text and, where useful, an icon. Define final status colours in the design system after contrast checks.

Unknown status values must display a neutral fallback, not crash the interface.

## 5. Design direction

Visual references selected by the team:
- Editorial, natural and scientific.
- Modern and minimal, not a generic business dashboard.
- Warm ivory backgrounds, forest-green typography and controls, restrained rain-blue and earth-brown accents.
- Generous whitespace and strong typographic hierarchy.
- Photography may be used on the landing page, preferably relevant to Angolan agricultural landscapes.
- Forms should be simple and easy to use.
- Results should feel like a clear, readable field report rather than a dense analytics dashboard.

### Initial palette

| Token | Hex |
|---|---|
| Forest Green | `#214D3A` |
| Warm Ivory | `#F7F6EF` |
| Earth Brown | `#82664B` |
| Rain Blue | `#477FA3` |
| Sage | `#DCE7D9` |
| Charcoal | `#26312B` |

## 6. API integration and states

Create a dedicated service layer. Suggested responsibilities:
- `api.js`: base URL, request helper, JSON parsing and HTTP error handling.
- `provinces.js`: list provinces.
- `crops.js`: list crops.
- `advisory.js`: full advisory and compact evaluation calls.

UI must include:
- Initial loading state for province and crop options.
- Empty selector state if the API returns an empty list.
- Error state with retry action if option loading fails.
- Disabled submit state while a request is pending.
- Result loading state.
- Network/server error state with a clear retry path.
- Safe handling of missing or null metrics.
- Unknown status fallback.

Do not expose technical stack traces to end users.

## 7. Metric formatting

- Rainfall values: display in `mm`, preserving meaningful precision.
- Soil moisture: API value is between 0.0 and 1.0; multiply by 100 for percentage display.
- Confidence score: display as `N/100` (e.g. `95/100`), with explanatory copy that it is a score supplied by the system, not a probability or a guarantee. **Decided 2026-11-12:** replaces the earlier percentage display, to avoid reading the score as a probability.
- Do not invent thresholds or interpretive labels for metrics unless the backend team provides them.

## 8. Historical trend proposal — not yet confirmed as a live API

A separate PDF proposes a static JSON structure for NASA POWER (MERRA-2) historical agroclimatic trends, including fields such as `sen_por_decada`, `mk_p_ajust_fdr`, `evidencia`, `direcao`, `leitura`, and warning codes.

The proposal explicitly identifies itself as a draft and says export code is not finalized. It also proposes optional files such as `series.json`, `comparacao_fontes.json`, `janela_plantio.json`, and GeoJSON maps.

Therefore:
- Do not implement historical trend charts, trend maps, planting-window analysis, or POWER/IMERG comparisons as live features until the backend team confirms the data files/endpoints and provides actual examples.
- These may be represented in future product planning, but not as working functionality in the first integrated prototype.
- Never fabricate historical values to fill these screens.

## 9. Accessibility, responsiveness and performance

- Mobile-first responsive layouts.
- Semantic HTML and associated labels for inputs.
- Keyboard-operable controls and visible focus indicators.
- Adequate text/background contrast.
- Status conveyed by text as well as colour.
- Avoid large assets and unnecessary animation.
- Provide useful feedback on slower connections.
- Consider that a hosted backend may take time to wake up; show a clear loading state rather than appearing frozen.

## 10. Acceptance criteria for the first integrated prototype

- User can load provinces from the live API.
- User can load crops from the live API.
- User can select a province and crop.
- User can submit an advisory request.
- The result status and confidence score are displayed.
- All three metric values are displayed with correct units and formatting when present.
- Detailed recommendation is rendered safely.
- Loading, error, empty, and retry states work.
- Layout is usable on mobile and desktop.
- No mock data is presented as live output.
- The application builds successfully.

## 11. Questions to confirm with backend/team

1. ~~Should the main consultation call `/advisory`, `/evaluate`, or both?~~ **Decided 2026-11-12 (revised):** both, independently — `/advisory` for the main recommendation, `/evaluate` for the complementary technical assessment; divergences are shown, not hidden (see `CLAUDE.md` §11).
2. ~~Does `/advisory` return `triggers_ativados`, `justificacoes_tecnicas`, or `is_fallback_weather` too?~~ **Verified live 2026-11-12:** no — it returns only `status`, `score_confianca`, `metricas`, `recomendacao_extensao`.
3. Are actual historical NASA POWER trend data available to the frontend during this release?
4. Is there a documented offline/demo requirement?
5. Are there approved thresholds or explanatory descriptions for the metrics?
6. ~~Should the date of consultation be user-selectable?~~ **Decided 2026-11-12:** yes — today or any past date; future dates disabled. Validated against the device's local date (known limitation: an incorrect device clock can affect validation). See `CLAUDE.md` §11.
