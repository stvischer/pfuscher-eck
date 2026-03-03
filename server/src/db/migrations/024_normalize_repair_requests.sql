-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024 – Normalise repair_requests storage
--
-- Drops the monolithic repair_requests / repair_request_skills tables from 023
-- and replaces them with:
--   repair_requests    – lean: only identity + text + status
--   request_addresses  – pivot → addresses (same pattern as user_addresses)
--   request_skills     – pivot → cnf_skills  (same pattern as user_skills)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old tables in FK order (including any pivot tables from prior partial runs)
DROP TABLE IF EXISTS repair_request_skills;
DROP TABLE IF EXISTS repair_request_addresses;
DROP TABLE IF EXISTS repair_requests;

-- ── repair_requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repair_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NOT NULL,
  category     VARCHAR(100) NULL,
  status       ENUM('open','in_progress','completed','cancelled')
               NOT NULL DEFAULT 'open',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_repair_requests_user   (user_id),
  KEY idx_repair_requests_status (status),

  CONSTRAINT fk_repair_requests_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── repair_request_addresses ─────────────────────────────────────────────────
-- Each request can have one address, stored in the shared addresses table.
CREATE TABLE IF NOT EXISTS repair_request_addresses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id  INT UNSIGNED NOT NULL,
  address_id  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_request_address (request_id, address_id),

  CONSTRAINT fk_repair_req_addr_request
    FOREIGN KEY (request_id) REFERENCES repair_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_repair_req_addr_address
    FOREIGN KEY (address_id) REFERENCES addresses(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── repair_request_skills ─────────────────────────────────────────────────────
-- Skills required to fulfil the repair request.
CREATE TABLE IF NOT EXISTS repair_request_skills (
  request_id INT UNSIGNED NOT NULL,
  skill_id   INT UNSIGNED NOT NULL,

  PRIMARY KEY (request_id, skill_id),

  CONSTRAINT fk_repair_req_skills_request
    FOREIGN KEY (request_id) REFERENCES repair_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_repair_req_skills_skill
    FOREIGN KEY (skill_id) REFERENCES cnf_skills(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
