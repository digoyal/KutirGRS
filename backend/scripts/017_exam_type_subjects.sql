-- Junction: exam_types <-> subjects
-- Replaces the school_type_subjects concept (which used hardcoded school type strings).
-- Each exam type maps to the subjects tested in its entrance exam.

CREATE TABLE IF NOT EXISTS exam_type_subjects (
    exam_type_id INTEGER NOT NULL REFERENCES exam_types(id) ON DELETE CASCADE,
    subject_id   INTEGER NOT NULL REFERENCES subjects(id)   ON DELETE CASCADE,
    PRIMARY KEY (exam_type_id, subject_id)
);
