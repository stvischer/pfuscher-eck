/**
 * @module controller/Skill
 * @description Skill controller: skill catalog and user skill management.
 */

/**
 * Skill in the catalog.
 *
 * @typedef {Object} CatalogSkill
 * @property {number} id
 * @property {string} name
 * @property {string|null} category
 */

/**
 * User skill with proficiency level.
 *
 * @typedef {Object} UserSkill
 * @property {number} skillId
 * @property {string} name
 * @property {string|null} category
 * @property {string} level
 */

/**
 * Handles skill catalog and user skill operations.
 */
export default class Skill {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} */
  #fastify;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} fastify
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * List all available skills from the catalog (only leaf skills with a parent).
   *
   * @returns {Promise<CatalogSkill[]>}
   */
  async listCatalog() {
    const rows = await this.#fastify.db.query(
      `SELECT cs.id, cs.name, p.name AS category
       FROM   cnf_skills cs
       LEFT JOIN cnf_skills p ON p.id = cs.parent_id
       WHERE  cs.parent_id IS NOT NULL
       ORDER  BY p.name, cs.name`,
    );

    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      category: r.category ?? null,
    }));
  }

  /**
   * List all skills for a specific user.
   *
   * @param {number} userId
   * @returns {Promise<UserSkill[]>}
   */
  async listForUser(userId) {
    const rows = await this.#fastify.db.query(
      `SELECT cs.id AS skill_id, cs.name, p.name AS category, us.level
       FROM   user_skills us
       JOIN   cnf_skills  cs ON cs.id = us.skill_id
       LEFT JOIN cnf_skills p  ON p.id  = cs.parent_id
       WHERE  us.user_id = ?
       ORDER  BY p.name, cs.name`,
      [userId],
    );

    return rows.map((r) => ({
      skillId: Number(r.skill_id),
      name: r.name,
      category: r.category ?? null,
      level: r.level,
    }));
  }

  /**
   * Replace all skills for a user with the provided list.
   *
   * @param {number} userId
   * @param {Array<{ skillId: number, level?: string }>} skills
   * @returns {Promise<UserSkill[]>}
   */
  async updateForUser(userId, skills) {
    const transaction = await this.#fastify.db.transaction();

    try {
      // Delete all existing skills for user
      await transaction.query('DELETE FROM user_skills WHERE user_id = ?', [userId]);

      // Insert new skills
      for (const s of skills) {
        await transaction.query(
          'INSERT INTO user_skills (user_id, skill_id, level) VALUES (?, ?, ?)',
          [userId, s.skillId, s.level ?? 'beginner'],
        );
      }

      await transaction.commit();

      return this.listForUser(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
