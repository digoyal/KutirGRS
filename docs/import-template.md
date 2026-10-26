# GRS Import Template

File: [`GRS_Import_Template.xlsx`](../GRS_Import_Template.xlsx) (repo root). Download also via **Import Data** → template API (`GET /api/v1/import/template`). Importer: `backend/app/routers/import_data.py` (`SHEET_ORDER`).

Format is **`.xlsx`** (openpyxl). Keep sheet names unchanged.

## Layout per data sheet

| Row | Purpose |
|-----|---------|
| 1 | Column headers (matched case-insensitively; spaces → underscores) |
| 2 | Sample row — **always skipped** by import |
| 3+ | Your data |

Optional `_Instructions` sheet is ignored by the importer.

## Sheet order (FK-safe)

Processed in this order only:

| # | Sheet | Depends on |
|---|-------|------------|
| 0 | `0_Users` | — |
| 1 | `1_Zones` | Users (`userid` = username, optional) |
| 2 | `2_Categories` | — |
| 3 | `3_SubCategories` | Categories |
| 4 | `4_Donors` | — |
| 5 | `5_SchoolTypes` | — |
| 6 | `6_ExamCategories` | — |
| 7 | `7_NoExamReasons` | — (`reason` column) |
| 8 | `8_NoAdmitReasons` | — (`reason` column) |
| 9 | `9_Subjects` | — |
| 10 | `10_Districts` | Zones; `states` table (`state_name`); optional `parivaar_presence`, `userid` |
| 11 | `11_Areas` | Districts |
| 12 | `12_Schools` | Districts (optional); school type as text |
| 13 | `13_ExamCenters` | Districts (optional) |
| 14 | `14_Clusters` | Areas (+ `district_name` to scope area) |
| 15 | `15_ExamTypes` | SchoolTypes (`school_types` CSV) |
| 16 | `16_SubjectsByExamType` | ExamTypes + Subjects |
| 17 | `17_Kutirs` | Clusters (+ `district_name` / optional `area_name`), Districts, Donors, Users |
| 18 | `18_Students` | Kutirs (hierarchical), Categories |
| 19 | `19_Admissions` | Students (via hierarchical kutir), Schools, lookups, ExamCenters |
| 20 | `20_Progress` | Students (via hierarchical kutir), Schools |
| 21 | `21_KutirVisits` | Kutirs (hierarchical), Users |

There is **no States sheet** — districts reference existing `states` rows (Madhya Pradesh, Jharkhand, Chhattisgarh).

## Notable columns

- **Users `title`:** Teacher, Cluster Coordinator, Education Coordinator, District Anchor, Regional Head, Admin, **SysAdmin**. Geo assignment is via `userid` on Zones / Districts / Areas / Clusters / Kutirs — not on the Users sheet.
- **Districts:** `state_name`, `parivaar_presence` (yes/no, default yes).
- **Schools / ExamCenters:** `street`, `city`, `district_name`, `state`, `pincode` (not a free-text `address`).
- **Donors:** `name`, `contact`, `notes`.
- **Kutir type:** Seva Kutir | Shiksha Kutir | Non-Kutir.
- **Parent-scoped names (not globally unique):** cluster names are unique **within a district**; kutir names are unique **within a cluster**. Import accepts name alone when that name matches **exactly one** row; if 2+ match, set `district_name` / `cluster_name` (and `area_name` if needed).
- **Years:** `school_start_year` / `academic_year` are **integers** (e.g. `2025`). UI display `2025-26` is not used on import.
- **Admissions / Progress:** resolve students by `first_name` + `last_name` + hierarchical kutir key — **no `student_id`**. Progress resolves school by `school_name` only — **no `school_id`**.
- **Admissions pipeline:** `eligible`, `form_received`, `applied`, `admit_card`, `appeared`, `selected`, `admitted` (+ optional `score_<subject>` columns).
