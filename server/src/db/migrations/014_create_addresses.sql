CREATE TABLE IF NOT EXISTS addresses (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED      NOT NULL,
  label        VARCHAR(50)       NOT NULL DEFAULT 'Home'  COMMENT 'e.g. Home, Work, Billing',
  street       VARCHAR(255)      NULL,
  city         VARCHAR(100)      NULL,
  state        VARCHAR(100)      NULL,
  postal_code  VARCHAR(20)       NULL,
  country      VARCHAR(100)      NULL,
  lat          DECIMAL(10, 7)    NULL     COMMENT 'Latitude  (-90  .. 90)',
  lon          DECIMAL(10, 7)    NULL     COMMENT 'Longitude (-180 .. 180)',
  is_primary   TINYINT(1)        NOT NULL DEFAULT 0,
  created_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id),
  KEY idx_addresses_geo  (lat, lon),

  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
