import fp from 'fastify-plugin'
import { createPool } from 'mariadb'

async function db(fastify) {
  const pool = createPool({
    host:            fastify.config.DB_HOST,
    port:            fastify.config.DB_PORT,
    user:            fastify.config.DB_USER,
    password:        fastify.config.DB_PASSWORD,
    database:        fastify.config.DB_NAME,
    connectionLimit: 10,
  })

  fastify.decorate('db', pool)

  fastify.addHook('onClose', async (instance) => {
    await instance.db.end()
  })
}

export default fp(db, { name: 'mariadb' })
