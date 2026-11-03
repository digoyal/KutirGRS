-- Migration 030: Drop legacy exit_reason (dropout reason); status + remarks cover exits.

ALTER TABLE student_progress DROP COLUMN IF EXISTS exit_reason;
