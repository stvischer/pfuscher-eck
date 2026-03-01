import Fastify from 'fastify'
import fastifyEnv from '@fastify/env'
import fastifyCors from '@fastify/cors'
import fastifyRedis from '@fastify/redis'
import { createPool } from 'mariadb'
import { Server as SocketIOServer } from 'socket.io'
import { randomUUID } from 'crypto'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'

const schema = {
  type: 'object',
  required: ['PORT', 'JWT_SECRET'],
  properties: {
    PORT:         { type: 'integer', default: 3001 },
    NODE_ENV:     { type: 'string',  default: 'development' },
    REDIS_URL:    { type: 'string',  default: 'redis://localhost:6379' },
    DB_HOST:      { type: 'string',  default: 'localhost' },
    DB_PORT:      { type: 'integer', default: 3306 },
    DB_USER:      { type: 'string',  default: 'root' },
    DB_PASSWORD:  { type: 'string',  default: '' },
    DB_NAME:      { type: 'string',  default: 'pfuscher_eck' },
    CLIENT_URL:   { type: 'string',  default: 'http://localhost:3000' },
    JWT_SECRET:   { type: 'string' },
  },
}

const fastify = Fastify({ logger: true })

await fastify.register(fastifyEnv, { schema, dotenv: true })

// CORS — must be registered before any routes
await fastify.register(fastifyCors, {
  origin: fastify.config.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Auth (JWT + cookies)
await fastify.register(authPlugin)
await fastify.register(authRoutes)

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

  // Send the UUID back so the client can identify itself
  socket.emit('socket:uuid', uuid)

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
