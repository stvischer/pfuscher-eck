CREATE TABLE IF NOT EXISTS `cnf_skills` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(100) NOT NULL COLLATE 'utf8mb4_general_ci',
	`parent_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`slug` VARCHAR(255) NOT NULL DEFAULT 'General' COLLATE 'utf8mb4_general_ci',
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB;

-- User ↔ skill relationship with proficiency level
CREATE TABLE IF NOT EXISTS user_skills (
  user_id  INT UNSIGNED                              NOT NULL,
  skill_id INT UNSIGNED                              NOT NULL,
  level    ENUM('beginner','intermediate','expert')  NOT NULL DEFAULT 'beginner',

  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_user_skills_user  FOREIGN KEY (user_id)  REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES cnf_skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
