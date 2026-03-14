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
 * @property {() => Promise<Transaction>} transaction
 *   Open a new database transaction and return a {@link Transaction} handle.
 */

/**
 * Extends the Fastify type system so that `fastify.db` is recognised
 * throughout the server codebase without additional casts.
 *
 * @typedef {import('fastify').FastifyInstance & { db: FastifyDB }} FastifyInstanceWithDB
 */

/**
 * A named savepoint within a database transaction.
 */
class Savepoint {
  /** @type {string} */
  #name;
  /** @type {import('mariadb').PoolConnection} */
  #connection;

  /**
   * Create and immediately issue the SAVEPOINT statement.
   *
   * @param {import('mariadb').PoolConnection} connection
   * @param {string} name
   * @returns {Promise<Savepoint>}
   */
  static async getInstance(connection, name) {
    const savepoint = new Savepoint(connection, name);
    await connection.query('SAVEPOINT ?', [name]);
    return savepoint;
  }

  /**
   * @param {import('mariadb').PoolConnection} connection
   * @param {string} name
   */
  constructor(connection, name) {
    this.#connection = connection;
    this.#name = name;
  }

  /** Roll back to this savepoint. */
  async rollback() {
    await this.#connection.query('ROLLBACK TO SAVEPOINT ?', [this.#name]);
  }
}

/**
 * A database transaction bound to a single pool connection.
 */
class Transaction {
  /** @type {import('mariadb').PoolConnection} */
  #connection;

  /**
   * Acquire a connection from the pool, start a transaction, and return a
   * bound {@link Transaction} instance.
   *
   * @param {FastifyInstanceWithDB} fastify
   * @returns {Promise<Transaction>}
   */
  static async getInstance(fastify) {
    const connection = await fastify.db.getConnection();
    await connection.query('START TRANSACTION;');
    return new Transaction(connection);
  }

  /**
   * @param {import('mariadb').PoolConnection} connection - Dedicated connection with an open transaction.
   */
  constructor(connection) {
    this.#connection = connection;
  }

  /** Commit the transaction and release the connection. */
  async commit() {
    await this.#connection.query('COMMIT');
    this.#connection.release();
  }

  /** Roll back the transaction and release the connection. */
  async rollback() {
    await this.#connection.query('ROLLBACK');
    this.#connection.release();
  }

  /**
   * Create a named savepoint within this transaction.
   *
   * @param {string} name
   * @returns {Promise<Savepoint>}
   */
  async savepoint(name) {
    return Savepoint.getInstance(this.#connection, name);
  }

  /**
   * Execute a parameterised query on the transaction connection.
   *
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any>}
   */
  async query(sql, params) {
    return this.#connection.query(sql, params);
  }

  /**
   * Execute a parameterised query and return only the first row.
   *
   * @param {string}  sql
   * @param {any[]}   [params]
   * @returns {Promise<any | undefined>} The first row, or `undefined` if the result set is empty.
   */
  async queryOne(sql, params) {
    const rows = await this.query(sql, params);
    return rows[0];
  }
}

/**
 * Fastify plugin that creates a MariaDB connection pool and decorates the
 * Fastify instance with `fastify.db`.
 *
 * Configuration is read from `fastify.config.db`:
 * `host`, `port`, `user`, `password`, `name`, `connection_limit`.
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
  };

  fastify.decorate('db', db);

  fastify.addHook('onClose', async (_instance) => {
    await pool.end();
  });
}

export default fp(fastifyMariaDB);
