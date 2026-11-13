-- Drop legacy Kutir class-enrollment count columns (tracked separately elsewhere).
ALTER TABLE kutirs
    DROP COLUMN IF EXISTS enrollment_5th,
    DROP COLUMN IF EXISTS enrollment_8th;
