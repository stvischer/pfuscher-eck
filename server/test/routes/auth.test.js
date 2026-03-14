import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fastify from 'fastify';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import authRoutes from '../../src/routes/auth.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const FAKE_TOKENS = {
  accessToken: 'access.token.fake',
  refreshToken: 'refresh-token-fake',
};

const FAKE_USER = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };

/**
 * Builds a minimal Fastify instance with the auth controller and schemas
 * stubbed out, then registers the auth routes.
 *
 * @param {object} controllerOverrides - Methods to override on the stub controller.
 */
async function buildTestApp(controllerOverrides = {}) {
  const app = fastify({ logger: false });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const controller = {
    register: async () => ({ ...FAKE_TOKENS, user: FAKE_USER }),
    login: async () => ({ ...FAKE_TOKENS, user: FAKE_USER }),
    refresh: async () => FAKE_TOKENS,
    logout: async () => {},
    changePassword: async () => {},
    ...controllerOverrides,
  };

  // Stub the schema decorator – use pass-through zod schemas matching each route
  const { z } = await import('zod');
  const anyObj = z.object({}).passthrough();
  const tokenResponse = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  });

  app.decorate('controller', { auth: controller });
  app.decorate('schema', {
    controller: {
      auth: {
        register: {
          body: anyObj,
          response: {
            201: z.object({ accessToken: z.string(), refreshToken: z.string(), user: anyObj }),
          },
        },
        login: {
          body: anyObj,
          response: {
            200: z.object({ accessToken: z.string(), refreshToken: z.string(), user: anyObj }),
          },
        },
        refresh: { body: anyObj, response: { 200: tokenResponse } },
        logout: { body: anyObj.optional(), response: { 200: z.object({ message: z.string() }) } },
        change_password: { body: anyObj, response: { 200: z.object({ message: z.string() }) } },
      },
    },
  });

  // Stub authenticate preHandler
  app.decorate('authenticate', async (request) => {
    request.user = { id: 1 };
  });

  await app.register(authRoutes);
  await app.ready();

  return app;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 201 with tokens and user on success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'testuser', email: 'test@example.com', password: 'password123' },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.accessToken, FAKE_TOKENS.accessToken);
    assert.equal(body.refreshToken, FAKE_TOKENS.refreshToken);
    assert.deepEqual(body.user, FAKE_USER);
  });

  it('returns 409 when controller throws 409', async () => {
    const app409 = await buildTestApp({
      register: async () => {
        const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
        throw new ApiError(409, 'Username or email already in use');
      },
    });
    after(() => app409.close());

    const res = await app409.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'taken', email: 'taken@example.com', password: 'password123' },
    });

    assert.equal(res.statusCode, 409);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 200 with tokens and user on success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.accessToken, FAKE_TOKENS.accessToken);
    assert.equal(body.refreshToken, FAKE_TOKENS.refreshToken);
    assert.deepEqual(body.user, FAKE_USER);
  });

  it('returns 401 when controller throws 401', async () => {
    const app401 = await buildTestApp({
      login: async () => {
        const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
        throw new ApiError(401, 'Invalid credentials');
      },
    });
    after(() => app401.close());

    const res = await app401.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'wrong@example.com', password: 'wrongpass' },
    });

    assert.equal(res.statusCode, 401);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 200 with new tokens on success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'old-refresh-token' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.accessToken, FAKE_TOKENS.accessToken);
    assert.equal(body.refreshToken, FAKE_TOKENS.refreshToken);
  });

  it('returns 401 when token is invalid or expired', async () => {
    const app401 = await buildTestApp({
      refresh: async () => {
        const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
        throw new ApiError(401, 'Refresh token invalid or expired');
      },
    });
    after(() => app401.close());

    const res = await app401.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'expired-token' },
    });

    assert.equal(res.statusCode, 401);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 200 with logout message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken: 'some-refresh-token' },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().message, 'Logged out');
  });

  it('returns 200 with no body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: {},
    });

    assert.equal(res.statusCode, 200);
  });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────

describe('POST /api/auth/change-password', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 200 on success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      payload: { currentPassword: 'oldpass123', newPassword: 'newpass456' },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().message, 'Password updated');
  });

  it('returns 401 when current password is wrong', async () => {
    const app401 = await buildTestApp({
      changePassword: async () => {
        const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
        throw new ApiError(401, 'Current password is incorrect');
      },
    });
    after(() => app401.close());

    const res = await app401.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      payload: { currentPassword: 'wrong', newPassword: 'newpass456' },
    });

    assert.equal(res.statusCode, 401);
  });

  it('returns 404 when user does not exist', async () => {
    const app404 = await buildTestApp({
      changePassword: async () => {
        const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
        throw new ApiError(404, 'User not found');
      },
    });
    after(() => app404.close());

    const res = await app404.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      payload: { currentPassword: 'oldpass123', newPassword: 'newpass456' },
    });

    assert.equal(res.statusCode, 404);
  });
});
