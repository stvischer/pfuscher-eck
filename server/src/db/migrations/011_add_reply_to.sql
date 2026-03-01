ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS reply_to INT UNSIGNED NULL,
  ADD CONSTRAINT fk_chat_messages_reply
    FOREIGN KEY (reply_to) REFERENCES chat_messages(id) ON DELETE SET NULL;
