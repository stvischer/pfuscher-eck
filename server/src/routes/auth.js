import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'

function sha256(str) {
  return createHash('sha256').update(str).digest('hex')
}

function generateRefreshToken() {
  return randomBytes(40).toString('hex')
}

async function issueTokens(fastify, conn, userId, role) {
  const accessToken = fastify.jwt.sign(
    { id: userId, role },
    { expiresIn: '15m' },
  )

  const rawRefresh = generateRefreshToken()
  const tokenHash  = sha256(rawRefresh)
  const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await conn.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt],
  )

  return { accessToken, refreshToken: rawRefresh }
}

export default async function authRoutes(fastify) {
  // ── Register ──────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email:    { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, email, password } = request.body

      const conn = await fastify.db.getConnection()
      try {
        const existing = await conn.query(
          'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
          [email, username],
        )
        if (existing.length > 0) {
          return reply.code(409).send({ message: 'Username or email already in use' })
        }

        const hash   = await bcrypt.hash(password, 12)
        const result = await conn.query(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hash],
        )
        const userId = Number(result.insertId)

        const { accessToken, refreshToken } = await issueTokens(fastify, conn, userId, 'user')

        reply.code(201).send({
          accessToken,
          refreshToken,
          user: { id: userId, username, email, role: 'user' },
        })
      } finally {
        conn.release()
      }
    },
  )

  // ── Login ─────────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const conn = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          'SELECT id, username, email, password, role FROM users WHERE email = ? LIMIT 1',
          [email],
        )
        const user = rows[0]

        if (!user || !(await bcrypt.compare(password, user.password))) {
          return reply.code(401).send({ message: 'Invalid credentials' })
        }

        const userId = Number(user.id)
        const { accessToken, refreshToken } = await issueTokens(fastify, conn, userId, user.role)

        reply.send({
          accessToken,
          refreshToken,
          user: { id: userId, username: user.username, email: user.email, role: user.role },
        })
      } finally {
        conn.release()
      }
    },
  )

  // ── Refresh ───────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body
      const tokenHash = sha256(refreshToken)

      const conn = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          `SELECT rt.id, rt.user_id, rt.expires_at, u.role
           FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           WHERE rt.token_hash = ? LIMIT 1`,
          [tokenHash],
        )
        const stored = rows[0]

        if (!stored || new Date(stored.expires_at) < new Date()) {
          if (stored) await conn.query('DELETE FROM refresh_tokens WHERE id = ?', [stored.id])
          return reply.code(401).send({ message: 'Refresh token invalid or expired' })
        }

        // Rotate: delete old, issue new pair
        await conn.query('DELETE FROM refresh_tokens WHERE id = ?', [stored.id])

        const userId = Number(stored.user_id)
        const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
          fastify, conn, userId, stored.role,
        )

        reply.send({ accessToken, refreshToken: newRefreshToken })
      } finally {
        conn.release()
      }
    },
  )

  // ── Logout ────────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/logout',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body ?? {}
      if (refreshToken) {
        const tokenHash = sha256(refreshToken)
        const conn = await fastify.db.getConnection()
        try {
          await conn.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash])
        } finally {
          conn.release()
        }
      }
      reply.send({ message: 'Logged out' })
    },
  )

  // ── Me ────────────────────────────────────────────────────────────────────
  fastify.get(
    '/api/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const conn = await fastify.db.getConnection()
      try {
        const rows = await conn.query(
          'SELECT id, username, email, role, created_at FROM users WHERE id = ? LIMIT 1',
          [request.user.id],
        )
        if (!rows[0]) return reply.code(404).send({ message: 'User not found' })

        const u = rows[0]
        reply.send({ id: Number(u.id), username: u.username, email: u.email, role: u.role, createdAt: u.created_at })
      } finally {
        conn.release()
      }
    },
  )
}

