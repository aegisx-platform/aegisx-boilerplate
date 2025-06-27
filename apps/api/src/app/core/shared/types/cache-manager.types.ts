/**
 * Cache Manager Types
 * 
 * Comprehensive types for multi-level caching system
 * with healthcare compliance and performance optimization
 */

// Core interfaces
export interface ICacheManager {
  // Basic cache operations
  get<T>(key: string, options?: CacheGetOptions): Promise<T | null>
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>
  delete(key: string, options?: CacheDeleteOptions): Promise<boolean>
  exists(key: string, layer?: CacheLayer): Promise<boolean>
  
  // Bulk operations
  mget<T>(keys: string[], options?: CacheGetOptions): Promise<Array<T | null>>
  mset<T>(items: CacheItem<T>[], options?: CacheSetOptions): Promise<void>
  mdelete(keys: string[], options?: CacheDeleteOptions): Promise<number>
  
  // Advanced operations
  increment(key: string, amount?: number, options?: CacheIncrementOptions): Promise<number>
  decrement(key: string, amount?: number, options?: CacheIncrementOptions): Promise<number>
  expire(key: string, ttl: number, layer?: CacheLayer): Promise<boolean>
  ttl(key: string, layer?: CacheLayer): Promise<number>
  
  // Pattern operations
  keys(pattern: string, layer?: CacheLayer): Promise<string[]>
  scan(pattern: string, options?: CacheScanOptions): AsyncGenerator<string[], void, unknown>
  clear(pattern?: string, layer?: CacheLayer): Promise<number>
  
  // Layer management
  invalidateLayer(layer: CacheLayer): Promise<void>
  warmup(keys: string[], layer?: CacheLayer): Promise<void>
  
  // Statistics and monitoring
  getStats(layer?: CacheLayer): Promise<CacheStats>
  getHealth(): Promise<CacheHealth>
  
  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Events
  on(event: CacheEvent, listener: CacheEventListener): void
  off(event: CacheEvent, listener: CacheEventListener): void
}

export interface ICacheProvider {
  // Core operations
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  
  // Bulk operations
  mget<T>(keys: string[]): Promise<Array<T | null>>
  mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void>
  mdelete(keys: string[]): Promise<number>
  
  // Advanced operations
  increment(key: string, amount: number): Promise<number>
  decrement(key: string, amount: number): Promise<number>
  expire(key: string, ttl: number): Promise<boolean>
  ttl(key: string): Promise<number>
  
  // Pattern operations
  keys(pattern: string): Promise<string[]>
  scan(pattern: string, cursor?: string): Promise<{ cursor: string; keys: string[] }>
  clear(pattern?: string): Promise<number>
  
  // Statistics
  getStats(): Promise<CacheProviderStats>
  
  // Connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

// Configuration types
export interface CacheManagerConfig {
  // Global settings
  enabled: boolean
  defaultTtl: number
  keyPrefix: string
  serializer: CacheSerializer
  
  // Layer configuration
  layers: CacheLayerConfig[]
  fallbackEnabled: boolean
  writeThrough: boolean
  writeBack: boolean
  
  // Performance settings
  compression: {
    enabled: boolean
    algorithm: 'gzip' | 'brotli' | 'lz4'
    threshold: number
  }
  
  // Monitoring
  metrics: {
    enabled: boolean
    interval: number
    retention: number
  }
  
  // Healthcare specific
  healthcare?: {
    encryption: boolean
    auditTrail: boolean
    dataClassification: boolean
    retentionPolicies: boolean
  }
  
  // Circuit breaker integration
  circuitBreaker?: {
    enabled: boolean
    failureThreshold: number
    resetTimeout: number
  }
  
  // Background tasks
  background: {
    enabled: boolean
    cleanupInterval: number
    warmupOnStart: boolean
    preloadPatterns: string[]
  }
}

export interface CacheLayerConfig {
  name: string
  type: CacheProviderType
  priority: number
  enabled: boolean
  
  // Provider configuration
  provider: CacheProviderConfig
  
  // Layer-specific settings
  ttl: {
    default: number
    min: number
    max: number
  }
  
  // Size limits
  limits: {
    maxKeys: number
    maxMemory: number
    maxKeySize: number
    maxValueSize: number
  }
  
  // Eviction policy
  eviction: {
    policy: EvictionPolicy
    maxAge: number
    checkInterval: number
  }
  
  // Healthcare settings
  healthcare?: {
    dataTypes: HealthcareDataType[]
    encryption: boolean
    auditLevel: 'none' | 'read' | 'write' | 'all'
    retentionDays: number
  }
}

export interface CacheProviderConfig {
  // Connection settings
  connection: {
    host?: string
    port?: number
    url?: string
    username?: string
    password?: string
    database?: number
    ssl?: boolean
  }
  
  // Pool settings
  pool?: {
    min: number
    max: number
    acquireTimeout: number
    idleTimeout: number
  }
  
  // Retry settings
  retry?: {
    attempts: number
    delay: number
    backoff: 'fixed' | 'exponential'
  }
  
  // Provider-specific options
  options?: Record<string, any>
}

// Cache operations types
export interface CacheGetOptions {
  layer?: CacheLayer
  fallback?: boolean
  refresh?: boolean
  metadata?: boolean
}

export interface CacheSetOptions {
  ttl?: number
  layer?: CacheLayer
  writeThrough?: boolean
  compress?: boolean
  metadata?: CacheMetadata
}

export interface CacheDeleteOptions {
  layer?: CacheLayer
  cascade?: boolean
}

export interface CacheIncrementOptions {
  ttl?: number
  layer?: CacheLayer
  initial?: number
}

export interface CacheScanOptions {
  layer?: CacheLayer
  count?: number
  cursor?: string
}

export interface CacheItem<T> {
  key: string
  value: T
  ttl?: number
  metadata?: CacheMetadata
}

export interface CacheMetadata {
  tags?: string[]
  version?: number
  source?: string
  createdAt?: Date
  updatedAt?: Date
  accessedAt?: Date
  accessCount?: number
  
  // Healthcare metadata
  healthcare?: {
    dataType: HealthcareDataType
    patientId?: string
    facilityId?: string
    classification: DataClassification
    retentionPolicy: string
  }
}

// Cache layer and provider types
export type CacheLayer = 'memory' | 'redis' | 'database' | 'file' | 'custom'
export type CacheProviderType = 'memory' | 'redis' | 'memcached' | 'database' | 'file'
export type CacheSerializer = 'json' | 'msgpack' | 'protobuf' | 'custom'
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random'

// Healthcare types
export type HealthcareDataType = 
  | 'patient_data'
  | 'medical_records'
  | 'lab_results'
  | 'imaging_data'
  | 'medication_orders'
  | 'vital_signs'
  | 'insurance_data'
  | 'billing_data'
  | 'audit_logs'
  | 'user_sessions'

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted'

// Statistics and monitoring types
export interface CacheStats {
  // General statistics
  totalKeys: number
  totalMemory: number
  
  // Hit/miss statistics
  hits: number
  misses: number
  hitRate: number
  
  // Operation statistics
  gets: number
  sets: number
  deletes: number
  
  // Performance statistics
  avgGetTime: number
  avgSetTime: number
  avgDeleteTime: number
  
  // Layer statistics
  layerStats: Record<CacheLayer, CacheLayerStats>
  
  // Time-based statistics
  lastReset: Date
  uptime: number
}

export interface CacheLayerStats {
  name: string
  type: CacheProviderType
  enabled: boolean
  
  // Connection status
  connected: boolean
  lastConnected?: Date
  connectionErrors: number
  
  // Key statistics
  keys: number
  memory: number
  
  // Performance
  hits: number
  misses: number
  hitRate: number
  
  // Operations
  operations: {
    gets: number
    sets: number
    deletes: number
    increments: number
    expires: number
  }
  
  // Timing
  avgResponseTime: number
  slowQueries: number
  
  // Health
  errors: number
  lastError?: Date
  isHealthy: boolean
}

export interface CacheProviderStats {
  // Basic stats
  keys: number
  memory: number
  
  // Performance
  hits: number
  misses: number
  operations: number
  
  // Timing
  avgLatency: number
  p95Latency: number
  p99Latency: number
  
  // Connection
  connections: number
  connectionErrors: number
  
  // Provider-specific stats
  custom?: Record<string, any>
}

export interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  score: number
  
  // Layer health
  layers: Record<CacheLayer, CacheLayerHealth>
  
  // System health
  system: {
    memory: number
    connections: number
    errors: number
    latency: number
  }
  
  // Issues and recommendations
  issues: string[]
  recommendations: string[]
  
  // Last check
  lastCheck: Date
  checkDuration: number
}

export interface CacheLayerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  score: number
  
  // Connection health
  connected: boolean
  connectionLatency: number
  
  // Performance health
  hitRate: number
  avgLatency: number
  errorRate: number
  
  // Capacity health
  memoryUsage: number
  keyCount: number
  
  // Issues
  issues: string[]
  lastCheck: Date
}

// Event types
export type CacheEvent = 
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'expire'
  | 'evict'
  | 'error'
  | 'connect'
  | 'disconnect'
  | 'layer-fallback'
  | 'health-check'

export type CacheEventListener = (event: CacheEventData) => void

export interface CacheEventData {
  type: CacheEvent
  timestamp: Date
  layer?: CacheLayer
  key?: string
  value?: any
  metadata?: CacheMetadata
  error?: Error
  duration?: number
  
  // Context
  context?: {
    operation: string
    requestId?: string
    userId?: string
    patientId?: string
  }
}

// Error types
export class CacheError extends Error {
  constructor(
    message: string,
    public code: CacheErrorCode,
    public layer?: CacheLayer,
    public key?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'CacheError'
  }
}

export type CacheErrorCode = 
  | 'CONNECTION_FAILED'
  | 'OPERATION_TIMEOUT'
  | 'KEY_NOT_FOUND'
  | 'SERIALIZATION_ERROR'
  | 'COMPRESSION_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'LAYER_UNAVAILABLE'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'TTL_INVALID'
  | 'PERMISSION_DENIED'
  | 'HEALTH_CHECK_FAILED'

// Cache patterns and strategies
export interface CachePattern {
  name: string
  description: string
  
  // Pattern configuration
  keyPattern: string
  ttl: number
  layer: CacheLayer
  
  // Behavior
  writeStrategy: 'write-through' | 'write-back' | 'write-around'
  readStrategy: 'cache-aside' | 'read-through'
  
  // Invalidation
  invalidation: {
    strategy: 'ttl' | 'manual' | 'event-based'
    triggers?: string[]
    dependencies?: string[]
  }
  
  // Healthcare specific
  healthcare?: {
    dataType: HealthcareDataType
    auditRequired: boolean
    encryptionRequired: boolean
  }
}

export interface CacheStrategy {
  name: string
  patterns: CachePattern[]
  
  // Global strategy settings
  defaultLayer: CacheLayer
  fallbackEnabled: boolean
  
  // Performance settings
  prefetchEnabled: boolean
  compressionThreshold: number
  
  // Healthcare settings
  healthcare?: {
    encryptionEnabled: boolean
    auditLevel: 'none' | 'basic' | 'detailed'
    dataRetention: number
  }
}

// Cache warming and preloading
export interface CacheWarmupConfig {
  enabled: boolean
  strategy: 'eager' | 'lazy' | 'scheduled'
  
  // Patterns to preload
  patterns: string[]
  
  // Scheduling
  schedule?: {
    cron: string
    timezone: string
  }
  
  // Performance
  batchSize: number
  delay: number
  maxConcurrency: number
  
  // Source
  source: {
    type: 'database' | 'api' | 'file' | 'custom'
    config: Record<string, any>
  }
}

// Cache invalidation
export interface CacheInvalidationConfig {
  strategies: CacheInvalidationStrategy[]
  
  // Event-based invalidation
  events: {
    enabled: boolean
    patterns: Array<{
      event: string
      keys: string[]
      cascade: boolean
    }>
  }
  
  // Time-based invalidation
  schedule: {
    enabled: boolean
    patterns: Array<{
      cron: string
      pattern: string
      layer?: CacheLayer
    }>
  }
}

export interface CacheInvalidationStrategy {
  name: string
  type: 'time-based' | 'event-based' | 'dependency-based' | 'manual'
  
  // Configuration
  config: {
    pattern?: string
    dependencies?: string[]
    events?: string[]
    ttl?: number
  }
  
  // Behavior
  cascade: boolean
  async: boolean
  
  // Conditions
  conditions?: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'exists'
    value: any
  }>
}

// Healthcare compliance
export interface HealthcareCacheConfig {
  // Encryption
  encryption: {
    enabled: boolean
    algorithm: 'aes-256-gcm' | 'aes-256-cbc'
    keyRotation: number
    encryptMetadata: boolean
  }
  
  // Audit trail
  audit: {
    enabled: boolean
    level: 'read' | 'write' | 'all'
    retention: number
    storage: 'database' | 'file' | 'external'
  }
  
  // Data classification
  classification: {
    enabled: boolean
    defaultLevel: DataClassification
    rules: Array<{
      pattern: string
      level: DataClassification
      retention: number
    }>
  }
  
  // Compliance rules
  compliance: {
    hipaa: boolean
    gdpr: boolean
    retention: {
      default: number
      byDataType: Record<HealthcareDataType, number>
    }
  }
}

// Predefined configurations
export const DefaultCacheManagerConfig: CacheManagerConfig = {
  enabled: true,
  defaultTtl: 3600,
  keyPrefix: 'aegisx',
  serializer: 'json',
  
  layers: [
    {
      name: 'memory',
      type: 'memory',
      priority: 1,
      enabled: true,
      provider: {
        connection: {},
        options: {}
      },
      ttl: {
        default: 300,    // 5 minutes
        min: 60,
        max: 3600
      },
      limits: {
        maxKeys: 10000,
        maxMemory: 128 * 1024 * 1024, // 128MB
        maxKeySize: 1024,
        maxValueSize: 1024 * 1024     // 1MB
      },
      eviction: {
        policy: 'lru',
        maxAge: 3600,
        checkInterval: 60
      }
    },
    {
      name: 'redis',
      type: 'redis',
      priority: 2,
      enabled: true,
      provider: {
        connection: {
          host: 'localhost',
          port: 6379,
          database: 0
        },
        pool: {
          min: 5,
          max: 20,
          acquireTimeout: 5000,
          idleTimeout: 30000
        },
        retry: {
          attempts: 3,
          delay: 1000,
          backoff: 'exponential'
        }
      },
      ttl: {
        default: 3600,   // 1 hour
        min: 300,
        max: 86400
      },
      limits: {
        maxKeys: 1000000,
        maxMemory: 2 * 1024 * 1024 * 1024, // 2GB
        maxKeySize: 4096,
        maxValueSize: 10 * 1024 * 1024     // 10MB
      },
      eviction: {
        policy: 'lru',
        maxAge: 86400,
        checkInterval: 300
      }
    }
  ],
  
  fallbackEnabled: true,
  writeThrough: true,
  writeBack: false,
  
  compression: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024
  },
  
  metrics: {
    enabled: true,
    interval: 60000,
    retention: 86400000
  },
  
  background: {
    enabled: true,
    cleanupInterval: 300000,
    warmupOnStart: false,
    preloadPatterns: []
  }
}

export const HealthcareCacheManagerConfig: CacheManagerConfig = {
  ...DefaultCacheManagerConfig,
  
  healthcare: {
    encryption: true,
    auditTrail: true,
    dataClassification: true,
    retentionPolicies: true
  },
  
  layers: [
    {
      ...DefaultCacheManagerConfig.layers[0],
      healthcare: {
        dataTypes: ['user_sessions'],
        encryption: false,
        auditLevel: 'write',
        retentionDays: 1
      }
    },
    {
      ...DefaultCacheManagerConfig.layers[1],
      healthcare: {
        dataTypes: ['patient_data', 'medical_records', 'lab_results'],
        encryption: true,
        auditLevel: 'all',
        retentionDays: 30
      }
    }
  ],
  
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000
  }
}

// Common cache patterns
export const CommonCachePatterns: Record<string, CachePattern> = {
  USER_SESSION: {
    name: 'User Session',
    description: 'Cache user session data',
    keyPattern: 'session:*',
    ttl: 1800,              // 30 minutes
    layer: 'memory',
    writeStrategy: 'write-through',
    readStrategy: 'cache-aside',
    invalidation: {
      strategy: 'ttl'
    },
    healthcare: {
      dataType: 'user_sessions',
      auditRequired: false,
      encryptionRequired: false
    }
  },
  
  PATIENT_DATA: {
    name: 'Patient Data',
    description: 'Cache patient records and medical data',
    keyPattern: 'patient:*',
    ttl: 3600,              // 1 hour
    layer: 'redis',
    writeStrategy: 'write-through',
    readStrategy: 'read-through',
    invalidation: {
      strategy: 'event-based',
      triggers: ['patient:updated', 'patient:deleted']
    },
    healthcare: {
      dataType: 'patient_data',
      auditRequired: true,
      encryptionRequired: true
    }
  },
  
  API_RESPONSE: {
    name: 'API Response',
    description: 'Cache external API responses',
    keyPattern: 'api:*',
    ttl: 600,               // 10 minutes
    layer: 'redis',
    writeStrategy: 'write-around',
    readStrategy: 'cache-aside',
    invalidation: {
      strategy: 'ttl'
    }
  },
  
  DATABASE_QUERY: {
    name: 'Database Query',
    description: 'Cache database query results',
    keyPattern: 'query:*',
    ttl: 1800,              // 30 minutes
    layer: 'redis',
    writeStrategy: 'write-back',
    readStrategy: 'read-through',
    invalidation: {
      strategy: 'event-based',
      dependencies: ['users', 'patients', 'facilities']
    }
  }
}