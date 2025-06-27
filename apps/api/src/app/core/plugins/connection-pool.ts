import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ConnectionPoolManager } from '../shared/services/connection-pool-manager.service';
import { ConnectionPoolConfig } from '../shared/types/connection-pool-manager.types';

declare module 'fastify' {
  interface FastifyInstance {
    connectionPool: ConnectionPoolManager;
  }
}

export interface ConnectionPoolPluginOptions {
  config?: Partial<ConnectionPoolConfig>;
  monitoring?: {
    enabled: boolean;
    interval: number;
  };
  warmUp?: boolean;
}

export default fp<ConnectionPoolPluginOptions>(
  async function connectionPoolPlugin(
    fastify: FastifyInstance,
    options: ConnectionPoolPluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: ConnectionPoolPluginOptions = {
      config: {},
      monitoring: {
        enabled: process.env.NODE_ENV === 'production',
        interval: 30000,
      },
      warmUp: true,
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create connection pool manager
    const connectionPool = new ConnectionPoolManager(fastify, pluginOptions.config);

    // Register the connection pool with Fastify
    fastify.decorate('connectionPool', connectionPool);

    // Set up event listeners
    connectionPool.on('pool-error', (event) => {
      fastify.log.error('Connection pool error:', event);
    });

    connectionPool.on('health-check-failed', (result) => {
      fastify.log.warn('Connection pool health check failed:', result);
    });

    connectionPool.on('optimization', (event) => {
      fastify.log.debug('Connection pool optimization:', event);
    });

    connectionPool.on('config-updated', (config) => {
      fastify.log.info('Connection pool configuration updated:', config);
    });

    // Warm up connections if enabled
    if (pluginOptions.warmUp) {
      try {
        await connectionPool.warmUpConnections();
        fastify.log.info('Connection pools warmed up successfully');
      } catch (error) {
        fastify.log.warn('Connection pool warm-up failed:', error);
      }
    }

    // Start monitoring if enabled
    if (pluginOptions.monitoring?.enabled) {
      connectionPool.startMonitoring(pluginOptions.monitoring.interval);
    }

    // Add health check route
    fastify.get('/health/connections', async (request, reply) => {
      try {
        const healthCheck = await connectionPool.performHealthCheck();
        const stats = await connectionPool.getPoolStats();
        
        return reply.status(healthCheck.healthy ? 200 : 503).send({
          status: healthCheck.healthy ? 'healthy' : 'unhealthy',
          timestamp: healthCheck.timestamp,
          connections: {
            database: healthCheck.database,
            redis: healthCheck.redis,
          },
          stats,
        });
      } catch (error) {
        fastify.log.error('Health check error:', error);
        return reply.status(503).send({
          status: 'error',
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Add connection stats route
    fastify.get('/stats/connections', async (request, reply) => {
      try {
        const stats = await connectionPool.getPoolStats();
        const lastHealthCheck = connectionPool.getLastHealthCheck();
        
        return reply.send({
          stats,
          lastHealthCheck,
          config: connectionPool.getConfig(),
        });
      } catch (error) {
        fastify.log.error('Connection stats error:', error);
        return reply.status(500).send({
          error: 'Failed to get connection stats',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      fastify.log.info('Shutting down connection pool...');
      await connectionPool.gracefulShutdown();
    });

    fastify.log.info('✅ Connection Pool plugin registered successfully');
  },
  {
    name: 'connection-pool-plugin',
    dependencies: ['knex-plugin', 'redis-plugin'],
  }
);