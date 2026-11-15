# CLAUDE.md — AgroKairos

## 1. Project overview

**AgroKairos** (formerly «Detetive da Chuva») is a web application for environmental intelligence and agricultural decision support, developed for the NASA Space Apps Challenge 2026.

The current backend exposes an agricultural advisory API. The frontend must allow a user to select a province and crop, request an assessment, and understand the returned status, confidence score, metrics, and practical recommendation.

The interface is bilingual (decision of 2026-11-14): **English (`en`) is the default language** and **Portuguese (`pt`, pt-AO)** is the second language. Use clear, accessible wording in both — Portuguese suitable for users in Angola, plain English for international readers. Every interface text lives in the dictionaries in `frontend/src/i18n/messages/` (see §11). Keep technical identifiers, code, API field names and the brand name «AgroKairos» unchanged in both languages.

## 2. Working mode and repository boundaries

- The repository root contains this file, `docs/`, `frontend/` and `backend/` (FastAPI source supplied by the backend team, added on 2026-11-15; see `backend/README.md`).
- The frontend application must be implemented inside `frontend/`.
- Read relevant documentation in `docs/` before making architectural or integration decisions.
- Do not modify backend code (scientific engines, rules, data) without explicit authorisation. Deployment configuration (`backend/render.yaml`, CI) may be changed when the project owner authorises deployment work (authorised 2026-11-15).
- Do not assume that an endpoint, field, dataset, or capability exists unless it appears in the API documentation or is verified against the live API.
- Before making broad changes, inspect the existing repository and report what is already present.
- Prefer small, reviewable implementation steps. Explain the files changed and how to test them.
- Do not overwrite user work or remove files without asking.

## 3. Source-of-truth documents

- `docs/docs2.md`: **current API contract (v1.1.0)**, supplied by the backend team on 2026-11-15. Treat it as the primary source for documented backend endpoints.
- `docs/backend-api.md`: **historical API contract (v1.0)**, superseded by `docs/docs2.md`. Kept for the record; do not use it as the current contract.
- `docs/especificacao-funcional.pdf`: functional specification of the IMERG decision engine (2026-11-14). **Internal document, not published** (kept outside Git) until an authorised version for publication is available. Describes planned and existing engine features; it is not proof that the backend implements them.
- `docs/DECISOES-ARQUITECTURAIS-API.md`: architectural decisions for the v1.1 integration (authority of `/advisory` and `/evaluate`, alternative weather data, AI disclosure, HTTP 400/422).
- `docs/AUDITORIA-CONCLUSAO-AGROKAIROS.md`: completion audit and prioritised plan (P0–P3), with its later status update.
- `docs/ESPECIFICACAO-BACKEND-I18N.md`: frontend request to the backend for content language (`lang` on every text endpoint, `content_language` in responses), 2026-11-15. A request, **not** an implemented contract.
- `docs/frontend.md`: product scope, screen requirements, UX, design direction, and frontend implementation guidance.
- `docs/Detetive_da_Chuva_Proposta_Formato_Dados.pdf`: draft proposal for historical trend data. It is not proof that those data endpoints or exports are implemented.

If documents disagree:
1. Identify the disagreement.
2. Do not silently reconcile it.
3. Keep the current API integration aligned with `docs/docs2.md` (v1.1). `docs/backend-api.md` (v1.0) is historical.
4. Record historical-trend features as pending until the backend team confirms their availability and contract.

## 4. Technology direction

Planned frontend stack:
- React
- JavaScript (not TypeScript unless the project owner explicitly changes this decision)
- Tailwind CSS
- Recharts for charts, only if needed by confirmed data
- Leaflet for maps, only if a map feature and suitable geographic data are confirmed
- Fetch API or an existing HTTP client already present in the project

Do not install libraries before inspecting the repository and proposing the required dependencies. Avoid unnecessary dependencies.

## 5. API integration rules

Base URL:
`https://detetive-da-chuva.onrender.com`

Documented endpoints:
- `GET /health`
- `GET /api/v1/provinces`
- `GET /api/v1/crops`
- `POST /api/v1/advisory`
- `POST /api/v1/evaluate`

Rules:
- Keep API calls in `frontend/src/services/`, not inside page components.
- Read the base URL from an environment variable such as `VITE_API_BASE_URL`, with the documented URL as a controlled default only if the project owner approves it.
- Never hardcode secrets. The documented API currently requires no authentication.
- Set `Content-Type: application/json` on JSON POST requests.
- Validate and handle HTTP errors, network failures, malformed responses, and empty states.
- Show loading states during requests and prevent accidental duplicate submissions.
- Do not assume the live API always responds exactly like the examples; inspect actual responses.
- Preserve backend field names at the service boundary. Convert to UI-friendly view models in a separate mapping layer if necessary.
- The `recomendacao_extensao` field contains Markdown-like text. Render it safely; do not inject it as raw HTML.
- Treat `score_confianca` as the backend's confidence score, not as a guarantee of planting success.
- Display `humidade_solo_raiz` as a percentage only after converting the 0–1 value to 0–100 for presentation. Preserve the original value in data handling.
- Support the three documented statuses: `FAVORAVEL`, `AGUARDAR`, `DESFAVORAVEL`. Handle unknown values gracefully.

## 6. Data integrity and scientific communication

- Never invent scientific results, measured values, forecasts, or recommendations.
- Never present mock, placeholder, or synthetic values as real observations or API results.
- If mock data is used during UI development, label it visibly as demonstration data and isolate it from production services.
- Do not imply that NASA POWER historical trends are already exposed by the current advisory API.
- Do not merge values from different sources into one record without a confirmed data contract.
- Distinguish the current advisory response (recent rainfall, root-zone soil moisture, seven-day rainfall forecast) from the draft historical-trend proposal (NASA POWER/MERRA-2 indicators and statistical trends).
- Avoid causal wording unless the backend or scientific validation explicitly supports it.
- Communicate uncertainty and limitations clearly. A confidence score must not be presented as certainty.
- Do not label a planting date as guaranteed or universally ideal.

## 7. Design direction

Approved visual identity: **NASA Earth Science — Dark Technology** (2026-11-12), with **Aurora Blue** as the highlight colour (2026-11-14, supersedes the earlier colour roles of the same day). Gradients are part of the identity, but only the Aurora gradients below.

Aurora Blue:
- Decorative gradient, 110° (180° for narrow vertical elements): `#5B3BFF → #2D6CFF → #20CFFF`. **Ornament only** — it drops to 2.83:1 on Mission Navy, so it is never the only cue for information or interaction (e.g. the current-page bar is paired with a text colour change).
- Action gradient (primary buttons), 110°: `#5B3BFF → #2B6AFD → #097F9F` — same hues (OKLCH), lower lightness, so **pure white text** (`#FFFFFF`) stays ≥ 4.5:1 along the whole button. Hover `#5228F1 → #1F5DEF → #017390`; active `#4A0BE2 → #134FE1 → #016681`.
- Aurora text `#6F9BFD` (solid, derived from the Aurora blue): eyebrows and Space Mono labels, units, icons, chevrons, list markers, link/navigation/field hover and the focus ring. Never use the gradient on small text.
- Selection background `#2B6AFD` with white text.

Base palette and roles:
- Space Black `#080F1E` — page background.
- Mission Navy `#0B1D35` — surfaces, cards, panels, footer.
- Orbital White `#EAF2F8` — main text and headings (not on the action gradient: 4.05:1).
- Steel Blue `#647F9B` — functional outlines (fields, secondary and unavailable buttons, pending tag), informational notices, neutral status.
- NASA Red `#FC3D21` — technical errors and the «Desfavorável» status (rule, icon, text). Never on buttons.
- Telemetry Cyan `#00A6D6` — **reserved for the logo drop and the hero illustration** (`brand`); not a generic highlight.
- NASA Blue `#0B3D91` — only in the hero illustration (hills).

Status presentation (results report): dark surface card with a 2 px outline; icon, label, outline and confidence bar in the status colour — never filled. Status colours are exclusive to results and their notices; never used on buttons.
- Favorável: green `#22A06B`.
- Aguardar: orange `#E58A32`.
- Desfavorável: NASA Red `#FC3D21`.
- Unrecognised value: dashed Steel Blue outline, neutral icon, `ink-muted` text, «Estado não reconhecido» plus the received value.
- Missing value: same neutral presentation with «Estado indisponível». Never assume a status.
- Technical errors (service failure) use `InlineNotice` tone `error` (red rule and triangle, `ink` text), clearly distinct from an unfavourable result.

Typography:
- Inter: interface and body content.
- Montserrat: headings, card titles, indicator names, highlighted numeric values, brand name (token `--font-display`).
- Space Mono: technical labels, metadata and code, through the single token `--font-mono` (also applied to every `<code>`/`<pre>` by Tailwind's preflight). Two centralised utilities in `index.css`:
  - `type-label` — short uppercase label style: Space Mono, 12 px, weight 400, uppercase, tracking 0.08em, line-height 1.4. Used for eyebrows and technical labels (e.g. «Erro 404», report section numbers).
  - `type-meta` — mixed-case metadata (e.g. the «Disponível» / «Em preparação» status tags): Space Mono, 13 px, weight 400, line-height 1.5.
  Never for paragraphs or long text.
- Montserrat exception for eight section subtitles (2026-11-14): they keep `type-label` (same size, weight, line-height, tracking, uppercase and Aurora text colour) plus `font-display`, which changes only the font family (it comes after `type-label` in the compiled CSS):
  - Homepage: «Indicadores considerados» (`AboutSection.jsx`), «Fontes de dados» and «Natureza da plataforma» (`DataSourcesSection.jsx`).
  - Footer: «Navegar» and «Dados» (`FOOTER_HEADING` in `SiteFooter.jsx`).
  - Consultation page: «Consulta agrícola» (`ConsultationPage.jsx`, via the `className` prop of `Eyebrow`).
  - Results: «Resultado da avaliação» (the four `Eyebrow` variants) and «Nível de confiança» (`ResultsArea.jsx`).
  Every other `type-label`/`type-meta` element, technical label, metadata item, `<code>` and `<pre>` stays in Space Mono. Do not change `--font-mono` or `type-label` globally to extend this exception; add `font-display` per element.
- Units (`mm`, `%`) sit in their own `<span>` coloured with Aurora text and keep the font of their context: Inter on the homepage, Montserrat inside the highlighted result values. Highlighted values stay in Montserrat.
- Delivery (revised 2026-11-14 — Space Mono replaces Bebas Neue, which had replaced Space Grotesk and JetBrains Mono the same day): self-hosted with Fontsource (`@fontsource-variable/inter`, `@fontsource-variable/montserrat`, `@fontsource/space-mono` 400 and 700 — static, no variable version exists; all SIL Open Font License 1.1), imported in `frontend/src/styles/index.css`. No third-party font requests. Do not add OpenType features without checking they exist in the Fontsource files (the Fontsource Inter subset has no `cv`/`ss` features).

Measured WCAG 2.2 contrast (verify again for any new pairing):
- Action gradient with white text: minimum 4.58:1 sampled at 201 points along the button (hover 5.43:1, active 6.49:1). The original Aurora under white text falls to 1.84:1 at `#20CFFF` and Orbital White to 4.05:1 at the blue stop — **not** suitable for buttons.
- Aurora text `#6F9BFD`: 7.1:1 on Space Black, 6.3:1 on Mission Navy — text, focus ring (≥ 3:1) and icons.
- Decorative gradient vs Space Black ≥ 3.2:1; vs Mission Navy 2.83:1 at the violet start — ornament only.
- On Space Black: Orbital White 16.9:1, NASA Red 5.3:1, green 5.8:1, orange 7.3:1, Steel Blue 4.6:1. On Mission Navy: Orbital White 14.9:1, `ink-subtle` 5.7:1, green 5.1:1, orange 6.5:1, NASA Red 4.7:1 (narrow margin); Steel Blue 4.1:1 — graphics only.
- Disabled primary button: no gradient (`bg-none`), Steel Blue outline, `ink-subtle` text (≥ 5.7:1).
- The focus ring keeps a 3 px offset: next to the gradient it would be only 1.7–2.2:1.
- Status must never rely on colour alone (see design principles below).

Brand and affiliation:
- The project is **not an official NASA service**; keep the existing disclaimer visible.
- Never use the NASA logo (insignia or logotype), seals, mission patches or any element that suggests NASA endorsement. The identity uses colours and typography only.

Implementation (revised 2026-11-14): design tokens live only in `frontend/src/styles/index.css` (`@theme`), in two layers — the palette above and semantic tokens grouped by function:
- Identity: `brand` (logo drop only).
- Surfaces and lines: `canvas`, `surface`, `line`, `line-strong`, `selection`.
- Text: `ink`, `ink-muted`, `ink-subtle`, `label` (Aurora text).
- Action and interaction: `action-ink` (white), `interactive`, `focus` (Aurora text).
- Status: `status-favorable`, `status-wait`, `status-unfavorable`.
- Feedback: `danger`, `info`.

Gradient utilities (also in `index.css`): `bg-action`, `bg-action-hover`, `bg-action-active` (buttons and the «Disponível» tag); `bg-aurora`, `bg-aurora-y`, `border-l-aurora`, `border-t-aurora`, `indicator-aurora` (decorative). They set `background-image`/`border-image`, so the unavailable button uses `bg-none`, and `border-image` is only for straight rules (it ignores rounded corners).

Rules:
- Components must use the semantic tokens, not palette names or arbitrary colour values. The only exception is `PlanaltoIllustration.jsx`, which maps palette colours by role.
- Tailwind's default palette is disabled (`--color-*: initial`), so classes such as `bg-emerald-500` or `text-white` generate no CSS.
- Status colours are centralised in `frontend/src/components/results/statusTone.js` (per `tone` from `config/status.js`).
- Opacity modifiers are allowed only where they have a visual role (disabled states, subdued underlines, the discreet details panel); never to approximate a colour on a fixed background.
- Icons are inline SVG line icons in `frontend/src/components/ui/icons.jsx` (`currentColor`, no icon library). No emoji in the interface.

`docs/frontend.md` §5 summarises the mapping.

Design principles:
- Editorial, natural, scientific, calm, and contemporary.
- Clear hierarchy and generous whitespace.
- Photography may support the landing page, but must not obscure usability or performance.
- Avoid generic enterprise dashboards, excessive cards and glassmorphism. Gradients: only the approved Aurora Blue ones, in their defined roles.
- Use text and icons in addition to colour to communicate status.
- Maintain readable contrast, keyboard accessibility, visible focus states, and responsive layouts.
- The interface should work on mobile and desktop, including constrained screen widths.

## 8. Code conventions

- Use functional React components and hooks.
- Use descriptive component and variable names.
- Keep components focused and reusable.
- Keep API logic in services; keep formatting and mapping logic in utilities.
- Avoid duplicating status labels, colours, and API paths. Centralize constants.
- Handle `null`, missing fields, and unexpected values explicitly.
- Do not use `any`-style shortcuts or unsafe assumptions.
- Keep components reasonably small; split them when responsibilities become mixed.
- Do not add state-management libraries unless a real need is demonstrated.

## 9. Quality checks

Before declaring a task complete:
- Run the available lint, build, and test commands.
- Test all three documented advisory statuses where possible.
- Test loading, empty, network-error, and server-error states.
- Check mobile and desktop layouts.
- Check keyboard navigation and accessible labels.
- Confirm no mock data is mistaken for real data.
- Report any checks that could not be run and why.

## 10. Development workflow

For each task:
1. Inspect relevant files and current project state.
2. State a short implementation plan.
3. Implement only the agreed scope.
4. Run appropriate checks.
5. Summarize changed files, behaviour, and remaining issues.

Do not build the entire application in one unreviewed operation.

## 11. Decisions taken

**2026-11-12 (revised) — Consultation uses both `/advisory` and `/evaluate`** (decided by the project owner; supersedes the earlier "advisory only" decision of the same day)
- `POST /api/v1/advisory` supplies the main recommendation shown to the user: `status`, `score_confianca`, available `metricas`, `recomendacao_extensao`.
- `POST /api/v1/evaluate` supplies the complementary technical assessment: `triggers_ativados`, `justificacoes_tecnicas`, `is_fallback_weather`, and its own `status`/`score_confianca`/`metricas`.
- Both receive the same consultation parameters.
- The two requests are independent: a failure in one must not block displaying the other; responses are handled and stored separately.
- Divergences between the two (status, score, metrics) must be detected and shown, never hidden or silently reconciled.
- The UI must distinguish recommendation data (`/advisory`) from technical-assessment data (`/evaluate`).
- Only documented fields are treated as confirmed. Undocumented fields (e.g. `detalhes_agroclimaticos`, extra `/provinces` and `/crops` fields) are optional and unstable: never required, never interpreted.
- Handle prolonged loading (Render cold start observed at ~54 s; `/advisory` observed at 8–22 s, one call >60 s), timeouts, HTTP/network errors, and incomplete or malformed responses.
- Keep the integration isolated in `frontend/src/services/`.
- Do not invent data, justifications, or indicators absent from the responses.
- Known limitations from the 2026-11-12 reconnaissance are accepted for now and will be raised with the backend team later (fallback weather, generated text variability, unvalidated `cultura`/`data_consulta`, undocumented extra fields).

**2026-11-12 — Base URL:** `VITE_API_BASE_URL` overrides the base URL; when it is unset or empty, the documented `https://detetive-da-chuva.onrender.com` is the default.

**2026-11-12 — Version control:** a git repository is initialised at the project root.

**2026-11-12 — Request timeout:** default `120000` ms (120 s), defined in `frontend/src/config/api.js` and overridable with `VITE_API_TIMEOUT_MS` (accepted range 5000–300000 ms). Rationale: a live `/advisory` request exceeded the previous 90 s limit.

**2026-11-12 — Consultation date** *(superseded: since commit `1ef7ca2` and per `docs2.md` §3, the form accepts today or any **future** date for season planning; past dates are not offered. The text below is kept for the record.)*: the user may choose today or any past date; future dates are disabled in the date picker and rejected by validation. `data_consulta` is required in the form (it remains optional in the API contract).
- Reference date: the device's **local** date (`getLocalIsoDate` in `frontend/src/utils/dates.js`), not the server's `data_servidor`. Do not switch to `data_servidor` in this phase.
- **Known limitation:** if the device clock or time zone is wrong, validation may wrongly reject today's date or accept a date that is already in the future for the server (typically a one-day offset).

**2026-11-12 — Confidence score display:** show `score_confianca` as `N/100` (e.g. `95/100`), never as a percentage, always with the caption that it is a system score (0–100), not a probability or a guarantee. Formatting lives in `formatConfidenceScore` (`frontend/src/utils/format.js`).

**2026-11-14 (later) — Aurora Blue adopted as the highlight colour** (decided by the project owner; supersedes the colour roles below, except the neutral missing/unrecognised status rule and the disabled Tailwind palette)
- Primary buttons use the Aurora action gradient with pure white text; labels, units, icons, hover and focus use Aurora text `#6F9BFD`; decorative rules use the Aurora gradient (ornament only).
- Telemetry Cyan `#00A6D6` is reserved for the logo drop and the hero illustration.
- Report statuses: Favorável green `#22A06B`, Aguardar orange `#E58A32`, Desfavorável NASA Red — exclusive to results; tests in `statusTone.test.js` and `ResultsArea.test.jsx`.
- The visible line «NASA POWER · reanálise MERRA-2» was removed from «Fontes de dados»; the provenance remains in the footer and in the documentation.

**2026-11-14 — Colour roles revised** (superseded by the Aurora Blue decision above; implemented in four phases)
- Primary actions in filled NASA Red with Space Black text. Labels in Steel Blue. Cyan restricted to brand, illustration, interaction (hover/focus) and the «Favorável» status.
- Report statuses use only the official palette (no green/amber), as outlined cards with icon and text (see §7).
- Missing and unrecognised statuses are presented neutrally («Estado indisponível» / «Estado não reconhecido»). The report never assumes `AGUARDAR` or `FAVORAVEL`; both cases are covered by tests in `ResultsArea.test.jsx`.
- Tailwind's default colour palette is disabled.

**2026-11-14 — Internationalisation (English default, Portuguese second language)** (decided by the project owner)
- Own architecture, no new dependencies, in `frontend/src/i18n/`: `config.js` (languages, `<html lang>` tags `en`/`pt-AO`, Intl locales `en-GB`/`pt-AO`), `messages/en.js` and `messages/pt.js` (same keys, enforced by a parity test), `translate.js` (`createTranslator`, missing key → the key itself, never text from the other language), `LanguageProvider.jsx` + `useI18n()` (`language`, `t`, `setLanguage`, `suggestion`).
- Components never hard-code interface text: they call `t('key')`. Pure utilities receive the language or `t` as a parameter (`format.js`, `errorMessages.js`, `describeConsultation`); validators return message keys.
- Numbers and dates are formatted per language (`en-GB`: `25.6 mm`, `12 November 2026`; `pt-AO`: `25,6 mm`, `12 de novembro de 2026`). Values are never changed, only their presentation.
- Language selector (EN | PT) always visible in the header, desktop and mobile; `aria-pressed`, `lang` on each option, active option on `selection` with white text (4.58:1). Below 1024 px the full navigation moves to the menu (it does not fit on one line with the selector); below 640 px the menu button is icon-only (accessible name kept).
- Persistence (localStorage, always in try/catch; in memory if blocked): `ddc.language` = explicit choice (`source: manual | suggestion`), absolute priority; `ddc.languageSuggestion` = suggestion dismissed (does not set a language). A dismissal is never confused with a choice.
- Language suggestion: only on a first visit with no stored choice or dismissal, when the browser's **primary** language (`navigator.languages[0]`, else `navigator.language`) is `pt` or `pt-*`. In-flow strip under the header (never covers content), English text plus the question in Portuguese (`lang="pt"`), actions «Switch to Portuguese» / «Keep English». Never changes the language by itself. No geolocation, IP or other personal data.
- Backend free text (`recomendacao_extensao`, `justificacoes_tecnicas`) is translated **by the backend only** — never in the browser, never by word substitution. When the text is not in the interface language, the interface shows a notice and a closed panel with the original text (with its `lang`), kept intact for audit (`SourceLanguageContent.jsx`, `utils/localizedContent.js`). Do not simulate multilingual support that does not exist. *(Updated 2026-11-15: the recommendation is now requested in the interface language — see the decision below.)*
- Crop names are translated by stable `id` (`i18n/catalogNames.js`); the value sent to the API stays the original `nome`. Province and municipality names are proper nouns and are not translated.
- English texts with scientific or agronomic meaning are listed in `i18n/reviewRequired.js` and **must be reviewed by a person** before being considered final. Translations must preserve values, units, dates, negations and caveats; a test checks that the numbers in those texts match in both languages.
- Tests render components through `src/test/render.jsx` (Portuguese by default, `{ language: 'en' }` for English).

**2026-11-15 — Product name: AgroKairos** (decided by the project owner)
- «AgroKairos» replaces «Detetive da Chuva» in the interface, page titles, metadata and project documentation, in both languages.
- Technical identifiers keep the old name: the backend URL `https://detetive-da-chuva.onrender.com`, the npm package name, the internal navigation event, the `ddc.*` storage keys (renaming them would discard saved language preferences), file names such as `docs/Detetive_da_Chuva_Proposta_Formato_Dados.pdf`, and historical documents (`docs/PROMPT-01-RECONNAISSANCE.md`).

**2026-11-15 — Recommendation language (D3)** (decided by the project owner; supersedes the earlier deferral of D3)
- Each language is requested **natively** from the backend; free text is never translated in the frontend and no translation service or dependency is used.
- `POST /api/v1/advisory`: English interface → `lang: "en"`; Portuguese interface → no `lang` (the documented default `"pt"`). Implemented in `advisoryLanguageParams` (`services/consultation.js`).
- `POST /api/v1/evaluate`: **never receives `lang`** (not supported; observed 2026-11-15 to ignore it). `justificacoes_tecnicas` remain Portuguese; in English they keep the notice and the original-text panel.
- The API does **not** return the language of the response. The frontend records the **requested** language (`requestedLanguage` on the advisory result, set by `useConsultation`) and uses it as the source language. It is not verified: if a backend ignores `lang`, Portuguese text would be labelled as English. Do not add an automatic language check without a documented response field.
- Retries of `/advisory` reuse the language of the submission.
- Switching the interface language after a consultation does **not** re-request anything automatically. The recommendation stays in the language it was requested in, with a notice, the original text panel and a «Get the recommendation in {language}» / «Obter a recomendação em {idioma}» button that re-requests **only `/advisory`** in the new language (`requestAdvisoryInLanguage`). The text is generated again by the service, so its wording may differ; status, score and metrics are the same in the recorded pair.
- Demo mode: the real recording `adv_en` (same consultation with `lang: "en"`) is eligible, so the complete demo consultation works in both languages (8 eligible responses).

**2026-11-15 — Effective content language and `/evaluate` language (preparation)** (authorised by the project owner; implemented and tested locally, not deployed)
- The backend source and `AgroKairos_Respostas_Backend_Frontend.pdf` are not in this repository (checked again on 2026-11-15); the architecture follows the project owner's summary of that PDF; the backend changes are specified in `docs/ESPECIFICACAO-BACKEND-I18N.md` and remain **dependent on backend deployment**.
- `content_language` (requested, undocumented in v1.1): read when present on `/advisory` and `/evaluate`, normalised by `normalizeContentLanguage` (`pt`, `pt-AO` → `pt`; `en`, `en-US` → `en`; anything else → `null`). Never required, never an `issues` entry.
- Source language of free text (`resolveSourceLanguage`, `utils/localizedContent.js`): `content_language` (confirmed) → requested language (not confirmed) → Portuguese. Never detect language from the text.
- Language capabilities (`LANGUAGE_CAPABILITY_ENV`, `config/env.js`; each exactly `"true"`, **off by default**): `VITE_API_EVALUATE_LANG`, `VITE_API_IMERG_LANG`, `VITE_API_PLANTING_LANG`. Observed 2026-11-15: `/evaluate` and `/optimal-planting` ignore `lang`; IMERG does not document it.
- `lang` on `/evaluate`: behind `VITE_API_EVALUATE_LANG`. When on: same rule as `/advisory`, `requestedLanguage` on the evaluate result, retries keep the language, and «Get the justifications in {language}» re-requests **only `/evaluate`**. Keep it off in demo mode (no recorded English `/evaluate`).
- Re-request buttons are hidden when that source was already requested in the interface language (a backend that declared another language would not honour a repeat).
- Fallback notice (`results.fallback.confirmedBody*`): NASA POWER climatology 2000–2024, values are historical expectations, not current observations or forecasts; per the backend clarification relayed by the project owner, `/advisory` and `/evaluate` share the DecisionEngine, but the notice stays attributed to `/evaluate` because the requests are separate. Pending scientific review.
- IMERG (`/zonas/...`) and `/optimal-planting` have **no screen** (D11, no new features in the stabilisation phase). Prepared and tested against real recordings: `services/scientific.js` (`getImergDecision`, `getOptimalPlanting`), `utils/scientificMappers.js`, `config/imerg.js`. IMERG outcomes (`indicative`, `wait`, `noReliableBasis`, `outOfSeason`, `unknown`, `missing`) are a separate vocabulary, never mapped to `FAVORAVEL`/`AGUARDAR`/`DESFAVORAVEL`; `SEM_BASE_FIAVEL` and `FORA_DA_EPOCA` are «no conclusion», never a decision (`imergNoDecisionMessageKeys`, `imerg.noDecision.*`). Observed: the IMERG code is in `mensagem_agricultor.codigo` (docs2 §5 says `estado_motor`); both are read. Scientific values (quantiles, IC90, probabilities) pass through unchanged.
- The report names its mechanism (`results.mechanism`, shown only with a submitted consultation): DecisionEngine assessment, not including IMERG or the planting window. Strings in `mechanisms.*`/`imerg.*` are prepared for integration and listed in `reviewRequired.js`.
- HTTP 422 on `lang` (`ApiError.fields` from `detail[].loc`): own message «unsupported language», no retry, no raw server text (real recording `adv_badlang`).

**2026-11-15 — Deployment and CI** (authorised by the project owner)
- Frontend production: Netlify project `agrokairos` (<https://agrokairos.netlify.app>), built from `main` via the root `netlify.toml` (`NODE_VERSION` 24). `VITE_API_BASE_URL` is set per context in the Netlify UI, never in source.
- API production: the existing Render service <https://detetive-da-chuva.onrender.com>, kept unchanged until a service built from `backend/` passes `scripts/smoke-backend.mjs`.
- `backend/render.yaml` describes a **new** service `agrokairos-api` (`rootDir: backend`, `/health`, Python 3.11.11). Creating it needs Render dashboard access.
- GitHub Actions (`.github/workflows/ci.yml`) runs frontend tests, lint, both builds and `scripts/check-demo-isolation.mjs`, and backend `pytest`, startup and the smoke test. Backend runtime evidence comes from CI (local Windows policy blocks the compiled Python dependencies).

## 12. Known pending decisions

- Confirm whether the historical NASA POWER trend outputs described in the PDF will be exposed to the frontend during this event.
- Confirm whether the API's live responses match the supplied examples. (Partially verified on 2026-11-12: shapes match, with extra undocumented fields in `/provinces`, `/crops`, and `/evaluate`.)
- Confirm whether map/geospatial data is available for the current release.
- Confirm whether offline operation is required for the frontend demo and what data must be cached.
- Multilingual API (i18n phase 5) — **partially resolved**: `/advisory` now uses `lang` (decision D3, 2026-11-15); the frontend is prepared for `content_language` and `/evaluate` `lang` (see above). Still pending from the backend (specified in `docs/ESPECIFICACAO-BACKEND-I18N.md`): `lang` on `/evaluate`, IMERG and optimal-planting, `content_language` in responses, 422 for invalid values, and the original text alongside generated translations. Original request sent to the backend team on 2026-11-14 (`idioma` parameter on `/advisory` and `/evaluate`, translated free text plus the Portuguese original, translation metadata, documented list of `triggers_ativados` codes). Integrate only after the contract is specified and available.
- Human review of the English scientific texts listed in `frontend/src/i18n/reviewRequired.js`.
