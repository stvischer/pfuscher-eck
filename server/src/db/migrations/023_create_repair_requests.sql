-- Repair requests submitted by users
CREATE TABLE IF NOT EXISTS repair_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NOT NULL,
  category     VARCHAR(100) NULL,
  urgency      ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  budget_min   DECIMAL(10,2) NULL,
  budget_max   DECIMAL(10,2) NULL,
  status       ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
  street       VARCHAR(255) NULL,
  city         VARCHAR(100) NULL,
  postal_code  VARCHAR(20)  NULL,
  country      VARCHAR(5)   NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Skills required for a repair request
CREATE TABLE IF NOT EXISTS repair_request_skills (
  request_id INT UNSIGNED NOT NULL,
  skill_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (request_id, skill_id),
  FOREIGN KEY (request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)   REFERENCES cnf_skills(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
