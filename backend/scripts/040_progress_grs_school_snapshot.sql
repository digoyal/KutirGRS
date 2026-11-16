-- Denormalized current GRS school fields on progress (district + school type).

ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS school_type VARCHAR(20);
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id);

UPDATE student_progress sp
SET
  school_type = COALESCE(sp.school_type, s.school_type),
  district_id = COALESCE(sp.district_id, s.district_id)
FROM schools s
WHERE s.id = sp.school_id;