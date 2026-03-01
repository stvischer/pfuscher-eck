-- Seed a private DM chat room between chat1 and chat2
DELETE FROM messages;
DELETE FROM chat_members;
DELETE FROM chat_rooms;

SET @chat_id = UUID();

INSERT INTO chat_rooms (id, type, visibility) VALUES (@chat_id, 'direct', 'private');

INSERT INTO chat_members (chat_id, user_id)
SELECT @chat_id, id FROM users WHERE username IN ('chat1', 'chat2');

-- Seed messages in the conversation
INSERT INTO messages (chat_id, user_id, content, created_at)
SELECT @chat_id, id, 'Hey, are you up for some Pfuschen today?', NOW() - INTERVAL 20 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @chat_id, id, 'Absolutely! What are we working on?', NOW() - INTERVAL 15 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @chat_id, id, 'I found a weird bug in the auth flow, want to take a look?', NOW() - INTERVAL 10 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @chat_id, id, 'Sure, share the repro steps and I am on it.', NOW() - INTERVAL 5 MINUTE
FROM users WHERE username = 'chat2';
