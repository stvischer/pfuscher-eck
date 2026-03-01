-- Seed additional dummy conversations on top of migration 007
-- Adds: a group "General" room + a DM between admin and user

-- ── Group room: General ──────────────────────────────────────────────────────
SET @general_id = UUID();

INSERT INTO chat_rooms (id, name, type, visibility)
VALUES (@general_id, 'General', 'group', 'public');

INSERT INTO chat_members (chat_id, user_id)
SELECT @general_id, id FROM users WHERE username IN ('admin', 'user', 'chat1', 'chat2');

INSERT INTO chat_messages (chat_id, user_id, content, created_at)
SELECT @general_id, id, 'Hey everyone, welcome to General! 👋', NOW() - INTERVAL 2 HOUR
FROM users WHERE username = 'admin'
UNION ALL
SELECT @general_id, id, 'Thanks for setting this up!', NOW() - INTERVAL 115 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @general_id, id, 'Good to have a place to chat outside of tickets 😄', NOW() - INTERVAL 110 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @general_id, id, 'Agreed. Anyone looked at the new auth middleware yet?', NOW() - INTERVAL 105 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @general_id, id, 'Yeah, it is solid. JWT expiry set to 15 min, refresh tokens stored hashed in DB.', NOW() - INTERVAL 100 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @general_id, id, 'Smart. Did you add token rotation on each refresh?', NOW() - INTERVAL 95 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @general_id, id, 'Of course — old token is invalidated immediately.', NOW() - INTERVAL 90 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @general_id, id, 'Nice. What about the socket auth?', NOW() - INTERVAL 80 MINUTE
FROM users WHERE username = 'chat1'
UNION ALL
SELECT @general_id, id, 'Socket.IO reads the access token from handshake.auth.token, verifies it, rejects on failure.', NOW() - INTERVAL 75 MINUTE
FROM users WHERE username = 'chat2'
UNION ALL
SELECT @general_id, id, 'Clean. We should document that for the README.', NOW() - INTERVAL 60 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @general_id, id, 'Already on it 📝', NOW() - INTERVAL 55 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @general_id, id, 'Legend. See you all in standup tomorrow!', NOW() - INTERVAL 10 MINUTE
FROM users WHERE username = 'chat1';

-- ── DM: admin ↔ user ─────────────────────────────────────────────────────────
SET @dm_admin_user = UUID();

INSERT INTO chat_rooms (id, type, visibility)
VALUES (@dm_admin_user, 'direct', 'private');

INSERT INTO chat_members (chat_id, user_id)
SELECT @dm_admin_user, id FROM users WHERE username IN ('admin', 'user');

INSERT INTO chat_messages (chat_id, user_id, content, created_at)
SELECT @dm_admin_user, id, 'Hey, can you review my PR when you get a chance?', NOW() - INTERVAL 3 HOUR
FROM users WHERE username = 'user'
UNION ALL
SELECT @dm_admin_user, id, 'Sure, which one?', NOW() - INTERVAL 175 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @dm_admin_user, id, 'The chat component refactor — RoomList and Room are split now.', NOW() - INTERVAL 170 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @dm_admin_user, id, 'Oh nice, I saw that. Left a couple of comments on the message bubble styling.', NOW() - INTERVAL 165 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @dm_admin_user, id, 'Gotcha, will fix the avatar margin and re-request.', NOW() - INTERVAL 160 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @dm_admin_user, id, 'Perfect. Also double-check the mobile breakpoint for the back button.', NOW() - INTERVAL 155 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @dm_admin_user, id, 'Good catch, it was hiding at 770px instead of 768px 😅', NOW() - INTERVAL 140 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @dm_admin_user, id, 'Classic off-by-two. Fixed now?', NOW() - INTERVAL 135 MINUTE
FROM users WHERE username = 'admin'
UNION ALL
SELECT @dm_admin_user, id, 'Yep, pushed just now. All good!', NOW() - INTERVAL 130 MINUTE
FROM users WHERE username = 'user'
UNION ALL
SELECT @dm_admin_user, id, 'Approved and merged. Great work 🚀', NOW() - INTERVAL 120 MINUTE
FROM users WHERE username = 'admin';
