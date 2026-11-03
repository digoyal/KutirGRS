# Progress single-record redesign

## Goal

One `student_progress` row per student for the full GRS journey (6→12 or 9→12), with per-class mark columns on that row instead of one row per academic year.

## Schema (migration `029_progress_single_record.sql`)

| Column | Type | Notes |
|--------|------|--------|
| `track` | `VARCHAR(20) NOT NULL` | `six_twelve` or `nine_twelve` |
| `marks_6` … `marks_12` | `NUMERIC(5,2)` nullable | Only track-relevant columns used in UI |
| `class_in_year` | unchanged | **Current class** in the journey (starts at admission class + 1) |
| `academic_year` | unchanged | **Current academic year** integer (same encoding as today: start calendar year, e.g. 2025 → display `2025-26`) |
| `school_id` | unchanged | GRS school from admission |
| `status` | unchanged + new value `promoted` | See statuses below |

**Uniqueness:** replace `(student_id, school_id, academic_year)` with **`UNIQUE (student_id)`** — one journey per student.

**Drop:** `previous_year_percentage` after backfill into `marks_{class}`.

## Resolved ambiguities

### Academic year on admit

- Admission uses `school_start_year` (int start year of the admission cycle, e.g. 2025 = `2025-26`).
- On **Admitted**, progress `academic_year` = **`school_start_year + 1`** (first GRS year after admission cycle).
- Rationale: student admitted during cycle Y typically enters GRS the following academic year; matches product examples (admit year + 1).

### Track inference

- `admission_class` **5** → track **`six_twelve`** (journey 6–12); first enabled mark = **6th**.
- `admission_class` **8** → track **`nine_twelve`** (9–12); first enabled mark = **9th**.
- Manual Add: infer from the student’s admitted exam; if missing, require explicit track in API (400).

### Mark field enablement (UI + API validation)

Track classes:

- `six_twelve`: 6, 7, 8, 9, 10, 11, 12 (7 boxes)
- `nine_twelve`: 9, 10, 11, 12 (4 boxes)

Rules:

1. **On admit (auto-create):** only the entry mark (6 or 9) is writable; `status = enrolled`.
2. **On save:** when the entry mark (6 or 9) becomes non-null, set `status = promoted` and allow the next mark (7 or 10).
3. **Chain:** mark for class *C* is writable only if *C* is the entry class, or mark for class *C−1* is already set (within track). Server rejects PATCH/POST that set disabled columns.

### Class and academic year on mark save

**On admit (before any marks):**

- `class_in_year` = **`admission_class + 1`** (entry class 6 or 9).
- `academic_year` = **`school_start_year + 1`**.

**On create/update when a mark for class *N* is newly filled** (was null, now non-null; re-saving the same value does not count):

- `academic_year` += **1** (once per newly filled class mark).
- `class_in_year` = **next class in track** after *N* if *N* is not the final track class; if *N* is final (12 or last in track), `class_in_year` = *N*.

Examples (six_twelve, admitted class 5, `school_start_year` 2025):

| State | Marks filled | `academic_year` | `class_in_year` |
|-------|----------------|-----------------|-----------------|
| After admit | none | 2026 | 6 |
| Entry mark saved | 6 | 2027 | 7 |
| Next mark saved | 6, 7 | 2028 | 8 |

**Import (`20_Progress`):** sheet `academic_year` is authoritative; after upsert, `class_in_year` is **recomputed** from the count of filled track marks (same class rule as above, without incrementing year).

### Status `promoted`

- New allowed value: `promoted` (shown as “Promoted”).
- Set automatically on save when entry-year marks (6 or 9) are first filled.

### Remove “Transferred to another school” from dropdown

- Remove **`transferred`** from add/edit **dropdown options** (frontend + backend allowed set for **writes** on create/update).
- Legacy rows with `status = transferred` remain readable; view/edit can show status read-only or map to dropped_out policy — **display only**, not selectable on new edits (user cannot re-select transferred).

### Data migration (existing multi-row progress)

1. Group by `student_id`.
2. Keep row with **max `academic_year`** (tie-break max `id`).
3. For **each** legacy row: if `class_in_year` and `previous_year_percentage` set, write into `marks_{class}` on survivor (later rows overwrite same class if duplicate).
4. Set `track` from latest admitted exam’s `admission_class`, else infer: if any `class_in_year` in 6–8 → `six_twelve`, else `nine_twelve`.
5. Delete other rows for that student.
6. Drop old unique constraint; add `UNIQUE(student_id)`.

Non-destructive for unmigrated edge cases: students with no survivor get skipped in merge step only if empty groups.

## Admission hook

On `POST/PATCH student-exams` when **`admitted`** is true (including transition false→true):

- Idempotent **upsert** progress by `student_id`.
- Set `school_id` = `admitted_school_id`, `class_in_year` = `admission_class + 1`, `academic_year` = `school_start_year + 1`, `track` from class 5/8, `status = enrolled`, marks unchanged if row exists.

## Bulk Progress Update (`new-year-setup`)

Out of scope for full redesign. **Minimal change:** page copy notes progress is created on Admit; bulk create only for students **without any** progress row (same upsert helper), not per-year duplicates.

## Import sheet `20_Progress`

Match key becomes **`(student, school)`** upsert single row; columns for `track`, `marks_6`…`marks_12`, `class_in_year`, `academic_year`, `status`.

## Docs

Update `docs/kutirgrs.md` § Progress and PRD §5.6 after implementation.
