# KutirGRS — Product Requirements (Ideal Day-One Spec)

**Product:** Parivaar Kutir GRS Admission Tracking  
**Audience:** Product owner, engineers, and implementers starting from a blank repo  
**Intent:** This is the requirements document that should have existed **before any code was written**, incorporating domain rules and product decisions that the live system eventually needed. Write requirements in the present tense (“the system shall…”). Do not treat this as a changelog of how the app grew.

---

## 1. Purpose and goals

Parivaar runs village learning centres (**Kutirs**) that prepare children for entrance exams to government residential schools (**GRS**) such as Navodaya and Eklavya. KutirGRS shall:

1. Keep **one student profile** per child, linked to a Kutir, with document checklist and contacts.
2. Track each **admission / exam attempt** through a fixed pipeline from eligibility to admission.
3. Follow **admitted students’ progress** year by year (enrolment, transfer, dropout, graduation).
4. Record **Kutir field visits** (quality inspections) and summarise them.
5. Enforce **geography-scoped data access** so each user sees only their assigned part of the organisation.
6. Support **bulk Excel import** of master and transactional data in a safe dependency order.
7. Provide **dashboards and reports** for the admission funnel and visit quality.

### Success criteria (day one)

- A Cluster Coordinator can add a student, advance an admission through the pipeline, and see only their clusters’ Kutirs.
- An Admin (or SysAdmin) can import a full workbook and see created / updated / skipped / error counts per sheet.
- Funnel counts and lists filter by academic / school-start year consistently (integer year in storage; display as `YYYY-YY+1`).

---

## 2. Users and roles

### 2.1 Day-to-day roles (lowest → highest)

| Role | Typical assignment | Data scope |
|------|--------------------|------------|
| Teacher | One Kutir | That Kutir only |
| Cluster Coordinator | Cluster(s) | Kutirs in those clusters |
| Education Coordinator | Area(s) | Kutirs under clusters of those areas |
| District Anchor | District(s) | Kutirs in those districts |
| Regional Head | Zone(s) | Kutirs in districts of those zones |
| Admin | — | Unrestricted |

### 2.2 Ops role

| Role | Purpose |
|------|---------|
| **SysAdmin** | Same unrestricted data and Admin-level menus as Admin, **plus** Deploy. Admin may create SysAdmin users. Admin shall **not** see or run Deploy. |

### 2.3 Auth and privilege rules

- The system shall authenticate with username / password and issue a JWT. Inactive users shall be rejected.
- Every list and mutation that is geography-scoped shall apply the **same server-side scope** (deny by default when scope is empty; unrestricted only for Admin / SysAdmin).
- A manager may create or edit only users of a **lower** role (except Admin / SysAdmin, who may assign any title including SysAdmin).
- A Teacher shall be assignable to **at most one** Kutir.
- Functionality (which menus and CRUD actions exist) and data scope (which rows) shall follow a single **role matrix** (Functionality + Data sheets). Frontend shall hide actions the matrix denies; backend shall enforce the same rules.
- **Schools, Exam Centers, and Lookups** are global catalogs for read (all roles see all rows). Mutation rights still follow the Functionality matrix.
- Geo assignment is via user links on Zone / District / Area / Cluster / Kutir — not free-text on the user profile alone.

---

## 3. Scope

### 3.1 In scope

- Auth, users, roles, geo hierarchy, Kutirs, students, admissions pipeline, progress, Kutir visits, GRS schools, exam centres, donors, lookups, import/export templates, column configuration, home dashboard, summary/detail reports, New Year progress setup, Deploy (SysAdmin).
- Responsive UI usable on phone (~375px) and desktop; shared list/table patterns (sort, search, CSV, print where applicable).

### 3.2 Out of scope (explicit)

- Exam scheduling calendars, parent/student portals, SMS/email notifications to parents, payments/fees, multi-tenant SaaS for unrelated organisations, automated test suite as a launch blocker (nice-to-have later).

---

## 4. Domain model (conceptual)

### 4.1 Geography

```
Zone → District → Area → Cluster → Kutir
```

- **District** belongs to a Zone and a **State** (seeded catalog: at least Madhya Pradesh, Jharkhand, Chhattisgarh). Districts have `parivaar_presence` (yes/no; default yes).
- **Parivaar District** pickers (Admissions exam geography filters, Progress geo filters, etc.) shall list only districts with Parivaar presence, unless a picker is explicitly unscoped (e.g. GRS School district may list all districts).
- **Name uniqueness (parent-scoped, not global):**
  - Area names unique within a district.
  - **Cluster names unique within a district** (two districts may share a cluster name).
  - **Kutir names unique within a cluster** (two clusters may share a kutir name).
- Kutir types: **Seva Kutir | Shiksha Kutir | Non-Kutir**.
- Kutir fields: name, type, cluster (required), district (denormalised or derived via cluster → area → district), street, state, pincode, optional donor (`donor_id` FK to Donors lookup), enrolment counts for class 5 and 8, optional teacher user link.

### 4.2 People and orgs

- **User:** username, password hash, names, phone, email, title (role), active flag, geo assignments.
- **Donor:** name, contact, notes; optional link from Kutir.
- **Student:** names, gender (Boy/Girl), DOB, photo, Kutir, address, phone, email, father/mother names, alt contact, category / sub-category, document flags (Aadhaar, category cert, birth cert, residence, medical).
- Deleting a student shall **hard-delete** the row and cascade-remove related exams and progress (with confirmation). No soft-delete / hide.

### 4.3 Schools and exams

- **Government residential school:** name, school type, street, city, district, state, pincode.
- **Exam centre:** name, district, street, city, state, pincode.
- **Lookups:** categories + sub-categories; exam categories; no-exam reasons; no-admit reasons; subjects; school types; exam types (many-to-many with school types); exam-type → subjects matrix; **Donors** (name, contact, notes).
- **Student exam (admission attempt):** one row per student attempt for a school-start year / path; pipeline flags; application/roll numbers; exam centre; scores by subject; admitted school; reasons when not appeared / not admitted.
- **Student progress:** one row per student per school per academic year after admission path is in play; class, status, transfer/exit fields, previous-year %, remarks.
- **Kutir visit:** one inspection per Kutir per visit date (unique on kutir + date); rich checklist (attendance, plans, topics, ratings, registers, remarks); optional photo; visited-by user.

### 4.4 Configuration

- Per-table **column visibility and order** (Admin / SysAdmin), persisted server-side and usable offline via client cache with correct cache-bust / bfcache behaviour.
- Import workbook template and last-import status for operators.

---

## 5. Functional requirements by area

### 5.1 Authentication and navigation

- The system shall provide login and a role-aware sidebar / hamburger nav on mobile.
- Menus shall match the role matrix (e.g. Teacher: no Users / Column Config mutate; only SysAdmin: Deploy).
- Home shall show high-level counts (students, active Kutirs, admissions for year, visits) and an admission funnel aligned with pipeline stages.

### 5.2 Geography and master data

- Admin/SysAdmin (and matrix-granted roles) shall CRUD Zone, District, Area, Cluster with cascading filters.
- District create/edit shall set state and Parivaar presence.
- Lookups Admin UI for all lookup tables, the exam-type ↔ subject matrix, and **Donors**.
- Donors shall be manageable in UI (CRUD) via Lookups → Donors (Admin / SysAdmin mutate; all roles may view), not API-only and not a separate top-level nav.
- Schools and Exam Centers: list / add / detail; geo filters where useful.

### 5.3 Kutirs

- List with geo filters; add / detail / edit / delete per matrix.
- Cascading district → area → cluster (and reverse display of hierarchy).
- Optional **Donor** dropdown (`donor_id` FK to Donors lookup); optional Teacher user link.

### 5.4 Students

- List: server-side search (name, phone, father name), filters (district, cluster, Kutir, gender), paging (default page size aligned FE/BE, e.g. 25), total count.
- Add / detail / edit; photo upload; show linked exams and progress on detail.
- In Admissions and Progress UIs, student labels shall be **`First Last (Father Name)`** when father is set, else **`First Last`**, so same-named children in a Kutir are distinguishable.

### 5.5 Admissions

- List: year filter, geo filters, search, stage badge, paging, CSV/print via shared table.
- Add / detail / edit with shared form.
- **Pipeline stages (order):** Eligible → Applied → Admit Card Downloaded → Appeared → Selected → Admitted.
- Ticking a stage shall set every earlier stage; unticking shall clear every later stage (contiguous prefix).
- Field visibility shall depend on furthest stage (e.g. exam centre from Applied; scores from Appeared; GRS school fields from Selected; reason-not-appeared only at Admit Card stage; reason-not-admitted only at Selected).
- **At most one Admitted** admission per student across all years (block second Admit; not scoped by `school_start_year`). Multiple Selected rows are allowed.
- **`admission_class` (5 or 8) is required when Admitted** (FE + API); needed for Bulk Progress Update defaults. No backfill of old nulls.
- Cascades: school type filters school list; exam type follows school type; subjects follow exam type.
- On Add, choosing a student shall **prefill Parivaar District** and **GRS School District** from the student’s Kutir district (kutir → cluster → area → district). User may override. Prefill Edit filters when empty from existing centre/school or student kutir.
- GRS School: District and School Type placeholders are “select”, not “all”; School Name enabled only after School Type; changing type clears school.
- No-exam / no-admit reasons recorded only when applicable; cleared otherwise.

### 5.6 Progress

- List / add / detail with year and geo filters; student search with father-aware labels.
- Statuses: enrolled | transferred | dropped out | graduated (and related transfer school / exit reason fields).
- **Bulk Progress Update** (route `new-year-setup`): choose year; filter students; bulk-create progress rows. Inclusion = **Admitted** ∪ prior-year Progress (deduped); students who already have Progress for the **target** year are omitted from the list (API still rejects duplicates on save). Class promotion = prior class + 1 (see §8.2). Transfer/dropout handling still open.

### 5.7 Kutir visits

- Visits dashboard (stats, charts, top Kutirs) and detail list / add / edit with full inspection form and photo.
- Unique constraint: one visit per Kutir per date.

### 5.8 Reports

- Summary: admission funnel by Kutir (by year) with the same six pipeline stages as Home (including Admit Card); visit summary metrics.
- Detail: admitted students for a year.
- Shared table behaviours: sort, search, export, print.

### 5.9 Import

- Admin / SysAdmin upload of `.xlsx` matching the published template.
- Sheet order **FK-safe** (Users → … → KutirVisits); sample row 2 always skipped; `_Instructions` ignored.
- Resolve cluster / kutir / area by **parent scope** when provided; if name alone is used and **exactly one** DB match exists, accept it; if **2+**, require parent columns; if **0**, not found (create paths still need parent when inserting).
- Admissions / Progress resolve students by name + kutir key (hierarchical or unique-name fallback) — no opaque student_id / school_id columns in the operator template.
- Years on import are **integers** (e.g. `2025`), not display ranges.
- **Re-import upserts** rows that match existing natural keys (update fields; count as `updated`). Insert when no match (`created`). Name-only lookup sheets and Users remain create-or-skip (see match keys below).
- **Match keys (current code, no external IDs):** Users `username` (create/skip only — passwords not overwritten); Zones `name`; Districts `(name, zone)`; Areas `(name, district)`; Clusters `(name, area)` or unique name; Schools / ExamCenters / Donors / ExamTypes / simple lookups by `name` (or `reason`); SubCategories by `name`; Kutirs `(name, cluster)`; Students `(first_name, last_name, kutir)` — **father_name is not part of the match**; Admissions `(student, school_type, school_start_year)`; Progress `(student, school, academic_year)`; KutirVisits `(kutir, visit_date)`; ExamTypeSubjects `(exam_type, subject)`.
- Persist and show last import status; return clear per-sheet created / updated / skipped / errors (no silent failure after commit).
- Optional destructive data-reset endpoint: Admin/SysAdmin only, with confirmation.

### 5.10 Column configuration and Deploy

- Column config: Admin / SysAdmin; per-entity column set; survive back-navigation (bfcache).
- Deploy: **SysAdmin only**; pull / install / build / migrate / restart on the single hard-coded AWS production path (`/opt/sevakutir` / `PROJECT_ROOT`). Multi-env / configurable Deploy target deferred. Migrations: numbered SQL under `backend/scripts/` only; Deploy applies pending `NNN_*.sql` via the `schema_migrations` ledger (see §8.5).

---

## 6. Key business rules (decide before coding)

| ID | Rule |
|----|------|
| BR-GEO-1 | Cluster name unique within district; Kutir name unique within cluster — not globally. |
| BR-GEO-2 | Parivaar presence gates which districts appear in Parivaar geo pickers. |
| BR-ADM-1 | Admission pipeline is a contiguous boolean prefix of the six stages. |
| BR-ADM-2 | One admitted outcome per student across all attempts/years (API create/update). Multiple Selected allowed. |
| BR-ADM-3 | School-start year and academic year stored as integers; UI may show `2025-26`. |
| BR-ADM-4 | Student → district prefill for Parivaar and GRS School filters on Add. |
| BR-ADM-5 | `admission_class` (5 or 8) required whenever `admitted` is true (API + FE). |
| BR-IMP-1 | Import sheet order is fixed; names resolve hierarchically with unique-name fallback. |
| BR-IMP-2 | No States sheet; districts reference seeded states. |
| BR-IMP-3 | Re-import upserts on natural match keys (§5.9 / §8.10); no external ID columns. |
| BR-SCOPE-1 | Writes use the same geo scope as reads; IDOR-safe. |
| BR-ROLE-1 | SysAdmin = Admin menus + Deploy + unrestricted data; Admin cannot Deploy. |
| BR-UX-1 | Student display name includes father when present in Admissions and Progress lists and search. |

---

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Stack | Backend: FastAPI, async SQLAlchemy, PostgreSQL. Frontend: React + TypeScript + Vite + TanStack Query. Shared UI primitives in a sibling package (`@parivaar/ui`) where generic. |
| Security | bcrypt passwords; JWT; CORS from env; secrets only in env; never commit DB dumps with PII or password hashes. |
| Performance | Server-side filter + pagination for large lists; funnel aggregates computed on the server once data volume warrants it. |
| Mobile | Viewport meta; usable forms on ~375px; no hover-only critical actions; drawer nav on phone. |
| Localisation | en-IN dates; Indian state defaults for Kutir/school forms. |
| Ops | Documented smoke checklist (build/tsc, login, one API read, SPA routes). Schema changes ship with applied migrations in the same change. |
| Accessibility / UX | Consistent design tokens; shared ConfirmDialog for deletes; loading / empty / error states on lists. |

---

## 8. Open questions that should have been decided on day one

Answer these in writing before implementation; do not leave them to emerge from bugs:

1. **Role matrix vs. “Admin-only master data”:** **Decided (2026-10-26): follow Role-and-Access matrix** (PRD §8.1 = option A). Schools / Exam Centers / Kutir Visits Add/Edit/Delete = Cluster Coordinator+ (Teacher view-only); Geography Add/Edit/Delete = Education Coordinator+ (Teacher/CC view-only); Lookups / Column Config remain Admin (+ SysAdmin) only. API and FE manage buttons are aligned to CC+ for schools, exam centres, and visit delete; Geography stays EC+.
2. **Bulk Progress Update** (was New Year Setup): **Class promotion decided (2026-10-26): auto-bump by 1** from prior Progress `class_in_year` when present (prefer selected year−1, else latest earlier Progress with a class); otherwise use exam `admission_class` as-is. **`admission_class` required on Admit (2026-10-26)** — FE + API reject `admitted=true` without class 5/8; no backfill of legacy nulls. Select includes the defaulted number so it displays. **Inclusion decided (2026-10-26):** **Admitted** ∪ prior-year Progress (deduped; geo filters); **omit** anyone with Progress for the selected target year. Still open: transfer/dropout.
3. **Form received:** **Decided (2026-10-26): not a pipeline stage; flag removed** — drop `form_received` from schema, API, import, and UI. Six stages only.
4. **Home / Reports funnel stages:** **Decided (2026-10-26): full six pipeline stages** — Eligible → Applied → Admit Card → Appeared → Selected → Admitted. Home dashboard bars and Reports Summary “Admission Funnel by Kutir” use the same stage set (keys aligned with `admissions-pipeline` / API `admit_card`).
5. **Migrations tool:** **Decided (2026-10-26): numbered SQL under `backend/scripts/` only**; Deploy applies pending `NNN_*.sql` via ledger (`schema_migrations`). Do not add Alembic.
6. **Soft delete vs. hard delete** for students, admissions, visits: **Decided (hard delete)** — permanent `DELETE` (cascade where modeled); no soft-delete / hide (`deleted_at` / `is_deleted`).
7. **Deploy target:** **Decided (2026-10-27): single AWS production host** — keep the existing hard-coded Deploy path (`/opt/sevakutir` / `PROJECT_ROOT`); one production AWS server. Multi-environment / configurable Deploy target deferred.
8. **Donors product surface:** **Decided (2026-10-27): simple lookup + Kutir dropdown** — Donors CRUD lives under **Lookups → Donors** (same Admin / SysAdmin mutate, all roles view as other lookups); **not** a separate top-level nav section. Kutir Add/Edit uses a **Donor** dropdown (`donor_id` FK), not free text.
9. **Multi-admission attempts:** **Decided (2026-10-27):** multiple exam/admission rows (attempts) per student are allowed (including multiple per `school_start_year` when `school_type` differs — uniqueness is `(student_id, school_type, school_start_year)`). **At most one Admitted** row per student **across all years** (API create/update blocks a second `admitted=true`; not scoped by year). **Selected:** no uniqueness rule — multiple Selected rows remain allowed (leave as-is; do not invent a Selected constraint).
10. **Import identity:** **Decided (2026-10-27): re-import upserts matched rows** (update in place; do not invent external ID columns). Match keys are the natural keys already used by `backend/app/routers/import_data.py` — see §5.9. No operator-facing external IDs in schema/template.

---

## 9. Suggested delivery slices (for planning, not scope creep)

1. Auth + users + geo + lookups + Kutirs + schools/centres.  
2. Students + scoped lists.  
3. Admissions pipeline + reports funnel.  
4. Progress + Bulk Progress Update.  
5. Visits + visit dashboard.  
6. Import + column config + Deploy.  

Each slice shall include migrations, role checks, and smoke for that slice.

---

## 10. Traceability

This ideal spec consolidates:

- The original feature requirements (purpose, entities, pipeline, visits, reports, admin).
- The Role-and-Access matrix (Functionality + Data), including **SysAdmin**.
- Rules proven necessary in production use: parent-scoped names, unique-name import fallback, father-aware student labels, Parivaar presence, district prefills on Admissions Add, GRS School cascade UX, integer years vs. display labels, import sheet contract.

When product and code disagree later, update **this** document (or the role matrix) first, then the code.
