-- Migration 018: Drop old school_type_subjects tables (replaced by exam_type_subjects)
DROP TABLE IF EXISTS school_type_subject_subjects;
DROP TABLE IF EXISTS school_type_subjects;
