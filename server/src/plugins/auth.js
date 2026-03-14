import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async function authPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: fastify.config.auth.jwt_secret,
  });

  /**
   * Prehandler: verifies the JWT from the Authorization: Bearer header.
   * Usage: { preHandler: [fastify.authenticate] }
   */
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  /**
   * Prehandler: verifies the JWT and requires the user to have the 'admin' role.
   */
  fastify.decorate('authorizeAdmin', async function (request, reply) {
    try {
      await request.jwtVerify();
      if (request.user?.role !== 'admin') {
        reply.code(403).send({ message: 'Forbidden' });
      }
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });
});
