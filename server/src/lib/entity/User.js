import helper from '../helper/address.js';

export default class User {
  constructur(fastify) {
    fastify.log.info('User plugin loaded')
    this.fastify = fastify;
  }

  async loadAddresses(id) {
    const result = await this.fastify.db.query(`
      SELECT
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
       ORDER  BY ua.id
      `, [id]);
    return result.map(helper.map)
  }
}