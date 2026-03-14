import ApiError from '../lib/errors/ApiError.js';

/**
 * @module controller/Address
 * @description Address controller: CRUD operations for user addresses.
 */

/**
 * Mapped address object returned to clients.
 *
 * @typedef {Object} AddressResult
 * @property {number} id - user_addresses.id (relation row ID)
 * @property {number} addressId - addresses.id
 * @property {string} addressType
 * @property {number|null} radiusM
 * @property {string|null} street
 * @property {string|null} city
 * @property {string|null} state
 * @property {string|null} postalCode
 * @property {string|null} country
 * @property {number|null} lat
 * @property {number|null} lon
 */

/**
 * Handles user address operations.
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
   * List all addresses for a user.
   *
   * @param {number} userId
   * @returns {Promise<AddressResult[]>}
   */
  async listForUser(userId) {
    const rows = await this.#fastify.db.query(
      `SELECT
         ua.id           AS relation_id,
         ua.address_type,
         ua.radius_m,
         a.id            AS address_id,
         a.street,
         a.city,
         a.state,
         a.postal_code,
         a.country,
         ST_Y(a.location) AS lat,
         ST_X(a.location) AS lon
       FROM   user_addresses ua
       JOIN   addresses a ON a.id = ua.address_id
       WHERE  ua.user_id = ?
       ORDER  BY ua.id`,
      [userId],
    );
    return rows.map(this.#mapAddress);
  }

  /**
   * Create or update an address for a user (upsert by addressType).
   *
   * @param {number} userId
   * @param {Object} data
   * @param {string} [data.addressType='home']
   * @param {number|null} [data.radiusM]
   * @param {string} [data.street]
   * @param {string} [data.city]
   * @param {string} [data.state]
   * @param {string} [data.postalCode]
   * @param {string} [data.country]
   * @param {number|null} [data.lat]
   * @param {number|null} [data.lon]
   * @returns {Promise<{ created: boolean, addresses: AddressResult[] }>}
   */
  async upsert(
    userId,
    { addressType = 'home', radiusM, street, city, state, postalCode, country, lat, lon },
  ) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const existing = await transaction.queryOne(
        'SELECT ua.id AS rel_id, ua.address_id FROM user_addresses ua WHERE ua.user_id = ? AND ua.address_type = ? LIMIT 1',
        [userId, addressType],
      );

      let created = false;

      if (existing) {
        // Update existing address
        const addrFields = [];
        const addrValues = [];

        if (street !== undefined) {
          addrFields.push('street = ?');
          addrValues.push(street || null);
        }
        if (city !== undefined) {
          addrFields.push('city = ?');
          addrValues.push(city || null);
        }
        if (state !== undefined) {
          addrFields.push('state = ?');
          addrValues.push(state || null);
        }
        if (postalCode !== undefined) {
          addrFields.push('postal_code = ?');
          addrValues.push(postalCode || null);
        }
        if (country !== undefined) {
          addrFields.push('country = ?');
          addrValues.push(country || null);
        }
        if (lat !== undefined || lon !== undefined) {
          addrFields.push(
            lat != null && lon != null
              ? `location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
              : 'location = NULL',
          );
        }

        if (addrFields.length > 0) {
          addrValues.push(existing.address_id);
          await transaction.query(
            `UPDATE addresses SET ${addrFields.join(', ')} WHERE id = ?`,
            addrValues,
          );
        }

        if (radiusM !== undefined) {
          await transaction.query('UPDATE user_addresses SET radius_m = ? WHERE id = ?', [
            radiusM ?? null,
            existing.rel_id,
          ]);
        }
      } else {
        // Create new address
        const locationExpr =
          lat != null && lon != null
            ? `ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
            : 'NULL';

        const res = await transaction.query(
          `INSERT INTO addresses (street, city, state, postal_code, country, location)
           VALUES (?, ?, ?, ?, ?, ${locationExpr})`,
          [street ?? null, city ?? null, state ?? null, postalCode ?? null, country ?? null],
        );

        await transaction.query(
          'INSERT INTO user_addresses (user_id, address_id, address_type, radius_m) VALUES (?, ?, ?, ?)',
          [userId, Number(res.insertId), addressType, radiusM ?? null],
        );

        created = true;
      }

      await transaction.commit();

      const addresses = await this.listForUser(userId);
      return { created, addresses };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update an existing address by relation ID.
   *
   * @param {number} userId
   * @param {number} relationId - user_addresses.id
   * @param {Object} data
   * @returns {Promise<AddressResult[]>}
   * @throws {ApiError} 404 – if address not found.
   */
  async update(
    userId,
    relationId,
    { addressType, radiusM, street, city, state, postalCode, country, lat, lon },
  ) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const rel = await transaction.queryOne(
        'SELECT ua.id, ua.address_id FROM user_addresses ua WHERE ua.id = ? AND ua.user_id = ? LIMIT 1',
        [relationId, userId],
      );

      if (!rel) {
        throw new ApiError(404, 'Address not found');
      }

      // Update address fields
      const addrFields = [];
      const addrValues = [];

      if (street !== undefined) {
        addrFields.push('street = ?');
        addrValues.push(street || null);
      }
      if (city !== undefined) {
        addrFields.push('city = ?');
        addrValues.push(city || null);
      }
      if (state !== undefined) {
        addrFields.push('state = ?');
        addrValues.push(state || null);
      }
      if (postalCode !== undefined) {
        addrFields.push('postal_code = ?');
        addrValues.push(postalCode || null);
      }
      if (country !== undefined) {
        addrFields.push('country = ?');
        addrValues.push(country || null);
      }
      if (lat !== undefined && lon !== undefined) {
        addrFields.push(
          lat != null && lon != null
            ? `location = ST_GeomFromText('POINT(${Number(lon)} ${Number(lat)})', 4326)`
            : 'location = NULL',
        );
      }

      if (addrFields.length > 0) {
        addrValues.push(rel.address_id);
        await transaction.query(
          `UPDATE addresses SET ${addrFields.join(', ')} WHERE id = ?`,
          addrValues,
        );
      }

      // Update relation fields
      const relFields = [];
      const relValues = [];

      if (addressType !== undefined) {
        relFields.push('address_type = ?');
        relValues.push(addressType);
      }
      if (radiusM !== undefined) {
        relFields.push('radius_m = ?');
        relValues.push(radiusM ?? null);
      }

      if (relFields.length > 0) {
        relValues.push(rel.id);
        await transaction.query(
          `UPDATE user_addresses SET ${relFields.join(', ')} WHERE id = ?`,
          relValues,
        );
      }

      await transaction.commit();

      return this.listForUser(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete an address by relation ID.
   *
   * @param {number} userId
   * @param {number} relationId - user_addresses.id
   * @returns {Promise<AddressResult[]>}
   * @throws {ApiError} 404 – if address not found.
   */
  async delete(userId, relationId) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const rel = await transaction.queryOne(
        'SELECT ua.id, ua.address_id FROM user_addresses ua WHERE ua.id = ? AND ua.user_id = ? LIMIT 1',
        [relationId, userId],
      );

      if (!rel) {
        throw new ApiError(404, 'Address not found');
      }

      await transaction.query('DELETE FROM user_addresses WHERE id = ?', [rel.id]);
      await transaction.query('DELETE FROM addresses WHERE id = ?', [rel.address_id]);

      await transaction.commit();

      return this.listForUser(userId);
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
      id: Number(row.relation_id),
      addressId: Number(row.address_id),
      addressType: row.address_type,
      radiusM: row.radius_m != null ? Number(row.radius_m) : null,
      street: row.street ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      postalCode: row.postal_code ?? null,
      country: row.country ?? null,
      lat: row.lat != null ? Number(row.lat) : null,
      lon: row.lon != null ? Number(row.lon) : null,
    };
  }
}
