import { format} from'sql-formatter';
import { getLogger } from '../logger.js'

const instances = {};

export class DBLogger {
  #logger;

  constructor(name) {
    this.#logger= getLogger(name);

    ['warn', 'fatal', 'trace', 'silent', 'child'].forEach((method) => {
      this[method] = this.#logger[method].bind(this.#logger);
    })
  }

  debug(sql, params) {
    this.#logger.debug(format(sql, {params, language: 'mariadb'}))
  }

  error(error, sql, params) {
    this.#logger.error({
      message: error.message,
      code: error.code,
      sql: sql ? format(sql, { params, language: 'mariadb' }) : undefined,
    })
  }
}

export function getLogger(name) {
  if (!instances[name]) {
    instances[name] = new DBLogger(name)
  }
  return instances[name];
}