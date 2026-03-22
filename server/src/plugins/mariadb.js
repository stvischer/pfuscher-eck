import Temorary from '../lib/db/Temporary.js';
import Transaction from '../lib/db/Transaction.js';

/**
 * @module plugins/mariadb
 * @description Fastify plugin that wires up a MariaDB connection pool and
 * exposes it as `fastify.db`. Provides a thin query helper, raw connection
 * access, and a transaction abstraction with savepoint support.
 */

import fp from 'fastify-plugin';
import { createPool } from 'mariadb';

/**
 * Database connection configuration, sourced from `fastify.config.db`.
 *
 * @typedef {Object} DbConfig
 * @property {string}  host             - MariaDB server hostname.
 * @property {number}  port             - MariaDB server port (default 3306).
 * @property {string}  user             - Database user.
 * @property {string}  password         - Database password.
 * @property {string}  name             - Database / schema name.
 * @property {number}  [connection_limit=10] - Maximum number of pool connections.
 */

/**
 * The `fastify.db` decorator exposed by this plugin.
 *
 * @typedef {Object} FastifyDB
 * @property {import('mariadb').Pool} pool
 *   The underlying MariaDB connection pool.
 * @property {(sql: string, params?: any[]) => Promise<any>} query
 *   Execute a parameterised SQL query using a pool-managed connection.
 * @property {() => Promise<import('mariadb').PoolConnection>} getConnection
 *   Acquire a dedicated connection from the pool (caller must release it).
 * @property {(sql: string, params?: any[]) => Promise<any>} queryOne
 *   Execute a parameterised SQL query and return only the first row, or `undefined`.
 * @property {() => Promise<import('../lib/db/Transaction.js').default>} transaction
 *   Open a new database transaction and return a {@link Transaction} handle.
 * @property {(table: string, options?: import('../lib/db/Temporary.js').TemporaryOptions) => Promise<import('../lib/db/Temporary.js').default>} temporary
 *   Create a shadow-table helper for atomic bulk-replace operations.
 *   The caller must call {@link import('../lib/db/Temporary.js').default#open open()} before use.
 */

/**
 * Extends the Fastify type system so that `fastify.db` is recognised
 * throughout the server codebase without additional casts.
 *
 * @typedef {import('fastify').FastifyInstance & { db: FastifyDB }} FastifyInstanceWithDB
 */

/**
 * Fastify plugin that creates a MariaDB connection pool and decorates the
 * Fastify instance with `fastify.db`.
 *
 * Configuration is read from `fastify.config.db`:
 * `host`, `port`, `user`, `password`, `name`, `connection_limit`.
 *
 * @param {import('fastify').FastifyInstance & { config: { db: DbConfig } }} fastify
 *   The Fastify instance provided by the plugin system.
 * @param {Record<string, never>} [options={}]
 *   Unused plugin options (reserved for future use).
 * @returns {Promise<void>}
 */
async function fastifyMariaDB(fastify, options = {}) {
  const pool = createPool({
    host: fastify.config.db.host,
    port: fastify.config.db.port,
    user: fastify.config.db.user,
    password: fastify.config.db.password,
    database: fastify.config.db.name,
    connectionLimit: fastify.config.db.connection_limit || 10,
  });

  /** @type {FastifyDB} */
  const db = {
    pool,
    query: (sql, params) => pool.query(sql, params),
    queryOne: async (sql, params) => {
      const rows = await pool.query(sql, params);

      return rows[0];
    },
    getConnection: () => pool.getConnection(),
    transaction: async () => Transaction.getInstance(fastify),
    /**
     * Create a shadow-table helper for atomic bulk-replace operations.
     *
     * Internally constructs a {@link Temorary} instance, calls
     * {@link Temorary#open} to begin the underlying transaction and create the
     * shadow table, then returns the ready-to-use instance.
     *
     * @param {string}                                table   - Name of the source table to shadow.
     * @param {import('../lib/db/Temporary.js').TemporaryOptions} [options={}]
     * @returns {Promise<import('../lib/db/Temporary.js').default>}
     */
    temporary: async (table, options) => {
      const temporary = new Temorary(fastify, table, options);
      await temporary.open();
      return temporary;
    },
  };

  fastify.decorate('db', db);

  fastify.addHook('onClose', async (_instance) => {
    await pool.end();
  });
}

export default fp(fastifyMariaDB);
