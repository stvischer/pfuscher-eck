/**
 * @typedef {Object} TemporaryOptions
 * @property {string}          [prefix='']           - Name prefix for the shadow table.
 * @property {string}          [suffix='_temporary'] - Name suffix for the shadow table.
 * @property {boolean}         [data=true]           - Copy existing rows from the source table on open.
 * @property {'skip'|'enable'} [index='skip']        - Whether to re-enable index checks after the
 *                                                      initial bulk copy ('skip' leaves them off until
 *                                                      {@link Temporary#publish} is called).
 */

/**
 * Shadow-table helper for atomic, bulk-replace operations.
 *
 * Opens a transaction, creates a temporary copy of a MariaDB table (optionally
 * pre-populated with the original data), lets the caller mutate the copy via
 * {@link Temporary#query}, and then either atomically swaps it into place with
 * {@link Temporary#publish} or rolls the whole operation back with
 * {@link Temporary#discard}.
 *
 * Typical usage:
 * ```js
 * const tmp = new Temporary(fastify, 'address');
 * await tmp.open();
 * try {
 *   await tmp.query('DELETE FROM address WHERE disabled = 1', []);
 *   await tmp.publish();
 * } catch (err) {
 *   await tmp.discard();
 *   throw err;
 * }
 * ```
 */
export default class Temporary {
  #schema;
  #fastify;
  #transaction;
  #options;
  #table;

  /** @type {boolean} Whether unique/FK checks are currently enabled. */
  #index;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../../plugins/mariadb.js').FastifyDB }} fastify - Fastify instance with the MariaDB decoration.
   * @param {string}           table   - Name of the source table to shadow.
   * @param {TemporaryOptions} [options={}]
   */
  constructor(fastify, table, options = {}) {
    this.#fastify = fastify;
    this.#options = Object.assign(
      {
        table,
        prefix: '',
        suffix: '_temporary',
        data: true,
        index: 'skip',
      },
      options,
    );

    this.#index = true;

    this.#table = `${this.#options.prefix}${this.#options.table}${this.#options.suffix}`;
  }

  /**
   * Opens a database transaction, creates the shadow table, and — when
   * `options.data` is `true` — copies all rows from the source table.
   *
   * Must be called before {@link Temporary#query}, {@link Temporary#publish},
   * or {@link Temporary#discard}.
   *
   * @returns {Promise<void>}
   */
  async open() {
    this.#transaction = await this.#fastify.db.transaction();

    const columns = await this.#transaction.query(`SHOW COLUMNS FROM ${this.#options.table}`);
    this.#schema = { columns: columns.map((row) => ({ name: row.Field })) };

    await this.#drop(this.#table);
    await this.#transaction.query(`CREATE TABLE ${this.#table} LIKE ${this.#options.table};`);

    if (this.#options.data) {
      await this.#copy();
    }
  }

  /**
   * Executes a parameterised SQL statement against the shadow table.
   *
   * All occurrences of the source table name in `sql` are automatically
   * rewritten to the shadow table name before execution.
   *
   * @param {string}  sql    - SQL statement.  Use `?` placeholders for values.
   * @param {unknown[]} [params=[]] - Bound parameter values.
   * @returns {Promise<void>}
   */
  async query(sql, params) {
    const statement = sql.replaceAll(this.#options.table, this.#table);
    await this.#transaction.query(statement, params);
  }

  /**
   * Commits all pending changes and atomically swaps the shadow table into
   * place, replacing the original table.
   *
   * The original table is briefly renamed to `<shadowTable>_old` and then
   * dropped.  If the drop fails the stale `_old` table is left behind but
   * the swap itself has already succeeded.
   *
   * @returns {Promise<void>}
   */
  async publish() {
    await this.#enableKeys();
    await this.#transaction.commit();
    const oldTable = `${this.#table}_old`;
    await this.#drop(oldTable);
    await this.#fastify.db.query(`RENAME TABLE ${this.#options.table} TO ${oldTable}, ${this.#table} TO ${this.#options.table}`);
    await this.#drop(oldTable);
  }

  /**
   * Rolls back the open transaction and drops the shadow table.
   *
   * Call this in a `catch` block whenever {@link Temporary#publish} is not
   * reached, to avoid leaving orphaned tables behind.
   *
   * @returns {Promise<void>}
   */
  async discard() {
    await this.#transaction.rollback();
    await this.#drop(this.#table);
  }

  /**
   * Bulk-copies all rows from the source table into the shadow table.
   * Temporarily disables unique and FK checks for performance.
   *
   * @returns {Promise<void>}
   */
  async #copy() {
    const columns = this.#schema.columns.map((column) => column.name);
    await this.#disableKeys();

    await this.#transaction.query(
      `INSERT INTO ${this.#table} (${columns.join(',')})
       SELECT ${columns.join(',')} FROM ${this.#options.table}`
    );

    if (this.#options.index != 'skip') {
      await this.#enableKeys();
    }
  }

  /**
   * Re-enables unique and foreign-key checks for the current session if they
   * were previously disabled by {@link Temporary##disableKeys}.
   *
   * @returns {Promise<void>}
   */
  async #enableKeys() {
    if (!this.#index) {
      await this.#transaction.query('SET unique_checks = 1;');
      await this.#transaction.query('SET foreign_key_checks = 1;');
      this.#index = true;
    }
  }

  /**
   * Disables unique and foreign-key checks for the current session to speed
   * up bulk inserts.  Tracks state so the checks are only issued once.
   *
   * @returns {Promise<void>}
   */
  async #disableKeys() {
    if (this.#index) {
      await this.#transaction.query('SET unique_checks = 0;');
      await this.#transaction.query('SET foreign_key_checks = 0;');
      this.#index = false;
    }
  }

  /**
   * Drops a table if it exists.  Uses the outer (non-transactional) connection
   * so it works both before and after a transaction commit/rollback.
   *
   * @param {string} table - Exact table name to drop.
   * @returns {Promise<void>}
   */
  async #drop(table) {
    await this.#fastify.db.query(`DROP TABLE IF EXISTS ${table}`);
  }
}
