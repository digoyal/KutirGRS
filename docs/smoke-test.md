# Smoke test checklist

Run after **shared UI / dependency / auth / deploy** changes (e.g. `@parivaar/ui`, Vite, FastAPI, login).

Local defaults: API `http://localhost:8001/api/v1`, Vite `http://localhost:5173`. Admin user from `backend/.env` (`ADMIN_PASSWORD`; username usually `admin`). Do not print secrets.

## Build

- [ ] `cd frontend && npx tsc -b --noEmit`
- [ ] `cd frontend && npx vite build` (or `bash build.sh` from repo root)

## Shared package (`@parivaar/ui`)

- [ ] `frontend/node_modules/@parivaar/ui` resolves (symlink or package)
- [ ] App imports from `@parivaar/ui` (e.g. `GrsTable` / `styles`) — no missing-module errors in build or Vite

## Backend

- [ ] Backend listening on `:8001` (e.g. `cd backend && bash start.sh`)
- [ ] Health OK — e.g. OpenAPI/docs `GET http://localhost:8001/docs` → 200
- [ ] Login: `POST /api/v1/login` with admin credentials from `.env` → token (do not log password)

## Frontend

- [ ] Vite `:5173` loads (`GET /` → 200)
- [ ] Home dashboard (admission funnel) renders without blank screen / console errors
- [ ] At least 3–4 table list pages render (no blank/console errors):
  - [ ] Students
  - [ ] Kutirs
  - [ ] Visits
  - [ ] Users **or** Schools

## Optional API

- [ ] `GET /api/v1/student-exams/funnel?school_start_year=2026` with Bearer token → 200 + JSON

## Notes

Mark each item pass/fail in the PR body or a comment. Fix only clear shared-UI / wiring blockers; otherwise report failures.
