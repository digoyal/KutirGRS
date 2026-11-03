-- Result Declared pipeline stage (between Appeared and Selected).
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS result_declared BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing rows at Selected or Admitted imply results were declared.
UPDATE student_exams
SET result_declared = TRUE
WHERE (selected = TRUE OR admitted = TRUE) AND result_declared = FALSE;
