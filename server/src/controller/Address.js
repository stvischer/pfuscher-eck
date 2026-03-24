import ApiError from '../lib/errors/ApiError.js';

/**
 * Mapped address object returned to clients.
 *
 * @typedef {Object} AddressResult
 * @property {number}  id
 * @property {number}  radius     - search/service radius in km
 * @property {boolean} enabled    - whether address participates in matching
 * @property {string}  street
 * @property {string}  city
 * @property {string}  state
 * @property {string}  postalCode
 * @property {string}  country
 * @property {number|null} lat
 * @property {number|null} lon
 */

/**
 * Handles address operations.
 */
export default class Address {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB, controller: { matching: import('./Matching.js').default } }} */
  #fastify;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB, controller: { matching: import('./Matching.js').default } }} fastify
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * Get address by its primary key.
   *
   * @param {number} id
   * @returns {Promise<AddressResult | null>}
   */
  async getById(id) {
    const row = await this.#fastify.db.queryOne(
      `SELECT
         id, radius, enabled,
         street, city, state, postal_code, country,
         ST_Y(location) AS lat, ST_X(location) AS lon
       FROM address
       WHERE id = ?`,
      [id],
    );
    return row ? this.#map(row) : null;
  }

  /**
   * Create or update an address by its primary key.
   *
   * - If `id` is provided the existing row is updated (delegates to {@link Address#update}).
   * - If `id` is `null`/`undefined` a new row is inserted.
   *
   * @param {number|null} id
   * @param {Object} data
   * @param {number} [data.radius=20]
   * @param {boolean} [data.enabled=true]
   * @param {string} data.street
   * @param {string} data.city
   * @param {string} [data.state='']
   * @param {string} data.postalCode
   * @param {string} data.country
   * @param {number} data.lat
   * @param {number} data.lon
   * @returns {Promise<{ created: boolean, address: AddressResult }>}
   */
  async upsert(id, { radius = 20, enabled = true, street, city, state = '', postalCode, country, lat, lon }) {
    if (id) {
      const address = await this.update(id, { radius, enabled, street, city, state, postalCode, country, lat, lon });
      return { created: false, address };
    }

    const res = await this.#fastify.db.query(
      `INSERT INTO address (type, street, city, state, postal_code, country, radius, enabled, hash, location)
       VALUES ('offer', ?, ?, ?, ?, ?, ?, ?, ST_GeoHash(?, ?, 12), ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326))`,
      [street, city, state, postalCode, country, radius, enabled ? 1 : 0, Number(lon), Number(lat)],
    );
    const newId = Number(res.insertId);

    if (enabled) {
      await this.#fastify.controller.matching.update(newId);
    }

    return { created: true, address: await this.getById(newId) };
  }

  /**
   * Update an existing address by its primary key.
   *
   * @param {number} id
   * @param {Object} data
   * @param {number} [data.radius]
   * @param {boolean} [data.enabled]
   * @param {string} [data.street]
   * @param {string} [data.city]
   * @param {string} [data.state]
   * @param {string} [data.postalCode]
   * @param {string} [data.country]
   * @param {number} [data.lat]
   * @param {number} [data.lon]
   * @returns {Promise<AddressResult>}
   * @throws {ApiError} 404 – if address not found.
   */
  async update(id, { radius, enabled, street, city, state, postalCode, country, lat, lon }) {
    const fields = [];
    const values = [];

    if (street !== undefined) { fields.push('street = ?'); values.push(street); }
    if (city !== undefined) { fields.push('city = ?'); values.push(city); }
    if (state !== undefined) { fields.push('state = ?'); values.push(state); }
    if (postalCode !== undefined) { fields.push('postal_code = ?'); values.push(postalCode); }
    if (country !== undefined) { fields.push('country = ?'); values.push(country); }
    if (radius !== undefined) { fields.push('radius = ?'); values.push(radius); }
    if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    if (lat !== undefined && lon !== undefined) {
      fields.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
      fields.push('hash = ST_GeoHash(?, ?, 12)');
      values.push(Number(lon), Number(lat));
    }

    if (fields.length === 0) {
      const current = await this.getById(id);
      if (!current) throw new ApiError(404, 'Address not found');
      return current;
    }

    values.push(id);
    const result = await this.#fastify.db.query(
      `UPDATE address SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) throw new ApiError(404, 'Address not found');

    if (enabled !== undefined || (lat !== undefined && lon !== undefined)) {
      await this.#fastify.controller.matching.update(id);
    }

    return this.getById(id);
  }

  /**
   * Delete an address by its primary key.
   *
   * @param {number} id
   * @returns {Promise<void>}
   * @throws {ApiError} 404 – if address not found.
   */
  async delete(id) {
    const result = await this.#fastify.db.query('DELETE FROM address WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new ApiError(404, 'Address not found');
  }

  /**
   * @param {Object} row
   * @returns {AddressResult}
   */
  #map(row) {
    return {
      id: Number(row.id),
      radius: Number(row.radius),
      enabled: row.enabled === 1,
      street: row.street,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      lat: row.lat != null ? Number(row.lat) : null,
      lon: row.lon != null ? Number(row.lon) : null,
    };
  }
}
