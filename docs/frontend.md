# Frontend Specification — AgroKairos

**Status:** Initial implementation specification  
**Product languages:** English (`en`, default) and Portuguese (`pt`, Angola) — decided 2026-11-14  
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

| API value | Portuguese label | English label | Visual treatment |
|---|---|---|---|
| `FAVORAVEL` | Favorável | Favourable | Positive, but not a guarantee |
| `AGUARDAR` | Aguardar | Wait | Caution / wait |
| `DESFAVORAVEL` | Desfavorável | Unfavourable | Warning |

Labels come from the i18n dictionaries (`status.*`, `results.verdict.*`), keyed by the API code.

Do not rely on colour alone. Include text and, where useful, an icon. Define final status colours in the design system after contrast checks.

Unknown status values must display a neutral fallback, not crash the interface.

## 5. Design direction

Approved identity (2026-11-12): **NASA Earth Science — Dark Technology**, with **Aurora Blue** as the
highlight colour since 2026-11-14. `CLAUDE.md` §7 is the reference; this section summarises how it is
applied.

- Scientific, technological and editorial; dark backgrounds, strong typographic hierarchy, generous whitespace.
- Modern and minimal, not a generic business dashboard. No glassmorphism or glow effects; the only
  gradients are the Aurora Blue ones, in the roles below.
- Forms should be simple and easy to use.
- Results should feel like a clear, readable field report rather than a dense analytics dashboard.
- The project is **not an official NASA service**: never use the NASA logo, seals or mission patches.

### Palette

**Aurora Blue** (highlight):

| Element | Value | Use |
|---|---|---|
| Decorative gradient | 110° `#5B3BFF → #2D6CFF → #20CFFF` (180° on narrow vertical rules) | Hero bar, step rules, eyebrow dash, list dashes, quote rule, current-page bar, loading drops. Ornament only (2.83:1 on surface) |
| Action gradient | 110° `#5B3BFF → #2B6AFD → #097F9F`; hover `#5228F1 → #1F5DEF → #017390`; active `#4A0BE2 → #134FE1 → #016681` | Primary buttons and the «Disponível» tag, with **pure white** text (≥ 4.58:1 along the whole gradient) |
| Aurora text | `#6F9BFD` (`label`, `interactive`, `focus`) | Eyebrows and Space Mono labels, units, icons, chevrons, list markers, hover of links/navigation/fields, focus ring (7.1:1 on canvas, 6.3:1 on surface) |
| Selection | `#2B6AFD` (`selection`) with white text (4.58:1) | Text selection |

**Base palette:**

| Colour | Hex | Semantic tokens | Main use |
|---|---|---|---|
| Space Black | `#080F1E` | `canvas` | Page background |
| Mission Navy | `#0B1D35` | `surface` | Panels, cards, bands, footer |
| Orbital White | `#EAF2F8` | `ink`, `ink-muted` (74 %), `ink-subtle` (60 %), `line` (14 %) | Text and headings; decorative rules |
| Steel Blue | `#647F9B` | `line-strong`, `info` | Functional outlines (fields, secondary/unavailable buttons, pending tag), info notices, neutral status |
| NASA Red | `#FC3D21` | `danger`, `status-unfavorable` | Errors and «Desfavorável» (rule, icon, text); never on buttons |
| Telemetry Cyan | `#00A6D6` | `brand` | **Only** the logo drop and the hero illustration |
| NASA Blue | `#0B3D91` | — | Only the hero illustration |

**Result statuses** (exclusive to results and their notices; never on buttons):

| Status | Colour | Text on surface | Outline/bar on canvas |
|---|---|---|---|
| Favorável | `#22A06B` | 5.1:1 | 5.8:1 |
| Aguardar | `#E58A32` | 6.5:1 | 7.3:1 |
| Desfavorável | `#FC3D21` | 4.7:1 | 5.3:1 |
| Missing / unrecognised | Neutral: dashed Steel Blue outline, `ink-muted` text | 8.3:1 | 4.6:1 |

Usage rules:
- **Buttons.** Primary: action gradient with white text. Unavailable: `bg-none`, Steel Blue outline,
  `ink-subtle` text. Secondary: Steel Blue outline with `ink` text, Aurora text outline on hover.
  Text links: `ink` with a Steel Blue underline, Aurora text on hover.
- **Navigation.** Hover in Aurora text; the current page shows `ink` text plus the decorative
  Aurora bar (the bar is never the only cue).
- **Focus.** Aurora text ring, always with a 3 px offset (next to the gradient it would be 1.7–2.2:1).
- **Gradients.** Never on small text. The decorative gradient is ornament only.
- **Status cards.** Surface card with a 2 px outline; icon, label, outline and confidence bar in the
  status colour — never filled. Colours live in `statusTone.js`.
- **Notices.** Technical errors and informational notices use `InlineNotice`: red rule and triangle
  for errors, Steel Blue for information, with text in `ink`.
- **Tailwind's default palette is disabled** (`--color-*: initial`): only the tokens above exist.

### Typography

| Font | Use | Delivery |
|---|---|---|
| Inter (variable) | Interface and body text | Self-hosted, Fontsource `@fontsource-variable/inter` (OFL-1.1) |
| Montserrat (variable) | Headings, card titles, indicator names, highlighted values, brand name, and eight section subtitles (`font-display`) | Self-hosted, `@fontsource-variable/montserrat` (OFL-1.1) |
| Space Mono (static, 400/700) | Technical labels, metadata, code and endpoints (`--font-mono`; `type-label`: 12 px, uppercase, 0.08em; `type-meta`: 13 px, mixed case; `<code>`/`<pre>` via preflight) | Self-hosted, `@fontsource/space-mono` (OFL-1.1) |

Montserrat exception: «Indicadores considerados», «Fontes de dados», «Natureza da plataforma»,
«Navegar», «Dados», «Consulta agrícola», «Resultado da avaliação» and «Nível de confiança» keep the
`type-label` metrics and colour but add `font-display`, which changes only the font family. All
other labels, metadata and code stay in Space Mono (see `CLAUDE.md` §7).

Units (`mm`, `%`) keep the font of their context (Inter on the homepage, Montserrat inside the
highlighted result values); natural-language dates and continuous text stay in Inter. Space Mono is
only used for short labels and code.

Fonts are bundled with the app (no third-party font requests); browsers download only the Latin
subsets used by Portuguese text.

### Implementation

- Tokens live only in `frontend/src/styles/index.css` (`@theme`): a palette layer and a semantic layer
  grouped by function — identity (`brand`), surfaces (`canvas`, `surface`, `line`, `line-strong`,
  `selection`), text (`ink`, `ink-muted`, `ink-subtle`, `label`), action (`action-ink`,
  `interactive`, `focus`), status (`status-favorable`, `status-wait`, `status-unfavorable`) and
  feedback (`danger`, `info`). Components use semantic tokens only.
- Gradient utilities in the same file: `bg-action`, `bg-action-hover`, `bg-action-active`;
  `bg-aurora`, `bg-aurora-y`, `border-l-aurora`, `border-t-aurora`, `indicator-aurora`.
- Status presentation: Favorável — green; Aguardar — orange; Desfavorável — NASA Red (outline, icon,
  text, bar); unrecognised or missing — dashed Steel Blue outline, neutral icon, `ink-muted` text.
  Each status has a distinct icon shape and a text label.
- Units such as `mm` and `%` sit in their own `<span>` so they can take Aurora text without changing
  the value or its format.
- Icons are inline SVG line icons (`components/ui/icons.jsx`); no emoji and no icon library.
- Contrast values for every token are documented in `index.css` and `CLAUDE.md` §7.

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
- Numbers and dates follow the interface language: `en-GB` (`25.6 mm`, `12 November 2026`) or `pt-AO` (`25,6 mm`, `12 de novembro de 2026`). Only the presentation changes.

## 7a. Internationalisation (implemented 2026-11-14)

- **Languages:** English (`en`) by default; Portuguese (`pt`, `pt-AO`) as the second language. `<html lang>` follows the active language.
- **Architecture** (no dependencies), `frontend/src/i18n/`:
  - `messages/en.js`, `messages/pt.js` — every interface text, same keys (parity test);
  - `translate.js` — `createTranslator(language)`; a missing key shows the key, never the other language;
  - `LanguageProvider.jsx`, `useI18n()` — `language`, `t(key, vars)`, `setLanguage`, `suggestion`;
  - `languagePreference.js`, `browserLanguage.js` — persistence and detection;
  - `catalogNames.js` — crop names by API `id` (the value sent to the API is unchanged);
  - `reviewRequired.js` — English texts awaiting human scientific review.
- **Selector:** EN | PT, always visible in the header (desktop and mobile). The choice is stored and has priority over any detection.
- **Suggestion:** on a first visit, if the browser's primary language is `pt`/`pt-*`, a non-blocking strip below the header offers «Switch to Portuguese» / «Keep English». It never switches automatically; a dismissal is stored separately from a language choice and the strip does not reappear. Only `navigator.languages`/`navigator.language` are used.
- **Storage keys:** `ddc.language` `{ language, source: 'manual' | 'suggestion', at }`; `ddc.languageSuggestion` `{ status: 'dismissed', at }`. If localStorage is blocked, choices last for the page session.
- **Backend free text** (`recomendacao_extensao`, `justificacoes_tecnicas`): delivered in Portuguese by the API, which has no language parameter yet. In English the report shows an English notice and a closed «View the original text (Portuguese)» panel (`lang="pt"`) with the unmodified text. The frontend never machine-translates or rewrites it. Translation is requested from the backend (see §11, question 7).
- **Not translated:** API field names, `triggers_ativados` codes (technical identifiers), province and municipality names, the brand name.

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
- Correct `lang` on the document and on any content in another language (backend text, language options, the Portuguese line of the language suggestion).
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
7. **Multilingual API (requested 2026-11-14):** can `/advisory` and `/evaluate` accept an `idioma` parameter and return the free text (`recomendacao_extensao`, `justificacoes_tecnicas`) in English, together with the Portuguese original and translation metadata? Can the list of `triggers_ativados` codes be documented? Until confirmed, the frontend shows the Portuguese original with a notice in English.
