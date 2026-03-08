import fastify from 'fastify';
import autoload from '@fastify/autoload';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from 'config';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { getLoggerConfig } from './plugins/logging.js';

const autoloadDitectory = dirname(fileURLToPath(import.meta.url));

export default async function buildApp(opts = {}) {
  const app = fastify(Object.assign(opts, { logger: getLoggerConfig() }));

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', config);

  // Auto-load all plugins (auth, cors, logging, mariadb, redis, socketio, schemas)
  await app.register(autoload, {
    dir: join(autoloadDitectory, 'plugins'),
    forceESM: true,
  });

  // Auto-load all controllers
  await app.register(autoload, {
    dir: join(autoloadDitectory, 'controller'),
    indexPattern: /^loader.js$/i,
  });

  // Auto-load all routes (auth, chat, health)
  await app.register(autoload, {
    dir: join(autoloadDitectory, 'routes'),
    forceESM: true,
  });

  app.get('/ping', async () => ({ res: 'pong' }));

  return app;
}
