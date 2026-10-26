# KutirGRS: Feature Requirements Document

**Product:** Parivaar Kutir GRS Admission Tracking
**Repo:** https://github.com/digoyal/KutirGRS (based on commit `df5d183`, 22 Oct 2026)
**Status key:** ✅ built · 🟡 partial · ⬜ not built

---

## 1. Purpose

Parivaar runs village learning centres ("Kutirs") that prepare children for entrance exams to government residential schools (GRS) such as Navodaya and Eklavya. KutirGRS tracks each student from eligibility through exam to admission, follows admitted students year by year, and records field visits that check Kutir quality.

### Goals
- One record per student, with every exam attempt and outcome.
- Show the admission funnel (eligible → admitted) at any level of the organisation.
- Track admitted students' progress, dropouts and transfers each academic year.
- Standardise Kutir visit inspections and summarise them.
- Each user sees only the data for their part of the geography.

### Out of scope (today)
Exam scheduling, notifications to parents, payments, and a parent or student login.

---

## 2. Users and roles

Six roles, in order of seniority. Each role is assigned to one level of the geography and sees every Kutir under it.

| Role | Assigned to | Data scope | Can manage users |
|---|---|---|---|
| Admin | — | Everything | Any role |
| Regional Head | Zone(s) | Kutirs in districts of their zones | Roles below them |
| District Anchor | District(s) | Kutirs in their districts | Roles below them |
| Education Coordinator | Area(s) | Kutirs in clusters of their areas | Roles below them |
| Cluster Coordinator | Cluster(s) | Kutirs in their clusters | No |
| Teacher | One Kutir | That Kutir only | No |

**Requirements**
- **R-ROLE-1** ✅ Users log in with a username and password and receive a JWT; inactive users are rejected.
- **R-ROLE-2** ✅ Students, Kutirs, admissions, progress and visits are filtered server-side by the user's Kutir scope (`get_scope`).
- **R-ROLE-3** ✅ A manager can create or edit only users of a lower role.
- **R-ROLE-4** ✅ A Teacher may be assigned at most one Kutir.
- **R-ROLE-5** ✅ Master data (lookups, geography writes, schools, import, column settings, deploy) is Admin-only.
- **R-ROLE-6** 🟡 The frontend hides only Admin-only menu items; other menu items are shown to every role and rely on the API to restrict data.

---

## 3. Geography and master data

### 3.1 Geography ✅
Hierarchy: **Zone → District → Area → Cluster → Kutir**. Geography page with one tab per level; add, edit and delete at each level (Admin).

### 3.2 Kutirs ✅
- Fields: name, type (Seva Kutir / Shiksha Kutir / Non-Kutir), cluster (required), district, street, state (default Madhya Pradesh), pincode, donor, 5th- and 8th-class enrolment counts.
- List, add, detail/edit and delete pages. The geography dropdowns cascade.

### 3.3 Government residential schools ✅
Name, school type (seeded: EMRS, JNV, KSP, MRS, GNV, KGBV, Sports Boys, Sports Girls, Other), street, city, district, state, pincode. These are both the schools students apply to and the schools they are admitted to.

### 3.4 Exam centres ✅
Name, district, street, city, state, pincode.

### 3.5 Donors 🟡
API supports full CRUD and Kutirs can link to a donor. **No Donors page in the UI yet.**

### 3.6 Lookups ✅ (Admin)
- Categories with sub-categories (social category for students)
- Exam categories
- Reasons for not taking the exam
- Reasons for not taking admission
- Subjects
- School types and exam types, linked many-to-many
- Exam-type → subject matrix (which subjects each exam type scores)

---

## 4. Students ✅

- **Profile:** first and last name, gender (Boy/Girl), date of birth, photo, Kutir, address (street, pincode), phone, email, father's and mother's names, alternate contact name and phone, category and sub-category.
- **Document checklist** (yes/no): Aadhaar, category certificate, birth certificate, residence proof, medical.
- **List:** server-side search (name, phone, father's name), filters by district, cluster, Kutir and gender; 25 rows per page with a total count.
- **Detail page:** view and edit the profile, upload a photo, and see the student's exams and progress records.
- **R-STU-1** Deleting a student removes their exam and progress records.

---

## 5. Admissions (exam applications) ✅

One record per student per exam attempt (`student_exams`).

### 5.1 Fields
- School type, target school, exam type, exam category, admission class (5 or 8), school start year
- Application number, exam centre, roll number
- Subject-wise scores; the subjects shown depend on the chosen exam type
- Admitted school, reason for not taking the exam, reason for not taking admission

### 5.2 Pipeline
Stages, in order: **Eligible → Applied → Admit Card Downloaded → Appeared → Selected → Admitted.** A separate "Form received" flag is also stored.

- **R-ADM-1** Ticking a stage also ticks every earlier stage; unticking a stage clears every later stage.
- **R-ADM-2** If the student did not appear, a "no exam" reason can be recorded. Otherwise it is cleared.
- **R-ADM-3** If the student was selected but not admitted, a "no admission" reason can be recorded. Otherwise it is cleared.
- **R-ADM-4** The school dropdown filters by the chosen school type, and the exam-type list follows the school type.
- **R-ADM-5** The list supports server-side filters and 25-row paging, and shows each record's current stage as a badge.

---

## 6. Student progress ✅

One record per student per academic year after admission.

- **Fields:** school, academic year, class (1–12), status (enrolled / transferred / dropped out / graduated), transfer school, exit reason, previous year's percentage, remarks.
- **R-PRG-1** List with server-side paging (`listProgressPaged`), plus add and detail pages.
- **R-PRG-2 Bulk Progress Update** (nav label; route `new-year-setup`): for a chosen year, list students (filter by district and Kutir) and bulk-create that year's progress records with New Class (default = prior progress class + 1 when known, else admission class), school (read-only from prior progress / admitted school), and previous-year marks %. Students who already have a record for that year are **omitted from the list** (create still safe-skips duplicates). ✅ Class promotion = auto-bump by 1 (2026-10-26). ✅ Inclusion = Admitted ∪ prior-year Progress, deduped; exclude target-year Progress (2026-10-26). 🟡 Transfer/dropout handling still open.

---

## 7. Kutir visits ✅

An inspection form filled in by a field user at a Kutir.

| Section | Fields |
|---|---|
| Basics | Kutir, visited by, visit date, Kutir closed (yes/no), photo |
| Attendance | Average attendance and regular students, morning and evening; physical vs. registered count (Matched / Not Matched) |
| Timetable and plans | Follows timetable; lesson plan for Hindi / Maths / English; reason if not followed |
| Topics | Maths and English topics covered, for pre-primary and upper levels |
| Activity slots | Bal Sabha, sports, yoga, value education, GK/map; reason if missing |
| Materials | Workbook completion % and status (Upto Date / Partial / Not), book availability (Sufficient / Lacking / More than required) |
| Ratings (1–5) | Cleanliness, Hindi, English, Maths, EVS, reasoning, material management, Kutir performance, staff behaviour |
| Registers kept | Admission forms, student attendance, daily activity, observation, student data, teacher attendance, student documents |
| Remarks | GRS preparation remarks, final remarks |

- **R-VIS-1** Visits list, add and detail pages; photo upload.
- **R-VIS-2 Visits dashboard:** stat cards, visits per month, average ratings, pie charts for workbook, attendance-match and book status, and the top 5 Kutirs by average performance.

---

## 8. Dashboards and reports

- **R-DSH-1 Home dashboard** ✅ Total students, active Kutirs, admissions this year, visits logged, and an admission funnel bar.
- **R-RPT-1 Summary reports** ✅ Admission funnel by Kutir (filter by year); Kutir visit summary (visit count, average performance and cleanliness, % following the timetable, last visit).
- **R-RPT-2 Detailed reports** ✅ Admitted students for a year.
- **R-RPT-3** ✅ Every list built on `GrsTable` supports sort, search, CSV export and print.

---

## 9. Administration

- **R-ADMIN-1 Column settings** ✅ Admin chooses, per table, which columns show and in what order (drag and drop). Saved in `app_settings` and cached in localStorage. Every table page needs the bfcache fix.
- **R-ADMIN-2 Excel import** ✅ Upload the workbook (`GRS_Import_Template.xlsx`). Sheets are processed in dependency order `0_Users` … `21_KutirVisits` (see [`docs/import-template.md`](./import-template.md)). Each sheet reports created / skipped / errors. Template download is included.
- **R-ADMIN-3 Data reset** ✅ Admin-only endpoint that deletes imported data.
- **R-ADMIN-4 One-click deploy** 🟡 Admin page runs git pull, install, build and restart on the server. The script calls `alembic upgrade head`, but the project uses hand-written SQL migrations in `backend/scripts/`, and the server path is hard-coded (`/opt/sevakutir`).

---

## 10. Non-functional requirements

- **Stack:** FastAPI + async SQLAlchemy + PostgreSQL; React 19 + TypeScript + Vite + TanStack Query.
- **Mobile:** forms must be usable on a phone; `mobile.css` and a hamburger menu are in place.
- **Performance:** large lists (students, admissions, progress) page server-side, 25 rows per page.
- **Security:** bcrypt passwords and JWT; CORS limited to `ALLOWED_ORIGINS`; secrets in `backend/.env`, which git ignores.
- **Localisation:** dates use the en-IN format; state defaults to Madhya Pradesh (Jharkhand and Chhattisgarh are also recognised on import).

---

## 11. Known gaps and open items

| # | Item | Priority |
|---|---|---|
| 1 | **`kutirgrs_v2_export.sql` is committed to a public repo.** It contains 27 student records (names, DOB, phones, parents' names) and a user password hash. Remove it from git history and change that password. | **High** |
| 2 | Home funnel uses "Form Received" and leaves out "Admit Card"; this doesn't match the pipeline in §5.2. | Medium |
| 3 | Home funnel loads every exam record into the browser and counts there. Move the counts to the API before the data grows. | Medium |
| 4 | Deploy script references Alembic, which isn't used (§9). | Medium |
| 5 | No Donors page in the UI. | Low |
| 6 | Menu shows Students, Kutirs, Users and other pages to every role. Hide pages a role can't use. | Low |
| 7 | "Reports" appears twice in the menu, both linking to Summary. | Low |
| 8 | Deletes use `window.confirm()`; replace with a shared ConfirmDialog. | Low |
| 9 | The bfcache `useEffect` is copied into several pages; extract a `useBfcacheReload` hook. | Low |
| 10 | No automated tests. | Medium |
| 11 | Bulk Progress Update: transfer/dropout rules still open (§6); class +1 and Admitted∪prior Progress inclusion decided 2026-10-26. | Medium |
