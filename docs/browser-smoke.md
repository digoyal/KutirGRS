# Browser smoke (Playwright)

Tiny Playwright smoke in `frontend/e2e/` for **Admissions**, **Progress**, **Kutir Visits**, **Users**, and **Kutirs**. Not a full suite; optional companion to [`smoke-test.md`](./smoke-test.md) and the pre-alpha approach.

## Prerequisites

| Service | URL | Notes |
|---------|-----|--------|
| Vite | `http://localhost:5173` | Prefer `localhost` (not `127.0.0.1`) |
| API | `http://localhost:8001` | Vite proxies `/api` → `:8001` |
| Login | `admin` / `admin` | Keep `ADMIN_PASSWORD` in sync |

Start if needed (examples):

```bash
# API (from repo backend/)
cd backend && bash start.sh   # or your usual uvicorn/start

# Frontend — use whatever already serves main on 5173
cd frontend && npx vite --host localhost --port 5173
```

Leave servers running after the test if you were already using them.

## Install (once)

```bash
cd frontend
npm install
npx playwright install chromium
```

## Run

Default is **headless** (good for a quick local check):

```bash
cd frontend
npm run test:e2e
```

**Headed** (watch the browser):

```bash
cd frontend
npm run test:e2e:headed
# or: HEADED=1 npx playwright test
```

Override base URL if needed: `PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e`.

Run one module: `npx playwright test e2e/progress-smoke.spec.ts` (or `admissions-` / `visits-` / `users-` / `kutirs-`).

## What it covers

### Admissions (`e2e/admissions-smoke.spec.ts`)

| Spec | Checks |
|------|--------|
| Login → Admissions list | Sign in as admin, open Admissions, heading + search + Add visible (empty prompt or rows) |
| Add Admission form | Pipeline Stage six labels, Exam Details / Year / Exam Type; Roll # hidden before Admit Card |
| Pipeline → Roll # | Tick Eligible → Applied → Admit Card Downloaded; Application # then Roll # appear |
| Edit existing row | Search list → row Edit → Edit Admission with Pipeline Stage six labels, Exam Details / Year / Exam Type, Save/Cancel |
| Edit Save (no-op) | Save Changes without edits → back to Admissions list (safe local update) |

Edit tests clear `admissions_filter_state`, search for an existing student (`Chouhan` in the local seed/DB), and use the row action `title="Edit"`.

### Progress (`e2e/progress-smoke.spec.ts`)

| Spec | Checks |
|------|--------|
| Login → Progress list | Open Progress, heading + search + Add (empty prompt or rows) |
| Add Progress form | Add Progress Record with Student / Year / Class / School / Status, Add Record / Cancel |
| Edit existing row | Search → Edit → Progress Record with Academic Year / Class / School / Status, Save/Cancel |
| Edit Save (no-op) | Save Changes without edits → back to Student Progress list |

Edit tests clear `progress_filter_state` and search `Chouhan`.

### Kutir Visits (`e2e/visits-smoke.spec.ts`)

| Spec | Checks |
|------|--------|
| Login → Visit Details list | Open Visit Details, Kutir Visits heading + search + Add |
| Log New Visit form | Visit Info, Kutir / Visit Date, Implementation, Log Visit / Cancel |
| Edit existing row | Search → Edit Visit with Visit Info / Kutir / Visit Date, Save/Cancel |
| Edit Save (no-op) | Save Changes without edits → back to Kutir Visits list |

Edit tests clear `visits_filter_state` and search `Test_kutir` (local seed/DB).

### Users (`e2e/users-smoke.spec.ts`)

| Spec | Checks |
|------|--------|
| Login → Users list | Open Users, heading + search + Add (empty or rows) |
| Add User form | Username / Password / First Name / Last Name / Role, Save User / Cancel |
| Edit existing row | Search → Edit → Username / Password (leave blank) / First Name / Role, Save/Cancel |
| Edit Save (no-op) | Save Changes without edits → back to Users list |

Edit tests search username `aaditya_mandloi` (local seed/DB); detail heading is the display name.

### Kutirs (`e2e/kutirs-smoke.spec.ts`)

| Spec | Checks |
|------|--------|
| Login → Kutirs list | Open Kutirs, heading + search + Add |
| Add Kutir form | Location / Details, Name / Type / Cluster, Save Kutir / Cancel |
| Edit existing row | Search → Edit → Location / Details / Name / Cluster, Save/Cancel |
| Edit Save (no-op) | Save Changes without edits → back to Kutirs list |

Edit tests clear `kutirs_filter_state` and search `Test_kutir` (local seed/DB).

Selectors prefer roles and visible labels — no `data-testid` churn for this smoke.

## Out of scope

Other modules, CI wiring, multi-role matrices, creating/submitting new records, mutating fields on Save.
