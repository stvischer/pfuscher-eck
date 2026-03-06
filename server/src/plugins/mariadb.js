import fp from 'fastify-plugin';
import { createPool } from 'mariadb';

/**
 * Fastify plugin that creates a MariaDB connection pool and decorates the
 * Fastify instance with a `db` object for database access.
 *
 * After registration, `fastify.db` exposes:
 * - `pool`          – the raw MariaDB pool instance
 * - `query()`       – shorthand for executing a parameterised SQL query
 * - `getConnection()` – acquire a dedicated connection from the pool
 *
 * Connection pool configuration is read from `fastify.config`:
 * `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
 *
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance.
 * @param {object} options - Plugin options (currently unused).
 * @returns {Promise<void>}
 */
async function fastifyMariaDB(fastify, _options) {
  const pool = createPool({
    host: fastify.config.DB_HOST,
    port: fastify.config.DB_PORT,
    user: fastify.config.DB_USER,
    password: fastify.config.DB_PASSWORD,
    database: fastify.config.DB_NAME,
    connectionLimit: 10,
  });

  /**
   * Database accessor object decorated onto the Fastify instance as `fastify.db`.
   *
   * @type {{
   *   pool: import('mariadb').Pool,
   *   query: (sql: string, params?: any[]) => Promise<any>,
   *   getConnection: () => Promise<import('mariadb').PoolConnection>
   * }}
   */
  const db = {
    /** The underlying MariaDB connection pool. */
    pool,
    /**
     * Execute a SQL query using the pool.
     *
     * @param {string} sql - The SQL statement to execute.
     * @param {any[]} [params] - Optional array of bound parameters.
     * @returns {Promise<any>} Query result rows.
     */
    query: (sql, params) => pool.query(sql, params),
    /**
     * Acquire a dedicated connection from the pool.
     *
     * @returns {Promise<import('mariadb').PoolConnection>} A pool connection.
     */
    getConnection: () => pool.getConnection(),
  };

  fastify.decorate('db', db);

  fastify.addHook('onClose', async (_instance) => {
    await pool.end();
  });
}

export default fp(fastifyMariaDB);
