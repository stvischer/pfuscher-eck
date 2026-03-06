import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import autoload from '@fastify/autoload';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { setBaseLogger, getLoggerConfig } from './lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: { type: 'integer', default: 3001 },
    NODE_ENV: { type: 'string', default: 'development' },
    REDIS_URL: { type: 'string', default: 'redis://localhost:6379' },
    DB_HOST: { type: 'string', default: 'localhost' },
    DB_PORT: { type: 'integer', default: 3306 },
    DB_USER: { type: 'string', default: 'root' },
    DB_PASSWORD: { type: 'string', default: '' },
    DB_NAME: { type: 'string', default: 'pfuscher_eck' },
    CLIENT_URL: { type: 'string', default: 'http://localhost:3000' },
    JWT_SECRET: { type: 'string', default: 'changeme' },
  },
};

const fastify = Fastify({ logger: getLoggerConfig() });

setBaseLogger(fastify.log);

// env must be ready before any plugin that reads fastify.config
await fastify.register(fastifyEnv, { schema, dotenv: true, confKey: 'config' });

// Auto-load all plugins (auth, cors, mariadb, redis, socketio)
await fastify.register(autoload, {
  dir: join(__dirname, 'plugins'),
  forceESM: true,
});

// Auto-load all routes (auth, chat, health)
await fastify.register(autoload, {
  dir: join(__dirname, 'routes'),
  forceESM: true,
});

try {
  await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
