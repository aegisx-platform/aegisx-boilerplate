import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const healthCheckPlugin: FastifyPluginAsync = async (fastify) => {
  // Health check cache to prevent resource exhaustion
  let healthCache: any = null;
  let lastHealthCheck = 0;
  const HEALTH_CACHE_TTL = 5000; // 5 seconds

  // Public health check endpoint (lightweight)
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          uptime: Type.Number(),
          database: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const now = Date.now();

    // Return cached result if still valid
    if (healthCache && now - lastHealthCheck < HEALTH_CACHE_TTL) {
      return healthCache;
    }

    try {
      await fastify.knex.raw('SELECT 1');

      healthCache = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: 'connected',
      };
      lastHealthCheck = now;

      return healthCache;
    } catch (error) {
      reply.code(503);
      const errorResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: 'disconnected',
      };

      // Cache error response for shorter time to retry sooner
      healthCache = errorResponse;
      lastHealthCheck = now - (HEALTH_CACHE_TTL - 2000); // Cache error for only 3 seconds

      return errorResponse;
    }
  });

  // Detailed health check for internal monitoring (more comprehensive)
  fastify.get('/health/detailed', {
    schema: {
      description: 'Detailed health check for internal monitoring',
      tags: ['Health'],
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          uptime: Type.Number(),
          version: Type.String(),
          environment: Type.String(),
          database: Type.Object({
            status: Type.String()
          }),
          memory: Type.Object({
            rss: Type.String(),
            heapUsed: Type.String(),
            heapTotal: Type.String()
          }),
          system: Type.Object({
            platform: Type.String(),
            nodeVersion: Type.String(),
            pid: Type.Number()
          })
        })
      }
    }
  }, async (request, reply) => {
    // Check if request is from internal network (basic IP whitelist)
    const clientIP = request.ip;
    const isInternal =
      clientIP === '127.0.0.1' ||
      clientIP === '::1' ||
      clientIP.startsWith('10.') ||
      clientIP.startsWith('192.168.') ||
      clientIP.startsWith('172.');

    if (!isInternal) {
      reply.code(403);
      return { error: 'Access denied' };
    }

    try {
      await fastify.knex.raw('SELECT 1');
      const dbHealthy = true;
      const memUsage = process.memoryUsage();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbHealthy ? 'connected' : 'disconnected',
        },
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
        },
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        database: 'disconnected',
      };
    }
  });

  // Readiness check endpoint
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check endpoint',
      tags: ['Health'],
      response: {
        200: Type.Object({
          ready: Type.Boolean(),
          services: Type.Object({
            database: Type.Boolean()
          })
        })
      }
    }
  }, async (request, reply) => {
    let dbReady = false;
    
    try {
      await fastify.knex.raw('SELECT 1');
      dbReady = true;
    } catch (error) {
      fastify.log.error('Database readiness check failed:', error);
      reply.status(503);
    }

    const ready = dbReady;

    return {
      ready,
      services: {
        database: dbReady
      }
    };
  });

  fastify.log.info('✅ Health check endpoints registered');
};

export default fp(healthCheckPlugin, {
  name: 'health-check-plugin',
  dependencies: ['knex-plugin']
});