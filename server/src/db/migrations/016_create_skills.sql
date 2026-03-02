-- Master list of skills
CREATE TABLE IF NOT EXISTS skills (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',

  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User ↔ skill relationship with proficiency level
CREATE TABLE IF NOT EXISTS user_skills (
  user_id  INT UNSIGNED                              NOT NULL,
  skill_id INT UNSIGNED                              NOT NULL,
  level    ENUM('beginner','intermediate','expert')  NOT NULL DEFAULT 'beginner',

  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_user_skills_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
