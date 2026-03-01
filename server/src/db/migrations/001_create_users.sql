CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username   VARCHAR(50)      NOT NULL,
  email      VARCHAR(255)     NOT NULL,
  password   VARCHAR(255)     NOT NULL,
  role       ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
