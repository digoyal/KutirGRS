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

## Template vs importer (row 1)

Downloaded `GRS_Import_Template.xlsx` row‑1 headers match what `import_data.py` persists today (plus optional `score_<subject>` on Admissions). **Removed from the template** (not in product schema; importer ignores or maps only from old uploads):

| Sheet | Column removed | Still OK on manual/old uploads? |
|-------|----------------|----------------------------------|
| `4_Donors` | `contact` | Yes — legacy column maps to `email` / `phone` if present |
| `19_Admissions` | `form_received` | Ignored (dropped in migration `023`; not a pipeline stage) |

All other `SHEET_ORDER` sheets: **no gaps** — see audit note in Project store `internal/import-template-drop-deleted-fields.md`.

**Kept** after schema alignment: Students `exam_year`; Admissions `exam_type_name`, `result_declared`; Progress `track`, `marks_6`…`marks_12`, and `previous_year_percentage` (importer maps to the mark for `class_in_year` when per-grade marks are blank).

## Notable columns

- **Users `title`:** Teacher, Cluster Coordinator, Education Coordinator, District Anchor, Regional Head, Admin, **SysAdmin**. Geo assignment is via `userid` on Zones / Districts / Areas / Clusters / Kutirs — not on the Users sheet.
- **Districts:** `state_name`, `parivaar_presence` (yes/no, default yes).
- **Schools / ExamCenters:** `street`, `city`, `district_name`, `state`, `pincode` (not a free-text `address`).
- **Donors:** `name`, `email`, `phone`, `notes` (also editable in UI under Lookups → Donors). The downloaded template has **no** `contact` column; re-uploaded workbooks may still include it — values with `@` map to email, otherwise phone.
- **Kutirs `donor_name`:** optional; resolved to `donor_id` by donor name (must already exist from `4_Donors`).
- **Kutir type:** Seva Kutir | Shiksha Kutir | Non-Kutir.
- **Parent-scoped names (not globally unique):** cluster names are unique **within a district**; kutir names are unique **within a cluster**. Import accepts name alone when that name matches **exactly one** row (including `14_Clusters` skip); if 2+ match, set parents. Creating a new cluster still needs `area_name` (and `district_name` if the area name is ambiguous).
- **Years:** `school_start_year` / `academic_year` / **`exam_year`** (Students) are **integers** (e.g. `2025`). UI display `2025-26` is not used on import.
- **Students `exam_year`:** optional; upserted on re-import (`COALESCE` — blank cell does not clear an existing value).
- **Admissions / Progress:** resolve students by `first_name` + `last_name` + hierarchical kutir key — **no `student_id`**. Progress resolves school by `school_name` only — **no `school_id`**.
- **Admissions pipeline:** `eligible`, `applied`, `admit_card`, `appeared`, **`result_declared`**, `selected`, `admitted`, optional **`exam_type_name`**, and optional `score_<subject>` columns. **`form_received`** is not in the download template and is **ignored** by the importer if present in an old file (removed from schema in migration `023`).
- **Progress:** optional **`track`** (`six_twelve` | `nine_twelve`; inferred from `class_in_year` when blank), **`marks_6` … `marks_12`**, and legacy **`previous_year_percentage`** (maps to the mark column for `class_in_year` when per-grade marks are blank).
- **Re-import:** matched rows **upsert** (update) for Schools, ExamCenters, Donors, Kutirs, Students, Admissions (+ scores), Progress, KutirVisits. Users and name-only lookup/geo sheets stay create-or-skip. Match keys: see [`docs/KutirGRS_PRD.md`](./KutirGRS_PRD.md) §5.9 / §8.10.
