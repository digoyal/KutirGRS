-- Migration: Split avg_attendance_last_week and regular_students into morning/evening
BEGIN;

-- Add 4 new columns
ALTER TABLE kutir_visits
  ADD COLUMN IF NOT EXISTS avg_attendance_morning  INTEGER,
  ADD COLUMN IF NOT EXISTS avg_attendance_evening  INTEGER,
  ADD COLUMN IF NOT EXISTS regular_students_morning INTEGER,
  ADD COLUMN IF NOT EXISTS regular_students_evening INTEGER;

-- Make old column nullable (it was NOT NULL) so old records remain valid
-- while new records use the morning/evening fields
ALTER TABLE kutir_visits
  ALTER COLUMN avg_attendance_last_week DROP NOT NULL;

COMMIT;
