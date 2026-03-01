import Fastify from 'fastify'
import fastifyEnv from '@fastify/env'
import fastifyCors from '@fastify/cors'
import fastifyRedis from '@fastify/redis'
import { createPool } from 'mariadb'
import { Server as SocketIOServer } from 'socket.io'
import { randomUUID } from 'crypto'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'

const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT:        { type: 'integer', default: 3001 },
    NODE_ENV:    { type: 'string',  default: 'development' },
    REDIS_URL:   { type: 'string',  default: 'redis://localhost:6379' },
    DB_HOST:     { type: 'string',  default: 'localhost' },
    DB_PORT:     { type: 'integer', default: 3306 },
    DB_USER:     { type: 'string',  default: 'root' },
    DB_PASSWORD: { type: 'string',  default: '' },
    DB_NAME:     { type: 'string',  default: 'pfuscher_eck' },
    CLIENT_URL:  { type: 'string',  default: 'http://localhost:3000' },
    JWT_SECRET:  { type: 'string',  default: 'changeme' },
  },
}

const fastify = Fastify({ logger: true })

// env must be ready before any plugin that reads fastify.config
await fastify.register(fastifyEnv, { schema, dotenv: true, confKey: 'config' })

// Auto-load all plugins (cors, redis, mariadb, socketio, …)
await fastify.register(autoload, {
  dir:   join(__dirname, 'plugins'),
  forceESM: true,
})

// Auth (JWT + cookies)
await fastify.register(authPlugin)
await fastify.register(authRoutes)
await fastify.register(chatRoutes)

// Redis
await fastify.register(fastifyRedis, { url: fastify.config.REDIS_URL, closeClient: true })

// MariaDB connection pool — exposed as fastify.db
fastify.decorate('db', createPool({
  host:     fastify.config.DB_HOST,
  port:     fastify.config.DB_PORT,
  user:     fastify.config.DB_USER,
  password: fastify.config.DB_PASSWORD,
  database: fastify.config.DB_NAME,
  connectionLimit: 10,
}))

fastify.addHook('onClose', async (instance) => {
  await instance.db.end()
})

fastify.get('/api/health', async () => {
  return { status: 'ok' }
})

// Socket.IO — fastify.server exists at instantiation, so decorate before listen
const io = new SocketIOServer(fastify.server, {
  cors: { origin: fastify.config.CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
})

fastify.decorate('io', io)

// Authenticate every Socket.IO connection via Bearer token in handshake.auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token

  if (!token) return next(new Error('Unauthorized'))

  try {
    const payload = fastify.jwt.verify(token)
    socket.data.user = payload
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket) => {
  const uuid = randomUUID()
  socket.data.uuid = uuid

  fastify.log.info(`Socket connected: ${socket.id} uuid=${uuid} user=${socket.data.user?.id}`)

  socket.emit('socket:uuid', uuid)

  socket.on('room:join', (roomId) => {
    socket.join(roomId)
    fastify.log.info(`Socket ${socket.id} joined room ${roomId}`)
  })

  socket.on('room:leave', (roomId) => {
    socket.leave(roomId)
    fastify.log.info(`Socket ${socket.id} left room ${roomId}`)
  })

  socket.on('message:send', async ({ roomId, content }) => {
    if (!roomId || !content?.trim()) return

    const conn = await fastify.db.getConnection()
    try {
      const result = await conn.query(
        'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)',
        [roomId, socket.data.user.id, content.trim()],
      )
      const [msg] = await conn.query(
        `SELECT m.id, m.chat_id AS chatId, m.user_id, m.content, m.created_at,
                u.username
         FROM messages m JOIN users u ON u.id = m.user_id
         WHERE m.id = ?`,
        [result.insertId],
      )
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

try {
  await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
