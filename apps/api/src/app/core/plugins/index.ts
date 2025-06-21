import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Core plugins (manual register with specific order)
import env from './env';
import redis from './database/redis';
import knex from './database/knex';
import sensible from './validation/sensible';
import jwt from './security/jwt';
import rateLimit from './security/rate-limit';
import helmet from './security/helmet';
import swagger from './docs/swagger';
import rbac from './security/rbac';
import underPressure from './monitoring/under-pressure';
import healthCheck from './monitoring/health-check';
import { registerAuditMiddleware } from '../shared/middleware/audit-log-middleware';

const corePlugins: FastifyPluginAsync = async (fastify) => {
  // Load core plugins in specific order
  await fastify.register(env);
  await fastify.register(sensible);
  await fastify.register(redis);
  await fastify.register(knex);
  await fastify.register(jwt);
  await fastify.register(rateLimit);
  await fastify.register(helmet);
  await fastify.register(underPressure);
  await fastify.register(swagger);
  await fastify.register(rbac);
  await fastify.register(healthCheck);

  // Register audit logging middleware
  registerAuditMiddleware(fastify, {
    enabled: true,
    excludeRoutes: ['/health', '/ready', '/docs', '/docs/*'],
    excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
    logSuccessOnly: false,
    logRequestBody: true,
    logResponseBody: false,
    maxBodySize: 1024 * 10 // 10KB
  });

  fastify.log.info('✅ Core plugins loaded successfully');
};

export default fp(corePlugins, {
  name: 'core-plugins',
});
