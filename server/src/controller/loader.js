import fp from 'fastify-plugin';
import fs from 'node:fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'node:url';

/**
 * Fastify plugin that auto-loads all controller files in this directory
 * and exposes them as `fastify.controller.<name>`.
 *
 * Supports both singleton controllers (via `getInstance`) and plain classes.
 *
 * @type {import('fastify').FastifyPluginAsync}
 */
export default fp(async (fastify) => {
  fastify.decorate('controller', {});

  const files = await fs.readdir(import.meta.dirname);
  const controllers = files.filter((f) => f.endsWith('.js') && f !== 'loader.js');

  await Promise.all(
    controllers.map(async (file) => {
      const fullPath = join(import.meta.dirname, file);
      const fileUrl = pathToFileURL(fullPath).href;
      const name = file.replace(/\.js$/, '').toLowerCase();

      const module = await import(fileUrl);
      const ControllerClass = module.default;

      if (ControllerClass) {
        if (typeof ControllerClass.getInstance === 'function') {
          fastify.controller[name] = ControllerClass.getInstance(fastify);
        } else if (typeof ControllerClass === 'function') {
          fastify.controller[name] = new ControllerClass(fastify);
        }

        fastify.log.debug(`Controller registriert: ${name}`);
      }
    }),
  );
});
