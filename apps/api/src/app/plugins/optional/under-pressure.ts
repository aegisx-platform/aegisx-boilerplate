import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import underPressure from '@fastify/under-pressure';

/**
 * This plugin monitors process health and provides circuit breaker functionality
 * It helps prevent server overload by monitoring memory, CPU, and event loop delay
 *
 * @see https://github.com/fastify/under-pressure
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(underPressure, {
    // Maximum memory usage in bytes (500MB)
    maxEventLoopDelay: 1000, // milliseconds
    maxHeapUsedBytes: 500 * 1024 * 1024, // 500MB
    maxRssBytes: 500 * 1024 * 1024, // 500MB
    maxEventLoopUtilization: 0.98, // 98% utilization

    // Health check configuration
    message: 'Service temporarily unavailable due to high load',
    retryAfter: 50, // seconds

    // Custom health check function
    healthCheck: async function () {
      // Add custom health checks here
      // For example, check database connectivity
      return { status: 'ok', timestamp: new Date().toISOString() };
    },

    // Health check endpoint configuration
    healthCheckInterval: 5000, // 5 seconds

    // Expose metrics endpoint
    exposeStatusRoute: {
      routeOpts: {
        logLevel: 'silent' // don't log health check requests
      },
      url: '/health', // health check endpoint
      routeSchemaOpts: {
        hide: false // hide from swagger docs
      }
    },

    // Custom pressure handler
    pressureHandler: (req, rep, type, value) => {
      // Log the pressure event
      req.log.warn(`Server under pressure: ${type} = ${value}`);

      // Send appropriate response based on pressure type
      rep.code(503).send({
        error: 'Service Unavailable',
        message: 'Server is currently under pressure',
        type: type,
        value: value,
        retryAfter: 50
      });
    },

    // Sample interval for monitoring
    sampleInterval: 1000 // 1 second
  });

  // Add custom metrics endpoint
  fastify.get('/metrics', {
    schema: {
      hide: true, // hide from swagger
      response: {
        200: {
          type: 'object',
          properties: {
            memoryUsage: { type: 'object' },
            eventLoopDelay: { type: 'number' },
            eventLoopUtilization: { type: 'number' },
            uptime: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async () => {
    const memoryUsage = process.memoryUsage();

    return {
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      eventLoopDelay: 0,
      eventLoopUtilization: 0,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  });
});
