import fp from 'fastify-plugin';
import { createPool } from 'mariadb';

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
  /** @type {import('fastify').FastifyInstance} */
  #fastify;
  /** @type {Promise<import('mariadb').PoolConnection>} */
  #connectionPromise;

  /** @param {import('fastify').FastifyInstance} fastify */
  constructor(fastify) {
    this.#fastify = fastify;
    this.#connectionPromise = this.#fastify.db.getConnection();
  }

  /** Begin the transaction. */
  async start() {
    const conn = await this.#connectionPromise;
    await conn.query('START TRANSACTION;');
  }

  /** Commit the transaction and release the connection. */
  async commit() {
    const conn = await this.#connectionPromise;
    await conn.query('COMMIT');
    conn.release();
  }

  /** Roll back the transaction and release the connection. */
  async rollback() {
    const conn = await this.#connectionPromise;
    await conn.query('ROLLBACK');
    conn.release();
  }

  /**
   * Create a named savepoint within this transaction.
   *
   * @param {string} name
   * @returns {Promise<Savepoint>}
   */
  async savepoint(name) {
    const conn = await this.#connectionPromise;
    return Savepoint.getInstance(conn, name);
  }

  /**
   * Execute a parameterised query on the transaction connection.
   *
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any>}
   */
  async query(sql, params) {
    const conn = await this.#connectionPromise;
    return conn.query(sql, params);
  }
}

/**
 * @typedef {Object} FastifyDB
 * @property {import('mariadb').Pool} pool - The underlying MariaDB connection pool.
 * @property {(sql: string, params?: any[]) => Promise<any>} query - Execute a parameterised SQL query via the pool.
 * @property {() => Promise<import('mariadb').PoolConnection>} getConnection - Acquire a dedicated connection from the pool.
 * @property {() => Transaction} transaction - Create a new {@link Transaction} instance.
 */

/**
 * Fastify plugin that creates a MariaDB connection pool and decorates the
 * Fastify instance with `fastify.db`.
 *
 * Configuration is read from `fastify.config.db`:
 * `host`, `port`, `user`, `password`, `name`, `connection_limit`.
 *
 * @type {import('fastify').FastifyPluginAsync}
 */
async function fastifyMariaDB(fastify, _options) {
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
    getConnection: () => pool.getConnection(),
    transaction: () => new Transaction(fastify),
  };

  fastify.decorate('db', db);

  fastify.addHook('onClose', async (_instance) => {
    await pool.end();
  });
}

export default fp(fastifyMariaDB);
