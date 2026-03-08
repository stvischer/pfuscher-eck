import fp from 'fastify-plugin';
import config from 'config';
import pino from 'pino';

/** @typedef {import('pino').TransportSingleOptions | import('pino').TransportMultiOptions} PinoTransport */
/** @typedef {{ level: string, transport?: PinoTransport }} LogConfig */
/** @typedef {import('pino').Bindings} Bindings */

/**
 * Normalizes the raw transport value from config into a valid Pino transport object.
 * Accepts string shorthands like "pino-pretty" or "pretty-print".
 * @param {string | PinoTransport | null | undefined} rawTransport
 * @returns {PinoTransport | undefined}
 */
function normalizeTransport(rawTransport) {
  if (!rawTransport) return undefined;

  if (typeof rawTransport === 'string') {
    const normalized = rawTransport.toLowerCase().replace(/-/g, '');
    if (normalized === 'prettyprint' || normalized === 'pinopretty') {
      return { target: 'pino-pretty' };
    }
    return { target: rawTransport };
  }

  return rawTransport;
}

/**
 * Returns Pino options for the given module, merged with global config as fallback.
 * Omit `name` to get the global config.
 * @param {string} [name] - Module name from `logging.modules.<name>`
 * @returns {LogConfig}
 */
export function getLoggerConfig(name) {
  const global = config.get('logging.global');
  const raw =
    name && config.has(`logging.modules.${name}`)
      ? { ...global, ...config.get(`logging.modules.${name}`) }
      : global;

  const { level, transport: rawTransport } = raw;
  const transport = normalizeTransport(rawTransport);

  return { level, ...(transport !== undefined && { transport }) };
}

/** @type {import('pino').Logger} */
let logger = pino(getLoggerConfig());

/**
 * Replaces the base logger instance.
 * @param {import('pino').Logger} instance
 */
export function setBaseLogger(instance) {
  logger = instance;
}

/**
 * Returns a child logger bound to a module name.
 * The module may have its own config under `logging.modules.<name>`.
 * @param {string} name - Module name
 * @param {Bindings} [bindings] - Optional extra fields bound to every log line
 * @returns {import('pino').Logger}
 */
export function getLogger(name, bindings = {}) {
  return logger.child({ module: name, ...bindings }, getLoggerConfig(name));
}

/**
 * Factory for plugin / module loggers. Call once at module level.
 * Use `.child()` on the result to add per-request context.
 *
 * Per-module log level can be set in config:
 * ```yaml
 * logging:
 *   modules:
 *     mariadb:
 *       level: debug
 * ```
 *
 * @example
 * const log = createModuleLogger('mariadb');
 * log.debug({ query: sql, params }, 'executing query');
 *
 * // with per-request child:
 * const qlog = log.child({ requestId });
 * qlog.debug({ query: sql }, 'executing query');
 *
 * @param {string} name - Module name
 * @param {Bindings} [bindings] - Optional extra fields bound to every log line
 * @returns {import('pino').Logger}
 */
export function createModuleLogger(name, bindings = {}) {
  return getLogger(name, bindings);
}

/**
 * Fastify plugin that wires the Fastify instance logger to the module-level
 * Pino instance and decorates the instance with logger helpers.
 *
 * After registration:
 * - `fastify.getLogger(name, bindings?)` – child logger for a named module
 * - `fastify.createModuleLogger(name, bindings?)` – alias for `getLogger`
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
async function loggingPlugin(fastify) {
  setBaseLogger(fastify.log);

  fastify.decorate('getLogger', getLogger);
  fastify.decorate('createModuleLogger', createModuleLogger);
}

export default fp(loggingPlugin, { name: 'logging' });
