export interface ConnectionPoolConfig {
  database: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    propagateCreateError: boolean;
  };
  redis: {
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    connectTimeout: number;
    commandTimeout: number;
    lazyConnect: boolean;
    keepAlive: number;
    family: number;
    maxMemoryPolicy: string;
  };
}

export interface DatabasePoolStats {
  total: number;
  idle: number;
  used: number;
  pending: number;
  error: number;
  min: number;
  max: number;
}

export interface RedisPoolStats {
  status: string;
  connected: boolean;
  ready: boolean;
  connecting: boolean;
  disconnecting: boolean;
  lagging: boolean;
}

export interface PoolStats {
  database: DatabasePoolStats;
  redis: RedisPoolStats;
}

export interface ConnectionHealth {
  connected: boolean;
  responseTime: number;
  error?: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  database: ConnectionHealth;
  redis: ConnectionHealth;
}

export interface PoolEvent {
  type: 'database' | 'redis';
  timestamp: Date;
  data?: any;
}

export interface PoolErrorEvent extends PoolEvent {
  error: Error;
}

export interface ReconnectingEvent extends PoolEvent {
  delay: number;
}

export interface OptimizationEvent {
  stats: PoolStats;
  timestamp: Date;
}

export type PoolEventType = 
  | 'pool-error'
  | 'reconnecting'
  | 'ready'
  | 'health-check-failed'
  | 'optimization'
  | 'config-updated';