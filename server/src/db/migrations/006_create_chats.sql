-- Drop everything that depends on messages/chats first (clean slate)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS chats;

CREATE TABLE chat_rooms (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  name       VARCHAR(100)          NULL,
  type       ENUM('direct','group')   NOT NULL DEFAULT 'direct',
  visibility ENUM('private','public') NOT NULL DEFAULT 'private',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_members (
  chat_id    CHAR(36)     NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (chat_id, user_id),
  CONSTRAINT fk_cm_chat FOREIGN KEY (chat_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  chat_id    CHAR(36)     NULL,
  user_id    INT UNSIGNED NOT NULL,
  content    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_messages_chat FOREIGN KEY (chat_id) REFERENCES chat_rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
