-- Migration 029: One progress row per student; per-class marks; track six_twelve | nine_twelve

ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS track VARCHAR(20);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_6  NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_7  NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_8  NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_9  NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_10 NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_11 NUMERIC(5, 2);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS marks_12 NUMERIC(5, 2);

-- Per-row backfill from legacy single mark column
UPDATE student_progress SET marks_6  = previous_year_percentage WHERE class_in_year = 6  AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_7  = previous_year_percentage WHERE class_in_year = 7  AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_8  = previous_year_percentage WHERE class_in_year = 8  AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_9  = previous_year_percentage WHERE class_in_year = 9  AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_10 = previous_year_percentage WHERE class_in_year = 10 AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_11 = previous_year_percentage WHERE class_in_year = 11 AND previous_year_percentage IS NOT NULL;
UPDATE student_progress SET marks_12 = previous_year_percentage WHERE class_in_year = 12 AND previous_year_percentage IS NOT NULL;

-- Merge multi-year rows: aggregate marks onto keeper (latest academic_year, then max id)
WITH agg AS (
  SELECT student_id,
    MAX(marks_6)  AS marks_6,
    MAX(marks_7)  AS marks_7,
    MAX(marks_8)  AS marks_8,
    MAX(marks_9)  AS marks_9,
    MAX(marks_10) AS marks_10,
    MAX(marks_11) AS marks_11,
    MAX(marks_12) AS marks_12
  FROM student_progress
  GROUP BY student_id
),
keeper AS (
  SELECT DISTINCT ON (student_id) id, student_id
  FROM student_progress
  ORDER BY student_id, academic_year DESC, id DESC
)
UPDATE student_progress sp SET
  marks_6  = COALESCE(a.marks_6,  sp.marks_6),
  marks_7  = COALESCE(a.marks_7,  sp.marks_7),
  marks_8  = COALESCE(a.marks_8,  sp.marks_8),
  marks_9  = COALESCE(a.marks_9,  sp.marks_9),
  marks_10 = COALESCE(a.marks_10, sp.marks_10),
  marks_11 = COALESCE(a.marks_11, sp.marks_11),
  marks_12 = COALESCE(a.marks_12, sp.marks_12)
FROM agg a
JOIN keeper k ON k.student_id = a.student_id AND sp.id = k.id;

DELETE FROM student_progress sp
USING student_progress newer
WHERE sp.student_id = newer.student_id
  AND (sp.academic_year < newer.academic_year
       OR (sp.academic_year = newer.academic_year AND sp.id < newer.id));

-- Track from admitted exam when available
UPDATE student_progress sp SET track = CASE
  WHEN e.admission_class = 5 THEN 'six_twelve'
  WHEN e.admission_class = 8 THEN 'nine_twelve'
  ELSE sp.track
END
FROM student_exams e
WHERE e.student_id = sp.student_id AND e.admitted = true AND e.admission_class IN (5, 8);

UPDATE student_progress SET track = 'nine_twelve'
WHERE track IS NULL AND class_in_year IS NOT NULL AND class_in_year >= 9;

UPDATE student_progress SET track = 'six_twelve'
WHERE track IS NULL;

ALTER TABLE student_progress ALTER COLUMN track SET NOT NULL;

ALTER TABLE student_progress DROP CONSTRAINT IF EXISTS uq_student_school_academic_year;
ALTER TABLE student_progress DROP CONSTRAINT IF EXISTS uq_student_progress_student;
ALTER TABLE student_progress ADD CONSTRAINT uq_student_progress_student UNIQUE (student_id);

ALTER TABLE student_progress DROP COLUMN IF EXISTS previous_year_percentage;
