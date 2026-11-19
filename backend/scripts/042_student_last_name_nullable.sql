-- Allow students without a last name (match key: first_name + coalesced last_name + kutir).
ALTER TABLE students ALTER COLUMN last_name DROP NOT NULL;
UPDATE students SET last_name = NULL WHERE last_name = '';