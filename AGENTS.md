# AGENTS.md — Engineering practices

General rules for agents working on database-backed web apps. Prefer do/don’t over product catalogs. Product-specific detail lives in repo `docs/` (see footer).

## Architecture & layering

- Keep **clear layers**: DB models → API schemas/routers → FE API clients/types → pages/components. Do not skip layers (e.g. pages talking to ORM, or routers returning raw ORM without schemas).
- **One source of truth per concern.** Shared constants (roles, statuses, enums, page size) live in one module; FE and BE must not diverge.
- Prefer **shared form/list components** over copy-paste Add vs Detail. When extracting, replace call sites — do not leave a second copy.
- Put cross-cutting auth, scope, and upload helpers in shared modules; do not reimplement per router/page.
- Prefer **server-side** filter + pagination for large lists; keep FE `pageSize` aligned with API `limit`.

## Database & migrations

- Schema changes ship as **numbered SQL only**: `backend/scripts/NNN_descriptive_name.sql` (e.g. `024_add_foo.sql`). **Do not add Alembic** migrations, `alembic.ini`, or an `alembic/` tree.
- Deploy applies pending `NNN_*.sql` via `python -m app.sql_migrations`, which records each basename in the `schema_migrations` ledger so re-Deploy is safe. Unapplied scripts under `scripts/` are not done. `create_all` only creates missing tables — it does **not** alter columns.
- **Ledger bootstrap:** existing databases without `schema_migrations` require an explicit operator-verified `--baseline-through NNN`; never seed all newly fetched files automatically. Later files remain pending. Fresh restores apply all SQL then `--sync-ledger` (see `restore_db.sh`). See `docs/deployment.md` for button setup.
- Any model/API/FE field that needs a new column or table ships **with** that migration. Do not add pipeline/UI stages that cannot persist.
- Before marking done: **verify** the column/table exists in the target DB (`information_schema` or a `SELECT`). Assume environments can drift.
- When adding/renaming a field, update in the **same change**: model → API schema → FE type → forms/lists → import/export headers if applicable.
- Column replacements (legacy → junction, rename/split): migrate data, then drop old columns in the **same** change set.
- Index hot FK filter columns. Unique constraints in migrations must match the model; reconcile model vs live DB before relying on either.
- Destructive migrations (drops, renames): check row counts / backups first. Document order relative to prior scripts.
- Do not invent columns or “fix” live DB drift unless the task asks for it.

## API & auth / scope

- Every list/get that is tenant- or geography-scoped must apply the **same scope helper** as writes. Mutations that only check “logged in” without verifying the target resource are an **IDOR** risk.
- Prefer scoping **writes like reads**. Deny by default when scope is empty; unrestricted only for explicit admin/superuser cases.
- Do not allow callers to escalate privilege (e.g. set `is_superuser` or a higher role than their own) unless product rules say so — and enforce that on the **server**, not only by hiding UI.
- Validate inputs with schemas; return consistent error shapes. Never leak stack traces or internal paths to clients in production.
- Keep import/export sheet order dependency-safe; do not reorder casually.

## Frontend & shared UI

- **Shareable UI lives in `parivaar-ui`.** Generic components and tokens go in the sibling package `@parivaar/ui` (`file:../parivaar-ui` or `file:../../parivaar-ui` from `frontend/`; source-only — no package build). Product-specific forms, pages, and domain UI stay in this app. Do not re-implement Table / shared tokens in-app when they belong in `@parivaar/ui`.
- Prefer the project **design tokens / shared styles** (CSS variables, shared button/input/table primitives) over one-off hex and ad-hoc chrome.
- **Add and Detail stay in sync.** Any field or section added on create must land on view/edit in the same change. Prefer a shared form component when they diverge.
- Use the shared table shell for searchable/exportable lists; pass loading and empty states. Match that tone on hand-rolled tables when you touch them.
- If the app has **column config** (user-visible columns stored client/server):
  - Bust HTTP cache on fetch; mark JSON columns modified before commit if the ORM needs it.
  - On Apply → Back, avoid **bfcache** stale state: navigate with a cache-bust query, strip it on load, and reload on `pageshow` when `persisted`.
  - Do not let a racing API response overwrite a non-empty local column-config cache.
- Extract repeated hooks/components (`ConfirmDialog`, geo filter bar, bfcache reload) instead of copying again.
- **Field registry** (list / Column Config / export / form labels): see **Field registry** below.

## Field registry

Entity list columns, Column Config, CSV export, and form field labels must come from **one registry per entity** — frontend `*Fields.ts` modules under `frontend/src/constants/` (e.g. `studentsFields.ts`, `kutirsFields.ts`, `admissionsFields.ts`; glob `**/*Fields.ts`). Each exports a `FieldMeta[]` list (`STUDENTS_FIELDS`, `KUTIRS_FIELDS`, …) plus helpers already used in the app (`studentField` / `kutirFieldLabel`, etc.).

- Do **not** hardcode parallel label/key lists in pages, Column Config, or export.
- Use `label` for list / Column Config / export. Use optional `formLabel` when Add/Edit needs a shorter or different label than the list (e.g. Kutir `enrollment_5th`: list `"5th Enrollment"`, form `"5th Class"`).
- When adding or renaming a field visible in list/config/export/forms, update that entity’s registry **first**, then wire UI through it.

## Mobile (laptop + phone)

- UI must work on **~375px phone and desktop**. Keep viewport meta (`width=device-width, initial-scale=1`).
- Touch targets ≥ ~40px where practical. No hover-only critical actions.
- **Input font-size ≥16px on mobile** (and prefer ≥16px in shared `input`/`select` tokens). iOS Safari auto-zooms focused text controls under 16px and often leaves the page zoomed until the user pinches out — Add/Edit forms then look cropped. View mode is usually fine because it uses `ViewField` (no inputs). Do not “fix” with `maximum-scale=1` / `user-scalable=no` (hurts accessibility).
- Forms: most entities share one `*Form` for Add/Edit/View (`mode`); Users share `UserForm` for Add/Edit only (View is separate on Detail). Put `className="grs-form"` on the Add/Edit root (not View). Full-width controls; stack fields on narrow screens via `.grs-form` / avoid multi-column grids that crush below ~640px. Form shells: `max-width: 100%`, `box-sizing: border-box`, `min-width: 0`.
- No document-level horizontal overflow: scroll **inside** tables/cards; use `min-width: 0` on flex children.
- Preserve hamburger / drawer nav behavior on phone (open, overlay dismiss, close on navigate). Desktop sidebar stays visible; hamburger hidden.
- **Hamburger vs Back:** on ≤768px the menu is `position: fixed` top-left. Clear it with padding on `.grs-main` (padding-left under the button), not only `.grs-page` — many Add/Edit/View shells omit that class. Do not let a mobile padding shorthand wipe the clearance. Back must stay fully tappable on Add, Edit, and View.
- **Collapsible filters (≤640px):** list-page filters in GrsTable / `@parivaar/ui` Table collapse behind a Filters toggle with an active-count badge; desktop stays expanded. Prefer Table `filters` slot + `activeFilterCount` — do not reinvent per page. Pass `activeFilterCount` when page filters are set so the badge works. Persistence stays page-level (`usePersistedFilters`).
- Dense filter rows must not leave permanent page overflow from chips/selects on small screens.
- After UI changes, smoke-test phone (~375px) and desktop (≥1024px): nav, one Add form, one filtered list, modals if touched.

## Security & secrets

- Never commit DB dumps, export SQL with real rows, or seed scripts with passwords/DB URLs. Seeds/read secrets from **env only**.
- Keep `*_export.sql` / dump patterns in `.gitignore`. No secrets, API keys, or raw PII in git, seeds, or agent logs.
- If a dump or secret was committed: **stop** and ask to scrub history — do not “just delete” the working-tree file.
- Hash passwords; never log tokens or session cookies.
- Uploads: validate type/size; store outside the repo tree or behind controlled media routes; reuse one upload helper.
- Treat bulk reset / destructive admin endpoints as high-risk; require proper auth and confirmation.
- Prefer parameterized queries / ORM; never concatenate user input into SQL.

## Testing

- After **any substantial change** (auth, roles, deploy, dependencies, shared UI, big API/UI): run [`docs/smoke-test.md`](docs/smoke-test.md). Skip for tiny typo / docs-only edits.
- After schema work: also smoke the affected list/detail once (e.g. admissions, visits, progress as relevant).
- After schema or API changes: typecheck FE; hit the affected endpoint or page once locally when practical.
- Prefer focused checks over large new suites unless asked. Cover auth/scope regressions when touching permissions.
- For UI: verify loading, empty, and error paths — not only the happy path.
- Before asking for browser verification of a UI change: check out the PR branch locally (or merge to main first), ensure Vite is serving that checkout, and say which branch is running. Unmerged PR work will not appear on Vite still on main.
- Mobile: use the checklist in **Mobile** above; do not ship desktop-only CRUD layouts.

## Process (PRs / branches)

- Branch from the agreed base; use a clear descriptive name. One concern per PR when practical.
- Commits: short imperative subject; explain *why* if non-obvious. Do not commit generated secrets or local env files.
- PR description: what changed, how to verify, risks (migrations, auth, mobile). Link product/audit docs when relevant.
- Do not force-push shared branches or rewrite published history unless explicitly asked.
- Ask before destructive DB ops, production deploys, or scope expansions beyond the task.

---

### This repo

Checkout: `/Users/dineshgoyal/projects/KutirGRS` · PRD: [`docs/KutirGRS_PRD.md`](docs/KutirGRS_PRD.md) · Role & access: [`docs/role-and-access.md`](docs/role-and-access.md) · Engineering audit: [`docs/AUDIT.md`](docs/AUDIT.md) · Smoke test: [`docs/smoke-test.md`](docs/smoke-test.md)

Local login is **`admin` / `admin`** (`backend/.env` `ADMIN_PASSWORD=admin`). API must be up on `:8001` (`bash backend/start.sh`). Startup creates admin only if missing — it does not rehash on every restart. If the UI says invalid password, check `/docs` first (API down / bad `ALLOWED_ORIGINS` env often looks like a bad password).
