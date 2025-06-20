import { FastifyInstance } from 'fastify';
import v1Routes from './v1';

const apiRoutes = async (fastify: FastifyInstance) => {
  // Health check cache to prevent resource exhaustion
  let healthCache: any = null;
  let lastHealthCheck = 0;
  const HEALTH_CACHE_TTL = 5000; // 5 seconds

  // Public health check endpoint (lightweight)
  fastify.get('/health', async (request, reply) => {
    const now = Date.now();

    // Return cached result if still valid
    if (healthCache && now - lastHealthCheck < HEALTH_CACHE_TTL) {
      return healthCache;
    }

    try {
      const dbHealthy = await fastify.db.healthCheck();

      healthCache = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: dbHealthy ? 'connected' : 'disconnected',
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
  fastify.get('/health/detailed', async (request, reply) => {
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
      const dbHealthy = await fastify.db.healthCheck();
      const memUsage = process.memoryUsage();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbHealthy ? 'connected' : 'disconnected',
          // Could add more DB metrics here if needed
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

  // API root endpoint
  fastify.get('/', async (request, reply) => {
    return { message: 'AegisX API V1.0' };
  });

  // Register versioned API routes
  await fastify.register(v1Routes, { prefix: '/api/v1' });

  fastify.log.info('✅ API routes loaded with versioning');
};

export default apiRoutes;
