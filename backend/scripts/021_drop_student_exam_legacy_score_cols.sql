-- Remove legacy fixed subject-score columns from student_exams.
-- Scores are now stored flexibly in student_exam_scores (exam_id, subject_id, score).
ALTER TABLE student_exams
  DROP COLUMN IF EXISTS math,
  DROP COLUMN IF EXISTS english,
  DROP COLUMN IF EXISTS reasoning,
  DROP COLUMN IF EXISTS evs;
