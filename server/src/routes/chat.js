async function chatRoutes(fastify) {
  // GET /api/chat/rooms — rooms the current user is a member of
  fastify.get('/api/chat/rooms', { preHandler: fastify.authenticate }, async (request) => {
    const conn = await fastify.db.getConnection()
    try {
      const rows = await conn.query(
        `SELECT r.id, r.name, r.type, r.visibility, r.created_at
         FROM chat_rooms r
         JOIN chat_members m ON m.chat_id = r.id
         WHERE m.user_id = ?
         ORDER BY r.created_at DESC`,
        [request.user.id],
      )
      return rows
    } finally {
      conn.release()
    }
  })

  // GET /api/chat/rooms/:id/messages — paginated messages for a room
  fastify.get('/api/chat/rooms/:id/messages', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { id } = request.params
    const limit  = Math.min(Number(request.query.limit) || 50, 100)
    const before = request.query.before // ISO timestamp for cursor pagination

    const conn = await fastify.db.getConnection()
    try {
      // Check membership
      const [membership] = await conn.query(
        'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?',
        [id, request.user.id],
      )
      if (!membership) return reply.code(403).send({ message: 'Not a member of this room' })

      const rows = await conn.query(
        `SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at,
                u.username
         FROM chat_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.chat_id = ?
           ${before ? 'AND m.created_at < ?' : ''}
         ORDER BY m.created_at ASC
         LIMIT ?`,
        before ? [id, before, limit] : [id, limit],
      )
      return rows
    } finally {
      conn.release()
    }
  })
}

export default chatRoutes
