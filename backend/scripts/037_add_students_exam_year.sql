-- Exam / admission cycle year when the student master record was added (e.g. 2025 = 2025-26).
ALTER TABLE students ADD COLUMN IF NOT EXISTS exam_year INTEGER NULL;