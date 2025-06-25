import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { registerAuditMiddleware } from '../shared/middleware/audit-log-middleware';
import { RabbitMQAuditWorker } from '../workers/rabbitmq-audit-worker';
import { RedisWorker } from '../workers/redis-worker';

/**
 * Audit System Plugin
 * 
 * Handles audit logging middleware registration and worker initialization
 * based on the configured adapter type (direct, redis, rabbitmq).
 */
async function auditPlugin(fastify: FastifyInstance): Promise<void> {
  const config = fastify.config as any;

  // Register audit logging middleware
  await registerAuditMiddleware(fastify, {
    enabled: config.AUDIT_ENABLED === 'true' && config.NODE_ENV !== 'test',
    excludeRoutes: config.AUDIT_EXCLUDE_ROUTES 
      ? config.AUDIT_EXCLUDE_ROUTES.split(',').map((r: string) => r.trim()) 
      : ['/health', '/ready', '/docs', '/docs/*'],
    excludeMethods: config.AUDIT_EXCLUDE_METHODS 
      ? config.AUDIT_EXCLUDE_METHODS.split(',').map((m: string) => m.trim()) 
      : ['GET', 'HEAD', 'OPTIONS'],
    includeDomains: config.AUDIT_INCLUDE_DOMAINS 
      ? config.AUDIT_INCLUDE_DOMAINS.split(',').map((d: string) => d.trim()) 
      : [],
    excludeDomains: config.AUDIT_EXCLUDE_DOMAINS 
      ? config.AUDIT_EXCLUDE_DOMAINS.split(',').map((d: string) => d.trim()) 
      : [],
    logSuccessOnly: config.AUDIT_SUCCESS_ONLY === 'true',
    logRequestBody: config.AUDIT_LOG_BODY === 'true',
    logResponseBody: false,
    maxBodySize: parseInt(config.AUDIT_MAX_BODY_SIZE, 10)
  });

  // Start audit workers based on adapter type
  if (config.AUDIT_ENABLED === 'true') {
    
    if (config.AUDIT_ADAPTER === 'redis') {
      await initializeRedisWorker(fastify);
      
    } else if (config.AUDIT_ADAPTER === 'rabbitmq') {
      await initializeRabbitMQWorker(fastify);
    }
    
    fastify.log.info(`✅ Audit system initialized with ${config.AUDIT_ADAPTER} adapter`);
  } else {
    fastify.log.info('ℹ️ Audit system disabled');
  }
}

/**
 * Initialize Redis audit worker
 */
async function initializeRedisWorker(fastify: FastifyInstance): Promise<void> {
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
}

/**
 * Initialize RabbitMQ audit worker
 */
async function initializeRabbitMQWorker(fastify: FastifyInstance): Promise<void> {
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

export default fp(auditPlugin, {
  name: 'audit-plugin',
  dependencies: ['env-plugin', 'knex-plugin', 'redis-plugin']
});