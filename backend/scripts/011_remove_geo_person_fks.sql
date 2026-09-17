ALTER TABLE zones     DROP COLUMN IF EXISTS zonal_head_id;
ALTER TABLE districts DROP COLUMN IF EXISTS district_anchor_id;
ALTER TABLE areas     DROP COLUMN IF EXISTS education_coordinator_id;
ALTER TABLE clusters  DROP COLUMN IF EXISTS cluster_coordinator_id;
