-- Kutir map coordinates for visit photo proximity checks (nullable until admin sets).
ALTER TABLE kutirs
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS location_source VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ NULL;
