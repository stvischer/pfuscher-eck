export default async function userRoutes(fastify) {
  // ── GET /api/skills ──────────────────────────────────────────────────────
  fastify.get(
    '/api/skills',
    {
      schema: fastify.schema.controller.skill.list,
    },
    async (_request, reply) => {
      const skills = await fastify.controller.skill.listCatalog();
      reply.send(skills);
    },
  );

  // ── GET /api/user/:id ─────────────────────────────────────────────────────
  fastify.get(
    '/api/user/:id',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.get,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const user = await fastify.controller.user.getById(id);
      reply.send(user);
    },
  );

  // ── PATCH /api/user/:id ───────────────────────────────────────────────────
  fastify.patch(
    '/api/user/:id',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.patch,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { username, displayName, email, bio, phone } = request.body ?? {};
      const user = await fastify.controller.user.update(id, {
        username,
        displayName,
        email,
        bio,
        phone,
      });
      reply.send(user);
    },
  );

  // ── PUT /api/user/:id/skills ──────────────────────────────────────────────
  fastify.put(
    '/api/user/:id/skills',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.skills.update,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { skills } = request.body;
      const updatedSkills = await fastify.controller.skill.updateForUser(id, skills);
      reply.send(updatedSkills);
    },
  );

  // ── GET /api/user/:id/addresses ──────────────────────────────────────────
  fastify.get(
    '/api/user/:id/addresses',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.list,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const addresses = await fastify.controller.address.listForUser(id);
      reply.send(addresses);
    },
  );

  // ── POST /api/user/:id/addresses ─────────────────────────────────────────
  fastify.post(
    '/api/user/:id/addresses',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.create,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { addressType, radiusM, street, city, state, postalCode, country, lat, lon } =
        request.body ?? {};

      const { created, addresses } = await fastify.controller.address.upsert(id, {
        addressType,
        radiusM,
        street,
        city,
        state,
        postalCode,
        country,
        lat,
        lon,
      });

      reply.code(created ? 201 : 200).send(addresses);
    },
  );

  // ── PATCH /api/user/:id/addresses/:aid ───────────────────────────────────
  fastify.patch(
    '/api/user/:id/addresses/:aid',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.update,
    },
    async (request, reply) => {
      const { id, aid } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { addressType, radiusM, street, city, state, postalCode, country, lat, lon } =
        request.body ?? {};

      const addresses = await fastify.controller.address.update(id, aid, {
        addressType,
        radiusM,
        street,
        city,
        state,
        postalCode,
        country,
        lat,
        lon,
      });

      reply.send(addresses);
    },
  );

  // ── DELETE /api/user/:id/addresses/:aid ──────────────────────────────────
  fastify.delete(
    '/api/user/:id/addresses/:aid',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.delete,
    },
    async (request, reply) => {
      const { id, aid } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const addresses = await fastify.controller.address.delete(id, aid);
      reply.send(addresses);
    },
  );
}
