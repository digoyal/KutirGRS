-- Migration 019: Add exam_type_id to student_exams
ALTER TABLE student_exams
    ADD COLUMN IF NOT EXISTS exam_type_id INTEGER REFERENCES exam_types(id) ON DELETE SET NULL;
