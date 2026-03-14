import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fastify from 'fastify';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import userRoutes from '../../src/routes/user.js';

// ── fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 1,
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  role: 'user',
  bio: 'A test user',
  phone: '+1234567890',
  skills: [{ skillId: 1, name: 'JavaScript', category: 'Programming', level: 'expert' }],
  addresses: [
    {
      id: 1,
      addressId: 1,
      addressType: 'home',
      radiusM: 5000,
      street: '123 Main St',
      city: 'Berlin',
      state: null,
      postalCode: '10115',
      country: 'Germany',
      lat: 52.52,
      lon: 13.405,
    },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
};

const FAKE_SKILLS = [
  { id: 1, name: 'JavaScript', category: 'Programming' },
  { id: 2, name: 'TypeScript', category: 'Programming' },
];

const FAKE_USER_SKILLS = [
  { skillId: 1, name: 'JavaScript', category: 'Programming', level: 'expert' },
];

const FAKE_ADDRESSES = [
  {
    id: 1,
    addressId: 1,
    addressType: 'home',
    radiusM: 5000,
    street: '123 Main St',
    city: 'Berlin',
    state: null,
    postalCode: '10115',
    country: 'Germany',
    lat: 52.52,
    lon: 13.405,
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a minimal Fastify instance with user, address, and skill controllers stubbed out.
 *
 * @param {object} opts
 * @param {object} [opts.userOverrides] - Methods to override on the user controller.
 * @param {object} [opts.addressOverrides] - Methods to override on the address controller.
 * @param {object} [opts.skillOverrides] - Methods to override on the skill controller.
 * @param {number} [opts.authenticatedUserId=1] - The user ID returned by authenticate.
 */
async function buildTestApp({
  userOverrides = {},
  addressOverrides = {},
  skillOverrides = {},
  authenticatedUserId = 1,
} = {}) {
  const app = fastify({ logger: false });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const userController = {
    getById: async () => FAKE_USER,
    update: async () => FAKE_USER,
    ...userOverrides,
  };

  const addressController = {
    listForUser: async () => FAKE_ADDRESSES,
    upsert: async () => ({ created: true, addresses: FAKE_ADDRESSES }),
    update: async () => FAKE_ADDRESSES,
    delete: async () => [],
    ...addressOverrides,
  };

  const skillController = {
    listCatalog: async () => FAKE_SKILLS,
    listForUser: async () => FAKE_USER_SKILLS,
    updateForUser: async () => FAKE_USER_SKILLS,
    ...skillOverrides,
  };

  // Stub schemas with pass-through zod schemas
  const { z } = await import('zod');
  const anyObj = z.object({}).passthrough();
  const anyArray = z.array(anyObj);
  const messageObj = z.object({ message: z.string() });

  // Params schemas must coerce id to number to match route comparison
  const userParams = z.object({ id: z.coerce.number() });
  const addressParams = z.object({ id: z.coerce.number(), aid: z.coerce.number() });

  app.decorate('controller', {
    user: userController,
    address: addressController,
    skill: skillController,
  });

  app.decorate('schema', {
    controller: {
      user: {
        get: { params: userParams, response: { 200: anyObj, 403: messageObj, 404: messageObj } },
        patch: {
          params: userParams,
          body: anyObj,
          response: { 200: anyObj, 400: messageObj, 403: messageObj, 409: messageObj },
        },
        addresses: {
          list: { params: userParams, response: { 200: anyArray, 403: messageObj } },
          create: {
            params: userParams,
            body: anyObj,
            response: { 200: anyArray, 201: anyArray, 403: messageObj },
          },
          update: {
            params: addressParams,
            body: anyObj,
            response: { 200: anyArray, 403: messageObj, 404: messageObj },
          },
          delete: {
            params: addressParams,
            response: { 200: anyArray, 403: messageObj, 404: messageObj },
          },
        },
        skills: {
          update: {
            params: userParams,
            body: anyObj,
            response: { 200: anyArray, 403: messageObj },
          },
        },
      },
      skill: {
        list: { response: { 200: anyArray } },
      },
    },
  });

  // Stub authenticate preHandler
  app.decorate('authenticate', async (request) => {
    request.user = { id: authenticatedUserId };
  });

  await app.register(userRoutes);
  await app.ready();

  return app;
}

// ── GET /api/skills ───────────────────────────────────────────────────────────

describe('GET /api/skills', () => {
  let app;
  before(async () => {
    app = await buildTestApp();
  });
  after(() => app.close());

  it('returns 200 with skill catalog', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/skills',
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.length, 2);
    assert.equal(body[0].name, 'JavaScript');
  });
});

// ── GET /api/user/:id ─────────────────────────────────────────────────────────

describe('GET /api/user/:id', () => {
  it('returns 200 with user profile on success', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/1',
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.id, 1);
    assert.equal(body.username, 'testuser');
    assert.equal(body.email, 'test@example.com');

    await app.close();
  });

  it('returns 403 when accessing another user', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/1',
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.json().message, 'Forbidden');

    await app.close();
  });

  it('returns 404 when user not found', async () => {
    const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
    const app = await buildTestApp({
      userOverrides: {
        getById: async () => {
          throw new ApiError(404, 'User not found');
        },
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/1',
    });

    assert.equal(res.statusCode, 404);

    await app.close();
  });
});

// ── PATCH /api/user/:id ───────────────────────────────────────────────────────

describe('PATCH /api/user/:id', () => {
  it('returns 200 with updated user on success', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1',
      payload: { username: 'newusername', bio: 'Updated bio' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.id, 1);

    await app.close();
  });

  it('returns 403 when updating another user', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1',
      payload: { username: 'hacker' },
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });

  it('returns 400 when nothing to update', async () => {
    const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
    const app = await buildTestApp({
      userOverrides: {
        update: async () => {
          throw new ApiError(400, 'Nothing to update');
        },
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1',
      payload: {},
    });

    assert.equal(res.statusCode, 400);

    await app.close();
  });

  it('returns 409 when username/email conflict', async () => {
    const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
    const app = await buildTestApp({
      userOverrides: {
        update: async () => {
          throw new ApiError(409, 'Username or email already in use');
        },
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1',
      payload: { username: 'taken' },
    });

    assert.equal(res.statusCode, 409);

    await app.close();
  });
});

// ── PUT /api/user/:id/skills ──────────────────────────────────────────────────

describe('PUT /api/user/:id/skills', () => {
  it('returns 200 with updated skills on success', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/user/1/skills',
      payload: { skills: [{ skillId: 1, level: 'expert' }] },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body[0].skillId, 1);
    assert.equal(body[0].level, 'expert');

    await app.close();
  });

  it('returns 403 when updating another user skills', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/user/1/skills',
      payload: { skills: [] },
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });
});

// ── GET /api/user/:id/addresses ───────────────────────────────────────────────

describe('GET /api/user/:id/addresses', () => {
  it('returns 200 with addresses on success', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/1/addresses',
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].city, 'Berlin');

    await app.close();
  });

  it('returns 403 when accessing another user addresses', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/1/addresses',
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });
});

// ── POST /api/user/:id/addresses ──────────────────────────────────────────────

describe('POST /api/user/:id/addresses', () => {
  it('returns 201 when address created', async () => {
    const app = await buildTestApp({
      addressOverrides: {
        upsert: async () => ({ created: true, addresses: FAKE_ADDRESSES }),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/1/addresses',
      payload: { addressType: 'work', street: '456 Office Blvd', city: 'Munich' },
    });

    assert.equal(res.statusCode, 201);

    await app.close();
  });

  it('returns 200 when address updated (upsert)', async () => {
    const app = await buildTestApp({
      addressOverrides: {
        upsert: async () => ({ created: false, addresses: FAKE_ADDRESSES }),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/1/addresses',
      payload: { addressType: 'home', street: '789 New St' },
    });

    assert.equal(res.statusCode, 200);

    await app.close();
  });

  it('returns 403 when creating for another user', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/1/addresses',
      payload: { street: 'Hacker St' },
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });
});

// ── PATCH /api/user/:id/addresses/:aid ────────────────────────────────────────

describe('PATCH /api/user/:id/addresses/:aid', () => {
  it('returns 200 with updated addresses on success', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1/addresses/1',
      payload: { city: 'Hamburg' },
    });

    assert.equal(res.statusCode, 200);

    await app.close();
  });

  it('returns 403 when updating another user address', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1/addresses/1',
      payload: { city: 'Hacked' },
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });

  it('returns 404 when address not found', async () => {
    const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
    const app = await buildTestApp({
      addressOverrides: {
        update: async () => {
          throw new ApiError(404, 'Address not found');
        },
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/user/1/addresses/999',
      payload: { city: 'Nowhere' },
    });

    assert.equal(res.statusCode, 404);

    await app.close();
  });
});

// ── DELETE /api/user/:id/addresses/:aid ───────────────────────────────────────

describe('DELETE /api/user/:id/addresses/:aid', () => {
  it('returns 200 with remaining addresses on success', async () => {
    const app = await buildTestApp({
      addressOverrides: {
        delete: async () => [],
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/user/1/addresses/1',
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), []);

    await app.close();
  });

  it('returns 403 when deleting another user address', async () => {
    const app = await buildTestApp({ authenticatedUserId: 2 });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/user/1/addresses/1',
    });

    assert.equal(res.statusCode, 403);

    await app.close();
  });

  it('returns 404 when address not found', async () => {
    const { default: ApiError } = await import('../../src/lib/errors/ApiError.js');
    const app = await buildTestApp({
      addressOverrides: {
        delete: async () => {
          throw new ApiError(404, 'Address not found');
        },
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/user/1/addresses/999',
    });

    assert.equal(res.statusCode, 404);

    await app.close();
  });
});
