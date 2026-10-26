# Smoke test checklist

Run after **any substantial change** — auth, roles, deploy, dependencies, shared UI, or sizable API/UI work. Skip for tiny typo / docs-only edits.

Local defaults: API `http://localhost:8001/api/v1`, Vite `http://localhost:5173`. Login **`admin` / `admin`** — keep `backend/.env` `ADMIN_PASSWORD=admin` in sync; startup creates admin only if missing and does **not** rehash on every start. If login fails, check API `:8001` is up (`/docs`) before assuming a bad password. Do not print secrets. No Playwright required.

## Build

- [ ] `cd frontend && npx tsc -b --noEmit`
- [ ] `cd frontend && npx vite build` (or `bash build.sh` from repo root) — when shipping a build

## Dependencies (if touched)

- [ ] Relevant packages resolve (e.g. `frontend/node_modules/@parivaar/ui` when that dep changed) — no missing-module errors

## Backend

- [ ] `:8001` up — e.g. `GET http://localhost:8001/docs` → 200
- [ ] Login: `POST /api/v1/auth/login` with admin from `.env` → token
- [ ] One read that matters for the change (default: `GET /api/v1/student-exams/funnel?school_start_year=2026` with Bearer → 200)

## Frontend

- [ ] Vite `:5173` — `GET /` → 200
- [ ] SPA curls → 200: `/students`, `/kutirs`, `/visits`, `/users` (or the pages your change touches)

## Notes

Mark pass/fail in the PR body or a comment. Fix clear blockers from the change under test; otherwise report failures.
