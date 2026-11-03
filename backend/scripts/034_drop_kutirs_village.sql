-- Kutir name is used for Nominatim geocoding; village column no longer needed.
ALTER TABLE kutirs DROP COLUMN IF EXISTS village;
