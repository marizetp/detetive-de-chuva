# Prompt 01 — Project reconnaissance and implementation plan

Paste this prompt into Claude Code from the repository root after placing the documents in `docs/`.

---

You are working on **Detetive da Chuva**, a React frontend for an agricultural decision-support project created for NASA Space Apps Challenge 2026.

Before changing anything, read:
- `CLAUDE.md`
- `docs/frontend.md`
- `docs/backend-api.md`
- `docs/Detetive_da_Chuva_Proposta_Formato_Dados.pdf` (if accessible in the repository)

## Your task

Perform a repository and API reconnaissance only. Do not implement the UI yet.

1. Inspect the existing repository and identify existing files, package managers, scripts, and code.
2. Review the documented API contract and verify the live endpoints where practical:
   - `GET https://detetive-da-chuva.onrender.com/health`
   - `GET https://detetive-da-chuva.onrender.com/api/v1/provinces`
   - `GET https://detetive-da-chuva.onrender.com/api/v1/crops`
   - Inspect `POST /api/v1/advisory` and `POST /api/v1/evaluate` using valid example payloads if safe and practical.
3. Record actual response shapes and any discrepancies with the documentation. Do not expose secrets; the documented API has no authentication.
4. Explain which product features can be implemented using the current API and which remain unsupported or unconfirmed.
5. Recommend a frontend architecture inside `frontend/`, using React and JavaScript.
6. Recommend the smallest justified dependency set. Do not install dependencies yet.
7. Propose the page/component structure and the API service layer.
8. Identify UX states: loading, empty options, API unavailable, request failure, success, and unknown status.
9. Identify questions that need answers from the backend team.

## Constraints

- Do not modify backend code.
- Do not invent endpoints or fields.
- Do not treat the historical NASA POWER PDF proposal as an implemented API.
- Do not invent or fabricate scientific data.
- Do not install dependencies or modify files in this task.
- Keep the visual direction editorial, natural, scientific, and accessible. Use the palette in `CLAUDE.md`.
- The primary language is Portuguese (Angola).

## Deliverable

Return:
1. Repository findings.
2. Live API verification findings, including which checks could not be performed.
3. Recommended architecture and folder structure.
4. Implementation plan in small phases.
5. Open questions and risks.

Wait for approval before creating or modifying project files.
