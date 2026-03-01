import fp from 'fastify-plugin'
import fastifyCors from '@fastify/cors'

async function cors(fastify) {
  await fastify.register(fastifyCors, {
    origin:         fastify.config.CLIENT_URL,
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}

export default fp(cors, { name: 'cors' })
