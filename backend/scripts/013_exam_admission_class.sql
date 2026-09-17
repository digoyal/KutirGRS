-- Migration 013: Add admission_class to student_exams
-- Stores the class (5 or 8) being applied for, direct input on the admission form
ALTER TABLE student_exams
  ADD COLUMN IF NOT EXISTS admission_class SMALLINT CHECK (admission_class IN (5, 8));
