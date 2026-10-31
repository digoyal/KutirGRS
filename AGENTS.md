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

- Role permissions and menu/data access: follow [`docs/role-and-access.md`](docs/role-and-access.md) (do not invent parallel matrices).
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
- **Collapsible mobile filters:** On ≤640px, filters collapse behind a **Filters** toggle (**collapsed by default**), with a visible **▼/▲** chevron on the toggle and an optional active-count badge — the same UX for list tables and report pages. List tables get this from `@parivaar/ui` Table (`filters` slot + `activeFilterCount`); Reports use in-app `frontend/src/components/ReportFiltersBar.tsx`. **Prefer moving shared `FilterToggle` / collapsible filter-bar chrome into `@parivaar/ui`** so new pages pick up the pattern automatically; product-specific filter *fields* stay in the app.
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
- **Collapsible filters (≤640px):** list-page filters in GrsTable / `@parivaar/ui` Table collapse behind a **Filters** toggle (**collapsed by default** on phone) with a visible **▼/▲** chevron and an active-count badge; desktop stays expanded. Prefer Table `filters` slot + `activeFilterCount` — do not reinvent per page. Pass `activeFilterCount` when page filters are set so the badge works. Persistence stays page-level (`usePersistedFilters`). **Reports** use the same pattern via `ReportFiltersBar` (see **Mobile / responsive UI → Reports**).
- **Reports (phone):** Report geo/date filter rows use the collapsible filter bar above (collapsed by default, chevron on toggle). Match other list pages for **full-width** main content; allow normal **vertical page scroll** and **horizontal scroll inside** wide report tables/cards — no document-level horizontal overflow.
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
- After mobile form/shell layout changes: `cd frontend && npx playwright test e2e/forms-mobile.spec.ts` (see [`docs/smoke-test.md`](docs/smoke-test.md)).

## Process (PRs / branches)

- **Do only what was asked.** No scope expansion, no “while we’re here” refactors, no Playwright / browser automation unless explicitly requested. Diagnose minimally, ship or report, then stop.
- Branch from the agreed base; use a clear descriptive name. One concern per PR when practical.
- Commits: short imperative subject; explain *why* if non-obvious. Do not commit generated secrets or local env files.
- PR description: what changed, how to verify, risks (migrations, auth, mobile). Link product/audit docs when relevant.
- Do not force-push shared branches or rewrite published history unless explicitly asked.
- Ask before destructive DB ops, production deploys, or scope expansions beyond the task.

### Git (local main until push)

- Until push, keep **at most one unpushed commit** on local `main`.
- After the first unpushed commit, **amend** further work into it — do not stack additional SHAs.
- On push, **squash to one** commit if more than one unpushed commit somehow accumulated (prefer avoiding that with amend).
- Never force-push unless explicitly asked.

---

### This repo

Checkout: `/Users/dineshgoyal/projects/KutirGRS` · PRD: [`docs/KutirGRS_PRD.md`](docs/KutirGRS_PRD.md) · Role & access: [`docs/role-and-access.md`](docs/role-and-access.md) · Engineering audit: [`docs/AUDIT.md`](docs/AUDIT.md) · Smoke test: [`docs/smoke-test.md`](docs/smoke-test.md)

Local login is **`admin` / `admin`** (`backend/.env` `ADMIN_PASSWORD=admin`). API must be up on `:8001` (`bash backend/start.sh`). Startup creates admin only if missing — it does not rehash on every restart. If the UI says invalid password, check `/docs` first (API down / bad `ALLOWED_ORIGINS` env often looks like a bad password).

#### Local verify (frontend)

**User:** one command from repo root — `bash scripts/dev-ui.sh` (same as `cd frontend && npm run dev:ui`). Opens **http://localhost:5173** with Vite **HMR** (live source, not frozen `dist/`). Hard refresh once (Cmd+Shift+R) if the tab was open while `vite preview` was running.

**Agents/workers:** **MUST** run `bash scripts/dev-ui.sh` (or equivalent: kill anything on **5173**, then `npm run dev` from `frontend/`) before asking the user to verify UI changes. **Never** start `vite preview` / `npm run preview` for routine UI work — preview serves stale built assets. Use preview only when explicitly testing a production build (`npm run build` first).

If CSS or layout changes are “not visible,” assume preview or a dead dev server — rerun `bash scripts/dev-ui.sh`; do not tell the user to rebuild for normal fixes.

#### Mobile / responsive UI

When changing frontend layout or CSS, treat these as **agent requirements** (see also **Mobile (laptop + phone)** above):

- **Full width on phones:** Main content must use the full viewport width on ~375px devices (≤768px). No centered narrow column with large empty gutters left/right — the shell should span the usable width after hamburger clearance only.
- **Geography & Lookups (agent requirement):** **Geography** (`GeoPage` — Zones / Districts / Areas / Clusters tab strip + `GrsTable` card) and **Lookups** (tab strip + table/list card) must match Kutirs/Students on phone: full-width main + table card, not a squeezed center column. Use `className="grs-page"` on the route shell; hamburger inset lives on `.grs-main` only (`frontend/src/mobile.css` — do not stack extra left padding on `.grs-page`). On ≤768px, `#root` must not stay at the desktop max-width column. After layout/CSS changes, hard-refresh **http://localhost:5173/geo** (Zones tab) at ~375–390px alongside Lookups.
- **Reports (agent requirement):** Report pages (`ReportsPage`, Kutir performance / top kutirs / visit detailed, etc.) must match list pages on phone: **full-width** shell, **collapsible filter bar** (≤640px, collapsed by default, **▼/▲** chevron on the Filters toggle, active-count badge when filters differ from defaults — `ReportFiltersBar`), **vertical page scroll**, and **horizontal scroll inside** wide tables only. Smoke one report route at ~375px after filter or table layout changes.
- **Scrollable mobile nav:** The hamburger drawer / mobile sidebar must scroll vertically so users can reach **Sign out** and every nav item at the bottom.
- **Full mobile access:** All pages and forms (Add, Edit, View, lists, modals) must stay fully usable on phone width — no desktop-only CRUD layouts, clipped fields, or unreachable actions.
- **Scroll where needed:** Allow vertical and horizontal scrolling **inside** tables, long forms, filter rows, and cards as appropriate. Do not clip content; keep scrolling off the document body (no page-level horizontal overflow).

#### Mobile device testing (real phone, same Wi‑Fi)

On a **physical iPhone/Android**, `localhost` and `127.0.0.1` point at the phone — not your Mac. Use the Mac’s **LAN URL** instead.

1. Start API and UI as usual: `bash backend/start.sh`, then `bash scripts/dev-ui.sh`. Vite must listen on all interfaces (`npm run dev` / `dev-ui.sh` pass **`--host`**; confirm with `lsof -nP -iTCP:5173 -sTCP:LISTEN` → `*:5173`).
2. Find the Mac’s Wi‑Fi IP: `ipconfig getifaddr en0` (or System Settings → Network). Optional hostnames: `Mac.lan` / `*.local` (Bonjour; IP is more reliable).
3. On the phone browser, open **`http://<Mac-LAN-IP>:5173`** (not localhost). Example: `http://192.168.31.121:5173`.
4. In dev, the SPA uses same-origin **`/api/v1`** (Vite proxy to `:8001`; optional override `VITE_API_URL` in a local `frontend/.env.development.local`) — **no backend CORS change** needed for login from the phone. Only add `http://<Mac-LAN-IP>:5173` to `ALLOWED_ORIGINS` in `backend/.env` if you bypass the proxy (e.g. point the SPA directly at `http://<Mac-LAN-IP>:8001`).
5. **macOS firewall:** if the phone gets “connection refused” while curl from the Mac to the LAN IP works, allow incoming connections for **Node** once (System Settings → Network → Firewall → Options, or the prompt when Vite first listens on the network).

**Forgot password (magic link):** set `FRONTEND_BASE_URL` and optional `SMTP_*` in `backend/.env` (see `.env.example`). With no `SMTP_HOST`, the API logs the reset URL to the server log instead of sending email.
