-- form_received is not a pipeline stage; remove leftover boolean from student_exams.
ALTER TABLE student_exams
  DROP COLUMN IF EXISTS form_received;
