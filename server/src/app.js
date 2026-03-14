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

  app.setErrorHandler((error, request, reply) => {
    // Falls der Fehler eine statusCode-Eigenschaft hat, nutze sie, sonst 500
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500;

    request.log.error(error); // Logge den Fehler intern

    reply.status(statusCode).send({
      status: 'error',
      code: statusCode,
      message:
        typeof error === 'object' && error !== null && 'message' in error
          ? error.message
          : 'Interner Serverfehler',
    });
  });

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
