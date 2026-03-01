import fp from 'fastify-plugin'
import { Server as SocketIOServer } from 'socket.io'
import { randomUUID } from 'crypto'

async function socketio(fastify) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin:      fastify.config.CLIENT_URL,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  })

  fastify.decorate('io', io)

  // Authenticate every Socket.IO connection via Bearer token in handshake.auth
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.data.user = fastify.jwt.verify(token)
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const uuid = randomUUID()
    socket.data.uuid = uuid

    fastify.log.info(`Socket connected: ${socket.id} uuid=${uuid}`)

    socket.emit('socket:uuid', uuid)

    socket.on('room:join', (roomId) => {
      socket.join(roomId)
      fastify.log.info(`Socket ${socket.id} joined room ${roomId}`)
    })

    socket.on('room:leave', (roomId) => {
      socket.leave(roomId)
      fastify.log.info(`Socket ${socket.id} left room ${roomId}`)
    })

    socket.on('message:send', async ({ roomId, content, attachment }) => {
      const hasText       = content?.trim()
      const hasAttachment = Array.isArray(attachment) && attachment.length > 0
      if (!roomId || (!hasText && !hasAttachment)) return

      const conn = await fastify.db.getConnection()
      try {
        const attachmentJson = hasAttachment ? JSON.stringify(attachment) : null
        const result = await conn.query(
          'INSERT INTO chat_messages (chat_id, user_id, content, attachment) VALUES (?, ?, ?, ?)',
          [roomId, socket.data.user?.id, hasText ? content.trim() : '', attachmentJson],
        )
        const [msg] = await conn.query(
          `SELECT m.id, m.chat_id AS chatId, m.user_id, m.content, m.attachment, m.created_at,
                  u.username
           FROM chat_messages m JOIN users u ON u.id = m.user_id
           WHERE m.id = ?`,
          [result.insertId],
        )
        // attachment is returned as parsed JSON by mariadb driver
        io.to(roomId).emit('message:new', msg)
      } catch (err) {
        fastify.log.error(err, 'message:send failed')
      } finally {
        conn.release()
      }
    })

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id} uuid=${socket.data.uuid}`)
    })
  })

  fastify.addHook('onClose', () => {
    io.close()
  })
}

export default fp(socketio, { name: 'socketio' })
