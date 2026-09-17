-- Migration: Teacher-Kutir assignment
-- A teacher belongs to exactly one kutir; a kutir can have many teachers.
-- Assignment lives in user_kutirs (already exists); we add a partial unique
-- index so a Teacher user can only appear once. The single-teacher FK on
-- kutirs (teacher_id) is dropped — it's replaced by the list in user_kutirs.
-- Run once against kutirgrs_v2.

BEGIN;

-- 1. Partial unique index: one kutir per teacher user
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_one_kutir
  ON user_kutirs (user_id)
  WHERE user_id IN (SELECT id FROM users WHERE title = 'Teacher');

-- 2. Drop the single-teacher FK column from kutirs (redundant now)
ALTER TABLE kutirs DROP COLUMN IF EXISTS teacher_id;

COMMIT;
