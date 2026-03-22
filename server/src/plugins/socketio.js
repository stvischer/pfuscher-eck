import fp from 'fastify-plugin';
import { Server as SocketIOServer } from 'socket.io';
import { randomUUID } from 'crypto';

async function socketio(fastify) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: fastify.config.client_url,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  fastify.decorate('io', io);

  // Authenticate every Socket.IO connection via Bearer token in handshake.auth
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.data.user = fastify.jwt.verify(token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uuid = randomUUID();
    socket.data.uuid = uuid;

    fastify.log.info(`Socket connected: ${socket.id} uuid=${uuid}`);

    socket.emit('socket:uuid', uuid);

    socket.on('room:join', (roomId) => {
      socket.join(roomId);
      fastify.log.info(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      fastify.log.info(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('message:send', async ({ roomId, content, attachment, replyTo }) => {
      const hasText = content?.trim();
      const hasAttachment = Array.isArray(attachment) && attachment.length > 0;
      if (!roomId || (!hasText && !hasAttachment)) return;

      const conn = await fastify.db.getConnection();
      try {
        const attachmentJson = hasAttachment ? JSON.stringify(attachment) : null;
        const result = await conn.query(
          'INSERT INTO chat_messages (chat_id, user_id, content, attachment, reply_to) VALUES (?, ?, ?, ?, ?)',
          [
            roomId,
            socket.data.user?.id,
            hasText ? content.trim() : '',
            attachmentJson,
            replyTo ?? null,
          ],
        );
        const [msg] = await conn.query(
          `SELECT m.id, m.chat_id AS chatId, m.user_id, m.content, m.attachment, m.created_at,
                  u.username,
                  m.reply_to, rm.content AS reply_content, ru.username AS reply_username
           FROM chat_messages m
           JOIN user u ON u.id = m.user_id
           LEFT JOIN chat_messages rm ON rm.id = m.reply_to
           LEFT JOIN user ru ON ru.id = rm.user_id
           WHERE m.id = ?`,
          [result.insertId],
        );
        msg.reactions = [];
        // attachment is returned as parsed JSON by mariadb driver
        io.to(roomId).emit('message:new', msg);
      } catch (err) {
        fastify.log.error(err, 'message:send failed');
      } finally {
        conn.release();
      }
    });

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id} uuid=${socket.data.uuid}`);
    });

    // ── Reactions ──────────────────────────────────────────────────────────
    socket.on('message:react', async ({ messageId, emoji }) => {
      if (!messageId || !emoji) return;
      const userId = socket.data.user?.id;

      const conn = await fastify.db.getConnection();
      try {
        // Verify the message exists and get its room
        const [msgRow] = await conn.query('SELECT chat_id FROM chat_messages WHERE id = ?', [
          messageId,
        ]);
        if (!msgRow) return;

        // Verify the user is a member of that room
        const [membership] = await conn.query(
          'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?',
          [msgRow.chat_id, userId],
        );
        if (!membership) return;

        // Toggle: remove if exists, add if not
        const [existing] = await conn.query(
          'SELECT id FROM chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
          [messageId, userId, emoji],
        );
        if (existing) {
          await conn.query('DELETE FROM chat_reactions WHERE id = ?', [existing.id]);
        } else {
          await conn.query(
            'INSERT INTO chat_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
            [messageId, userId, emoji],
          );
        }

        // Broadcast updated reaction list
        const reactions = await conn.query(
          'SELECT emoji, user_id AS userId FROM chat_reactions WHERE message_id = ?',
          [messageId],
        );
        io.to(msgRow.chat_id).emit('reaction:update', { messageId: Number(messageId), reactions });
      } catch (err) {
        fastify.log.error(err, 'message:react failed');
      } finally {
        conn.release();
      }
    });
  });

  fastify.addHook('onClose', () => {
    io.close();
  });
}

export default fp(socketio, { name: 'socketio' });
