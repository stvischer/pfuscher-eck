/**
 * Controller for maintaining the `address_matches` table.
 *
 * For every address that is inserted, updated, or explicitly refreshed, this
 * controller recomputes which other addresses fall within the configured search
 * radius and persists those pairs together with the great-circle distance (km).
 *
 * Match logic (mirrors the DB triggers):
 * - **Outgoing** – addresses whose location lies within `addressId`'s radius.
 *   Hash-prefix length is derived from the radius bucket so that only
 *   geographically plausible candidates are compared.
 * - **Incoming** – addresses whose own radius covers `addressId`'s location.
 *   A fixed two-character hash prefix is used for this reverse lookup.
 */
export default class Matching {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} */
  #fastify;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} fastify
   *   Fastify instance decorated with the `db` plugin.
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * Recompute all matches that involve the given address.
   *
   * The method runs inside a single database transaction:
   * 1. Deletes every existing row in `address_matches` where the address
   *    appears as either `source` or `target`.
   * 2. Inserts **outgoing** matches – other enabled addresses that fall inside
   *    this address's radius (`source = addressId`).
   * 3. Inserts **incoming** matches – other enabled addresses whose radius
   *    covers this address (`target = addressId`).
   *
   * Rolls back automatically if any step fails and re-throws the error.
   *
   * @param {number} addressId  Primary key of the `address` row to refresh.
   * @returns {Promise<void>}
   * @throws {Error} Propagates any database error after rolling back the transaction.
   */
  async update(addressId) {
    const temporary = await this.#fastify.db.temporary('address_matches');

    try {
      await temporary.query('DELETE FROM address_matches WHERE source = ? OR target = ?;', [
        addressId,
        addressId,
      ]);

      await temporary.query(
        `
        INSERT INTO address_matches (source, target, distance)
        WITH src AS (
          SELECT
            id, hash, location, radius,
            CASE
              WHEN radius <= 1   THEN 5
              WHEN radius <= 5   THEN 4
              WHEN radius <= 40  THEN 3
              WHEN radius <= 160 THEN 2
              ELSE 1
            END AS prefix_len
          FROM address
          WHERE id = ? AND enabled = 1
        )
        SELECT
          src.id,
          a.id,
          ROUND(ST_Distance_Sphere(src.location, a.location) / 1000, 1)
        FROM src
        JOIN address a ON a.id != src.id
                      AND a.enabled = 1
                      AND LEFT(a.hash, src.prefix_len) = LEFT(src.hash, src.prefix_len)
        WHERE ST_Distance_Sphere(src.location, a.location) <= (src.radius * 1000);
      `,
        [addressId],
      );

      await temporary.query(
        `
        INSERT INTO address_matches (source, target, distance)
        WITH src AS (
          SELECT
            id, hash, location
          FROM address
          WHERE id = ?
            AND enabled = 1
        )
        SELECT
          a.id         AS souurce,
          src.id AS target,
          ROUND(ST_Distance_Sphere(src.location, a.location) / 1000, 1) AS distance
        FROM src
        JOIN address a ON  a.enabled = 1
          AND a.id != src.id
          AND LEFT(a.hash, 2) = LEFT(src.hash, 2)
        WHERE ST_Distance_Sphere(src.location, a.location) <= a.radius * 1000
      `,
        [addressId],
      );
      await temporary.publish();
    } catch (error) {
      await temporary.discard();
      throw error;
    }
  }
}
