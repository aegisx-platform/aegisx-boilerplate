/**
 * Secrets Manager Types
 * 
 * Comprehensive types for secure secrets management
 * Supports multiple backends and encryption options
 */

// Core interfaces
export interface ISecretsManager {
  // Basic operations
  get(key: string, namespace?: string): Promise<string | null>
  set(key: string, value: string, namespace?: string, options?: SetSecretOptions): Promise<void>
  delete(key: string, namespace?: string): Promise<boolean>
  exists(key: string, namespace?: string): Promise<boolean>
  
  // Bulk operations
  getMultiple(keys: string[], namespace?: string): Promise<Record<string, string | null>>
  setMultiple(secrets: Record<string, string>, namespace?: string, options?: SetSecretOptions): Promise<void>
  
  // Namespace management
  listNamespaces(): Promise<string[]>
  clearNamespace(namespace: string): Promise<void>
  
  // Advanced operations
  rotate(key: string, newValue: string, namespace?: string): Promise<void>
  getVersions(key: string, namespace?: string): Promise<SecretVersion[]>
  
  // Cache management
  clearCache(tags?: string[]): Promise<void>
  
  // Health and monitoring
  healthCheck(): Promise<SecretsHealthStatus>
  getStats(): Promise<SecretsStats>
  
  // Lifecycle
  initialize(): Promise<void>
  shutdown(): Promise<void>
}

export interface ISecretsAdapter {
  name: string
  priority: number
  isAvailable(): Promise<boolean>
  
  get(key: string, namespace?: string): Promise<string | null>
  set(key: string, value: string, namespace?: string, options?: SetSecretOptions): Promise<void>
  delete(key: string, namespace?: string): Promise<boolean>
  exists(key: string, namespace?: string): Promise<boolean>
  
  getMultiple(keys: string[], namespace?: string): Promise<Record<string, string | null>>
  setMultiple(secrets: Record<string, string>, namespace?: string, options?: SetSecretOptions): Promise<void>
  
  listNamespaces(): Promise<string[]>
  clearNamespace(namespace: string): Promise<void>
  
  rotate(key: string, newValue: string, namespace?: string): Promise<void>
  getVersions(key: string, namespace?: string): Promise<SecretVersion[]>
  
  healthCheck(): Promise<AdapterHealthStatus>
  getStats(): Promise<AdapterStats>
  
  initialize(): Promise<void>
  shutdown(): Promise<void>
}

// Configuration interfaces
export interface SecretsManagerConfig {
  // Primary adapter configuration
  adapter: SecretsAdapterType
  fallbackAdapters?: SecretsAdapterType[]
  
  // Encryption settings
  encryption?: {
    enabled: boolean
    algorithm: EncryptionAlgorithm
    keyDerivation: KeyDerivationConfig
  }
  
  // Caching configuration
  cache?: {
    enabled: boolean
    ttl: number
    maxSize: number
    refreshThreshold: number
  }
  
  // Security settings
  security?: {
    maskLogging: boolean
    auditAccess: boolean
    requireNamespace: boolean
    allowedNamespaces?: string[]
  }
  
  // Adapter-specific configurations
  adapters: {
    environment?: EnvironmentAdapterConfig
    hashicorpVault?: HashiCorpVaultConfig
    awsSecretsManager?: AWSSecretsManagerConfig
    azureKeyVault?: AzureKeyVaultConfig
    database?: DatabaseAdapterConfig
    redis?: RedisAdapterConfig
  }
  
  // Monitoring and health
  healthCheck?: {
    enabled: boolean
    interval: number
    timeout: number
  }
}

export interface SetSecretOptions {
  ttl?: number
  version?: string
  metadata?: Record<string, any>
  encrypted?: boolean
  replicate?: boolean
}

// Adapter types and configurations
export type SecretsAdapterType = 
  | 'environment'
  | 'hashicorp-vault'
  | 'aws-secrets-manager'
  | 'azure-key-vault'
  | 'database'
  | 'redis'

export interface EnvironmentAdapterConfig {
  prefix?: string
  transformKeys?: boolean
  allowOverwrite?: boolean
}

export interface HashiCorpVaultConfig {
  address: string
  token?: string
  roleId?: string
  secretId?: string
  namespace?: string
  mount: string
  version: 'v1' | 'v2'
  timeout: number
  retries: number
}

export interface AWSSecretsManagerConfig {
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  roleArn?: string
  prefix?: string
  kmsKeyId?: string
}

export interface AzureKeyVaultConfig {
  vaultUrl: string
  clientId?: string
  clientSecret?: string
  tenantId?: string
  managedIdentity?: boolean
}

export interface DatabaseAdapterConfig {
  table: string
  keyColumn: string
  valueColumn: string
  namespaceColumn?: string
  metadataColumn?: string
  encryption: boolean
}

export interface RedisAdapterConfig {
  keyPrefix: string
  database?: number
  encryption: boolean
  replication?: {
    enabled: boolean
    slaves: string[]
  }
}

// Encryption types
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305'

export interface KeyDerivationConfig {
  algorithm: 'pbkdf2' | 'scrypt' | 'argon2'
  iterations?: number
  saltLength: number
  keyLength: number
}

export interface EncryptionResult {
  encryptedData: string
  iv: string
  tag?: string
  salt: string
  algorithm: EncryptionAlgorithm
}

// Version and metadata types
export interface SecretVersion {
  version: string
  value: string
  createdAt: Date
  createdBy?: string
  metadata?: Record<string, any>
}

export interface SecretMetadata {
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  version: string
  namespace: string
  ttl?: number
  tags?: string[]
  encrypted: boolean
}

// Health and monitoring types
export interface SecretsHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  adapters: Record<string, AdapterHealthStatus>
  timestamp: Date
  uptime: number
}

export interface AdapterHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  available: boolean
  responseTime: number
  errorCount: number
  lastError?: string
  lastChecked: Date
}

export interface SecretsStats {
  totalSecrets: number
  secretsByNamespace: Record<string, number>
  cacheStats?: {
    hitRate: number
    size: number
    evictions: number
  }
  operationCounts: {
    gets: number
    sets: number
    deletes: number
    rotations: number
  }
  adapters: Record<string, AdapterStats>
}

export interface AdapterStats {
  operationCounts: {
    gets: number
    sets: number
    deletes: number
    errors: number
  }
  averageResponseTime: number
  availability: number
  lastUsed: Date
}

// Error types
export class SecretsManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public adapter?: string,
    public key?: string
  ) {
    super(message)
    this.name = 'SecretsManagerError'
  }
}

export class SecretNotFoundError extends SecretsManagerError {
  constructor(key: string, namespace?: string) {
    super(
      `Secret not found: ${namespace ? `${namespace}:` : ''}${key}`,
      'SECRET_NOT_FOUND',
      undefined,
      key
    )
    this.name = 'SecretNotFoundError'
  }
}

export class SecretAccessDeniedError extends SecretsManagerError {
  constructor(key: string, adapter: string) {
    super(
      `Access denied to secret: ${key}`,
      'SECRET_ACCESS_DENIED',
      adapter,
      key
    )
    this.name = 'SecretAccessDeniedError'
  }
}

export class AdapterUnavailableError extends SecretsManagerError {
  constructor(adapter: string, reason?: string) {
    super(
      `Adapter ${adapter} is unavailable${reason ? `: ${reason}` : ''}`,
      'ADAPTER_UNAVAILABLE',
      adapter
    )
    this.name = 'AdapterUnavailableError'
  }
}

export class EncryptionError extends SecretsManagerError {
  constructor(operation: string, reason?: string) {
    super(
      `Encryption ${operation} failed${reason ? `: ${reason}` : ''}`,
      'ENCRYPTION_ERROR'
    )
    this.name = 'EncryptionError'
  }
}

export class ValidationError extends SecretsManagerError {
  constructor(field: string, reason: string) {
    super(
      `Validation failed for ${field}: ${reason}`,
      'VALIDATION_ERROR'
    )
    this.name = 'ValidationError'
  }
}

// Utility types
export interface SecretReference {
  key: string
  namespace?: string
  version?: string
}

export interface SecretQuery {
  keys?: string[]
  namespace?: string
  pattern?: string
  tags?: string[]
  includeMetadata?: boolean
}

export interface SecretMigration {
  from: {
    adapter: SecretsAdapterType
    namespace?: string
  }
  to: {
    adapter: SecretsAdapterType
    namespace?: string
  }
  options?: {
    dryRun?: boolean
    skipExisting?: boolean
    deleteSource?: boolean
  }
}

// Event types for monitoring and auditing
export interface SecretAccessEvent {
  operation: 'get' | 'set' | 'delete' | 'rotate' | 'list'
  key: string
  namespace?: string
  adapter: string
  userId?: string
  timestamp: Date
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

// Factory and builder types
export interface SecretsManagerFactory {
  create(config: SecretsManagerConfig): Promise<ISecretsManager>
  createAdapter(type: SecretsAdapterType, config: any): Promise<ISecretsAdapter>
}

export interface SecretsManagerBuilder {
  withAdapter(type: SecretsAdapterType, config?: any): SecretsManagerBuilder
  withFallback(type: SecretsAdapterType, config?: any): SecretsManagerBuilder
  withEncryption(algorithm: EncryptionAlgorithm, config?: KeyDerivationConfig): SecretsManagerBuilder
  withCaching(ttl: number, maxSize?: number): SecretsManagerBuilder
  withSecurity(options: SecretsManagerConfig['security']): SecretsManagerBuilder
  build(): Promise<ISecretsManager>
}

// Plugin integration types
export interface SecretsManagerPluginConfig extends SecretsManagerConfig {
  enableHealthCheck?: boolean
  enableMetrics?: boolean
  enableAdminRoutes?: boolean
  adminRoutePrefix?: string
}

// Predefined configurations
export const DefaultSecretsManagerConfig: Partial<SecretsManagerConfig> = {
  adapter: 'environment',
  fallbackAdapters: [],
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    refreshThreshold: 0.8
  },
  security: {
    maskLogging: true,
    auditAccess: true,
    requireNamespace: false
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000
  }
}

export const ProductionSecretsManagerConfig: Partial<SecretsManagerConfig> = {
  adapter: 'hashicorp-vault',
  fallbackAdapters: ['environment'],
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyDerivation: {
      algorithm: 'argon2',
      saltLength: 32,
      keyLength: 32
    }
  },
  cache: {
    enabled: true,
    ttl: 600000, // 10 minutes
    maxSize: 2000,
    refreshThreshold: 0.9
  },
  security: {
    maskLogging: true,
    auditAccess: true,
    requireNamespace: true,
    allowedNamespaces: ['api', 'database', 'external']
  }
}