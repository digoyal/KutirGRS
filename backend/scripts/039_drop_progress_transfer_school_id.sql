-- Revert 038_progress_transfer_school_id.sql (never shipped to prod).
-- Operators who applied 038 locally: apply this script via `python -m app.sql_migrations`.
ALTER TABLE student_progress DROP COLUMN IF EXISTS transfer_school_id;