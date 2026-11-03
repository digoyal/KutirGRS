# KutirGRS

Companion to root [`AGENTS.md`](../AGENTS.md) — not auto-loaded; read both at task start.

Product and repo rules for **KutirGRS** only. Generic engineering practices for database-backed web apps live in [`AGENTS.md`](../AGENTS.md) at the repo root — agents working here should follow **both**.

**Where work runs:** all code changes and verification happen on Dinesh's Mac (self-hosted worker), not in a cloud VM — see [`AGENTS.md`](../AGENTS.md) **§0**.

---

## 1. This repo

1. Checkout: `/Users/dineshgoyal/projects/KutirGRS` · PRD: [`docs/KutirGRS_PRD.md`](KutirGRS_PRD.md) · Role & access: [`docs/role-and-access.md`](role-and-access.md) · Audit: [`docs/AUDIT.md`](AUDIT.md) · Smoke: [`docs/smoke-test.md`](smoke-test.md)
2. Local login **`admin` / `admin`** (`backend/.env` `ADMIN_PASSWORD=admin`). API on `:8001` (`bash backend/start.sh`). Startup creates admin only if missing — no rehash every restart. Invalid password in UI: check `/docs` first (API down / bad `ALLOWED_ORIGINS` often looks like bad password).

### 1.1 Local verify (frontend)

1. **User:** from repo root — `bash scripts/dev-ui.sh` (same as `cd frontend && npm run dev:ui`). **http://localhost:5173** with Vite **HMR**. Hard refresh (Cmd+Shift+R) if tab was open during `vite preview`.
2. **Agents/workers:** **MUST** run `bash scripts/dev-ui.sh` (or kill **5173**, then `npm run dev` from `frontend/`) before asking user to verify UI. **Never** `vite preview` / `npm run preview` for routine UI work — stale `dist/`. Preview only for prod build test (`npm run build` first).
3. CSS/layout “not visible”: assume preview or dead dev server — rerun `dev-ui.sh`; do not tell user to rebuild for normal fixes.

### 1.2 Mobile / responsive UI

Layout/CSS changes — agent requirements (also generic **Mobile** in [`AGENTS.md`](../AGENTS.md)):

1. **Full width on phones:** Main content full viewport on ~375px (≤768px). No narrow centered column with large side gutters — span usable width after hamburger clearance only.
2. **Geography & Lookups:** **Geography** (`GeoPage` — Zones/Districts/Areas/Clusters tabs + `GrsTable` card) and **Lookups** (tabs + table card) match Kutirs/Students on phone: full-width main + table card. `className="grs-page"` on route shell; hamburger inset on `.grs-main` only (`frontend/src/mobile.css` — no extra left padding on `.grs-page`). ≤768px: `#root` must not stay at desktop max-width column. After layout/CSS: hard-refresh **http://localhost:5173/geo** (Zones) and Lookups at ~375–390px.
3. **Reports:** Match list pages on phone — full-width shell; **collapsible filter bar** (≤640px, collapsed by default, **▼/▲** on Filters toggle, active-count badge when filters differ from defaults — **`ReportFiltersBar`** / **`ReportPageShell`**); vertical page scroll; horizontal scroll inside wide tables only. Smoke one report route ~375px after filter/table layout changes.
4. **Scrollable mobile nav:** Hamburger drawer scrolls vertically so **Sign out** and all nav items are reachable.
5. **Full mobile access:** All pages/forms (Add, Edit, View, lists, modals) usable at phone width — no desktop-only CRUD, clipped fields, or unreachable actions.
6. **Scroll where needed:** Vertical/horizontal scroll inside tables, long forms, filter rows, cards — do not clip; no document-level horizontal overflow.

### 1.3 Mobile device testing (real phone, same Wi‑Fi)

On a physical phone, `localhost` / `127.0.0.1` is the phone — use the Mac **LAN URL**.

1. `bash backend/start.sh`; `bash scripts/dev-ui.sh`. Vite on all interfaces (`--host`; confirm `lsof -nP -iTCP:5173 -sTCP:LISTEN` → `*:5173`).
2. Mac Wi‑Fi IP: `ipconfig getifaddr en0` (or System Settings → Network). Optional: `Mac.lan` / `*.local` (Bonjour); IP more reliable.
3. Phone browser: **`http://<Mac-LAN-IP>:5173`** (not localhost). Example: `http://192.168.31.121:5173`.
4. Dev SPA uses same-origin **`/api/v1`** (Vite proxy → `:8001`; optional `VITE_API_URL` in `frontend/.env.development.local`) — no backend CORS change for phone login via proxy. Add `http://<Mac-LAN-IP>:5173` to `ALLOWED_ORIGINS` only if SPA hits `:8001` directly.
5. **macOS firewall:** If phone gets “connection refused” but Mac curl to LAN IP works, allow incoming **Node** once (Firewall → Options or prompt when Vite listens on network).

**Forgot password (magic link):** Set `FRONTEND_BASE_URL` and optional `SMTP_*` in `backend/.env` (`.env.example`). No `SMTP_HOST` → API logs reset URL to server log instead of email.

### 1.4 Offline add (phase 1 + drafts)

**Kutir Visits only** (Students and Admissions are online Add only; **Progress** has no Add UI — rows are created when admission is **Admitted**, then **Edit** only): IndexedDB (`kutirgrs-offline`) with visit **drafts** (minimal fields) and **outbox** (full create payload). **`GrsOfflineSyncMount`** (dashboard layout) syncs the visit outbox on load and on `online`. Visits list merges local rows with badges **Saved for offline** / **Waiting to sync**. **Add + complete-draft only** — edit/view existing server records unchanged. Drafts expire **7 days** (purged on list load). Geo/kutir lookups cached when Visit Add opens online (`geo-kutir-lookups` meta).

| Entity | Minimal draft (Save for offline) | Complete draft route | Outbox sync API |
|--------|----------------------------------|----------------------|-----------------|
| **Visits** | kutir + visit date | `/visits/detail/draft/:draftId` | `createVisit` (+ photo upload) |

**Visits manual test:** (1) Online: Log New Visit once (cache lookups). (2) **Save for offline** with minimal fields — badge on list. (3) Complete one draft **Log Visit**. (4) DevTools offline: Add or complete with **Save on device** — **Waiting to sync**; go online — row syncs. (5) Confirm normal online **Log Visit** unchanged.

---

## 2. Role & access

1. Roles, menu, and data access: [`docs/role-and-access.md`](role-and-access.md) (and `docs/Role-and-Access.xlsx` when present) — no parallel matrices invented in code.
2. Align FE and BE to that matrix (including loosening overly strict Admin-only API gates when the matrix grants CC+ mutate). View-only roles still hide manage UI when the matrix says No.

---

## 3. Shared UI (`@parivaar/ui`) — KutirGRS wiring

1. **Shareable UI → `parivaar-ui`.** Generic pieces in `@parivaar/ui` sibling (`file:../parivaar-ui` or `file:../../parivaar-ui` from `frontend/`; source-only — no package build). Domain forms/pages stay in this app. No in-app Table/token reimplementation when they belong in `@parivaar/ui`.
2. **Add/Edit shell:** New entity Add/Edit use `@parivaar/ui` **`FormPageShell`** (optional `header`, entity form as `children`, shared error + Cancel/Save footer). Reference: **`ExamCenterAddPage` / `ExamCenterDetailPage`**. **`FormPageActions`** for footer without page wrapper. Layout/validation stay in entity `*Form` + handlers.
3. **Reports hub:** routes in **`frontend/src/constants/reportsRegistry.ts`** (`REPORT_SECTIONS`); hub **`/reports`** (`ReportsHubPage`). Sidebar: single **Reports** item — not every report. New report: registry + `App.tsx` same change. Each page: `/reports/…`; **`ReportHubBackLink`** (`← All reports` → `/reports`). Legacy: **`/reports/summary`** → admission funnel; **`/reports/detailed`** → admitted students (incl. summary `?tab=visits`).
4. **Report shell:** Hub pages use **`ReportPageShell`** + app **`ReportPageHeader`** in `header` (back, title, actions); `filters` + `activeFilterCount`, optional `toolbar`, loading/empty/error; table as `children`. Import **`@parivaar/ui/report-shell.css`** once in `frontend/src/main.tsx` (with `table-shell.css`). Filter fields in app; mobile chrome **`ReportFiltersBar`** (shell `filters` slot; re-export `frontend/src/components/ReportFiltersBar.tsx` for direct use). References: **`TopKutirsReportPage`**, **`KutirPerformanceReportPage`**, **`AdmissionFunnelReportPage`**, **`AdmittedStudentsReportPage`** in `ReportsPage.tsx`.
5. **Form submit errors (Add/Edit):** Client validation and API failures **immediately above** Cancel/Save — not top-only (missed on long mobile). Prefer **`FormSubmitError`** from `@parivaar/ui` (`grs-form-submit-error` in `mobile.css`; re-export `frontend/src/components/FormSubmitError.tsx`). Custom layouts: `VisitAddPage`, `VisitDraftCompletePage`, `VisitDetailPage` edit.
6. **Collapsible mobile filters (≤640px):** **Filters** toggle (**collapsed by default**), **▼/▲** chevron, optional active-count badge — same UX for list Table (`filters` slot + `activeFilterCount`) and reports (**`ReportFiltersBar`** / **`ReportPageShell`**). Filter fields stay in app. List persistence: `usePersistedFilters` (page-level).
7. **List hub table cells:** **`GrsTable`** enables **`shellFullWidth`** on Students, Kutirs, Admissions, and Progress routes — desktop cells default to single-line ellipsis via `@parivaar/ui` **`Table`**; use column **`wrap: true`** for long notes-style fields ([`AGENTS.md`](../AGENTS.md) §4 item 11).

---

## 4. Progress (single journey record)

1. **One row per student** on `student_progress` (unique `student_id`). Track **`six_twelve`** (6→12) or **`nine_twelve`** (9→12) from admission class 5 or 8.
2. **Marks:** columns `marks_6` … `marks_12`; Add/Edit shows 7 or 4 inputs; server enables the next class when the previous mark is saved.
3. **Admit hook:** when Admissions **`admitted`** becomes true, API upserts progress with `class_in_year = admission_class + 1`, `academic_year = school_start_year + 1`, `status = enrolled`, entry mark field enabled. No standalone **Add Progress** list action or `/progress/new` form — progress is created on admit.
4. **Status:** `promoted` is set on save when 6th or 9th marks are first filled. **`transferred`** is legacy/read-only in UI (removed from status dropdown). Writable: enrolled, promoted, dropped_out, graduated, admitted_to_college.
5. **Registry / form:** `progressFields.ts`, shared **`ProgressForm`**, mark helpers in **`frontend/src/utils/progressTrack.ts`**. Design note: Project store [`docs/progress-single-record-plan.md`](progress-single-record-plan.md) (coordinator copy under store `docs/`).

---

## 5. Field registry (GRS entities)

One registry per entity: `frontend/src/constants/*Fields.ts` (e.g. `studentsFields.ts`, `kutirsFields.ts`, `admissionsFields.ts`; glob `**/*Fields.ts`). Each exports `FieldMeta[]` (`STUDENTS_FIELDS`, `KUTIRS_FIELDS`, …) and helpers (`studentField`, `kutirFieldLabel`, …). List columns, Column Config, CSV export, and form labels **from registry**.

1. Do **not** hardcode parallel label/key lists in pages, Column Config, or export.
2. `label` for list / Column Config / export. Optional `formLabel` when Add/Edit needs a different label (e.g. Kutir `enrollment_5th`: list `"5th Enrollment"`, form `"5th Class"`).
3. Add/rename field visible in list/config/export/forms: update registry **first**, then wire UI.
4. **CI guards:** `npm run build` runs:
   - `check-field-registry.mjs` — list page column keys ↔ `*Fields.ts` ( **`actions`** excluded).
   - `check-field-registry-models.mjs` — `*Fields.ts` ↔ SQLAlchemy columns per `field-registry-model-manifest.mjs` (join/computed keys documented there; Progress ↔ `StudentProgress`).
   Audits must compare registry to **DB/model**, not registry ↔ table switch cases only. Schema/list changes ship registry + list wiring together.

---

## 6. Mobile — KutirGRS forms & visits

1. **Forms:** Most entities: one `*Form` for Add/Edit/View (`mode`). Users: `UserForm` Add/Edit; View on Detail. `className="grs-form"` on Add/Edit root (not View). Full-width controls; stack on narrow via `.grs-form` / avoid multi-column grids below ~640px. Shells: `max-width: 100%`, `box-sizing: border-box`, `min-width: 0`.
2. **Reports (phone):** Collapsible filter bar as in **1.2** item 3. Full-width main; vertical page scroll; horizontal scroll **inside** wide tables/cards only — no document horizontal overflow.
3. **Visit photo (Add/Edit, ≤768px):** `VisitForm` shows **Take photo** (`input capture="environment"`) and **Choose file**; desktop single file input. Attaching a photo **requires** browser GPS (`navigator.geolocation.getCurrentPosition`); denied/unavailable clears the attachment and blocks save until location works. Coords are stored on `kutir_visits` (`visit_photo_latitude`, `visit_photo_longitude`, `visit_photo_accuracy_m`) and sent with `uploadVisitPhoto`. When the photo is saved and the kutir has **latitude/longitude** (migration `032`, from **manual map coordinates** or **Nominatim geocode on kutir save** — see below), the API also stores **`visit_photo_distance_from_kutir_m`** (migration `033`, haversine metres). Distance is **recorded only** — not enforced (GPS accuracy is not trusted enough to block uploads). If kutir coords are missing, save is allowed with a warning that distance is not shown (photo GPS is still stored). View/detail shows coords, distance when available, and **Open in maps**. Offline outbox requires photo GPS on the pending row; sync still requires GPS on the server but does not reject by distance.
4. **Kutir geocoding (backend):** On kutir **create** (and on **update** when name/district/state/street change, unless coords are manually set), the API geocodes `{kutir name}, {district name}, {state}, India` via **OSM Nominatim** (no API key; polite `User-Agent`; ~1 req/s). Success sets `latitude`, `longitude`, `location_source = geocoded`, `geocoded_at`. Failure leaves coords null and does not block save (`geocode_message` on create/update response + server log). The separate **`village`** column was removed in migration **`034`**; **kutir name** is the place string for Nominatim.

---

## 7. Testing (KutirGRS)

1. Smoke checklist: [`docs/smoke-test.md`](smoke-test.md) (see also generic **Testing** in [`AGENTS.md`](../AGENTS.md)).
2. After schema work: smoke affected list/detail once (admissions, visits, progress as relevant).
3. After mobile form/shell layout changes: `cd frontend && npx playwright test e2e/forms-mobile.spec.ts` (see [`docs/smoke-test.md`](smoke-test.md)).

---

## 8. Database ledger & deploy

1. **Ledger bootstrap (this repo):** existing DBs without `schema_migrations` need operator-verified `--baseline-through NNN` via `python -m app.sql_migrations`. Fresh restore: apply all SQL then `--sync-ledger` (`restore_db.sh`).
2. Button / pipeline setup: [`docs/deployment.md`](deployment.md).
