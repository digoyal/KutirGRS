-- ExamType: top-level exam programme (e.g. MP Tribals, JNV, Gyanodaya)
CREATE TABLE IF NOT EXISTS exam_types (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SchoolType: school category (e.g. EMRS, GNV, JNV)
CREATE TABLE IF NOT EXISTS school_types (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction: which school types belong to which exam type
CREATE TABLE IF NOT EXISTS exam_type_school_types (
    exam_type_id   INTEGER NOT NULL REFERENCES exam_types(id)   ON DELETE CASCADE,
    school_type_id INTEGER NOT NULL REFERENCES school_types(id) ON DELETE CASCADE,
    PRIMARY KEY (exam_type_id, school_type_id)
);
