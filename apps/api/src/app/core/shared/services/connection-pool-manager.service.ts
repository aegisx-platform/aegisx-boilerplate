import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import Knex from 'knex';
import {
  ConnectionPoolConfig,
  PoolStats,
  HealthCheckResult,
} from '../types/connection-pool-manager.types';

export class ConnectionPoolManager extends EventEmitter {
  private fastify: FastifyInstance;
  private config: ConnectionPoolConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;
  private lastHealthCheck?: HealthCheckResult;

  constructor(fastify: FastifyInstance, config?: Partial<ConnectionPoolConfig>) {
    super();
    this.fastify = fastify;
    this.config = this.buildConfig(config);
    this.setupEventListeners();
  }

  private buildConfig(config?: Partial<ConnectionPoolConfig>): ConnectionPoolConfig {
    return {
      database: {
        min: config?.database?.min ?? 2,
        max: config?.database?.max ?? (process.env.NODE_ENV === 'production' ? 50 : 10),
        idleTimeoutMillis: config?.database?.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: config?.database?.connectionTimeoutMillis ?? 60000,
        acquireTimeoutMillis: config?.database?.acquireTimeoutMillis ?? 60000,
        reapIntervalMillis: config?.database?.reapIntervalMillis ?? 1000,
        createRetryIntervalMillis: config?.database?.createRetryIntervalMillis ?? 200,
        createTimeoutMillis: config?.database?.createTimeoutMillis ?? 30000,
        destroyTimeoutMillis: config?.database?.destroyTimeoutMillis ?? 5000,
        propagateCreateError: config?.database?.propagateCreateError ?? false,
        ...config?.database,
      },
      redis: {
        maxRetriesPerRequest: config?.redis?.maxRetriesPerRequest ?? 3,
        retryDelayOnFailover: config?.redis?.retryDelayOnFailover ?? 100,
        connectTimeout: config?.redis?.connectTimeout ?? 10000,
        commandTimeout: config?.redis?.commandTimeout ?? 5000,
        lazyConnect: config?.redis?.lazyConnect ?? true,
        keepAlive: config?.redis?.keepAlive ?? 30000,
        family: config?.redis?.family ?? 4,
        maxMemoryPolicy: config?.redis?.maxMemoryPolicy ?? 'allkeys-lru',
        ...config?.redis,
      },
    };
  }

  private setupEventListeners(): void {
    if (this.fastify.knex) {
      const knex = this.fastify.knex as Knex.Knex;
      
      knex.on('pool-error', (error) => {
        this.fastify.log.error('Database pool error:', error);
        this.emit('pool-error', { type: 'database', error });
      });
    }

    if (this.fastify.redis) {
      this.fastify.redis.on('error', (error) => {
        this.fastify.log.error('Redis connection error:', error);
        this.emit('pool-error', { type: 'redis', error });
      });

      this.fastify.redis.on('reconnecting', (delay: number) => {
        this.fastify.log.warn(`Redis reconnecting in ${delay}ms`);
        this.emit('reconnecting', { type: 'redis', delay });
      });

      this.fastify.redis.on('ready', () => {
        this.fastify.log.info('Redis connection ready');
        this.emit('ready', { type: 'redis' });
      });
    }
  }

  async getPoolStats(): Promise<PoolStats> {
    const stats: PoolStats = {
      database: {
        total: 0,
        idle: 0,
        used: 0,
        pending: 0,
        error: 0,
        min: this.config.database.min,
        max: this.config.database.max,
      },
      redis: {
        status: 'disconnected',
        connected: false,
        ready: false,
        connecting: false,
        disconnecting: false,
        lagging: false,
      },
    };

    if (this.fastify.knex) {
      const knex = this.fastify.knex as Knex.Knex;
      const pool = (knex.client as any).pool;
      
      if (pool) {
        stats.database = {
          total: pool.numUsed() + pool.numFree(),
          idle: pool.numFree(),
          used: pool.numUsed(),
          pending: pool.numPendingAcquires(),
          error: pool.numPendingCreates(),
          min: pool.min,
          max: pool.max,
        };
      }
    }

    if (this.fastify.redis) {
      const redis = this.fastify.redis;
      stats.redis = {
        status: redis.status,
        connected: redis.status === 'ready',
        ready: redis.status === 'ready',
        connecting: redis.status === 'connecting',
        disconnecting: false, // Redis client doesn't have 'disconnecting' status
        lagging: false, // Redis client doesn't have 'lagging' status
      };
    }

    return stats;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: false,
      timestamp: new Date(),
      database: {
        connected: false,
        responseTime: 0,
      },
      redis: {
        connected: false,
        responseTime: 0,
      },
    };

    // Database health check
    if (this.fastify.knex) {
      const dbStartTime = Date.now();
      try {
        await this.fastify.knex.raw('SELECT 1');
        result.database.connected = true;
        result.database.responseTime = Date.now() - dbStartTime;
      } catch (error) {
        result.database.connected = false;
        result.database.responseTime = Date.now() - dbStartTime;
        result.database.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Redis health check
    if (this.fastify.redis) {
      const redisStartTime = Date.now();
      try {
        const pingResult = await this.fastify.redis.ping();
        result.redis.connected = pingResult === 'PONG';
        result.redis.responseTime = Date.now() - redisStartTime;
      } catch (error) {
        result.redis.connected = false;
        result.redis.responseTime = Date.now() - redisStartTime;
        result.redis.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    result.healthy = result.database.connected && result.redis.connected;
    this.lastHealthCheck = result;

    if (!result.healthy) {
      this.emit('health-check-failed', result);
    }

    return result;
  }

  async optimizeConnections(): Promise<void> {
    const stats = await this.getPoolStats();
    
    // Log current connection usage
    this.fastify.log.info('Connection pool optimization:', {
      database: {
        utilization: stats.database.used / stats.database.max,
        idle: stats.database.idle,
        pending: stats.database.pending,
      },
      redis: {
        status: stats.redis.status,
        connected: stats.redis.connected,
      },
    });

    // Emit optimization event for monitoring
    this.emit('optimization', { stats, timestamp: new Date() });
  }

  async warmUpConnections(): Promise<void> {
    this.fastify.log.info('Warming up connection pools...');
    
    // Warm up database connections
    if (this.fastify.knex) {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < this.config.database.min; i++) {
        promises.push(
          this.fastify.knex.raw('SELECT 1').then(() => {}).catch(() => {})
        );
      }
      await Promise.all(promises);
    }

    // Warm up Redis connection
    if (this.fastify.redis) {
      try {
        await this.fastify.redis.ping();
      } catch (error) {
        this.fastify.log.warn('Redis warm-up failed:', error);
      }
    }

    this.fastify.log.info('Connection pools warmed up successfully');
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      this.fastify.log.warn('Connection pool monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.optimizeConnections();
      } catch (error) {
        this.fastify.log.error('Connection pool monitoring error:', error);
      }
    }, intervalMs);

    this.fastify.log.info(`Connection pool monitoring started (interval: ${intervalMs}ms)`);
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.isMonitoring = false;
    this.fastify.log.info('Connection pool monitoring stopped');
  }

  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  async gracefulShutdown(): Promise<void> {
    this.fastify.log.info('Shutting down connection pool manager...');
    
    this.stopMonitoring();
    
    // Database connections will be closed by the knex plugin
    // Redis connections will be closed by the redis plugin
    
    this.removeAllListeners();
    this.fastify.log.info('Connection pool manager shutdown complete');
  }

  // Utility methods for connection management
  async testDatabaseConnection(): Promise<boolean> {
    if (!this.fastify.knex) return false;
    
    try {
      await this.fastify.knex.raw('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async testRedisConnection(): Promise<boolean> {
    if (!this.fastify.redis) return false;
    
    try {
      const result = await this.fastify.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  async flushRedisCache(): Promise<boolean> {
    if (!this.fastify.redis) return false;
    
    try {
      await this.fastify.redis.flushdb();
      this.fastify.log.info('Redis cache flushed successfully');
      return true;
    } catch (error) {
      this.fastify.log.error('Failed to flush Redis cache:', error);
      return false;
    }
  }

  // Get configuration
  getConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  // Update configuration (requires restart for some changes)
  updateConfig(newConfig: Partial<ConnectionPoolConfig>): void {
    this.config = this.buildConfig(newConfig);
    this.emit('config-updated', this.config);
  }
}