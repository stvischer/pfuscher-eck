export default async function usersRoutes(fastify) {

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Load all skills for a user from user_skills + cnf_skills. */
  async function loadSkills(conn, userId) {
    const rows = await conn.query(
      `SELECT cs.id AS skill_id, cs.name, p.name AS category, us.level
       FROM   user_skills us
       JOIN   cnf_skills  cs ON cs.id = us.skill_id
       LEFT JOIN cnf_skills p  ON p.id  = cs.parent_id
       WHERE  us.user_id = ?
       ORDER  BY p.name, cs.name`,
      [userId],
    )
    return rows.map(r => ({
      skillId:  Number(r.skill_id),
      name:     r.name,
      category: r.category ?? null,
      level:    r.level,
    }))
  }

  /** Load all addresses for a user and return them as plain objects. */
  async function loadAddresses(conn, userId) {
    const rows = await conn.query(
      `SELECT
         ua.id           AS relation_id,
         ua.address_type,
         ua.radius_m,
         a.id            AS address_id,
         a.street,
         a.city,
         a.state,
         a.postal_code,
         a.country,
         ST_Y(a.location) AS lat,
         ST_X(a.location) AS lon
       FROM   user_addresses ua
       JOIN   addresses a ON a.id = ua.address_id
       WHERE  ua.user_id = ?
       ORDER  BY ua.id`,
      [userId],
    )
    return rows.map(mapAddress)
  }

  /** Upsert a single address + its user_addresses relation row. */
  async function upsertAddress(conn, userId, { addressType = 'home', radiusM, street, city, state, postalCode, country, lat, lon }) {
    const [existing] = await conn.query(
      'SELECT ua.id AS rel_id, ua.address_id FROM user_addresses ua WHERE ua.user_id = ? AND ua.address_type = ? LIMIT 1',
      [userId, addressType],
    )

    if (existing) {
      // Only touch columns that were explicitly supplied — never overwrite with NULL
      // unless the caller deliberately sent null.
      const addrFields = []
      const addrValues = []
      if (street     !== undefined) { addrFields.push('street = ?');      addrValues.push(street || null) }
      if (city       !== undefined) { addrFields.push('city = ?');        addrValues.push(city || null) }
      if (state      !== undefined) { addrFields.push('state = ?');       addrValues.push(state || null) }
      if (postalCode !== undefined) { addrFields.push('postal_code = ?'); addrValues.push(postalCode || null) }
      if (country    !== undefined) { addrFields.push('country = ?');     addrValues.push(country || null) }
      // Update geometry only when at least one coordinate was supplied
      if (lat !== undefined || lon !== undefined) {
        addrFields.push(
          lat != null && lon != null
            ? `location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
            : 'location = NULL',
        )
      }
      if (addrFields.length > 0) {
        addrValues.push(existing.address_id)
        await conn.query(`UPDATE addresses SET ${addrFields.join(', ')} WHERE id = ?`, addrValues)
      }
      if (radiusM !== undefined) {
        await conn.query('UPDATE user_addresses SET radius_m = ? WHERE id = ?', [radiusM ?? null, existing.rel_id])
      }
      return false // updated
    } else {
      // New record — initialise all columns (NULL for anything not provided)
      const locationExpr = (lat != null && lon != null)
        ? `ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
        : 'NULL'
      const res = await conn.query(
        `INSERT INTO addresses (street, city, state, postal_code, country, location)
         VALUES (?, ?, ?, ?, ?, ${locationExpr})`,
        [street ?? null, city ?? null, state ?? null, postalCode ?? null, country ?? null],
      )
      await conn.query(
        'INSERT INTO user_addresses (user_id, address_id, address_type, radius_m) VALUES (?, ?, ?, ?)',
        [userId, Number(res.insertId), addressType, radiusM ?? null],
      )
      return true // created
    }
  }

  // ── GET /api/skills ──────────────────────────────────────────────────────
  fastify.get(
    '/api/skills',
    async (_request, reply) => {
      const conn = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          `SELECT cs.id, cs.name, p.name AS category
           FROM   cnf_skills cs
           LEFT JOIN cnf_skills p ON p.id = cs.parent_id
           WHERE  cs.parent_id IS NOT NULL
           ORDER  BY p.name, cs.name`,
        )
        reply.send(rows.map(r => ({ id: Number(r.id), name: r.name, category: r.category ?? null })))
      } finally {
        conn.release()
      }
    },
  )

  // ── GET /api/users/:id ─────────────────────────────────────────────────────
  fastify.get(
    '/api/users/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer', minimum: 1 } },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const conn = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          'SELECT id, username, display_name, email, role, bio, phone, created_at FROM users WHERE id = ? LIMIT 1',
          [id],
        )
        if (!rows[0]) return reply.code(404).send({ message: 'User not found' })
        const [addresses, skills] = await Promise.all([
          fastify.entity.user.loadAddresses(id),
          loadSkills(conn, id),
        ])
        reply.send(mapUser(rows[0], addresses, skills))
      } finally {
        conn.release()
      }
    },
  )

  // ── PATCH /api/users/:id ───────────────────────────────────────────────────
  // Updates profile fields only (username, displayName, email, bio, phone,
  // skills).  Address data is managed via /api/users/:id/addresses.
  fastify.patch(
    '/api/users/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer', minimum: 1 } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            username:    { type: 'string', minLength: 3, maxLength: 50 },
            displayName: { type: 'string', maxLength: 100 },
            email:       { type: 'string', format: 'email' },
            bio:         { type: 'string', maxLength: 1000 },
            phone:       { type: 'string', maxLength: 30 },
            skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skillId: { type: 'integer', minimum: 1 },
                  level:   { type: 'string', enum: ['beginner', 'intermediate', 'expert'] },
                },
                required: ['skillId'],
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const { username, displayName, email, bio, phone, skills } = request.body ?? {}

      if ([username, displayName, email, bio, phone, skills].every(v => v === undefined)) {
        return reply.code(400).send({ message: 'Nothing to update' })
      }

      const conn = await fastify.db.getConnection()
      try {
        if (username !== undefined || email !== undefined) {
          const conflict = await conn.query(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
            [username ?? '', email ?? '', id],
          )
          if (conflict.length > 0) {
            return reply.code(409).send({ message: 'Username or email already in use' })
          }
        }

        const fields = []
        const values = []
        if (username    !== undefined) { fields.push('username = ?');     values.push(username) }
        if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName || null) }
        if (email       !== undefined) { fields.push('email = ?');        values.push(email) }
        if (bio         !== undefined) { fields.push('bio = ?');          values.push(bio || null) }
        if (phone       !== undefined) { fields.push('phone = ?');        values.push(phone || null) }
        values.push(id)

        if (fields.length > 0) {
          await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
        }

        if (skills !== undefined) {
          await conn.query('DELETE FROM user_skills WHERE user_id = ?', [id])
          for (const s of skills) {
            await conn.query(
              'INSERT INTO user_skills (user_id, skill_id, level) VALUES (?, ?, ?)',
              [id, s.skillId, s.level ?? 'beginner'],
            )
          }
        }

        const rows = await conn.query(
          'SELECT id, username, display_name, email, role, bio, phone, created_at FROM users WHERE id = ? LIMIT 1',
          [id],
        )
        const [addresses, userSkills] = await Promise.all([
          loadAddresses(conn, id),
          loadSkills(conn, id),
        ])
        reply.send(mapUser(rows[0], addresses, userSkills))
      } finally {
        conn.release()
      }
    },
  )

  // ── GET /api/users/:id/addresses ──────────────────────────────────────────
  fastify.get(
    '/api/users/:id/addresses',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer', minimum: 1 } },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const conn = await fastify.db.getConnection()
      try {
        reply.send(await loadAddresses(conn, id))
      } finally {
        conn.release()
      }
    },
  )

  // ── POST /api/users/:id/addresses ─────────────────────────────────────────
  fastify.post(
    '/api/users/:id/addresses',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer', minimum: 1 } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            addressType: { type: 'string', maxLength: 50 },
            radiusM:     { type: ['integer', 'null'], minimum: 0 },
            street:      { type: 'string', maxLength: 255 },
            city:        { type: 'string', maxLength: 100 },
            state:       { type: 'string', maxLength: 100 },
            postalCode:  { type: 'string', maxLength: 20 },
            country:     { type: 'string', maxLength: 100 },
            lat:         { type: ['number', 'null'] },
            lon:         { type: ['number', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const { addressType = 'home', radiusM, street, city, state, postalCode, country, lat, lon } = request.body ?? {}

      const conn = await fastify.db.getConnection()
      try {
        const created = await upsertAddress(conn, id, { addressType, radiusM, street, city, state, postalCode, country, lat, lon })
        reply.code(created ? 201 : 200).send(await loadAddresses(conn, id))
      } finally {
        conn.release()
      }
    },
  )

  // ── PATCH /api/users/:id/addresses/:aid ───────────────────────────────────
  // :aid is user_addresses.id (the relation row id)
  fastify.patch(
    '/api/users/:id/addresses/:aid',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: {
            id:  { type: 'integer', minimum: 1 },
            aid: { type: 'integer', minimum: 1 },
          },
          required: ['id', 'aid'],
        },
        body: {
          type: 'object',
          properties: {
            addressType: { type: 'string', maxLength: 50 },
            radiusM:     { type: ['integer', 'null'], minimum: 0 },
            street:      { type: 'string', maxLength: 255 },
            city:        { type: 'string', maxLength: 100 },
            state:       { type: 'string', maxLength: 100 },
            postalCode:  { type: 'string', maxLength: 20 },
            country:     { type: 'string', maxLength: 100 },
            lat:         { type: ['number', 'null'] },
            lon:         { type: ['number', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const id  = request.params.id
      const aid = request.params.aid
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const conn = await fastify.db.getConnection()
      try {
        const [rel] = await conn.query(
          'SELECT ua.id, ua.address_id FROM user_addresses ua WHERE ua.id = ? AND ua.user_id = ? LIMIT 1',
          [aid, id],
        )
        if (!rel) return reply.code(404).send({ message: 'Address not found' })

        const { addressType, radiusM, street, city, state, postalCode, country, lat, lon } = request.body ?? {}

        const addrFields = []
        const addrValues = []
        if (street     !== undefined) { addrFields.push('street = ?');      addrValues.push(street || null) }
        if (city       !== undefined) { addrFields.push('city = ?');        addrValues.push(city || null) }
        if (state      !== undefined) { addrFields.push('state = ?');       addrValues.push(state || null) }
        if (postalCode !== undefined) { addrFields.push('postal_code = ?'); addrValues.push(postalCode || null) }
        if (country    !== undefined) { addrFields.push('country = ?');     addrValues.push(country || null) }
        if (lat !== undefined && lon !== undefined) {
          addrFields.push(
            lat != null && lon != null
              ? `location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
              : 'location = NULL',
          )
        }
        if (addrFields.length > 0) {
          addrValues.push(rel.address_id)
          await conn.query(`UPDATE addresses SET ${addrFields.join(', ')} WHERE id = ?`, addrValues)
        }

        const relFields = []
        const relValues = []
        if (addressType !== undefined) { relFields.push('address_type = ?'); relValues.push(addressType) }
        if (radiusM     !== undefined) { relFields.push('radius_m = ?');     relValues.push(radiusM ?? null) }
        if (relFields.length > 0) {
          relValues.push(rel.id)
          await conn.query(`UPDATE user_addresses SET ${relFields.join(', ')} WHERE id = ?`, relValues)
        }

        reply.send(await loadAddresses(conn, id))
      } finally {
        conn.release()
      }
    },
  )

  // ── DELETE /api/users/:id/addresses/:aid ──────────────────────────────────
  fastify.delete(
    '/api/users/:id/addresses/:aid',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: {
            id:  { type: 'integer', minimum: 1 },
            aid: { type: 'integer', minimum: 1 },
          },
          required: ['id', 'aid'],
        },
      },
    },
    async (request, reply) => {
      const id  = request.params.id
      const aid = request.params.aid
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' })

      const conn = await fastify.db.getConnection()
      try {
        const [rel] = await conn.query(
          'SELECT ua.id, ua.address_id FROM user_addresses ua WHERE ua.id = ? AND ua.user_id = ? LIMIT 1',
          [aid, id],
        )
        if (!rel) return reply.code(404).send({ message: 'Address not found' })

        await conn.query('DELETE FROM user_addresses WHERE id = ?', [rel.id])
        await conn.query('DELETE FROM addresses WHERE id = ?', [rel.address_id])

        reply.send(await loadAddresses(conn, id))
      } finally {
        conn.release()
      }
    },
  )
}

// ── mappers ──────────────────────────────────────────────────────────────────

function mapUser(u, addresses = [], skills = []) {
  return {
    id:          Number(u.id),
    username:    u.username,
    displayName: u.display_name ?? null,
    email:       u.email,
    role:        u.role,
    bio:         u.bio   ?? null,
    phone:       u.phone ?? null,
    skills,
    addresses,
    createdAt:   u.created_at,
  }
}

function mapAddress(r) {
  return {
    id:          Number(r.relation_id),
    addressId:   Number(r.address_id),
    addressType: r.address_type,
    radiusM:     r.radius_m != null ? Number(r.radius_m) : null,
    street:      r.street      ?? null,
    city:        r.city        ?? null,
    state:       r.state       ?? null,
    postalCode:  r.postal_code ?? null,
    country:     r.country     ?? null,
    lat:         r.lat  != null ? Number(r.lat)  : null,
    lon:         r.lon  != null ? Number(r.lon)  : null,
  }
}
