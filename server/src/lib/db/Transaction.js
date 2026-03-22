/**
 * @module lib/db/Transaction
 * @description Transaction abstraction with savepoint support for MariaDB.
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
export default class Transaction {
  /** @type {import('mariadb').PoolConnection} */
  #connection;

  /**
   * Acquire a connection from the pool, start a transaction, and return a
   * bound {@link Transaction} instance.
   *
   * @param {import('../../plugins/mariadb.js').FastifyInstanceWithDB} fastify
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
