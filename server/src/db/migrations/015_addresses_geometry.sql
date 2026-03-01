-- Replace decimal lat/lon columns with a native geometry POINT column.
-- ST_X(location) = longitude, ST_Y(location) = latitude  (WGS-84 / SRID 4326)
-- Each statement is idempotent so re-running the migration is safe.

ALTER TABLE addresses DROP INDEX  IF EXISTS idx_addresses_geo;
ALTER TABLE addresses DROP COLUMN IF EXISTS lat;
ALTER TABLE addresses DROP COLUMN IF EXISTS lon;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS location POINT NULL
  COMMENT 'WGS-84 geometry: ST_X=lon ST_Y=lat  e.g. ST_GeomFromText(''POINT(16.37 48.21)'', 4326)';

-- SPATIAL INDEX requires NOT NULL.  To enable it later:
--   ALTER TABLE addresses MODIFY location POINT NOT NULL;
--   ALTER TABLE addresses ADD SPATIAL INDEX idx_addresses_location (location);
