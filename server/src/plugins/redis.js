import fp from 'fastify-plugin'
import fastifyRedis from '@fastify/redis'

async function redis(fastify) {
  await fastify.register(fastifyRedis, {
    url:         fastify.config.REDIS_URL,
    closeClient: true,
  })
}

export default fp(redis, { name: 'redis' })
