export default async function repairsRoutes(fastify) {
  // ── helpers ────────────────────────────────────────────────────────────────

  async function loadSkills(conn, requestId) {
    const rows = await conn.query(
      `SELECT cs.id, cs.name, p.name AS category
       FROM   repair_skills rs
       JOIN   cnf_skills cs ON cs.id = rs.skill_id
       LEFT JOIN cnf_skills p ON p.id = cs.parent_id
       WHERE  rs.request_id = ?
       ORDER  BY p.name, cs.name`,
      [requestId],
    );
    return rows.map((r) => ({ id: Number(r.id), name: r.name, category: r.category ?? null }));
  }

  async function loadAddress(conn, requestId) {
    const [row] = await conn.query(
      `SELECT id, street, city, state, postal_code, country, radius, enabled,
              ST_Y(location) AS lat, ST_X(location) AS lon
       FROM   address
       WHERE  type = 'request' AND entity_id = ?
       LIMIT  1`,
      [requestId],
    );
    if (!row) return null;
    return {
      id: Number(row.id),
      street: row.street ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      postalCode: row.postal_code ?? null,
      country: row.country ?? null,
      radius: Number(row.radius),
      enabled: row.enabled === 1,
      lat: row.lat != null ? Number(row.lat) : null,
      lon: row.lon != null ? Number(row.lon) : null,
    };
  }

  function mapRequest(r) {
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      username: r.username ?? null,
      title: r.title,
      description: r.description,
      category: r.category ?? null,
      status: r.status,
      isActive: r.is_active !== 0,
      address: null, // populated via loadAddress()
      skills: [], // populated via loadSkills()
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ── GET /api/repair ───────────────────────────────────────────────────────
  // Public: browse open repair requests
  fastify.get('/api/repair', async (request, reply) => {
    const { status = 'open', category, limit = 50, offset = 0 } = request.query;

    const conn = await fastify.db.getConnection();
    try {
      const conditions = [];
      const params = [];

      // Public listing only shows active requests
      conditions.push('rr.is_active = 1');

      if (status) {
        conditions.push('rr.status = ?');
        params.push(status);
      }
      if (category) {
        conditions.push('rr.category = ?');
        params.push(category);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await conn.query(
        `SELECT rr.*, u.username
         FROM   repair rr
         JOIN   user u ON u.id = rr.user_id
         ${where}
         ORDER  BY rr.created_at DESC
         LIMIT  ? OFFSET ?`,
        [...params, Number(limit), Number(offset)],
      );

      const requests = rows.map(mapRequest);

      for (const req of requests) {
        req.address = await loadAddress(conn, req.id);
        req.skills = await loadSkills(conn, req.id);
      }

      return reply.send(requests);
    } finally {
      conn.release();
    }
  });

  // ── GET /api/repair/mine ──────────────────────────────────────────────────
  // Auth required: current user's own requests
  fastify.get(
    '/api/repair/mine',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.id;
      const conn = await fastify.db.getConnection();
      try {
        const rows = await conn.query(
          `SELECT rr.*, u.username
           FROM   repair rr
           JOIN   user u ON u.id = rr.user_id
           WHERE  rr.user_id = ?
           ORDER  BY rr.created_at DESC`,
          [userId],
        );

        const requests = rows.map(mapRequest);
        for (const req of requests) {
          req.address = await loadAddress(conn, req.id);
          req.skills = await loadSkills(conn, req.id);
        }

        return reply.send(requests);
      } finally {
        conn.release();
      }
    },
  );

  // ── GET /api/repair/:id ───────────────────────────────────────────────────
  fastify.get('/api/repair/:id', async (request, reply) => {
    const { id } = request.params;
    const conn = await fastify.db.getConnection();
    try {
      const [row] = await conn.query(
        `SELECT rr.*, u.username
         FROM   repair rr
         JOIN   user u ON u.id = rr.user_id
         WHERE  rr.id = ?`,
        [id],
      );

      if (!row) return reply.code(404).send({ message: 'Not found' });

      const req = mapRequest(row);
      req.address = await loadAddress(conn, req.id);
      req.skills = await loadSkills(conn, req.id);

      return reply.send(req);
    } finally {
      conn.release();
    }
  });

  // ── POST /api/repair ──────────────────────────────────────────────────────
  // Auth required: create a new repair request
  fastify.post(
    '/api/repair',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title: { type: 'string', minLength: 3, maxLength: 255 },
            description: { type: 'string', minLength: 10 },
            category: { type: 'string', maxLength: 100 },
            street: { type: 'string', maxLength: 255 },
            city: { type: 'string', maxLength: 100 },
            state: { type: 'string', maxLength: 100 },
            postalCode: { type: 'string', maxLength: 20 },
            country: { type: 'string', maxLength: 100 },
            lat: { type: 'number' },
            lon: { type: 'number' },
            radius: { type: 'integer', minimum: 0, default: 20 },
            skillIds: { type: 'array', items: { type: 'integer' } },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const {
        title,
        description,
        category = null,
        street = null,
        city = null,
        state = null,
        postalCode = null,
        country = null,
        lat = null,
        lon = null,
        radius = 20,
        skillIds = [],
      } = request.body;

      const conn = await fastify.db.getConnection();
      try {
        await conn.query('START TRANSACTION');

        // Insert the lean request row
        const result = await conn.query(
          `INSERT INTO repair (user_id, title, description, category)
           VALUES (?, ?, ?, ?)`,
          [userId, title, description, category],
        );

        const requestId = Number(result.insertId);

        // Insert address directly with type='request' and entity_id=requestId
        if (lat != null && lon != null) {
          await conn.query(
            `INSERT INTO address (type, entity_id, street, city, state, postal_code, country, radius, enabled, hash, location)
             VALUES ('request', ?, ?, ?, ?, ?, ?, ?, 1, ST_GeoHash(?, ?, 12), ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326))`,
            [requestId, street, city, state, postalCode, country, radius, Number(lon), Number(lat)],
          );
        } else {
          await conn.query(
            `INSERT INTO address (type, entity_id, street, city, state, postal_code, country, radius, enabled)
             VALUES ('request', ?, ?, ?, ?, ?, ?, ?, 1)`,
            [requestId, street, city, state, postalCode, country, radius],
          );
        }

        // Insert skills
        if (skillIds.length > 0) {
          const placeholders = skillIds.map(() => '(?, ?)').join(', ');
          const params = skillIds.flatMap((sid) => [requestId, sid]);
          await conn.query(
            `INSERT IGNORE INTO repair_skills (request_id, skill_id) VALUES ${placeholders}`,
            params,
          );
        }

        await conn.query('COMMIT');

        const [created] = await conn.query(
          `SELECT rr.*, u.username
           FROM   repair rr
           JOIN   user u ON u.id = rr.user_id
           WHERE  rr.id = ?`,
          [requestId],
        );

        const req = mapRequest(created);
        req.address = await loadAddress(conn, requestId);
        req.skills = await loadSkills(conn, requestId);

        return reply.code(201).send(req);
      } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
      } finally {
        conn.release();
      }
    },
  );

  // ── PATCH /api/repair/:id ─────────────────────────────────────────────────
  // Auth required: update own repair request
  fastify.patch(
    '/api/repair/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.id;
      const conn = await fastify.db.getConnection();
      try {
        const [existing] = await conn.query('SELECT id, user_id FROM repair WHERE id = ?', [id]);
        if (!existing) return reply.code(404).send({ message: 'Not found' });
        if (Number(existing.user_id) !== userId && request.user.role !== 'admin') {
          return reply.code(403).send({ message: 'Forbidden' });
        }

        const allowed = ['title', 'description', 'category', 'status', 'isActive'];

        const colMap = {
          title: 'title',
          description: 'description',
          category: 'category',
          status: 'status',
          isActive: 'is_active',
        };

        const fields = [];
        const values = [];

        for (const key of allowed) {
          if (request.body[key] !== undefined) {
            fields.push(`${colMap[key]} = ?`);
            values.push(request.body[key]);
          }
        }

        if (fields.length > 0) {
          values.push(id);
          await conn.query(`UPDATE repair SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        // Update address if provided (update directly by type + entity_id)
        const addrFields = ['street', 'city', 'state', 'postalCode', 'country', 'radius'];
        const addrColMap = {
          street: 'street',
          city: 'city',
          state: 'state',
          postalCode: 'postal_code',
          country: 'country',
          radius: 'radius',
        };
        const addrUpdates = [];
        const addrValues = [];
        for (const key of addrFields) {
          if (request.body[key] !== undefined) {
            addrUpdates.push(`${addrColMap[key]} = ?`);
            addrValues.push(request.body[key]);
          }
        }
        // lat/lon → geometry column + hash
        const { lat, lon } = request.body;
        if (lat != null && lon != null) {
          addrUpdates.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
          addrUpdates.push('hash = ST_GeoHash(?, ?, 12)');
          addrValues.push(Number(lon), Number(lat));
        }
        if (addrUpdates.length > 0) {
          addrValues.push(id);
          await conn.query(
            `UPDATE address SET ${addrUpdates.join(', ')} WHERE type = 'request' AND entity_id = ?`,
            addrValues,
          );
        }

        // Update skills if provided
        if (Array.isArray(request.body.skillIds)) {
          await conn.query('DELETE FROM repair_skills WHERE request_id = ?', [id]);
          if (request.body.skillIds.length > 0) {
            const placeholders = request.body.skillIds.map(() => '(?, ?)').join(', ');
            const params = request.body.skillIds.flatMap((sid) => [Number(id), sid]);
            await conn.query(
              `INSERT IGNORE INTO repair_skills (request_id, skill_id) VALUES ${placeholders}`,
              params,
            );
          }
        }

        const [row] = await conn.query(
          `SELECT rr.*, u.username FROM repair rr JOIN user u ON u.id = rr.user_id WHERE rr.id = ?`,
          [id],
        );
        const req = mapRequest(row);
        req.address = await loadAddress(conn, req.id);
        req.skills = await loadSkills(conn, req.id);

        return reply.send(req);
      } finally {
        conn.release();
      }
    },
  );

  // ── DELETE /api/repair/:id ────────────────────────────────────────────────
  // Auth required: delete own repair request
  fastify.delete(
    '/api/repair/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.id;
      const conn = await fastify.db.getConnection();
      try {
        const [existing] = await conn.query('SELECT id, user_id FROM repair WHERE id = ?', [id]);
        if (!existing) return reply.code(404).send({ message: 'Not found' });
        if (Number(existing.user_id) !== userId && request.user.role !== 'admin') {
          return reply.code(403).send({ message: 'Forbidden' });
        }

        await conn.query('DELETE FROM repair WHERE id = ?', [id]);
        return reply.code(204).send();
      } finally {
        conn.release();
      }
    },
  );

  fastify.post(
    '/api/repair/:id/enable',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {},
  );
  fastify.post(
    '/api/repair/:id/disable',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {},
  );
}
