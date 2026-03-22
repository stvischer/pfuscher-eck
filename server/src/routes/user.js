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

  // ── GET /api/user/:id/address ────────────────────────────────────────────
  // Get the user's offer address (skill location)
  fastify.get(
    '/api/user/:id/address',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.list,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const address = await fastify.controller.address.getForUser(id);
      reply.send(address);
    },
  );

  // ── POST /api/user/:id/address ───────────────────────────────────────────
  // Create or update the user's offer address
  fastify.post(
    '/api/user/:id/address',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.create,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { radius, enabled, street, city, state, postalCode, country, lat, lon } = request.body;

      const { created, address } = await fastify.controller.address.upsertForUser(id, {
        radius,
        enabled,
        street,
        city,
        state,
        postalCode,
        country,
        lat,
        lon,
      });

      reply.code(created ? 201 : 200).send(address);
    },
  );

  // ── PATCH /api/user/:id/address ──────────────────────────────────────────
  // Update the user's offer address
  fastify.patch(
    '/api/user/:id/address',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.update,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      const { radius, enabled, street, city, state, postalCode, country, lat, lon } = request.body;

      const address = await fastify.controller.address.updateForUser(id, {
        radius,
        enabled,
        street,
        city,
        state,
        postalCode,
        country,
        lat,
        lon,
      });

      reply.send(address);
    },
  );

  // ── DELETE /api/user/:id/address ─────────────────────────────────────────
  // Delete the user's offer address
  fastify.delete(
    '/api/user/:id/address',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.user.addresses.delete,
    },
    async (request, reply) => {
      const { id } = request.params;
      if (id !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

      await fastify.controller.address.deleteForUser(id);
      reply.code(204).send();
    },
  );
}
