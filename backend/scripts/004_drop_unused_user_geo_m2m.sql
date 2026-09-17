-- Migration 004: Drop unused user geo M2M tables
--
-- These tables were created when the app used M2M for all role-based geo
-- assignments. The design was changed: Zonal Head, District Anchor,
-- Education Coordinator and Cluster Coordinator are now assigned via scalar
-- FK columns on the geo models (zones.zonal_head_id, etc.).
-- Only Teachers still use M2M (user_kutirs), which is kept.

DROP TABLE IF EXISTS user_clusters;
DROP TABLE IF EXISTS user_areas;
DROP TABLE IF EXISTS user_districts;
DROP TABLE IF EXISTS user_zones;
