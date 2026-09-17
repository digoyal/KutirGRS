-- Add student_class column (1-12) to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_class SMALLINT;
