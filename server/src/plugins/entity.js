import fp from 'fastify-plugin';

import User from '../lib/entity/User.js';
import Repair from '../lib/entity/Repair.js';
import Meeting from '../lib/entity/Meeting.js';

class Entity {
  constructor(fastify) {
    this.fastify = fastify;

    this.user = new User(fastify);
    this.repair = new Repair(fastify);
    this.meeting = new Meeting(fastify);

    this.fastify.log.debug('Entity plugin loaded');
  }
}

/**
 * Fastify plugin that registers the {@link Entity} facade.
 * After registration the entity helpers are available via `fastify.entity`.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts - Plugin options (currently unused).
 */
async function entityPlugin(fastify, _opts) {
  const entity = new Entity(fastify);

  fastify.decorate('entity', entity);
}

export default fp(entityPlugin);
