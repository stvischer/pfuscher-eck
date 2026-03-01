async function health(fastify) {
  fastify.get('/api/health', async () => ({ status: 'ok' }))
}

export default health
