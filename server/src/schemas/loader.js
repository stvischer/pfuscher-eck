import fs from 'node:fs/promises';
import path from 'node:path';

/** @import { FastifyInstance } from 'fastify' */

/**
 * Recursively loads all JSON schema files from the current directory and
 * registers them with Fastify via {@link FastifyInstance.addSchema}.
 *
 * Each schema is assigned a `$id` derived from its relative file path,
 * with path separators replaced by dots and the `.json` extension removed.
 *
 * @example
 * // schemas/user/create.json → $id: "user.create"
 *
 * @param {FastifyInstance} fastify - The Fastify instance to register schemas on.
 * @returns {Promise<void>}
 */
export default async function loadSchemas(fastify) {
  const files = await fs.readdir(import.meta.dirname, { recursive: true });

  await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        const name = path.join(path.dirname(file), path.parse(file).name).split(path.sep).join('.');

        const content = await fs.readFile(path.join(import.meta.dirname, file), 'utf-8');

        fastify.addSchema({ $id: name, ...JSON.parse(content) });
      }),
  );
}
