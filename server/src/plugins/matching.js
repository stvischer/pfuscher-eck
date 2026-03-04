import fp from 'fastify-plugin';

/**
 * Handles matching-point CRUD for users.
 * A user's matching point is derived from their home address
 * stored in the `user_addresses` / `addresses` tables.
 */
class User {
  /**
   * @param {import('fastify').FastifyInstance} fastify - Fastify instance used for DB queries.
   */
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * Inserts a matching point for the given user by looking up
   * their home address and copying its location.
   * @param {number} id - The user ID to create a matching point for.
   */
  async add(id) {
    await this.fastify.query(`
      INSERT INTO matching_points (type, entity_id, location)
      SELECT 
          'user', 
          ua.user_id, 
          a.location 
      FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      WHERE ua.user_id = ?
        AND ua.address_type = 'home';
    `, [id]);
  }

  /**
   * Removes the matching point associated with the given user.
   * @param {number} id - The user ID whose matching point should be deleted.
   */
  async remove(id) {
    await this.fastify.query(`DELETE FROM matching_points WHHERE TYPE = 'user' AND id = ?`, [id]);
  }
}

/**
 * Handles matching-point CRUD for repair requests.
 * A repair request's matching point is derived from the address
 * linked via `repair_request_addresses`.
 */
class Repair {
  /**
   * @param {import('fastify').FastifyInstance} fastify - Fastify instance used for DB queries.
   */
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * Inserts a matching point for the given repair request by
   * looking up its associated address location.
   * @param {number} id - The repair request ID to create a matching point for.
   */
  async add(id) {
    await this.fastify.query(`
      INSERT INTO matching_points (type, entity_id, location)
      SELECT 
          'repair', 
          rra.request_id, 
          a.location 
      FROM repair_request_addresses rra
      JOIN addresses a ON a.id = rra.address_id
      WHERE rra.request_id = ?
    `, [id]);
  }

  /**
   * Removes the matching point associated with the given repair request.
   * @param {number} id - The repair request ID whose matching point should be deleted.
   */
  async remove(id) {
    await this.fastify.query(`DELETE FROM matching_points WHHERE TYPE = 'repair' AND id = ?`, [id]);
  }
}

/**
 * Handles matching-point CRUD for meetings.
 * Unlike users and repairs, a meeting's location is supplied
 * directly rather than looked up from an address table.
 */
class Meeting {
  /**
   * @param {import('fastify').FastifyInstance} fastify - Fastify instance used for DB queries.
   */
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * Inserts a matching point for the given meeting by
   * looking up its associated address location.
   * @param {number} id - The meeting ID to create a matching point for.
   */
  async add(id) {
    await this.fastify.query(`
      INSERT INTO matching_points (type, entity_id, location)
      SELECT 
          'meeting', 
          ma.meeting_id, 
          a.location 
      FROM meeting_addresses ma
      JOIN addresses a ON a.id = ma.address_id
      WHERE ma.meeting_id = ?
    `, [id]);
  }

  /**
   * Removes the matching point associated with the given meeting.
   * @param {number} id - The meeting ID whose matching point should be deleted.
   */
  async remove(id) {
    await this.fastify.query(`DELETE FROM matching_points WHERE type = 'meeting' AND entity_id = ?`, [id]);
  }
}

/**
 * Central facade that groups all entity-specific matching-point
 * managers ({@link User}, {@link Repair}, {@link Meeting}).
 * Exposed on the Fastify instance as `fastify.mapping`.
 */
class Mapping {
  /**
   * @param {import('fastify').FastifyInstance} fastify - Fastify instance shared with sub-managers.
   */
  constructor(fastify) {
    this.fastify = fastify;
    this.user = new User(fastify);
    this.repair = new Repair(fastify);
    this.metting = new Meeting(fastify);
  }
}

/**
 * Fastify plugin that registers the {@link Mapping} facade.
 * After registration the mapping helpers are available via `fastify.mapping`.
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} opts - Plugin options (currently unused).
 */
async function mappingPlugin(fastify, opts) {
  const mapping = new Mapping(fastify);
  
  // Die Klasse unter dem Namen 'mapping' an Fastify binden
  fastify.decorate('mapping', mapping);
}

export default fp(mappingPlugin);
