-- staff_behavior was optional; align with other 1–5 visit ratings (required).
UPDATE kutir_visits
SET staff_behavior = 3
WHERE staff_behavior IS NULL;

ALTER TABLE kutir_visits
  ALTER COLUMN staff_behavior SET NOT NULL;
