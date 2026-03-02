export default async function configRoutes(fastify) {
  // ── GET /api/config ────────────────────────────────────────────────────────
  // Returns public lookup data: countries (flat) + skills (tree).
  // No authentication required — used for form dropdowns etc.
  fastify.get('/api/config', async (_request, reply) => {
    const conn = await fastify.db.getConnection()
    try {
      const [countryRows, skillRows] = await Promise.all([
        conn.query(
          'SELECT id, iso2, iso3, name, phone_code FROM cnf_countries ORDER BY name',
        ),
        conn.query(
          'SELECT id, name, slug, parent_id FROM cnf_skills ORDER BY parent_id, id',
        ),
      ])

      // ── Countries ──────────────────────────────────────────────────────────
      const countries = countryRows.map(r => ({
        id:        Number(r.id),
        iso2:      r.iso2,
        iso3:      r.iso3,
        name:      r.name,
        phoneCode: r.phone_code,
      }))

      // ── Skills tree ────────────────────────────────────────────────────────
      // Build an id-keyed map first, then wire up children arrays.
      const skillMap = new Map()
      for (const r of skillRows) {
        skillMap.set(Number(r.id), {
          id:       Number(r.id),
          name:     r.name,
          slug:     r.slug,
          children: [],
        })
      }

      const skillTree = []
      for (const r of skillRows) {
        const node = skillMap.get(Number(r.id))
        if (r.parent_id == null) {
          skillTree.push(node)
        } else {
          const parent = skillMap.get(Number(r.parent_id))
          if (parent) parent.children.push(node)
        }
      }

      reply.send({ countries, skills: skillTree })
    } finally {
      conn.release()
    }
  })
}
