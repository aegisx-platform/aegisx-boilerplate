import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { HealthCheckService } from '../../shared/services/health-check.service';
import { HealthCheckConfig, HealthCheckOptions } from '../../shared/types/health-check.types';

declare module 'fastify' {
  interface FastifyInstance {
    healthChecker: HealthCheckService;
  }
}

export interface HealthCheckPluginOptions {
  config?: Partial<HealthCheckConfig>;
  enableAdvancedEndpoints?: boolean;
  enableMetrics?: boolean;
}

const healthCheckPlugin: FastifyPluginAsync<HealthCheckPluginOptions> = async (fastify, options = {}) => {
  // Wait for dependencies
  await fastify.after();

  const defaultOptions: HealthCheckPluginOptions = {
    config: {},
    enableAdvancedEndpoints: true,
    enableMetrics: true,
  };

  const pluginOptions = { ...defaultOptions, ...options };

  // Create health checker service
  const healthChecker = new HealthCheckService(fastify, pluginOptions.config);

  // Register the health checker with Fastify
  fastify.decorate('healthChecker', healthChecker);

  // Set up event listeners
  healthChecker.on('health-check-failed', (event) => {
    fastify.log.error('Health check failed:', event.data);
  });

  healthChecker.on('threshold-exceeded', (event) => {
    fastify.log.warn('Health thresholds exceeded:', event.data);
  });

  // Simple health check endpoint (lightweight)
  fastify.get('/health', {
    schema: {
      description: 'Simple health check endpoint',
      tags: ['Health'],
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          uptime: Type.Number(),
        })
      }
    }
  }, async (request, reply) => {
    try {
      const status = await healthChecker.getQuickHealthStatus();
      
      return reply.status(status === 'healthy' ? 200 : 503).send({
        status: status === 'healthy' ? 'ok' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      });
    } catch (error) {
      fastify.log.error('Health check error:', error);
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      });
    }
  });

  // Comprehensive health check endpoint
  if (pluginOptions.enableAdvancedEndpoints) {
    fastify.get('/health/comprehensive', {
      schema: {
        description: 'Comprehensive health check with all system metrics',
        tags: ['Health'],
        querystring: Type.Object({
          includeMetrics: Type.Optional(Type.Boolean()),
          includeDependencies: Type.Optional(Type.Boolean()),
          detailed: Type.Optional(Type.Boolean()),
        }),
      }
    }, async (request, reply) => {
      try {
        const query = request.query as any;
        const options: HealthCheckOptions = {
          includeMetrics: query?.includeMetrics ?? true,
          includeDependencies: query?.includeDependencies ?? true,
          detailed: query?.detailed ?? true,
        };

        const result = await healthChecker.performHealthCheck(options);
        
        return reply.status(result.overall.status === 'healthy' ? 200 : 503).send(result);
      } catch (error) {
        fastify.log.error('Comprehensive health check error:', error);
        return reply.status(503).send({
          status: 'error',
          message: 'Comprehensive health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Health report endpoint
    fastify.get('/health/report', {
      schema: {
        description: 'Human-readable health report',
        tags: ['Health'],
        response: {
          200: Type.Object({
            report: Type.String(),
            timestamp: Type.String(),
          })
        }
      }
    }, async (request, reply) => {
      try {
        // Ensure we have recent health data
        await healthChecker.performHealthCheck({ detailed: true });
        const report = healthChecker.generateHealthReport();
        
        return reply.send({
          report,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error('Health report error:', error);
        return reply.status(500).send({
          error: 'Failed to generate health report',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  // Readiness check endpoint
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check endpoint for Kubernetes',
      tags: ['Health'],
      response: {
        200: Type.Object({
          ready: Type.Boolean(),
          timestamp: Type.String(),
          services: Type.Object({
            database: Type.Boolean(),
            redis: Type.Boolean(),
            configValidator: Type.Boolean(),
          })
        })
      }
    }
  }, async (request, reply) => {
    try {
      const result = await healthChecker.performHealthCheck({ 
        detailed: false, 
        includeMetrics: false 
      });
      
      const ready = result.overall.status === 'healthy';
      const services = {
        database: result.dependencies.database.status === 'healthy',
        redis: result.dependencies.redis.status === 'healthy',
        configValidator: result.dependencies.configValidator.status === 'healthy',
      };

      return reply.status(ready ? 200 : 503).send({
        ready,
        timestamp: new Date().toISOString(),
        services,
      });
    } catch (error) {
      fastify.log.error('Readiness check failed:', error);
      return reply.status(503).send({
        ready: false,
        timestamp: new Date().toISOString(),
        services: {
          database: false,
          redis: false,
          configValidator: false,
        },
      });
    }
  });

  fastify.log.info('✅ Enhanced Health Check plugin registered successfully');
};

export default fp(healthCheckPlugin, {
  name: 'health-check-plugin',
  dependencies: ['knex-plugin', 'redis-plugin', 'config-validator-plugin', 'connection-pool-plugin']
});