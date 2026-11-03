-- Optional GPS captured when a visit photo is attached (browser geolocation at upload time).
ALTER TABLE kutir_visits
  ADD COLUMN visit_photo_latitude DOUBLE PRECISION NULL,
  ADD COLUMN visit_photo_longitude DOUBLE PRECISION NULL,
  ADD COLUMN visit_photo_accuracy_m DOUBLE PRECISION NULL;
