-- Group chat between chat1, chat2 and chat3
SET @trio_id = UUID();

INSERT INTO chat_rooms (id, name, type, visibility)
VALUES (@trio_id, 'The Trio', 'group', 'private');

INSERT INTO chat_members (chat_id, user_id)
SELECT @trio_id, id FROM users WHERE username IN ('chat1', 'chat2', 'chat3');

INSERT INTO chat_messages (chat_id, user_id, content, created_at)
SELECT @trio_id, id, 'Alright, the three of us finally in one chat 🎉', NOW() - INTERVAL 90 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @trio_id, id, 'About time! What are we tackling first?', NOW() - INTERVAL 88 MINUTE
FROM users WHERE username = 'chat3'
UNION ALL
SELECT @trio_id, id, 'I say we go through the open issues backlog together.', NOW() - INTERVAL 85 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @trio_id, id, 'Good call. I counted 12 tickets that are older than two weeks.', NOW() - INTERVAL 82 MINUTE
FROM users WHERE username = 'chat3'
UNION ALL
SELECT @trio_id, id, 'Most of them are probably duplicates or already fixed.', NOW() - INTERVAL 79 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @trio_id, id, 'Ha, true. I will filter the list and share it here.', NOW() - INTERVAL 75 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @trio_id, id, 'While you do that — chat3, did you get the staging deploy working?', NOW() - INTERVAL 70 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @trio_id, id, 'Yeah! Finally. The env vars were missing from the CI pipeline.', NOW() - INTERVAL 67 MINUTE
FROM users WHERE username = 'chat3'
UNION ALL
SELECT @trio_id, id, 'Classic. At least it was not a code bug this time 😄', NOW() - INTERVAL 65 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @trio_id, id, 'Never say that out loud, you will jinx it.', NOW() - INTERVAL 62 MINUTE
FROM users WHERE username = 'chat3'
UNION ALL
SELECT @trio_id, id, 'OK filtered the list — down to 5 real issues. Sharing in the General chat too.', NOW() - INTERVAL 55 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @trio_id, id, 'Perfect. Let us assign them after standup.', NOW() - INTERVAL 50 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @trio_id, id, 'Agreed. Same time tomorrow?', NOW() - INTERVAL 45 MINUTE
FROM users WHERE username = 'chat3'
UNION ALL
SELECT @trio_id, id, 'Works for me 👍', NOW() - INTERVAL 43 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @trio_id, id, '👍', NOW() - INTERVAL 42 MINUTE
FROM users WHERE username = 'chat2';
