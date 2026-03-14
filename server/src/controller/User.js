import ApiError from '../lib/errors/ApiError.js';

/**
 * @module controller/User
 * @description User controller: profile retrieval and updates.
 */

/**
 * Mapped user object returned to clients.
 *
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} username
 * @property {string|null} displayName
 * @property {string} email
 * @property {string} role
 * @property {string|null} bio
 * @property {string|null} phone
 * @property {Array} skills
 * @property {Array} addresses
 * @property {string} createdAt
 */

/**
 * Handles user profile operations.
 */
export default class User {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB, controller: { address: import('./Address.js').default, skill: import('./Skill.js').default } }} */
  #fastify;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} fastify
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * Retrieve a user profile by ID.
   *
   * @param {number} userId
   * @returns {Promise<UserProfile>}
   * @throws {ApiError} 404 – if user not found.
   */
  async getById(userId) {
    const row = await this.#fastify.db.queryOne(
      'SELECT id, username, display_name, email, role, bio, phone, created_at FROM users WHERE id = ? LIMIT 1',
      [userId],
    );

    if (!row) {
      throw new ApiError(404, 'User not found');
    }

    const [addresses, skills] = await Promise.all([
      this.#fastify.controller.address.listForUser(userId),
      this.#fastify.controller.skill.listForUser(userId),
    ]);

    return this.#mapUser(row, addresses, skills);
  }

  /**
   * Update user profile fields (username, displayName, email, bio, phone).
   *
   * @param {number} userId
   * @param {Object} data
   * @param {string} [data.username]
   * @param {string} [data.displayName]
   * @param {string} [data.email]
   * @param {string} [data.bio]
   * @param {string} [data.phone]
   * @returns {Promise<UserProfile>}
   * @throws {ApiError} 400 – if nothing to update.
   * @throws {ApiError} 409 – if username or email already in use.
   * @throws {ApiError} 404 – if user not found.
   */
  async update(userId, { username, displayName, email, bio, phone }) {
    if ([username, displayName, email, bio, phone].every((v) => v === undefined)) {
      throw new ApiError(400, 'Nothing to update');
    }

    const transaction = await this.#fastify.db.transaction();

    try {
      // Check for conflicts
      if (username !== undefined || email !== undefined) {
        const conflict = await transaction.query(
          'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
          [username ?? '', email ?? '', userId],
        );
        if (conflict.length > 0) {
          throw new ApiError(409, 'Username or email already in use');
        }
      }

      const fields = [];
      const values = [];

      if (username !== undefined) {
        fields.push('username = ?');
        values.push(username);
      }
      if (displayName !== undefined) {
        fields.push('display_name = ?');
        values.push(displayName || null);
      }
      if (email !== undefined) {
        fields.push('email = ?');
        values.push(email);
      }
      if (bio !== undefined) {
        fields.push('bio = ?');
        values.push(bio || null);
      }
      if (phone !== undefined) {
        fields.push('phone = ?');
        values.push(phone || null);
      }

      if (fields.length > 0) {
        values.push(userId);
        await transaction.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      await transaction.commit();

      return this.getById(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Map a database row to a UserProfile object.
   *
   * @param {Object} row
   * @param {Array} addresses
   * @param {Array} skills
   * @returns {UserProfile}
   */
  #mapUser(row, addresses = [], skills = []) {
    return {
      id: Number(row.id),
      username: row.username,
      displayName: row.display_name ?? null,
      email: row.email,
      role: row.role,
      bio: row.bio ?? null,
      phone: row.phone ?? null,
      skills,
      addresses,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  }
}
