# AGENTS.md — Engineering practices

**Mandatory:** At the start of every task, read the app product rules in `docs/<project>.md` in full (this repo: [`docs/kutirgrs.md`](docs/kutirgrs.md); e.g. BNV: `docs/bnv.md`) — Cursor auto-loads only this file, not those product rules.

Rules for agents on **database-backed web apps** (Python/FastAPI + React or similar). Product rules per app: `docs/<project>.md` (this repo: [`docs/kutirgrs.md`](docs/kutirgrs.md)). Other apps: each repo’s `docs/`.

## 1. Architecture & layering

1. **Layers:** DB models → API schemas/routers → FE clients/types → pages/components. No skipping (pages → ORM, raw ORM from routers).
2. **One source of truth** per concern — roles, statuses, enums, page size in one module; FE and BE must match.
3. **Shared form/list** over copy-paste Add vs Detail; on extract, replace all call sites — no second copy.
4. Auth, scope, upload helpers in shared modules — not per router/page.
5. **Server-side** filter + pagination for large lists; FE `pageSize` aligned with API `limit`.

## 2. Database & migrations

1. Schema = **numbered SQL only**: `backend/scripts/NNN_descriptive_name.sql` (e.g. `024_add_foo.sql`). **No Alembic**, `alembic.ini`, or `alembic/`.
2. Deploy applies pending `NNN_*.sql` via `python -m app.sql_migrations` → `schema_migrations` ledger (re-deploy safe). Unapplied scripts under `scripts/` are not done. `create_all` creates missing tables only — **not** column alters.
3. **Ledger bootstrap:** DBs without `schema_migrations` need operator-verified `--baseline-through NNN`; never auto-seed all newly fetched files. Later files stay pending. Fresh restore: apply all SQL + `--sync-ledger` (repo restore/deploy scripts).
4. New column/table ships **with** migration. No UI/pipeline stages without persistence.
5. Before done: **verify** column/table in target DB (`information_schema` or `SELECT`). Assume environments drift.
6. Add/rename field in **one change**: model → API schema → FE type → forms/lists → import/export headers if applicable.
7. Column replacements (legacy → junction, rename/split): migrate data, drop old columns in the **same** change set.
8. Index hot FK filter columns. Unique constraints in migrations match the model; reconcile model vs live DB before relying on either.
9. Destructive migrations (drops, renames): row counts/backups first; document order vs prior scripts.
10. Do not invent columns or “fix” live DB drift unless the task asks.

## 3. API & auth / scope

1. Roles, menu, and data access: follow the **product role-and-access doc** in the repo’s `docs/` — do not invent parallel permission matrices.
2. Tenant/geography list/get uses the **same scope helper** as writes. Mutations with only “logged in” = **IDOR**.
3. Scope **writes like reads**. Empty scope → deny; unrestricted only for explicit admin/superuser.
4. No privilege escalation (e.g. `is_superuser`, higher role) unless product rules allow — enforce on **server**, not UI-only.
5. Validate with schemas; consistent error shapes. No stack traces or internal paths to clients in production.
6. Import/export sheet order dependency-safe; do not reorder casually.

## 4. Frontend & shared UI

1. Use `@parivaar/ui` for shared Table/primitives; do not reimplement them in the app.
2. Design tokens / shared button/input/table primitives over one-off hex and ad-hoc chrome.
3. **Add ↔ View/Edit sync:** Add and view/edit share fields in one change; use one shared `*Form` when they drift.
4. **Add/Edit shell:** `FormPageShell` + `FormPageActions`; entity `*Form` owns fields/validation. Product doc for examples ([`docs/kutirgrs.md`](docs/kutirgrs.md) for KutirGRS).
5. **Reports hub:** Central registry + hub route; sidebar lists the hub, not every report. New report: registry + router in the same change. Per-page back link to hub. Paths/legacy routes: app product doc.
6. **Report shell:** Hub pages use shared **`ReportPageShell`** + app header in `header`; `filters` + `activeFilterCount`, optional `toolbar`, loading/empty/error; table as `children`. Import report/table shell CSS once at app entry. Filter fields in app; mobile filter chrome via shell `filters` slot.
7. **Form submit errors (Add/Edit):** Client validation and API failures **immediately above** Cancel/Save — not top-only (missed on long mobile). Prefer shared **`FormSubmitError`**; app may re-export. Custom entity pages: product doc.
8. Shared table shell for searchable/exportable lists; loading and empty states. Match tone on hand-rolled tables you touch.
9. **Column config** (client/server stored columns):
   - Bust HTTP cache on fetch; mark JSON columns modified before commit if ORM needs it.
   - Apply → Back: avoid **bfcache** stale state — cache-bust query, strip on load, reload on `pageshow` when `persisted`.
   - Racing API must not overwrite non-empty local column-config cache.
10. Extract repeats (`ConfirmDialog`, geo filter bar, bfcache reload) instead of copying.

## 5. Field registry

One registry per entity (e.g. `frontend/src/constants/*Fields.ts`; glob `**/*Fields.ts`). Each exports metadata (`FieldMeta[]` or equivalent) and label helpers. List columns, Column Config, CSV export, and form labels **from registry**. Which entity `*Fields.ts` modules to use is in the app product doc ([`docs/kutirgrs.md`](docs/kutirgrs.md) for KutirGRS).

1. Do **not** hardcode parallel label/key lists in pages, Column Config, or export.
2. `label` for list / Column Config / export. Optional `formLabel` when Add/Edit needs a different label than the list.
3. Add/rename field visible in list/config/export/forms: update registry **first**, then wire UI.

## 6. Mobile (laptop + phone)

1. **~375px phone and desktop.** Viewport meta: `width=device-width, initial-scale=1`.
2. Touch targets ≥ ~40px where practical. No hover-only critical actions.
3. **Input/select font-size ≥16px on mobile** (prefer ≥16px in shared tokens). iOS auto-zooms under 16px and may leave page zoomed — Add/Edit look cropped; View usually fine (read-only fields). No `maximum-scale=1` / `user-scalable=no`.
4. **Forms:** Prefer one entity `*Form` for Add/Edit/View (`mode`) where the app does so. Put the app’s form root class on Add/Edit (not View). Full-width controls; stack on narrow via shared form styles / avoid multi-column grids below ~640px. Shells: `max-width: 100%`, `box-sizing: border-box`, `min-width: 0`.
5. No document-level horizontal overflow — scroll inside tables/cards; `min-width: 0` on flex children.
6. Hamburger/drawer on phone: open, overlay dismiss, close on navigate. Desktop sidebar visible; hamburger hidden.
7. **Hamburger vs Back (≤768px):** Menu `position: fixed` top-left. Clear with main-content padding-left (not only page wrapper — many Add/Edit/View shells omit page class). Mobile padding shorthand must not wipe clearance. Back fully tappable on Add, Edit, View.
8. **Collapsible mobile filters (≤640px):** **Filters** toggle (**collapsed by default** on phone), **▼/▲** chevron, optional active-count badge — same UX for list Table (`filters` slot + `activeFilterCount`) and report shells. Filter fields in app; pass `activeFilterCount` when set. Dense chip/select rows must not cause permanent page overflow. Desktop expanded. Page persistence via app hook when provided — not reinvented per page.
9. **Reports (phone):** **4.6** and **6.8**; vertical page scroll; horizontal scroll inside wide tables/cards only.
10. After UI changes: smoke ~375px and ≥1024px — nav, one Add form, one filtered list, modals if touched. App-specific pages (geo, reports, camera uploads): product doc.

## 7. Security & secrets

1. Never commit DB dumps, export SQL with real rows, or seed scripts with passwords/DB URLs. Read secrets from **env only**.
2. `*_export.sql` / dump patterns in `.gitignore`. No secrets, API keys, or raw PII in git, seeds, or agent logs.
3. Dump or secret committed: **stop** and ask to scrub history — do not only delete the working-tree file.
4. Hash passwords; never log tokens or session cookies.
5. Uploads: validate type/size; store outside repo or behind controlled media routes; one upload helper.
6. Bulk reset / destructive admin endpoints: proper auth and confirmation.
7. Parameterized queries / ORM — never concatenate user input into SQL.

## 8. Testing

1. After **substantial change** (auth, roles, deploy, dependencies, shared UI, big API/UI): run the repo’s **smoke checklist** (e.g. `docs/smoke-test.md`). Skip tiny typo / docs-only edits.
2. After schema work: smoke affected list/detail once for relevant entities.
3. After schema or API changes: typecheck FE; hit affected endpoint or page locally when practical.
4. Focused checks over large new suites unless asked. Auth/scope regressions when touching permissions.
5. UI: loading, empty, and error paths — not happy path only.
6. Before browser verify: checkout PR branch (or merge to main), dev server on that checkout, state branch. Unmerged PR invisible if server still on main.
7. Mobile: **6. Mobile**; no desktop-only CRUD layouts.
8. After mobile form/shell layout changes: run app-specific mobile e2e when the repo defines one (product doc).

## 9. Process (PRs / branches)

1. **Do only what was asked.** No scope expansion, no “while we’re here” refactors, no Playwright / browser automation unless explicitly requested. Diagnose minimally, ship or report, stop.
2. Branch from agreed base; clear descriptive name. One concern per PR when practical.
3. Commits: short imperative subject; explain *why* if non-obvious. No generated secrets or local env files.
4. PR description: what changed, how to verify, risks (migrations, auth, mobile). Link product/audit docs when relevant.
5. Do not force-push shared branches or rewrite published history unless explicitly asked.
6. Ask before destructive DB ops, production deploys, or scope expansions beyond the task.

### 9.1 Git (local main until push)

1. Until push, **at most one unpushed commit** on local `main`.
2. After first unpushed commit, **amend** further work — do not stack additional SHAs.
3. On push, **squash to one** if more than one unpushed commit accumulated (prefer amend to avoid).
4. Never force-push unless explicitly asked.
