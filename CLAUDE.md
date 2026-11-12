# CLAUDE.md — Detetive da Chuva

## 1. Project overview

**Detetive da Chuva** is a web application for environmental intelligence and agricultural decision support, developed for the NASA Space Apps Challenge 2026.

The current backend exposes an agricultural advisory API. The frontend must allow a user to select a province and crop, request an assessment, and understand the returned status, confidence score, metrics, and practical recommendation.

The product language is Portuguese. Use clear, accessible Portuguese suitable for users in Angola. Keep technical identifiers, code, and API field names unchanged.

## 2. Working mode and repository boundaries

- The repository root contains this file, `docs/`, and `frontend/`.
- The frontend application must be implemented inside `frontend/`.
- Read relevant documentation in `docs/` before making architectural or integration decisions.
- Do not modify backend code or backend deployment.
- Do not assume that an endpoint, field, dataset, or capability exists unless it appears in the API documentation or is verified against the live API.
- Before making broad changes, inspect the existing repository and report what is already present.
- Prefer small, reviewable implementation steps. Explain the files changed and how to test them.
- Do not overwrite user work or remove files without asking.

## 3. Source-of-truth documents

- `docs/backend-api.md`: API contract supplied by the backend team. Treat it as the primary source for currently documented backend endpoints.
- `docs/frontend.md`: product scope, screen requirements, UX, design direction, and frontend implementation guidance.
- `docs/Detetive_da_Chuva_Proposta_Formato_Dados.pdf`: draft proposal for historical trend data. It is not proof that those data endpoints or exports are implemented.

If documents disagree:
1. Identify the disagreement.
2. Do not silently reconcile it.
3. Keep the current API integration aligned with `backend-api.md`.
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

Use the visual direction agreed for the project:
- Forest Green: `#214D3A`
- Warm Ivory: `#F7F6EF`
- Earth Brown: `#82664B`
- Rain Blue: `#477FA3`
- Sage: `#DCE7D9`
- Charcoal: `#26312B`

Design principles:
- Editorial, natural, scientific, calm, and contemporary.
- Clear hierarchy and generous whitespace.
- Photography may support the landing page, but must not obscure usability or performance.
- Avoid generic enterprise dashboards, excessive cards, exaggerated gradients, and glassmorphism.
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

**2026-11-12 — Consultation date:** the user may choose today or any past date; future dates are disabled in the date picker and rejected by validation. `data_consulta` is required in the form (it remains optional in the API contract).
- Reference date: the device's **local** date (`getLocalIsoDate` in `frontend/src/utils/dates.js`), not the server's `data_servidor`. Do not switch to `data_servidor` in this phase.
- **Known limitation:** if the device clock or time zone is wrong, validation may wrongly reject today's date or accept a date that is already in the future for the server (typically a one-day offset).

**2026-11-12 — Confidence score display:** show `score_confianca` as `N/100` (e.g. `95/100`), never as a percentage, always with the caption that it is a system score (0–100), not a probability or a guarantee. Formatting lives in `formatConfidenceScore` (`frontend/src/utils/format.js`).

## 12. Known pending decisions

- Confirm whether the historical NASA POWER trend outputs described in the PDF will be exposed to the frontend during this event.
- Confirm whether the API's live responses match the supplied examples. (Partially verified on 2026-11-12: shapes match, with extra undocumented fields in `/provinces`, `/crops`, and `/evaluate`.)
- Confirm whether map/geospatial data is available for the current release.
- Confirm whether offline operation is required for the frontend demo and what data must be cached.
