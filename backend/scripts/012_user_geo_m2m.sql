-- Migration 012: Replace scalar geo FKs on users with M2M tables
-- Regional Head -> user_zones, District Anchor -> user_districts,
-- Education Coordinator -> user_areas, Cluster Coordinator -> user_clusters

CREATE TABLE IF NOT EXISTS user_zones (
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    zone_id    INTEGER NOT NULL REFERENCES zones(id)  ON DELETE CASCADE,
    PRIMARY KEY (user_id, zone_id)
);

CREATE TABLE IF NOT EXISTS user_districts (
    user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, district_id)
);

CREATE TABLE IF NOT EXISTS user_areas (
    user_id INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    area_id INTEGER NOT NULL REFERENCES areas(id)  ON DELETE CASCADE,
    PRIMARY KEY (user_id, area_id)
);

CREATE TABLE IF NOT EXISTS user_clusters (
    user_id    INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES clusters(id)  ON DELETE CASCADE,
    PRIMARY KEY (user_id, cluster_id)
);

-- Migrate existing scalar assignments to M2M tables
INSERT INTO user_zones (user_id, zone_id)
    SELECT id, zone_id FROM users
    WHERE zone_id IS NOT NULL AND title = 'Regional Head'
    ON CONFLICT DO NOTHING;

INSERT INTO user_districts (user_id, district_id)
    SELECT id, district_id FROM users
    WHERE district_id IS NOT NULL AND title = 'District Anchor'
    ON CONFLICT DO NOTHING;

INSERT INTO user_areas (user_id, area_id)
    SELECT id, area_id FROM users
    WHERE area_id IS NOT NULL AND title = 'Education Coordinator'
    ON CONFLICT DO NOTHING;

INSERT INTO user_clusters (user_id, cluster_id)
    SELECT id, cluster_id FROM users
    WHERE cluster_id IS NOT NULL AND title = 'Cluster Coordinator'
    ON CONFLICT DO NOTHING;

-- Drop scalar FK columns from users (Teachers stored kutirs via user_kutirs; zone/district/area/cluster were UI-only for them)
ALTER TABLE users DROP COLUMN IF EXISTS zone_id;
ALTER TABLE users DROP COLUMN IF EXISTS district_id;
ALTER TABLE users DROP COLUMN IF EXISTS area_id;
ALTER TABLE users DROP COLUMN IF EXISTS cluster_id;
