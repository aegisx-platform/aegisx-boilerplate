import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import redis from '@fastify/redis';

/**
 * This plugin adds Redis support for caching
 *
 * @see https://github.com/fastify/fastify-redis
 */

export default fp(async function (fastify: FastifyInstance) {
  // Make sure env and sensible plugins are loaded first
  await fastify.after();

  const redisConfig = {
    host: fastify.config.REDIS_HOST,
    port: parseInt(fastify.config.REDIS_PORT, 10),
    password: fastify.config.REDIS_PASSWORD || undefined,
    db: parseInt(fastify.config.REDIS_DB, 10),
    connectTimeout: 10000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    family: 4, // 4 (IPv4) or 6 (IPv6)
  };

  try {
    await fastify.register(redis, redisConfig);
    fastify.log.info('✅ Redis plugin registered successfully');
  } catch (error) {
    fastify.log.error('❌ Failed to register Redis plugin:', error);
    throw fastify.httpErrors.internalServerError('Redis initialization failed');
  }

  // Add utility methods
  fastify.decorate('getFromCache', async function (key: string) {
    // Validate input
    fastify.assert(key, 400, 'Cache key is required');
    fastify.assert(typeof key === 'string', 400, 'Cache key must be a string');

    try {
      const result = await fastify.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      fastify.log.error('Redis GET error:', { key, error });
      return null; // Graceful degradation for cache
    }
  });

  fastify.decorate('setToCache', async function (key: string, value: any, ttlSeconds?: number) {
    // Validate input
    fastify.assert(key, 400, 'Cache key is required');
    fastify.assert(typeof key === 'string', 400, 'Cache key must be a string');
    fastify.assert(value !== undefined, 400, 'Cache value cannot be undefined');

    try {
      const ttl = ttlSeconds || parseInt(fastify.config.REDIS_TTL, 10);
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await fastify.redis.setex(key, ttl, serialized);
      } else {
        await fastify.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      fastify.log.error('Redis SET error:', { key, ttl: ttlSeconds, error });
      return false; // Graceful degradation for cache
    }
  });

  fastify.decorate('deleteFromCache', async function (key: string) {
    // Validate input
    fastify.assert(key, 400, 'Cache key is required');
    fastify.assert(typeof key === 'string', 400, 'Cache key must be a string');

    try {
      const deletedCount = await fastify.redis.del(key);
      return deletedCount > 0;
    } catch (error) {
      fastify.log.error('Redis DELETE error:', { key, error });
      return false; // Graceful degradation for cache
    }
  });

  fastify.decorate('deleteCachePattern', async function (pattern: string) {
    // Validate input
    fastify.assert(pattern, 400, 'Cache pattern is required');
    fastify.assert(typeof pattern === 'string', 400, 'Cache pattern must be a string');

    try {
      const keys = await fastify.redis.keys(pattern);
      if (keys.length > 0) {
        await fastify.redis.del(...keys);
      }
      fastify.log.info(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      fastify.log.error('Redis DELETE PATTERN error:', { pattern, error });
      return 0; // Graceful degradation for cache
    }
  });

  fastify.decorate('getCacheStats', async function () {
    try {
      const [memoryInfo, keyspaceInfo, serverInfo] = await Promise.all([
        fastify.redis.info('memory'),
        fastify.redis.info('keyspace'),
        fastify.redis.info('server')
      ]);

      return {
        connected: fastify.redis.status === 'ready',
        status: fastify.redis.status,
        memory_info: memoryInfo,
        keyspace_info: keyspaceInfo,
        server_info: serverInfo,
        config: {
          host: fastify.config.REDIS_HOST,
          port: fastify.config.REDIS_PORT,
          db: fastify.config.REDIS_DB,
          ttl: fastify.config.REDIS_TTL
        }
      };
    } catch (error: any) {
      fastify.log.error('Redis STATS error:', error);
      throw fastify.httpErrors.serviceUnavailable('Cache service unavailable');
    }
  });

  // Log Redis connection status
  fastify.redis.on('connect', () => {
    fastify.log.info('Redis connected successfully');
  });

  fastify.redis.on('error', (error) => {
    fastify.log.error('Redis connection error:', error);
  });

  fastify.redis.on('close', () => {
    fastify.log.warn('Redis connection closed');
  });

  // Add cache health check method
  fastify.decorate('isCacheHealthy', async function () {
    try {
      const result = await fastify.redis.ping();
      return result === 'PONG';
    } catch (error) {
      fastify.log.error('Redis health check failed:', error);
      return false;
    }
  });

}, {
  name: 'redis-plugin',
  dependencies: ['env-plugin', 'sensible']
});

// Extend FastifyInstance interface for Redis methods
declare module 'fastify' {
  interface FastifyInstance {
    getFromCache: (key: string) => Promise<any>;
    setToCache: (key: string, value: any, ttlSeconds?: number) => Promise<boolean>;
    deleteFromCache: (key: string) => Promise<boolean>;
    deleteCachePattern: (pattern: string) => Promise<number>;
    getCacheStats: () => Promise<any>;
    isCacheHealthy: () => Promise<boolean>;
  }
}
