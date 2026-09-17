-- Migration: Add school_type column to student_exams, relax school_id, update unique constraint
-- Run once against kutirgrs_v2 database

BEGIN;

-- 1. Add school_type column (nullable)
ALTER TABLE student_exams
  ADD COLUMN IF NOT EXISTS school_type VARCHAR(20);

-- 2. Backfill school_type from the linked school record
UPDATE student_exams se
SET school_type = sc.school_type
FROM schools sc
WHERE se.school_id = sc.id
  AND se.school_type IS NULL;

-- 3. Make school_id nullable
ALTER TABLE student_exams
  ALTER COLUMN school_id DROP NOT NULL;

-- 4. Add index on school_type
CREATE INDEX IF NOT EXISTS ix_student_exams_school_type
  ON student_exams (school_type);

-- 5. Drop old unique constraint and add new one
ALTER TABLE student_exams
  DROP CONSTRAINT IF EXISTS uq_student_school_year;

-- Only add new constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_school_type_year'
  ) THEN
    ALTER TABLE student_exams
      ADD CONSTRAINT uq_student_school_type_year
      UNIQUE (student_id, school_type, school_start_year);
  END IF;
END$$;

COMMIT;
