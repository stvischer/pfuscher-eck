/**
 * @module controller/Skill
 * @description Skill controller: skill catalog and entity skill management.
 *
 * Supports three skill types:
 * - **offer**   – user skill offerings (type='offer', entity_id=user.id)
 * - **request** – repair request required skills (type='request', entity_id=repair.id)
 * - **meeting** – meeting skills (type='meeting', entity_id=meeting.id)
 */

/**
 * Valid skill types.
 * @typedef {'offer' | 'request' | 'meeting'} SkillType
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
 * Entity skill with optional proficiency level.
 *
 * @typedef {Object} EntitySkill
 * @property {number} skillId
 * @property {string} name
 * @property {string|null} category
 * @property {string|null} level
 */

/**
 * Handles skill catalog and entity skill operations.
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
   * List all skills for a specific entity.
   *
   * @param {SkillType} type
   * @param {number} entityId
   * @returns {Promise<EntitySkill[]>}
   */
  async list(type, entityId) {
    const rows = await this.#fastify.db.query(
      `SELECT cs.id AS skill_id, cs.name, p.name AS category, s.level
       FROM   skill s
       JOIN   cnf_skills cs ON cs.id = s.skill_id
       LEFT JOIN cnf_skills p ON p.id = cs.parent_id
       WHERE  s.type = ? AND s.entity_id = ?
       ORDER  BY p.name, cs.name`,
      [type, entityId],
    );

    return rows.map((r) => ({
      skillId: Number(r.skill_id),
      name: r.name,
      category: r.category ?? null,
      level: r.level ?? null,
    }));
  }

  /**
   * Replace all skills for an entity with the provided list.
   *
   * @param {SkillType} type
   * @param {number} entityId
   * @param {Array<{ skillId: number, level?: string }>} skills
   * @returns {Promise<EntitySkill[]>}
   */
  async update(type, entityId, skills) {
    const transaction = await this.#fastify.db.transaction();

    try {
      // Delete all existing skills for this entity
      await transaction.query('DELETE FROM skill WHERE type = ? AND entity_id = ?', [
        type,
        entityId,
      ]);

      // Insert new skills
      if (skills.length > 0) {
        const placeholders = skills.map(() => '(?, ?, ?, ?)').join(', ');
        const values = skills.flatMap((s) => [type, entityId, s.skillId, s.level ?? null]);
        await transaction.query(
          `INSERT INTO skill (type, entity_id, skill_id, level) VALUES ${placeholders}`,
          values,
        );
      }

      await transaction.commit();

      return this.list(type, entityId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convenience methods (for backward compatibility)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List all skills for a specific user (type='offer').
   *
   * @param {number} userId
   * @returns {Promise<EntitySkill[]>}
   */
  async listForUser(userId) {
    return this.list('offer', userId);
  }

  /**
   * Replace all skills for a user (type='offer').
   *
   * @param {number} userId
   * @param {Array<{ skillId: number, level?: string }>} skills
   * @returns {Promise<EntitySkill[]>}
   */
  async updateForUser(userId, skills) {
    return this.update('offer', userId, skills);
  }
}
