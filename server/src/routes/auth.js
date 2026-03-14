import bcrypt from 'bcryptjs';

export default async function authRoutes(fastify) {
  // ── Register ──────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/register',
    {
      schema: fastify.schema.controller.auth.register,
    },
    async (request, reply) => {
      const { username, email, password } = request.body;

      const { accessToken, refreshToken, user } = await fastify.controller.auth.register(
        username,
        email,
        password,
      );

      reply.code(201).send({ accessToken, refreshToken, user });
    },
  );

  // ── Login ─────────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/login',
    {
      schema: fastify.schema.controller.auth.login,
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const { accessToken, refreshToken, user } = await fastify.controller.auth.login(
        email,
        password,
      );

      reply.send({
        accessToken,
        refreshToken,
        user,
      });
    },
  );

  // ── Refresh ───────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/refresh',
    {
      schema: fastify.schema.controller.auth.refresh,
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const { accessToken, refreshToken: newRefreshToken } =
        await fastify.controller.auth.refresh(refreshToken);

      reply.send({ accessToken, refreshToken: newRefreshToken });
    },
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/logout',
    {
      schema: fastify.schema.controller.auth.logout,
    },
    async (request, reply) => {
      const { refreshToken } = request.body ?? {};
      await fastify.controller.auth.logout(refreshToken);
      reply.send({ message: 'Logged out' });
    },
  );

  // ── Change password ───────────────────────────────────────────────────────
  fastify.post(
    '/api/auth/change-password',
    {
      preHandler: [fastify.authenticate],
      schema: fastify.schema.controller.auth.change_password,
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      const userId = request.user.id;

      await fastify.controller.auth.changePassword(userId, currentPassword, newPassword);

      reply.send({ message: 'Password updated' });
    },
  );
}
