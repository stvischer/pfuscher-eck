import fp from 'fastify-plugin';
import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {Record<string, unknown>} SchemaNode
 */

/**
 * Fastify plugin that recursively loads all schema modules from the `schemas/`
 * directory and exposes them as a nested object on `fastify.schema`.
 *
 * @type {import('fastify-plugin').FastifyPluginAsync}
 */
export default fp(async (fastify) => {
  /** @type {SchemaNode} */
  const schemaRoot = {};

  /** @type {string} */
  const schemasDir = join(process.cwd(), 'schemas');

  try {
    const files = await readdir(schemasDir, { recursive: true, withFileTypes: true });

    for (const file of files) {
      if (file.isFile() && /\.(js|ts)$/.test(file.name)) {
        /** @type {string} */
        const fullPath = join(file.parentPath || file.path, file.name);

        /** @type {string[]} */
        const segments = fullPath
          .replace(schemasDir + sep, '')
          .replace(/\.[^/.]+$/, '')
          .split(sep);

        const module = await import(pathToFileURL(fullPath).href);

        /** @type {SchemaNode | undefined} */
        const schema = module.default || module.Schema;

        if (schema) {
          /** @type {SchemaNode} */
          let current = schemaRoot;
          for (let i = 0; i < segments.length; i++) {
            const part = segments[i];
            if (i === segments.length - 1) {
              current[part] = schema;
            } else {
              current[part] = /** @type {SchemaNode} */ (current[part] || {});
              current = /** @type {SchemaNode} */ (current[part]);
            }
          }
        }
      }
    }

    fastify.decorate('schema', schemaRoot);
  } catch (err) {
    fastify.log.error(`Schema-Loader Fehler: ${err.message}`);
  }
});
