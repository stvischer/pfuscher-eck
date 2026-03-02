-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 019 – Normalise address storage  (fully idempotent)
--
-- Every step checks information_schema before touching data so the migration
-- is safe to re-run even if it was partially applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Promote flat user address data into addresses ─────────────────────────
-- Only runs if addresses.user_id still exists.

SET @has_addr_uid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'addresses' AND COLUMN_NAME = 'user_id');

SET @s = IF(@has_addr_uid, 'INSERT INTO addresses (user_id, street, city, state, postal_code, country, label, is_primary) SELECT u.id, u.street, u.city, u.state, u.postal_code, u.country, ''home'', 1 FROM users u WHERE (u.street IS NOT NULL OR u.city IS NOT NULL OR u.country IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id AND a.label = ''home'')', 'DO 0');

EXECUTE IMMEDIATE @s;

-- ── 1b. Populate geometry from users.lat/lon ─────────────────────────────────
-- Only runs if both addresses.user_id AND users.lat still exist.

SET @has_users_lat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'lat');

SET @s = IF(@has_addr_uid AND @has_users_lat, 'UPDATE addresses a JOIN users u ON a.user_id = u.id SET a.location = ST_GeomFromText(CONCAT(''POINT('', u.lon, '' '', u.lat, '')''), 4326) WHERE a.location IS NULL AND u.lat IS NOT NULL AND u.lon IS NOT NULL', 'DO 0');

EXECUTE IMMEDIATE @s;

-- ── 2. Create the relation table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_addresses (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED  NOT NULL,
  address_id    INT UNSIGNED  NOT NULL,
  address_type  VARCHAR(50)   NOT NULL DEFAULT 'home'
    COMMENT 'e.g. home, work, billing, shipping, service_area',
  radius_m      INT UNSIGNED  NULL
    COMMENT 'Optional service/search radius in metres around this address',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_ua_user_type  (user_id, address_type),
  KEY         idx_ua_address   (address_id),

  CONSTRAINT fk_ua_user
    FOREIGN KEY (user_id)   REFERENCES users     (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ua_address
    FOREIGN KEY (address_id) REFERENCES addresses (id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE         = utf8mb4_unicode_ci;

-- ── 3. Seed user_addresses from existing addresses rows ──────────────────────
-- Only runs if addresses.user_id still exists (i.e. step 4 has not run yet).

SET @has_addr_uid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'addresses' AND COLUMN_NAME = 'user_id');

SET @s = IF(@has_addr_uid, 'INSERT IGNORE INTO user_addresses (user_id, address_id, address_type) SELECT a.user_id, a.id, COALESCE(NULLIF(TRIM(a.label), ''''), ''home'') FROM addresses a WHERE a.user_id IS NOT NULL', 'DO 0');

EXECUTE IMMEDIATE @s;

-- ── 4. Remove ownership / label columns from addresses ───────────────────────

ALTER TABLE addresses
  DROP FOREIGN KEY IF EXISTS fk_addresses_user;

ALTER TABLE addresses
  DROP INDEX IF EXISTS idx_addresses_user;

ALTER TABLE addresses
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS label,
  DROP COLUMN IF EXISTS is_primary;

-- ── 5. Remove flat address + coordinate columns from users ───────────────────

ALTER TABLE users
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS lat,
  DROP COLUMN IF EXISTS lon;
