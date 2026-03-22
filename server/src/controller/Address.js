import ApiError from '../lib/errors/ApiError.js';

/**
 * @module controller/Address
 * @description Address controller: CRUD operations for entity addresses.
 *
 * Supports three address types:
 * - **offer**   – user skill offer location (1 per user)
 * - **request** – repair request location (1 per repair)
 * - **meeting** – meeting location (1 per meeting)
 */

/**
 * Valid address types.
 * @typedef {'offer' | 'request' | 'meeting'} AddressType
 */

/**
 * Mapped address object returned to clients (with type/entityId).
 *
 * @typedef {Object} AddressResult
 * @property {number}      id         - address.id
 * @property {AddressType} type       - entity type
 * @property {number}      entityId   - owning entity ID
 * @property {number}      radius     - search/service radius in km
 * @property {boolean}     enabled    - whether address participates in matching
 * @property {string}      street
 * @property {string}      city
 * @property {string}      state
 * @property {string}      postalCode
 * @property {string}      country
 * @property {number}      lat
 * @property {number}      lon
 */

/**
 * Mapped user address object (via FK, no type/entityId).
 *
 * @typedef {Object} UserAddressResult
 * @property {number}      id         - address.id
 * @property {number}      radius     - search/service radius in km
 * @property {boolean}     enabled    - whether address participates in matching
 * @property {string}      street
 * @property {string}      city
 * @property {string}      state
 * @property {string}      postalCode
 * @property {string}      country
 * @property {number}      lat
 * @property {number}      lon
 */

/**
 * Handles entity address operations.
 */
export default class Address {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} */
  #fastify;

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} fastify
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * Get address by type and entity ID.
   *
   * @param {AddressType} type
   * @param {number} entityId
   * @returns {Promise<AddressResult | null>}
   */
  async get(type, entityId) {
    const row = await this.#fastify.db.queryOne(
      `SELECT
         id, type, entity_id, radius, enabled,
         street, city, state, postal_code, country,
         ST_Y(location) AS lat, ST_X(location) AS lon
       FROM address
       WHERE type = ? AND entity_id = ?`,
      [type, entityId],
    );
    return row ? this.#mapAddress(row) : null;
  }

  /**
   * Create or update an address for an entity (upsert by type + entityId).
   *
   * @param {AddressType} type
   * @param {number} entityId
   * @param {Object} data
   * @param {number} [data.radius=20]  - service/search radius in km
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
  async upsert(
    type,
    entityId,
    { radius = 20, enabled = true, street, city, state = '', postalCode, country, lat, lon },
  ) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const existing = await transaction.queryOne(
        'SELECT id FROM address WHERE type = ? AND entity_id = ? LIMIT 1',
        [type, entityId],
      );

      let created = false;
      let addressId;

      if (existing) {
        addressId = existing.id;

        const fields = [];
        const values = [];

        if (street !== undefined) {
          fields.push('street = ?');
          values.push(street);
        }
        if (city !== undefined) {
          fields.push('city = ?');
          values.push(city);
        }
        if (state !== undefined) {
          fields.push('state = ?');
          values.push(state);
        }
        if (postalCode !== undefined) {
          fields.push('postal_code = ?');
          values.push(postalCode);
        }
        if (country !== undefined) {
          fields.push('country = ?');
          values.push(country);
        }
        if (radius !== undefined) {
          fields.push('radius = ?');
          values.push(radius);
        }
        if (enabled !== undefined) {
          fields.push('enabled = ?');
          values.push(enabled ? 1 : 0);
        }
        if (lat !== undefined && lon !== undefined) {
          fields.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
          fields.push('hash = ST_GeoHash(?, ?, 12)');
          values.push(Number(lon), Number(lat));
        }

        if (fields.length > 0) {
          values.push(addressId);
          await transaction.query(`UPDATE address SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      } else {
        const res = await transaction.query(
          `INSERT INTO address (type, entity_id, street, city, state, postal_code, country, radius, enabled, hash, location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ST_GeoHash(?, ?, 12), ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326))`,
          [
            type,
            entityId,
            street,
            city,
            state,
            postalCode,
            country,
            radius,
            enabled ? 1 : 0,
            Number(lon),
            Number(lat),
          ],
        );
        addressId = Number(res.insertId);
        created = true;
      }

      await transaction.commit();

      const address = await this.get(type, entityId);
      return { created, address };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update an existing address by type and entity ID.
   *
   * @param {AddressType} type
   * @param {number} entityId
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
  async update(type, entityId, { radius, enabled, street, city, state, postalCode, country, lat, lon }) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const existing = await transaction.queryOne(
        'SELECT id FROM address WHERE type = ? AND entity_id = ? LIMIT 1',
        [type, entityId],
      );

      if (!existing) {
        throw new ApiError(404, 'Address not found');
      }

      const fields = [];
      const values = [];

      if (street !== undefined) {
        fields.push('street = ?');
        values.push(street);
      }
      if (city !== undefined) {
        fields.push('city = ?');
        values.push(city);
      }
      if (state !== undefined) {
        fields.push('state = ?');
        values.push(state);
      }
      if (postalCode !== undefined) {
        fields.push('postal_code = ?');
        values.push(postalCode);
      }
      if (country !== undefined) {
        fields.push('country = ?');
        values.push(country);
      }
      if (radius !== undefined) {
        fields.push('radius = ?');
        values.push(radius);
      }
      if (enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(enabled ? 1 : 0);
      }
      if (lat !== undefined && lon !== undefined) {
        fields.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
        fields.push('hash = ST_GeoHash(?, ?, 12)');
        values.push(Number(lon), Number(lat));
      }

      if (fields.length > 0) {
        values.push(existing.id);
        await transaction.query(`UPDATE address SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      await transaction.commit();

      return this.get(type, entityId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete an address by type and entity ID.
   *
   * @param {AddressType} type
   * @param {number} entityId
   * @returns {Promise<void>}
   * @throws {ApiError} 404 – if address not found.
   */
  async delete(type, entityId) {
    const existing = await this.#fastify.db.queryOne(
      'SELECT id FROM address WHERE type = ? AND entity_id = ? LIMIT 1',
      [type, entityId],
    );

    if (!existing) {
      throw new ApiError(404, 'Address not found');
    }

    await this.#fastify.db.query('DELETE FROM address WHERE id = ?', [existing.id]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User-specific methods (using user.address_id FK)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get address for a user via user.address_id FK.
   *
   * @param {number} userId
   * @returns {Promise<UserAddressResult | null>}
   */
  async getForUser(userId) {
    const row = await this.#fastify.db.queryOne(
      `SELECT
         a.id, a.radius, a.enabled,
         a.street, a.city, a.state, a.postal_code, a.country,
         ST_Y(a.location) AS lat, ST_X(a.location) AS lon
       FROM user u
       JOIN address a ON a.id = u.address_id
       WHERE u.id = ?`,
      [userId],
    );
    return row ? this.#mapUserAddress(row) : null;
  }

  /**
   * Create or update address for a user (upsert via user.address_id FK).
   *
   * @param {number} userId
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
   * @returns {Promise<{ created: boolean, address: UserAddressResult }>}
   */
  async upsertForUser(
    userId,
    { radius = 20, enabled = true, street, city, state = '', postalCode, country, lat, lon },
  ) {
    const transaction = await this.#fastify.db.transaction();

    try {
      // Check if user already has an address
      const user = await transaction.queryOne('SELECT address_id FROM user WHERE id = ?', [userId]);

      let created = false;
      let addressId = user?.address_id;

      if (addressId) {
        // Update existing address
        const fields = [];
        const values = [];

        if (street !== undefined) {
          fields.push('street = ?');
          values.push(street);
        }
        if (city !== undefined) {
          fields.push('city = ?');
          values.push(city);
        }
        if (state !== undefined) {
          fields.push('state = ?');
          values.push(state);
        }
        if (postalCode !== undefined) {
          fields.push('postal_code = ?');
          values.push(postalCode);
        }
        if (country !== undefined) {
          fields.push('country = ?');
          values.push(country);
        }
        if (radius !== undefined) {
          fields.push('radius = ?');
          values.push(radius);
        }
        if (enabled !== undefined) {
          fields.push('enabled = ?');
          values.push(enabled ? 1 : 0);
        }
        if (lat !== undefined && lon !== undefined) {
          fields.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
          fields.push('hash = ST_GeoHash(?, ?, 12)');
          values.push(Number(lon), Number(lat));
        }

        if (fields.length > 0) {
          values.push(addressId);
          await transaction.query(`UPDATE address SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      } else {
        // Create new address and link to user
        const res = await transaction.query(
          `INSERT INTO address (type, street, city, state, postal_code, country, radius, enabled, hash, location)
           VALUES ('offer', ?, ?, ?, ?, ?, ?, ?, ST_GeoHash(?, ?, 12), ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326))`,
          [street, city, state, postalCode, country, radius, enabled ? 1 : 0, Number(lon), Number(lat)],
        );
        addressId = Number(res.insertId);
        created = true;

        // Update user.address_id
        await transaction.query('UPDATE user SET address_id = ? WHERE id = ?', [addressId, userId]);
      }

      await transaction.commit();

      const address = await this.getForUser(userId);
      return { created, address };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update address for a user via user.address_id FK.
   *
   * @param {number} userId
   * @param {Object} data
   * @returns {Promise<UserAddressResult>}
   * @throws {ApiError} 404 – if user has no address.
   */
  async updateForUser(userId, { radius, enabled, street, city, state, postalCode, country, lat, lon }) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const user = await transaction.queryOne('SELECT address_id FROM user WHERE id = ?', [userId]);

      if (!user?.address_id) {
        throw new ApiError(404, 'Address not found');
      }

      const fields = [];
      const values = [];

      if (street !== undefined) {
        fields.push('street = ?');
        values.push(street);
      }
      if (city !== undefined) {
        fields.push('city = ?');
        values.push(city);
      }
      if (state !== undefined) {
        fields.push('state = ?');
        values.push(state);
      }
      if (postalCode !== undefined) {
        fields.push('postal_code = ?');
        values.push(postalCode);
      }
      if (country !== undefined) {
        fields.push('country = ?');
        values.push(country);
      }
      if (radius !== undefined) {
        fields.push('radius = ?');
        values.push(radius);
      }
      if (enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(enabled ? 1 : 0);
      }
      if (lat !== undefined && lon !== undefined) {
        fields.push(`location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`);
        fields.push('hash = ST_GeoHash(?, ?, 12)');
        values.push(Number(lon), Number(lat));
      }

      if (fields.length > 0) {
        values.push(user.address_id);
        await transaction.query(`UPDATE address SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      await transaction.commit();

      return this.getForUser(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete address for a user (clears user.address_id and deletes address row).
   *
   * @param {number} userId
   * @returns {Promise<void>}
   * @throws {ApiError} 404 – if user has no address.
   */
  async deleteForUser(userId) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const user = await transaction.queryOne('SELECT address_id FROM user WHERE id = ?', [userId]);

      if (!user?.address_id) {
        throw new ApiError(404, 'Address not found');
      }

      // Clear the FK first, then delete the address
      await transaction.query('UPDATE user SET address_id = NULL WHERE id = ?', [userId]);
      await transaction.query('DELETE FROM address WHERE id = ?', [user.address_id]);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Map a database row to an AddressResult object.
   *
   * @param {Object} row
   * @returns {AddressResult}
   */
  #mapAddress(row) {
    return {
      id: Number(row.id),
      type: row.type,
      entityId: Number(row.entity_id),
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

  /**
   * Map a database row to a UserAddressResult (user FK version, no type/entityId).
   *
   * @param {Object} row
   * @returns {UserAddressResult}
   */
  #mapUserAddress(row) {
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
