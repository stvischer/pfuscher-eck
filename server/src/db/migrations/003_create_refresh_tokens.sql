CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  token_hash VARCHAR(64)   NOT NULL,       -- SHA-256 hex of the raw token
  expires_at DATETIME      NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY        idx_refresh_token_user (user_id),
  CONSTRAINT fk_refresh_token_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
