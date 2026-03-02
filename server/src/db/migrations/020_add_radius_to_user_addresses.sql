ALTER TABLE user_addresses
  ADD COLUMN IF NOT EXISTS radius_m INT UNSIGNED NULL
    COMMENT 'Optional service/search radius in metres around this address'
    AFTER address_type;
