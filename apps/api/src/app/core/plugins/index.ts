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
import { RabbitMQAuditWorker } from '../workers/rabbitmq-audit-worker';
import { RedisWorker } from '../workers/redis-worker';

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
  const config = fastify.config as any;
  await registerAuditMiddleware(fastify, {
    enabled: config.AUDIT_ENABLED === 'true' && config.NODE_ENV !== 'test',
    excludeRoutes: config.AUDIT_EXCLUDE_ROUTES ? config.AUDIT_EXCLUDE_ROUTES.split(',').map((r: string) => r.trim()) : ['/health', '/ready', '/docs', '/docs/*'],
    excludeMethods: config.AUDIT_EXCLUDE_METHODS ? config.AUDIT_EXCLUDE_METHODS.split(',').map((m: string) => m.trim()) : ['GET', 'HEAD', 'OPTIONS'],
    includeDomains: config.AUDIT_INCLUDE_DOMAINS ? config.AUDIT_INCLUDE_DOMAINS.split(',').map((d: string) => d.trim()) : [],
    excludeDomains: config.AUDIT_EXCLUDE_DOMAINS ? config.AUDIT_EXCLUDE_DOMAINS.split(',').map((d: string) => d.trim()) : [],
    logSuccessOnly: config.AUDIT_SUCCESS_ONLY === 'true',
    logRequestBody: config.AUDIT_LOG_BODY === 'true',
    logResponseBody: false,
    maxBodySize: parseInt(config.AUDIT_MAX_BODY_SIZE, 10)
  });

  // Start audit workers based on adapter type
  if (fastify.config.AUDIT_ENABLED === 'true') {
    if (fastify.config.AUDIT_ADAPTER === 'redis') {
      const redisWorker = new RedisWorker(fastify);
      await redisWorker.initialize();
      await redisWorker.start();
      
      // Expose worker for monitoring
      fastify.decorate('auditRedisWorker', redisWorker);
      
      // Graceful shutdown
      fastify.addHook('onClose', async () => {
        await redisWorker.stop();
      });

      fastify.log.info('✅ Redis audit worker started');
      
    } else if (fastify.config.AUDIT_ADAPTER === 'rabbitmq') {
      const rabbitMQWorker = new RabbitMQAuditWorker(fastify, fastify.knex);
      await rabbitMQWorker.initialize();
      await rabbitMQWorker.start();
      
      // Expose worker for monitoring
      fastify.decorate('rabbitMQWorker', rabbitMQWorker);
      
      // Graceful shutdown
      fastify.addHook('onClose', async () => {
        await rabbitMQWorker.stop();
      });

      fastify.log.info('✅ RabbitMQ audit worker started');
    }
  }

  fastify.log.info('✅ Core plugins loaded successfully');
};

export default fp(corePlugins, {
  name: 'core-plugins',
});
