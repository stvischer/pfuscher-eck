import { format } from 'sql-formatter';
import { getLogger as getPinoLogger } from '../../plugins/logging.js';

const instances = {};

export class DBLogger {
  #logger;

  constructor(name) {
    this.#logger = getPinoLogger(name);

    ['warn', 'fatal', 'trace', 'silent', 'child'].forEach((method) => {
      this[method] = this.#logger[method].bind(this.#logger);
    });
  }

  debug(sql, params) {
    const stringParams = params?.map(String);
    this.#logger.debug(format(sql, { params: stringParams, language: 'mariadb' }));
  }

  error(error, sql, params) {
    const stringParams = params?.map(String);
    this.#logger.error({
      message: error.message,
      code: error.code,
      sql: sql ? format(sql, { params: stringParams, language: 'mariadb' }) : undefined,
    });
  }
}

export function getLogger(name) {
  if (!instances[name]) {
    instances[name] = new DBLogger(name);
  }
  return instances[name];
}
