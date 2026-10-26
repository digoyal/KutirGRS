# KutirGRS — Pre-Alpha / Pre-Beta Testing Approach

**Audience:** Dinesh (sole developer), then a small Alpha/Beta invite list  
**Layers on top of:** [`docs/smoke-test.md`](./smoke-test.md) — smoke stays short; this doc is the deeper gate before inviting people  
**Automation stance:** Manual checklists + smoke + a few high-value API/script checks. No Playwright / full browser suite unless you explicitly ask later.

Local defaults match smoke: API `http://localhost:8001`, Vite `http://localhost:5173`, login `admin` / `admin` (keep `ADMIN_PASSWORD` in sync). Prefer `http://localhost:5173` over `127.0.0.1`.

---

## 1. Goal

| Gate | Means for KutirGRS |
|------|--------------------|
| **Ready for Alpha** | *You* trust core paths enough that 1–3 trusted field/ops people can poke a **seeded non-prod** copy without constant hand-holding. Scope: login → scoped lists → one admission through the pipeline → one progress + one visit → Admin import dry-run. Known matrix conflicts and §8 open questions are **documented**, not necessarily all fixed. |
| **Ready for Beta** | Broader invite (more districts / roles). Role × scope behaviour matches the matrix for the roles you invite; pipeline field visibility and contiguous stages hold; import of a real-ish workbook works; no open **IDOR** or privilege-escalation holes on scoped writes; Home funnel does not contradict the six pipeline stages. Remaining §8 items either decided or explicitly “live with ambiguity” for Beta. |

Alpha is “does the product story work?” Beta is “does access control + data integrity hold under real users?”

---

## 2. Sources of truth (map to tests)

| Source | What it drives |
|--------|----------------|
| [`docs/KutirGRS_PRD.md`](./KutirGRS_PRD.md) (PRD) | Personas, §5.5 admissions behaviour, BR-\* rules (§6), success criteria, §8 blockers |
| [`docs/Role-and-Access.xlsx`](./Role-and-Access.xlsx) → [`docs/role-and-access.md`](./role-and-access.md) | **Functionality** (menu × Add/Edit/Delete vs View) and **Data** (kutir → cluster → area → district → zone → All). SysAdmin is documented in markdown (ops role; not a column on the spreadsheet). |
| Pipeline Stages spreadsheet + PRD §5.5 / BR-ADM-\* | Six stages and **which admission fields show at each stage**; contiguous prefix tick/untick; one Admitted per student |
| [`docs/smoke-test.md`](./smoke-test.md) | Every substantial change: tsc/build, login, one API read, SPA route curls — **always first, never replaced** |

**Do not invent** roles or stages outside those sources. Spreadsheet stage label **Admin Card Downloaded** ≡ app/import `admit_card` / PRD “Admit Card Downloaded”.

**Known product conflict (test explicitly):** `role-and-access.md` notes code may still require **Admin** for school CUD, exam-centre CUD, and visit **delete**, while the Functionality sheet grants Cluster Coordinator+. Until §8.1 is decided, Alpha tests should **record actual vs matrix**, not silently pass the stricter code.

---

## 3. Test layers

### 3.0 Build / smoke (existing)

Run [`docs/smoke-test.md`](./smoke-test.md) after any substantial change and **before** starting the deeper layers below. Keep it short: tsc, optional vite build, API up + login + one funnel/read, SPA curls for touched routes.

### 3.1 Role × data-scope matrix

**Fixtures (create once, reuse):**

| User | Role | Assignment | Expect on Students / Kutirs / Admissions / Progress / Visits / Geography / Users |
|------|------|------------|----------------------------------------------------------------------------------|
| T1 | Teacher | One Kutir K-A | Only K-A rows; **no** Users / Column Config nav; view-only Kutirs/Visits/Schools/Exam Centers/Geography |
| CC1 | Cluster Coordinator | Cluster C1 (includes K-A, K-B) | Rows under C1 only; mutate Kutirs/Visits/Schools/Exam Centers/Users per matrix (or note Admin-only conflict) |
| EC1 | Education Coordinator | Area A1 | Scope = clusters under A1 |
| DA1 | District Anchor | District D1 | Scope = D1 |
| RH1 | Regional Head | Zone Z1 | Scope = districts in Z1 |
| ADM | Admin | — | All rows; Lookups + Column Config mutate; **no** Deploy |
| SYS | SysAdmin | — | Same as Admin menus **+ Deploy**; data All |

**Functionality spot-checks (from Functionality sheet — pick high-risk cells, not every cell every time):**

| Check | Teacher | CC+ | Admin | SysAdmin |
|-------|---------|-----|-------|----------|
| Students / Admissions / Progress CUD | Yes | Yes | Yes | Yes |
| Kutirs / Visits / Schools / Exam Centers CUD | **No** (view only) | **Yes** (matrix) | Yes | Yes |
| Geography CUD | No | No until Education Coordinator+ | Yes | Yes |
| Lookups / Column Config CUD | No | No | Yes | Yes |
| Users view + CUD | No | Yes | Yes | Yes |
| Deploy | No | No | **No** | **Yes** |

**Data-scope / IDOR (BR-SCOPE-1) — highest value before Alpha:**

1. As T1, list students → only K-A.  
2. As T1, `GET`/`PUT`/`DELETE` a student or admission whose Kutir is **outside** K-A (copy id from Admin) → **403/404**, not success. Repeat for Progress and Visits.  
3. As CC1, confirm K-A and K-B visible; Kutir in another cluster **not** listable; mutation by id denied.  
4. Schools / Exam Centers / Lookups: list shows **All** for every role (Data sheet); mutate still follows Functionality.  
5. Empty assignment → deny by default (no accidental “see everything”).  
6. Privilege: CC1 cannot create Admin/SysAdmin or assign a higher title than allowed (PRD §2.3). Teacher assignable to **at most one** Kutir.

**Stage 1 automated API (high value, not a full suite):** [`backend/scripts/API_testing_matrix.py`](../backend/scripts/API_testing_matrix.py) logs in as fixtures T1/CC1/ADM/SYS against `http://localhost:8001`, asserts list scope + IDOR GET/PATCH/DELETE (403/404) + BR-ROLE-1 Deploy, and writes [`docs/API_testing_matrix_results.md`](./API_testing_matrix_results.md). No Playwright. Re-run the script to refresh the matrix; do not wait on a full pytest suite for Alpha.

### 3.2 Admissions pipeline stages

**Stages (order):** Eligible → Applied → Admit Card Downloaded → Appeared → Selected → Admitted.

**Contiguous prefix (BR-ADM-1 / PRD §5.5):**

- [ ] Tick **Selected** → Eligible, Applied, Admit Card, Appeared, Selected all on.  
- [ ] Untick **Applied** → Applied and all later stages clear; Eligible stays if it was on.  
- [ ] Cannot leave a “gap” (e.g. Appeared without Applied) via UI or API.

**Field visibility (Pipeline Stages sheet — Yes = show at that furthest stage):**

| Field | Eligible | Applied | Admit Card | Appeared | Selected | Admitted |
|-------|----------|---------|------------|----------|----------|----------|
| Year, Exam Type, Exam Category | Yes | Yes | Yes | Yes | Yes | Yes |
| Parivaar District, Exam Center, Application # | No | Yes | Yes | Yes | Yes | Yes |
| Roll # | No | No | Yes | Yes | Yes | Yes |
| Reason Not Appeared | No | No | **Yes** | No | No | No |
| Scores | No | No | No | Yes | Yes | Yes |
| District (school), School Type, School Name (GRS) | No | No | No | No | Yes | Yes |
| Reason Not Admitted | No | No | No | No | **Yes** | **No** |

Manual pass: Add/Edit/View — change furthest stage and confirm show/hide + validation does not require hidden fields.

**Also (PRD §5.5 / BR-ADM-\*):**

- [ ] BR-ADM-2: second **Admitted** for same student blocked.  
- [ ] BR-ADM-3: year stored as integer; UI may show `2025-26`.  
- [ ] BR-ADM-4: on Add, student select prefills Parivaar District and GRS School District from student’s Kutir district; override allowed.  
- [ ] GRS School: School Name enabled only after School Type; type change clears school; district/type placeholders are select (not “All”).  
- [ ] Cascades: school type → schools; exam type ↔ school type; subjects follow exam type.  
- [ ] BR-UX-1: lists/search show `First Last (Father)` when father set.

**Form received:** **Decided (2026-10-26): not a stage; flag removed.** Alpha/Beta: funnel bars must match the six pipeline stages (Eligible → Applied → Admit Card → Appeared → Selected → Admitted).

### 3.3 Critical business rules (PRD §6)

Prioritize in this order for pre-Alpha:

| ID | Quick check |
|----|-------------|
| BR-SCOPE-1 | Out-of-scope write fails (3.1) |
| BR-ROLE-1 | Admin no Deploy; SysAdmin has Deploy + all Admin menus + All data |
| BR-ADM-1 / 2 / 4 | Pipeline prefix, one Admit, district prefill (3.2) |
| BR-GEO-1 | Two districts can share a cluster **name**; two clusters can share a kutir **name**; duplicate **within** same parent rejected |
| BR-GEO-2 | Parivaar pickers (Admissions exam geo, Progress, Students, Kutirs, Visits, Areas, Users, Exam Center where gated) only list `parivaar_presence` districts; GRS School District may list all |
| BR-IMP-1 / 2 | Import order + hierarchical / unique-name resolve; no States sheet; districts use seeded states |
| BR-ADM-3 / BR-UX-1 | Year display vs storage; father in labels |

### 3.4 Import / geo uniqueness / Parivaar presence

**Import (Admin or SysAdmin) — Alpha minimum:**

- [ ] Download template; row 2 sample skipped; `_Instructions` ignored.  
- [ ] Happy path: small workbook Users → … through at least Students + Admissions (or full template on a throwaway DB).  
- [ ] UI shows per-sheet created / skipped / errors; last-import status persists across navigation.  
- [ ] Years as integers on sheet.  
- [ ] Ambiguous cluster/kutir name (2+ matches without parents) → clear error requiring parent columns.  
- [ ] Unique name with exactly one DB match → accepted (unique-name fallback).  
- [ ] Destructive reset (if used): Admin/SysAdmin only + confirmation — never on a DB you care about.

**Geo uniqueness + presence:**

- [ ] BR-GEO-1 create/import as above.  
- [ ] Toggle a district `parivaar_presence=no` → disappears from Parivaar-gated pickers; still usable where unscoped (e.g. GRS School district if product says so).

### 3.5 Happy-path journeys by persona

Run after smoke + one scoped IDOR check. Use the fixture users from 3.1.

| # | Persona | Journey (pass/fail) |
|---|---------|---------------------|
| J1 | **Teacher** | Login → Home counts load → Students list (K-A only) → Add/edit student → Add admission Eligible→Applied→Admit Card (fields appear per matrix) → Progress view/add in scope → Visits **view** only (no add) → no Users nav |
| J2 | **Cluster Coordinator** | Login → see C1 Kutirs → Add Kutir → Add visit → Advance one admission to Appeared (scores visible) → Create a lower-role user in scope → cannot open Deploy |
| J3 | **Education Coordinator / District Anchor / Regional Head** | Login → lists match area / district / zone scope; Geography mutate allowed from Education Coordinator up; spot-check one out-of-scope id denied |
| J4 | **Admin** | Full import dry-run → Lookups + Column Config change → Users including create SysAdmin → **no** Deploy menu/API |
| J5 | **SysAdmin** | Same as Admin menus + Deploy visible; unrestricted lists; Deploy page loads (do not need a real production deploy for Alpha) |

Phone smoke (~375px) once before Beta: login, drawer nav, one Add form, one filtered list — PRD NFR / AGENTS.md.

---

## 4. Recommended order (before inviting anyone)

Do this as **you**, on a disposable or clearly labelled local/staging DB:

1. **Smoke** (`docs/smoke-test.md`) — green.  
2. **Fixture users** T1, CC1, ADM, SYS (+ EC/DA/RH if you have time).  
3. **IDOR / scope** for Teacher and Cluster Coordinator (BR-SCOPE-1) — blocker for Alpha if open.  
4. **One full admission** Admin or CC: Eligible → … → Admitted + field visibility spot-check + second Admit blocked.  
5. **Parivaar presence + geo uniqueness** (one district off; one duplicate-within-parent rejection).  
6. **Import** small workbook + ambiguous-name error case.  
7. **J1 + J2 + J4** journeys; J5 Deploy visibility; J3 optional for Alpha.  
8. **Home funnel** vs six stages — note mismatches (§8.3–4); do not invite Beta until you either fix or write “known incorrect bars”.  
9. Only then: seed Alpha env, hand out accounts, point them at a short “try this” list (section 5).

---

## 5. Alpha vs Beta

| | **Alpha** | **Beta** |
|--|-----------|----------|
| **Who** | You + 1–3 trusted people (ideally one Teacher-like, one CC-like, one Admin-like) | More districts / roles; still not public |
| **Env** | Staging or local tunnel; **copy** of sanitized data or small seed — not production write | Stable staging URL; backup before import experiments |
| **Accounts** | Pre-created T1/CC1/ADM; passwords rotated from defaults | Real titles + correct geo assignments; no shared admin password |
| **What they cover** | J1/J2 paths; “can I advance an admission?”; obvious UI bugs; import **only** if Admin tester and on throwaway data | Full role matrix for invited roles; scope complaints; multi-district geo; import of a realistic workbook; Progress + Visits volume; mobile |
| **What you still own** | Matrix vs code conflicts (§8.1); funnel definition; Deploy real run; Bulk Progress Update transfer/dropout | Closing remaining BR failures; privilege escalation; any open IDOR |
| **Data rules** | Fake or consented PII only; no prod password hashes in git/dumps | Same; document restore procedure after destructive import/reset |

Give Alpha a one-pager: URL, role, “do J1 or J2”, “file bugs with role + screen + expected from matrix/PRD”.

---

## 6. Exit criteria

### Ship to Alpha

- [ ] Smoke green on the build you will share.  
- [ ] Teacher and CC: lists scoped; at least one out-of-scope mutation denied.  
- [ ] One admission contiguous through all six stages; field show/hide roughly matches Pipeline Stages sheet.  
- [ ] BR-ADM-2 (second Admit) enforced.  
- [ ] Admin import of a **small** workbook reports per-sheet results (or known failure documented).  
- [ ] Admin cannot Deploy; SysAdmin can see Deploy.  
- [ ] Written list of known gaps (§8 + matrix conflict) shared with Alpha testers.

### Ship to Beta

- [ ] All Alpha criteria still true.  
- [ ] Functionality checks for every **invited** role (Teacher → SysAdmin as applicable); Data scope verified for Teacher, CC, and at least one of EC/DA/RH.  
- [ ] Pipeline visibility table checked at each stage once (Add or Edit).  
- [ ] BR-GEO-1, BR-GEO-2, BR-IMP-1 spot-checks passed.  
- [ ] Home / reports funnel stage set **agreed** with PRD (or explicitly waived in writing).  
- [ ] No known IDOR on Students / Admissions / Progress / Visits writes.  
- [ ] Phone pass: nav + one form + one list.  
- [ ] §8 items that block invited workflows decided or waived.

---

## 7. Out of scope for now

- Full Playwright / E2E browser automation (optional later only if you ask).  
- Exhaustive matrix: every role × every menu × every HTTP method on every release.  
- Perfect resolution of all PRD §8 items before Alpha (document instead).  
- Load / performance testing beyond “lists paginate”.  
- Production Deploy drill as an Alpha blocker (visibility yes; real server cutover is ops, not Alpha).  
- Replacing `docs/smoke-test.md` — smoke remains the short every-change gate.

---

## 8. Gaps / open questions that affect testing design (PRD §8)

These do **not** stop writing this approach, but they change pass/fail expectations:

| # | Topic | Impact on testing |
|---|--------|-------------------|
| 1 | Role matrix vs Admin-only schools / exam centres / visit delete | **Decided (see role-and-access.md):** Functionality matrix wins (CC+ for school/exam-centre/visit CUD). Stage 1 API script records actual vs expected; no silent pass on stricter code. |
| 2 | Bulk Progress Update transfer/dropout (class +1 + Admitted∪prior Progress decided) | Defer deep bulk-setup tests until remaining rules exist; Alpha can skip Bulk Progress Update |
| 3–4 | Form received (removed) + Home funnel bars | Form received dropped; Home funnel must match six stages before treating as oracle |
| 5 | Migrations: numbered SQL only (decided) | Expect `backend/scripts/NNN_*.sql` + `schema_migrations` ledger; Deploy runs `python -m app.sql_migrations` |
| 6 | Soft vs hard delete | Delete tests: expect cascade vs block — confirm before Beta data drills |
| 7 | Deploy target | **Decided:** single AWS production (`/opt/sevakutir` / `PROJECT_ROOT`); Alpha: SysAdmin Deploy UI/API auth only — do not need a real production deploy |
| 8 | Donors nav vs Kutir-only | **Decided:** Lookups → Donors (simple lookup) + Kutir Donor dropdown; Alpha may exercise Lookups Donors CRUD (Admin) and Kutir donor select |
| 9 | Multi-attempt / multiple Selected | BR-ADM-2 tests “one Admitted”; clarify whether multiple Selected rows are allowed before asserting otherwise |
| 10 | Import upsert vs create-only | **Decided:** re-import upserts matched rows (natural keys in §5.9); Alpha/Beta re-import tests expect `updated` on match for Students/Admissions/Progress/Kutirs/Schools/ExamCenters/Donors/Visits — Users + name-only lookups still create/skip |

**Also from role doc:** SysAdmin is markdown/ops (not a spreadsheet column) — include SYS in fixtures anyway per PRD §2.2 / BR-ROLE-1.

---

## Quick reference — where to look while testing

| Concern | Doc |
|---------|-----|
| Short every-change gate | [`docs/smoke-test.md`](./smoke-test.md) |
| Roles / menus / row scope | [`docs/role-and-access.md`](./role-and-access.md), [`Role-and-Access.xlsx`](./Role-and-Access.xlsx) |
| Stage field matrix | Pipeline Stages spreadsheet / store plan; PRD §5.5 |
| BR-\* list | PRD §6 |
| Import sheet contract | [`docs/import-template.md`](./import-template.md) |
