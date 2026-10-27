# KutirGRS Engineering Audit

**Date:** 23 Oct 2026  
**Scope:** Read-only audit of `/Users/dineshgoyal/projects/KutirGRS` (backend + frontend + local Postgres `kutirgrs_v2`).  
**Method:** Code inspection, `npx tsc -b --noEmit`, `npm run lint` (oxlint), read-only SQL against local DB via `backend/.env`.  
**Constraint:** No code, config, or database writes were made for this audit.

**Sources of truth consulted:** `AGENTS.md`, `docs/KutirGRS_PRD.md`, `docs/kutirGRS_PRD_Old.md`.

**Legend:** Effort S/M/L · Priority High/Medium/Low · **unsure** = not fully certain.

---

## Executive snapshot

| Area | Verdict |
|------|---------|
| Typecheck | `tsc -b --noEmit` **PASS** (exit 0) |
| Lint | oxlint configured; **~55 warnings**, 0 errors |
| Tests | **None** found (no `tests/`, no `*.test.*`) |
| Local DB vs models | **Severe drift** — many scripts `006–021` (and related) not reflected in live schema |
| Security | Scope on reads; **mutations often unscoped**; PII dump in git; seed credentials committed |
| UI reuse | Route pages (not modals); bfcache missing on 4 field-config pages; duplicated forms/filters |

---

## 1. Reuse and shared components

| ID | Path + line | What's wrong | Fix | Effort | Priority |
|----|-------------|--------------|-----|--------|----------|
| R1 | `frontend/src/pages/UsersPage.tsx:42`; `SchoolsPage.tsx:80`; `KutirsPage.tsx:102`; `ExamCentersPage.tsx:64` | These pages call `useFieldConfig` but **lack** the bfcache `pageshow`/`?_=` reload required by `AGENTS.md`. Present on Admissions/Students/Progress/Visits only. After Column Settings → Apply → Back, columns can stay stale. | Extract `useBfcacheReload()`; add to all four pages. | S | High |
| R2 | `VisitsPage.tsx:343`; `VisitDetailPage.tsx:169`; `UsersPage.tsx:61`; `StudentsPage.tsx:299`; `StudentProgressPage.tsx:339`; `SchoolsPage.tsx:99`; `KutirsPage.tsx:145`; `GeoPage.tsx:165`; `ExamCentersPage.tsx:84`; `AdmissionsPage.tsx:378` | Ten deletes use browser `confirm()`. Lookups already uses in-app modal confirms (`LookupsPage.tsx` ~208–228, ~575–589). | Shared `ConfirmDialog` component; replace all `confirm()` call sites. | M | Medium |
| R3 | `GeoPage.tsx:171–214`; `LookupsPage.tsx:209–228`, `544–572`, `576–589` | Overlay modal shells re-composed from `grs.overlay` / `grs.modal` with no shared React wrapper. | Extract `<GrsModal title onClose>`. | M | Medium |
| R4 | `VisitAddPage.tsx` (~118–326) vs `VisitDetailPage.tsx` (~180–567) | Near-duplicate visit form (geo, attendance, topics, ratings, registers, photo). | Extract `VisitForm` (mirror `UserForm.tsx`). | L | High |
| R5 | `AdmissionAddPage.tsx` / `AdmissionDetailPage.tsx` | Pipeline, scores, school sections duplicated across add/edit. | Extract `AdmissionForm`. | L | High |
| R6 | `ProgressAddPage.tsx` / `ProgressDetailPage.tsx` | Duplicated field chrome + status option lists. | Shared progress form + status constants. | M | Medium |
| R7 | Geo filter cascades on Visits/Students/Progress/Kutirs/Admissions/ExamCenters/NewYearSetup | District→cluster→kutir + scope defaults + sessionStorage restore copied across ~7 list pages. | `GeoFilterBar` + `usePersistedFilters` + `defaultsFromUser`. | L | High |
| R8 | `GeoPage.tsx:118–138`; `LookupsPage.tsx:611–628`; `ReportsPage.tsx:355–366`, `389–406` | Near-identical underline tab strips. | Shared `<GrsTabs>`. | S | Medium |
| R9 | `LookupsPage.tsx` (raw `<table>` ~154, 350, 511); `ReportsPage.tsx` (~76, 184, 273); `NewYearSetupPage.tsx:268`; `ImportDataPage.tsx` (~543, 608) | Not on `GrsTable` / inconsistent `grs` table tokens (Lookups scored 3/7 in AGENTS.md). | Prefer `GrsTable` where search/export fit; keep subject matrix custom. | L | Medium |
| R10 | `frontend/src/pages/` Add/Detail pages vs `AGENTS.md` UI audit table | AGENTS.md still describes Add/Edit/View **modals** for Admissions/Kutirs/Schools/ExamCenters. Live UX is **route pages** (`*AddPage` / `*DetailPage`) linked from lists. | Update AGENTS.md to match code; do not delete Add/Detail pages. | S | Medium |
| R11 | `backend/app/routers/` (geo ×5, lookups ×8, donors, schools, kutirs, visits, students) | Nearly identical list/get/create/update/delete boilerplate; `app/crud/` is empty (`__init__.py` only). Auth/scope applied inconsistently as a result. | Thin CRUD factory or shared scope-guard helpers first; full crud layer later. | L | Medium |
| R12 | `students.py:156–174` and `visits.py:98–116` | Photo upload path/uuid/write duplicated. | Shared `save_upload(subdir)` helper. | S | Low |
| R13 | Role title lists in `auth.py`, `users.py:10–11`, `schemas/users.py`, `import_data.py`, `UserForm.tsx`, multiple pages | Drift already visible (see §5 / §2). | Single shared roles module (or OpenAPI enum) consumed by FE + BE. | M | High |

---

## 2. Hard-coded values

| ID | Path + line | What's wrong | Fix | Effort | Priority |
|----|-------------|--------------|-----|--------|----------|
| H1 | `AdmissionDetailPage.tsx:206` `color: "#e53e3e"` | Leftover hardcoded danger red called out in AGENTS.md. | `var(--status-danger-fg)`. | S | High |
| H2 | `VisitsDashboardPage.tsx` (~41, 260, 319–322, 381); `ReportsPage.tsx` (~277, 362, 399); navy hex in Admission/Visit detail headers | Accents bypass CSS variables / theme. | Map to `--badge-*` / `--status-*` / `--nav-*`. | M | Medium |
| H3 | Role arrays diverge: `VisitsPage.tsx:51` includes `"Cluster Coordinator"`; `VisitDetailPage.tsx:74` omits it; `UsersPage.tsx:32` vs `UserDetailPage.tsx:30` same pattern | List vs detail **manage permission mismatch** for Cluster Coordinators. | One `MANAGER_ROLES` / `canManageX()` in `constants/roles.ts`. | S | High |
| H4 | Backend `users.py:11` `MANAGER_ROLES` omits Cluster Coordinator; FE Users page includes it | CC sees Users UI (`canManage`) but API returns 403 on mutating endpoints. | Align FE/BE; if CC should manage Teachers only, add CC to backend list + hierarchy rules. | S | Medium |
| H5 | `SCHOOL_TYPES` ×3 (School* pages); `STATES` ×6 (School*/Kutir*/ExamCenter*); `KUTIR_TYPES` ×2 | Duplicated enums + default `"Madhya Pradesh"`. | `constants/geo.ts` / `schools.ts`. | S | Medium |
| H6 | Progress status maps in `StudentProgressPage.tsx`, `ProgressDetailPage.tsx`, `ProgressAddPage.tsx` | STATUS labels/badges/options triplicated. | `constants/progressStatus.ts`. | S | Medium |
| H7 | `CURRENT_YEAR` / year option lists in Admissions, Progress, Reports, NewYearSetup, HomePage (spans differ: 6 vs 3 vs ±1) | Same year math, inconsistent ranges. | `constants/years.ts`. | S | Medium |
| H8 | `PAGE_SIZE = 25` in `AdmissionsPage.tsx:69`, `StudentsPage.tsx:67`, `StudentProgressPage.tsx:94` | Must stay in sync with server paging. | `constants/pagination.ts`. | S | Medium |
| H9 | `api/client.ts:4`; `api/import.ts:32–33`, `42–43`; `VisitsPage.tsx:15`; `VisitDetailPage.tsx:11` | `http://localhost:8001/api/v1` fallback / media base duplicated. | Single export from `client.ts`. | S | Medium |
| H10 | `deploy.py:10` default `PROJECT_ROOT=/opt/sevakutir`; `start.sh` port `8001` | Environment-specific paths/ports hard-coded. | Env vars only (`PROJECT_ROOT`, `PORT`). | S | Low |
| H11 | `HomePage.tsx:123` `limit: 5000`; `:139` `limit: 2000`; Reports similar | Magic client fetch caps for dashboard/reports. | Named constants; prefer server aggregates (see §5). | M | Medium |
| H12 | `config.py:8–14` | Default `SECRET_KEY`, DB URL `postgres:postgres`, 480‑min JWT TTL. | Fail fast in production if secret is default; shorten TTL. | S | High (prod) |

---

## 3. Dead code

| ID | Path + line | What's wrong | Fix | Effort | Priority |
|----|-------------|--------------|-----|--------|----------|
| D1 | `frontend/src/api/students.ts:99–104` `listSchoolTypeSubjects` | Never imported. Calls `GET /school-type-subjects` — **no** backend route. Table dropped by design in `018_drop_school_type_subjects.sql` (still present in local DB — see §4). | Delete function + interface. | S | High |
| D2 | `frontend/src/api/import.ts:30–37` `getTemplateUrl` | Exported; unused. `downloadTemplate` is what Import page uses. | Delete. | S | Low |
| D3 | `backend/app/routers/donors.py:13–52` | ~~Full donors CRUD mounted; no FE~~ **Done:** Lookups → Donors UI + `donors.ts` client; Kutir `donor_id` dropdown. | — | — | Done |
| D4 | `backend/app/routers/students.py:156–174` `POST /students/{id}/photo` | No FE caller; Student detail does not upload photos. | Wire UI or remove endpoint. | M | Medium |
| D5 | `backend/app/routers/users.py:153–155` `GET /users/me` | Unused; auth uses `GET /auth/me`. | Remove or alias and document one. | S | Low |
| D6 | `geo.py` GET-by-id for zones/districts/areas/clusters | No FE client; lists only. | Optional drop. | S | Low |
| D7 | `frontend/src/App.css` (entire file) | Never imported (`main.tsx` loads `index.css` + `mobile.css` only). Vite scaffold leftover. | Delete. | S | Medium |
| D8 | `index.css` scaffold selectors (`#social`, `.counter`); `grs.ts` unused `thead`/`trEven`/`trOdd`; `mobile.css` `.grs-ibtn` / `.grs-filter-toggle` etc. with no matching `className` | Dead CSS/tokens. | Remove or wire. | S | Low–Medium |
| D9 | `App.tsx` route `new-year-setup` → `NewYearSetupPage` | Routed but **absent** from `DashboardPage.tsx` `navItems` (66–89). Reachable only by URL. | Add nav under Progress/Admin, or remove if abandoned. | S | Medium |
| D10 | `backend/scripts/migrate_data.py`; `export_geo.py` + `geo_export.json`; `backend/clear_progress.py` | One-shot / leftover scripts with hardcoded DSNs; not in `restore_db.sh`. | Archive or delete after confirming unused. | S | Medium |
| D11 | `frontend/src/constants/kutirsFields.ts:12` `teachers` | In field config; `KutirsPage` `allColumns` has no `teachers` column — toggle does nothing. | Remove from Fields or add column. | S | Medium |
| D12 | `VisitsPage.tsx:228–231` `staff_behavior` column | Rendered in table but **missing** from `visitsFields.ts` — cannot configure via Column Settings. | Add to `VISITS_FIELDS`. | S | Medium |
| D13 | `require_admin` imported unused in `visits.py:8`, `students.py:12`, `kutirs.py:8`, `schools.py:8`, `users.py:7`; `require_roles` in `auth.py:69–78` never used | Dead imports / unused helpers. | Use them for real gates, or remove. | S | Low |

**Not dead (verified):** All `*AddPage` / `*DetailPage` files are routed and linked — they are the live UX, not leftovers from a modal migration.

---

## 4. Database

**Local DB audited:** `kutirgrs_v2` via `DATABASE_URL` in `backend/.env` (credentials not repeated here).  
**Note:** `Base.metadata.create_all` in `main.py:40` creates missing **tables** only; it does **not** apply column migrations. Live schema is far behind models/scripts.

### 4.1 Schema drift (models / Pydantic / scripts vs live DB)

| ID | Evidence | What's wrong | Fix | Effort | Priority |
|----|----------|--------------|-----|--------|----------|
| DB1 | Model `StudentExam.admit_card` (`students.py:87`); schema `admit_card` (`schemas/students.py:90`); script `007_add_admit_card_stage.sql`; **DB column ABSENT** | Pipeline stage in code/API cannot persist. | Apply migration 007 (and related) to all environments; track applied scripts. | M | High |
| DB2 | Model/schema `exam_type_id`, `school_type`, `admission_class` on exams; scripts `013`, `019`; **DB ABSENT** (`student_exams` still has legacy `math`/`english`/`reasoning`/`evs`) | Admissions features and score model mismatch DB. Unique in DB is `uq_student_school_year (student_id, school_id, school_start_year)`; model declares `uq_student_school_type_year (student_id, school_type, school_start_year)`. | Apply `013`, `016`, `019`, `021`; reconcile unique constraint with product rule. | L | High |
| DB3 | Model `KutirVisit` has `avg_attendance_morning/evening`, `kutir_closed`, `plan_*`, `staff_behavior`, `regular_students_morning/evening`; DB still has `avg_attendance_last_week`, `regular_students`, `follow_monthly_plan`, `timeslot_utilization`; **missing** model columns | Visit create/read will error or silently omit fields once ORM selects model columns. Scripts `006`, `008`, `020`, `migrate_attendance_morning_evening.sql`. | Apply visit migrations; verify against 554 existing visit rows before destructive drops. | L | High |
| DB4 | Model `StudentProgress` uses `status`, `class_in_year`, `transfer_school`; DB has `grade`, `is_enrolled` (no `status` / `class_in_year`) | Progress API/UI ↔ DB mismatch. | Apply progress migrations (`migrate_class_in_year.py` / equivalent SQL); data-migrate `grade`→`class_in_year`, `is_enrolled`→`status`. | L | High |
| DB5 | Router/import use table `exam_type_subjects` (`lookups.py:398+`, script `017`); **table ABSENT** in DB | Lookups subject matrix / import sheet will fail. | Apply `017_exam_type_subjects.sql`. | S | High |
| DB6 | Script `018` should drop `school_type_subjects` + M2M; **both tables still PRESENT** (6 rows) | Obsolete schema coexists with new design; FE dead client still targets old path (D1). | Apply 018 after 017 cutover. | S | Medium |
| DB7 | Script `011_remove_geo_person_fks.sql` should drop `zonal_head_id` etc.; **still PRESENT** on zones/districts/areas/clusters (+ FKs to users) | Models no longer map these columns; orphaned person FKs remain. | Apply 011 (or drop columns after confirming unused). | S | Medium |
| DB8 | Script `015` drops `kutirs.village`; **village + teacher_id still in DB**; model has neither `village` nor `teacher_id` | Extra DB columns unused by ORM. | Apply 015; decide teacher assignment (user_kutirs vs kutir.teacher_id). | S | Medium |
| DB9 | Script `014_import_logs.sql`; **`import_logs` table ABSENT** | Import logging migration not applied. | Apply 014 if import logs are required. | S | Low |
| DB10 | `AGENTS.md` claims `student_class` on model + `students.ts`; **absent from model, TS interface, and DB** | Docs/product drift. `migrate_add_student_class.sql` adds it; `migrate_class_in_year.py` drops it in favor of progress `class_in_year`. | Update AGENTS.md; treat class on progress year records as source of truth. | S | Medium |

### 4.2 Fields / TS / Pydantic alignment (code-level, independent of DB)

| ID | Path | What's wrong | Fix | Effort | Priority |
|----|------|--------------|-----|--------|----------|
| DB11 | `schemas/students.py:85` and `:96` | `exam_type_id` declared **twice** on `StudentExamBase`. | Remove duplicate field. | S | Low |
| DB12 | `kutirsFields.ts` `teachers` vs list columns; `visitsFields.ts` missing `staff_behavior` | Field-config registry out of sync with table columns (see D11/D12). | Align Fields ↔ page columns ↔ model. | S | Medium |
| DB13 | ~~Donors model; no FE types/page~~ **Done:** Lookups → Donors + Kutir dropdown. | — | — | — | Done |

### 4.3 Indexes / FKs / uniques

| ID | Evidence | What's wrong | Fix | Effort | Priority |
|----|----------|--------------|-----|--------|----------|
| DB14 | FK columns without a leading btree index include `students.kutir_id`, `student_exams.school_id`, `kutirs.cluster_id`/`district_id`, `areas.district_id`, `clusters.area_id`, `districts.zone_id`, many lookup FKs (verified via `information_schema` + `pg_indexes`) | Scope filters and joins on large tables (`kutir_visits` already 554 rows) will seq-scan. | Add indexes on hot FKs (`students.kutir_id`, `student_exams.student_id` if missing as leading, `kutir_visits.kutir_id` — note unique `(kutir_id, visit_date)` already covers kutir_id leading). | M | Medium |
| DB15 | Model unique `uq_student_school_type_year` vs DB unique `uq_student_school_year` | Constraint semantics differ (school_type vs school_id). | Pick one product rule; migrate constraint to match. | M | High |
| DB16 | Geo `code` columns on zones/districts/areas/clusters exist in DB, not in models | Unused legacy columns (unless import still writes them — **unsure**). | Drop or map in models. | S | Low |

---

## 5. Correctness and security

| ID | Path + line | What's wrong | Fix | Effort | Priority |
|----|-------------|--------------|-----|--------|----------|
| S1 | `kutirs.py` create/update/delete (~67–104); `students.py` mutations/photo (~104–174, 239–338, 399–450); `visits.py` create/update/delete/photo (~42–116) | **List/get use `get_scope`; mutations only `get_current_user`.** Any authenticated user can mutate out-of-scope records by ID (IDOR). | Inject `get_scope` on all mutations; 404/403 if target kutir ∉ scope. | M | High |
| S2 | `schools.py:15–66` all auth-only; `geo.py` exam-center CUD (~234–266) auth-only | Frontend treats schools/exam centers as admin-ish nav; API allows any role to CUD. Schools list has **no** geo filter. | `require_admin` (or manager) for CUD; optional geo filter on school list. | S–M | High |
| S3 | FE `VisitDetailPage.tsx` gates delete with `isAdmin`; BE `visits.py:88–94` any auth | Role check **UI-only**. | `require_admin` (or proper roles) on DELETE. | S | High |
| S4 | `schemas/users.py` + `users.py:137–190` | Managers can set `is_superuser` via create/update → passes `require_admin`. | Strip / reject `is_superuser` unless caller is Admin/superuser. | S | High |
| S5 | Create checks role hierarchy (`users.py:130–132`); **update does not** (`168–229`) | Manager can promote users to equal/higher titles via PUT. | Reuse hierarchy check on title change; block editing peers/seniors. | S | High |
| S6 | `kutirgrs_v2_export.sql` **git-tracked** (also listed in `.gitignore` — ignore does not untrack); ~27 students with names/DOB/phones/parents; user password hash | PII + credential material in public repo history. | Remove from git history; rotate admin password; keep anonymized seeds only. | M | High |
| S7 | `backend/scripts/seed_admin.py:13–19` | Hardcoded `PASSWORD = "***REMOVED***"` and hardcoded DB URL including DB password. | Read from env; never commit secrets; force password change. | S | High |
| S8 | `config.py:8` default JWT secret | Missing/empty `.env` in prod → forgeable tokens. `.env` itself is gitignored (OK). | Refuse to start if `APP_ENV=production` and secret is default. | S | High |
| S9 | `deploy.py` | Admin deploy still runs `shell=True` subprocess; default path `/opt/sevakutir`. **Migration step fixed (2026-10-26):** calls `python -m app.sql_migrations` (numbered SQL + ledger) instead of Alembic. | Prefer CI/systemd; if kept, argv list form, no shell. | M | High |
| S10 | `main.py:50–51` `/docs` always on; `main.py:83–86` `/media` StaticFiles unauthenticated | Photos/docs readable by anyone with URL; OpenAPI exposes surface. | Auth/signed URLs for media; disable docs when not `is_dev`. | M | Medium |
| S11 | `DashboardPage.tsx:84–88` `adminOnly` nav only; `App.tsx` `PrivateRoute` is login-only | Lookups/Import/Deploy/Field-config reachable by URL for any logged-in user (mutations mostly admin-gated on API — good). | `AdminRoute` wrapper for those pages. | S | Medium |
| S12 | `HomePage.tsx:121–149` | Loads up to 5000 students + 2000 exams into the browser to count funnel; stages include **"Form Received"** and omit **"Admit Card"** vs pipeline §5.2. | Server-side aggregate endpoint; align stages with Eligible→Applied→Admit Card→Appeared→Selected→Admitted. | M | Medium |
| S13 | `main.py:54–59` CORS `allow_methods=["*"]`, `allow_headers=["*"]`, credentials on | Broad if origins misconfigured. | Explicit methods/headers. | S | Low–Medium |
| S14 | Geo GET-by-id (`geo.py` ~38–247) uses `get_current_user` only | Lists use `get_geo_scope`; single GETs return any ID. | Scope check on get. | S | Medium |

---

## 6. Consistency

| ID | Path + line | What's wrong | Fix | Effort | Priority |
|----|-------------|--------------|-----|--------|----------|
| C1 | Tooling | `cd frontend && npx tsc -b --noEmit` → **PASS**. | — | — | — |
| C2 | `frontend/package.json` `"lint": "oxlint"` | oxlint runs; **~55 warnings**, 0 errors. Dominant: `react(set-state-in-effect)`, `react-hooks/exhaustive-deps`, `only-export-components`. Notable: `VisitsDashboardPage.tsx` `react(immutability)` reassign after render; `NewYearSetupPage.tsx` incomplete hook deps. | Fix immutability + critical deps first; triage set-state-in-effect as follow-up. | M | Medium |
| C3 | Error banners | Many Add/Detail pages use ad-hoc danger boxes with hex fallbacks; `grs.errorBox` exists but often unused. | Standardize on `grs.errorBox`. | S | Medium |
| C4 | Loading / empty | GrsTable pages generally OK; Lookups/Reports/Import hand-rolled — inconsistent empty states. | Shared empty/loading patterns. | M | Low |
| C5 | Naming | Mix of `kutir-visits` vs `visits` routes; progress `grade` (DB) vs `class_in_year` (code). | Align names when migrating schema. | M | Medium |
| C6 | `DashboardPage.tsx:73` and `:79` | **"Reports" appears twice** in nav; both can reach summary (`/reports` and `/reports/summary`). | Remove duplicate under KUTIR VISITS (requirements gap #7). | S | Low |
| C7 | `AGENTS.md` vs code | Modal-centric UI audit, `student_class`, admissions modals — outdated vs route pages and progress `class_in_year`. | Refresh AGENTS.md after product confirmations. | S | Medium |

---

## 7. Testing and tooling

| ID | Finding | Fix / recommendation | Effort | Priority |
|----|---------|----------------------|--------|----------|
| T1 | **No automated tests** in repo (no `backend/tests`, no FE `*.test.*` / Playwright / Vitest / pytest configs found). | Add pytest + httpx for API; Vitest for critical FE helpers; optional Playwright smoke. | L | High |
| T2 | ~~Deploy Alembic / no ledger~~ — **Done (2026-10-26):** `schema_migrations` ledger + `app.sql_migrations`; Deploy and `restore_db.sh --sync-ledger` aligned. One-off legacy Python migrators remain for pre-004 history. | — | — |
| T3 | oxlint present; no CI gate verified in this audit for lint/tsc. **unsure** of GitHub Actions without opening workflows in depth. | Fail CI on `tsc` + oxlint errors. | S | Medium |

### Five most valuable tests to add first

1. **Scope IDOR on mutations** — Teacher scoped to kutir A cannot PUT/DELETE student/exam/visit/kutir in kutir B (S1).  
2. **Role hierarchy on user update** — District Anchor cannot promote to Admin / set `is_superuser` (S4, S5).  
3. **Admission pipeline invariants** — ticking/unticking stages cascades; no-exam / no-admit reasons cleared correctly (R-ADM-1..3).  
4. **Paged list contracts** — `/students`, `/student-exams`, `/student-progress` honor `limit`/`offset` + `X-Total-Count` and scope filters.  
5. **Migration smoke** — fresh DB applying `restore_db.sh` / scripts `004–021` matches SQLAlchemy models (columns + uniques for `student_exams`, `kutir_visits`, `student_progress`, `exam_type_subjects`).

---

## Top-10 fix order

1. **Remove `kutirgrs_v2_export.sql` from git history; rotate admin password; scrub `seed_admin.py` secrets** (S6, S7)  
2. **Apply pending DB migrations so live `kutirgrs_v2` matches models** — especially admit_card, exam_type_*, visit columns, progress status/class_in_year, exam_type_subjects (DB1–DB5)  
3. **Enforce `get_scope` on all student/exam/progress/visit/kutir mutations** (S1)  
4. **Lock down user privilege escalation** — `is_superuser` + hierarchy on PUT (S4, S5)  
5. **Admin-gate schools / exam-center CUD and visit delete on the API** (S2, S3)  
6. **~~Replace deploy Alembic mismatch~~** — migration runner done (T2); still harden or remove shell deploy (S9)  
7. **Server-side home funnel aggregates + correct stages (include Admit Card)** (S12)  
8. **Add bfcache reload to Users/Schools/Kutirs/ExamCenters** (R1)  
9. **Unify role constants FE/BE; fix Cluster Coordinator manage drift** (H3, H4, R13)  
10. **Add the five tests above** starting with scope IDOR + user hierarchy (T1)

---

## Unsure / needs product confirmation

- Whether Cluster Coordinators should manage Teachers (H4).  
- Whether Geo tables should get column config (R9/R26 territory).  
- Default `listVisits` limit 200 — intentional truncation or bug.  
- Whether `kutirs.teacher_id` / geo `*_id` person columns are still written by any import path.  
- ~~Production deploy topology~~ — **Decided (2026-10-27):** single AWS production host; keep hard-coded `/opt/sevakutir` / `PROJECT_ROOT`; multi-env deferred.  
- New Year Setup promotion rules (requirements §6 / gap #11) — page exists but is not in nav (D9).

---

*End of audit. Report only — no repository or database changes were made beyond writing this file.*
