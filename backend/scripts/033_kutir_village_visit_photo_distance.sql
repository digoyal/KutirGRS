-- Re-add kutir village (dropped in 015); persist visit photo distance from kutir when GPS + kutir coords exist.
ALTER TABLE kutirs
  ADD COLUMN IF NOT EXISTS village VARCHAR(200) NULL;

UPDATE kutirs SET village = name WHERE village IS NULL AND name IS NOT NULL;

ALTER TABLE kutir_visits
  ADD COLUMN IF NOT EXISTS visit_photo_distance_from_kutir_m DOUBLE PRECISION NULL;
