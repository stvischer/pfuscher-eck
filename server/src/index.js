import Fastify from 'fastify'
import fastifyEnv from '@fastify/env'
import fastifyRedis from '@fastify/redis'
import mariadb from 'mariadb'
import { Server as SocketIOServer } from 'socket.io'

const schema = {
  type: 'object',
  required: ['PORT'],
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
  },
}

const fastify = Fastify({ logger: true })

await fastify.register(fastifyEnv, { schema, dotenv: true })

// Redis
await fastify.register(fastifyRedis, { url: fastify.config.REDIS_URL, closeClient: true })

// MariaDB connection pool — exposed as fastify.db
fastify.decorate('db', mariadb.createPool({
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

try {
  await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' })

  // Socket.IO — attach after server is listening
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: fastify.config.CLIENT_URL, methods: ['GET', 'POST'] },
  })

  fastify.decorate('io', io)

  io.on('connection', (socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`)

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`)
    })
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
