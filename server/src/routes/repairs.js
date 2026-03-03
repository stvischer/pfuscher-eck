export default async function repairsRoutes(fastify) {

  // ── helpers ────────────────────────────────────────────────────────────────

  async function loadSkills(conn, requestId) {
    const rows = await conn.query(
      `SELECT cs.id, cs.name, p.name AS category
       FROM   repair_request_skills rrs
       JOIN   cnf_skills cs ON cs.id = rrs.skill_id
       LEFT JOIN cnf_skills p ON p.id = cs.parent_id
       WHERE  rrs.request_id = ?
       ORDER  BY p.name, cs.name`,
      [requestId],
    )
    return rows.map(r => ({ id: Number(r.id), name: r.name, category: r.category ?? null }))
  }

  function mapRequest(r) {
    return {
      id:          Number(r.id),
      userId:      Number(r.user_id),
      username:    r.username ?? null,
      title:       r.title,
      description: r.description,
      category:    r.category ?? null,
      urgency:     r.urgency,
      budgetMin:   r.budget_min != null ? Number(r.budget_min) : null,
      budgetMax:   r.budget_max != null ? Number(r.budget_max) : null,
      status:      r.status,
      street:      r.street ?? null,
      city:        r.city   ?? null,
      postalCode:  r.postal_code ?? null,
      country:     r.country ?? null,
      skills:      [],
      createdAt:   r.created_at,
      updatedAt:   r.updated_at,
    }
  }

  // ── GET /api/repairs ───────────────────────────────────────────────────────
  // Public: browse open repair requests
  fastify.get('/api/repairs', async (request, reply) => {
    const { status = 'open', category, limit = 50, offset = 0 } = request.query

    const conn = await fastify.db.getConnection()
    try {
      const conditions = []
      const params     = []

      if (status) {
        conditions.push('rr.status = ?')
        params.push(status)
      }
      if (category) {
        conditions.push('rr.category = ?')
        params.push(category)
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const rows = await conn.query(
        `SELECT rr.*, u.username
         FROM   repair_requests rr
         JOIN   users u ON u.id = rr.user_id
         ${where}
         ORDER  BY rr.created_at DESC
         LIMIT  ? OFFSET ?`,
        [...params, Number(limit), Number(offset)],
      )

      const requests = rows.map(mapRequest)

      // Attach skills for each request
      for (const req of requests) {
        req.skills = await loadSkills(conn, req.id)
      }

      return reply.send(requests)
    } finally {
      conn.release()
    }
  })

  // ── GET /api/repairs/mine ──────────────────────────────────────────────────
  // Auth required: current user's own requests
  fastify.get(
    '/api/repairs/mine',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.id
      const conn   = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          `SELECT rr.*, u.username
           FROM   repair_requests rr
           JOIN   users u ON u.id = rr.user_id
           WHERE  rr.user_id = ?
           ORDER  BY rr.created_at DESC`,
          [userId],
        )

        const requests = rows.map(mapRequest)
        for (const req of requests) {
          req.skills = await loadSkills(conn, req.id)
        }

        return reply.send(requests)
      } finally {
        conn.release()
      }
    },
  )

  // ── GET /api/repairs/:id ───────────────────────────────────────────────────
  fastify.get('/api/repairs/:id', async (request, reply) => {
    const { id } = request.params
    const conn   = await fastify.db.getConnection()
    try {
      const [row] = await conn.query(
        `SELECT rr.*, u.username
         FROM   repair_requests rr
         JOIN   users u ON u.id = rr.user_id
         WHERE  rr.id = ?`,
        [id],
      )

      if (!row) return reply.code(404).send({ message: 'Not found' })

      const req = mapRequest(row)
      req.skills = await loadSkills(conn, req.id)

      return reply.send(req)
    } finally {
      conn.release()
    }
  })

  // ── POST /api/repairs ──────────────────────────────────────────────────────
  // Auth required: create a new repair request
  fastify.post(
    '/api/repairs',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title:       { type: 'string', minLength: 3, maxLength: 255 },
            description: { type: 'string', minLength: 10 },
            category:    { type: 'string', maxLength: 100 },
            urgency:     { type: 'string', enum: ['low', 'medium', 'high'] },
            budgetMin:   { type: 'number', minimum: 0 },
            budgetMax:   { type: 'number', minimum: 0 },
            street:      { type: 'string', maxLength: 255 },
            city:        { type: 'string', maxLength: 100 },
            postalCode:  { type: 'string', maxLength: 20 },
            country:     { type: 'string', maxLength: 5 },
            skillIds:    { type: 'array', items: { type: 'integer' } },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id
      const {
        title, description,
        category    = null,
        urgency     = 'medium',
        budgetMin   = null,
        budgetMax   = null,
        street      = null,
        city        = null,
        postalCode  = null,
        country     = null,
        skillIds    = [],
      } = request.body

      const conn = await fastify.db.getConnection()
      try {
        await conn.query('START TRANSACTION')

        const result = await conn.query(
          `INSERT INTO repair_requests
             (user_id, title, description, category, urgency, budget_min, budget_max,
              street, city, postal_code, country)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, title, description, category, urgency, budgetMin, budgetMax,
           street, city, postalCode, country],
        )

        const requestId = Number(result.insertId)

        if (skillIds.length > 0) {
          const skillRows = skillIds.map(sid => [requestId, sid])
          await conn.query(
            'INSERT IGNORE INTO repair_request_skills (request_id, skill_id) VALUES ?',
            [skillRows],
          )
        }

        await conn.query('COMMIT')

        const [created] = await conn.query(
          `SELECT rr.*, u.username
           FROM   repair_requests rr
           JOIN   users u ON u.id = rr.user_id
           WHERE  rr.id = ?`,
          [requestId],
        )

        const req = mapRequest(created)
        req.skills = await loadSkills(conn, requestId)

        return reply.code(201).send(req)
      } catch (err) {
        await conn.query('ROLLBACK')
        throw err
      } finally {
        conn.release()
      }
    },
  )

  // ── PATCH /api/repairs/:id ─────────────────────────────────────────────────
  // Auth required: update own repair request
  fastify.patch(
    '/api/repairs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = request.user.id
      const conn   = await fastify.db.getConnection()
      try {
        const [existing] = await conn.query(
          'SELECT id, user_id FROM repair_requests WHERE id = ?',
          [id],
        )
        if (!existing) return reply.code(404).send({ message: 'Not found' })
        if (Number(existing.user_id) !== userId && request.user.role !== 'admin') {
          return reply.code(403).send({ message: 'Forbidden' })
        }

        const allowed = ['title', 'description', 'category', 'urgency', 'budgetMin', 'budgetMax',
                         'street', 'city', 'postalCode', 'country', 'status']

        const colMap = {
          title: 'title', description: 'description', category: 'category',
          urgency: 'urgency', budgetMin: 'budget_min', budgetMax: 'budget_max',
          street: 'street', city: 'city', postalCode: 'postal_code',
          country: 'country', status: 'status',
        }

        const fields = []
        const values = []

        for (const key of allowed) {
          if (request.body[key] !== undefined) {
            fields.push(`${colMap[key]} = ?`)
            values.push(request.body[key])
          }
        }

        if (fields.length > 0) {
          values.push(id)
          await conn.query(
            `UPDATE repair_requests SET ${fields.join(', ')} WHERE id = ?`,
            values,
          )
        }

        // Update skills if provided
        if (Array.isArray(request.body.skillIds)) {
          await conn.query('DELETE FROM repair_request_skills WHERE request_id = ?', [id])
          if (request.body.skillIds.length > 0) {
            const skillRows = request.body.skillIds.map(sid => [Number(id), sid])
            await conn.query(
              'INSERT IGNORE INTO repair_request_skills (request_id, skill_id) VALUES ?',
              [skillRows],
            )
          }
        }

        const [row] = await conn.query(
          `SELECT rr.*, u.username FROM repair_requests rr JOIN users u ON u.id = rr.user_id WHERE rr.id = ?`,
          [id],
        )
        const req = mapRequest(row)
        req.skills = await loadSkills(conn, req.id)

        return reply.send(req)
      } finally {
        conn.release()
      }
    },
  )

  // ── DELETE /api/repairs/:id ────────────────────────────────────────────────
  // Auth required: delete own repair request
  fastify.delete(
    '/api/repairs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = request.user.id
      const conn   = await fastify.db.getConnection()
      try {
        const [existing] = await conn.query(
          'SELECT id, user_id FROM repair_requests WHERE id = ?',
          [id],
        )
        if (!existing) return reply.code(404).send({ message: 'Not found' })
        if (Number(existing.user_id) !== userId && request.user.role !== 'admin') {
          return reply.code(403).send({ message: 'Forbidden' })
        }

        await conn.query('DELETE FROM repair_requests WHERE id = ?', [id])
        return reply.code(204).send()
      } finally {
        conn.release()
      }
    },
  )
}
