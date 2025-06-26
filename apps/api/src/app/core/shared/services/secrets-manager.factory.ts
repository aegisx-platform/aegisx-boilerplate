/**
 * Secrets Manager Factory
 * 
 * Factory for creating pre-configured secrets manager instances
 * with different adapters and configurations
 */

import { Knex } from 'knex'
import {
  ISecretsManager,
  ISecretsAdapter,
  SecretsManagerConfig,
  SecretsAdapterType,
  EnvironmentAdapterConfig,
  DatabaseAdapterConfig,
  ProductionSecretsManagerConfig,
  DefaultSecretsManagerConfig
} from '../types/secrets-manager.types'
import { SecretsManagerService } from './secrets-manager.service'
import { EnvironmentSecretsAdapter } from '../adapters/secrets/environment.adapter'
import { DatabaseSecretsAdapter } from '../adapters/secrets/database.adapter'

export class SecretsManagerFactory {
  /**
   * Create secrets manager with default configuration
   */
  public static async createDefault(): Promise<ISecretsManager> {
    const config: SecretsManagerConfig = {
      adapter: 'environment',
      adapters: {
        environment: {
          prefix: 'SECRET_',
          transformKeys: true
        }
      }
    }
    
    return this.create(config)
  }

  /**
   * Create secrets manager for development environment
   */
  public static async createForDevelopment(): Promise<ISecretsManager> {
    const config: SecretsManagerConfig = {
      adapter: 'environment',
      fallbackAdapters: [],
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 500,
        refreshThreshold: 0.8
      },
      security: {
        maskLogging: true,
        auditAccess: false,
        requireNamespace: false
      },
      adapters: {
        environment: {
          prefix: 'SECRET_',
          transformKeys: true,
          allowOverwrite: true
        }
      }
    }
    
    return this.create(config)
  }

  /**
   * Create secrets manager for testing environment
   */
  public static async createForTesting(): Promise<ISecretsManager> {
    const config: SecretsManagerConfig = {
      adapter: 'environment',
      cache: {
        enabled: false, // Disable cache in tests for consistency
        ttl: 0,
        maxSize: 0,
        refreshThreshold: 0
      },
      security: {
        maskLogging: false, // Show full values in tests
        auditAccess: false,
        requireNamespace: false
      },
      healthCheck: {
        enabled: false, // Disable health check in tests
        interval: 0,
        timeout: 0
      },
      adapters: {
        environment: {
          prefix: 'TEST_SECRET_',
          transformKeys: true,
          allowOverwrite: true
        }
      }
    }
    
    return this.create(config)
  }

  /**
   * Create secrets manager for production environment
   */
  public static async createForProduction(
    encryptionKey: string,
    knex?: Knex
  ): Promise<ISecretsManager> {
    const config: SecretsManagerConfig = {
      adapter: 'hashicorp-vault',
      ...ProductionSecretsManagerConfig,
      adapters: {
        environment: {
          prefix: 'SECRET_',
          transformKeys: true,
          allowOverwrite: false
        }
      }
    }
    
    // Add database adapter if Knex instance provided
    if (knex) {
      config.fallbackAdapters = ['database', 'environment']
      config.adapters.database = {
        table: 'secrets',
        keyColumn: 'key',
        valueColumn: 'value',
        namespaceColumn: 'namespace',
        metadataColumn: 'metadata',
        encryption: true
      }
    }
    
    return this.create(config, { knex, encryptionKey })
  }

  /**
   * Create secrets manager with database adapter
   */
  public static async createWithDatabase(
    knex: Knex,
    encryptionKey?: string,
    config?: Partial<DatabaseAdapterConfig>
  ): Promise<ISecretsManager> {
    const secretsConfig: SecretsManagerConfig = {
      adapter: 'database',
      fallbackAdapters: ['environment'],
      encryption: encryptionKey ? {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyDerivation: {
          algorithm: 'pbkdf2',
          iterations: 100000,
          saltLength: 32,
          keyLength: 32
        }
      } : undefined,
      cache: {
        enabled: true,
        ttl: 600000, // 10 minutes
        maxSize: 1000,
        refreshThreshold: 0.9
      },
      adapters: {
        database: {
          table: 'secrets',
          keyColumn: 'key',
          valueColumn: 'value',
          namespaceColumn: 'namespace',
          metadataColumn: 'metadata',
          encryption: !!encryptionKey,
          ...config
        },
        environment: {
          prefix: 'SECRET_',
          transformKeys: true
        }
      }
    }
    
    return this.create(secretsConfig, { knex, encryptionKey })
  }

  /**
   * Create secrets manager with multiple adapters
   */
  public static async createWithMultipleAdapters(
    primaryAdapter: SecretsAdapterType,
    fallbackAdapters: SecretsAdapterType[],
    adapters: { [key: string]: any },
    options?: {
      knex?: Knex
      encryptionKey?: string
      cacheEnabled?: boolean
    }
  ): Promise<ISecretsManager> {
    const config: SecretsManagerConfig = {
      adapter: primaryAdapter,
      fallbackAdapters,
      cache: {
        enabled: options?.cacheEnabled ?? true,
        ttl: 300000,
        maxSize: 1000,
        refreshThreshold: 0.8
      },
      security: {
        maskLogging: true,
        auditAccess: true,
        requireNamespace: false
      },
      adapters
    }
    
    return this.create(config, options)
  }

  /**
   * Create secrets manager from environment configuration
   */
  public static async createFromEnvironment(
    knex?: Knex
  ): Promise<ISecretsManager> {
    const adapter = (process.env.SECRETS_ADAPTER || 'environment') as SecretsAdapterType
    const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY
    const cacheEnabled = process.env.SECRETS_CACHE_ENABLED === 'true'
    const auditAccess = process.env.SECRETS_AUDIT_ACCESS === 'true'
    
    const config: SecretsManagerConfig = {
      adapter,
      fallbackAdapters: adapter !== 'environment' ? ['environment'] : [],
      cache: {
        enabled: cacheEnabled,
        ttl: parseInt(process.env.SECRETS_CACHE_TTL || '300000'),
        maxSize: parseInt(process.env.SECRETS_CACHE_MAX_SIZE || '1000'),
        refreshThreshold: 0.8
      },
      security: {
        maskLogging: true,
        auditAccess,
        requireNamespace: process.env.SECRETS_REQUIRE_NAMESPACE === 'true'
      },
      encryption: encryptionKey ? {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyDerivation: {
          algorithm: 'pbkdf2',
          iterations: 100000,
          saltLength: 32,
          keyLength: 32
        }
      } : undefined,
      adapters: {
        environment: {
          prefix: process.env.SECRETS_ENV_PREFIX || 'SECRET_',
          transformKeys: true,
          allowOverwrite: process.env.NODE_ENV !== 'production'
        }
      }
    }
    
    // Add database adapter configuration if available
    if (knex && (adapter === 'database' || config.fallbackAdapters?.includes('database'))) {
      config.adapters.database = {
        table: process.env.SECRETS_DB_TABLE || 'secrets',
        keyColumn: 'key',
        valueColumn: 'value',
        namespaceColumn: 'namespace',
        metadataColumn: 'metadata',
        encryption: !!encryptionKey
      }
    }
    
    return this.create(config, { knex, encryptionKey })
  }

  /**
   * Main factory method to create secrets manager
   */
  public static async create(
    config: SecretsManagerConfig,
    options?: {
      knex?: Knex
      encryptionKey?: string
      redisClient?: any
    }
  ): Promise<ISecretsManager> {
    const manager = new SecretsManagerService(config)
    
    // Create and add adapters based on configuration
    await this.addAdapters(manager, config, options)
    
    // Initialize the manager
    await manager.initialize()
    
    return manager
  }

  /**
   * Create adapter by type
   */
  public static async createAdapter(
    type: SecretsAdapterType,
    config: any,
    options?: {
      knex?: Knex
      encryptionKey?: string
      redisClient?: any
    }
  ): Promise<ISecretsAdapter> {
    switch (type) {
      case 'environment':
        return new EnvironmentSecretsAdapter(config as EnvironmentAdapterConfig)
      
      case 'database':
        if (!options?.knex) {
          throw new Error('Knex instance required for database adapter')
        }
        return new DatabaseSecretsAdapter(
          options.knex,
          config as DatabaseAdapterConfig,
          options.encryptionKey
        )
      
      // Note: Redis, HashiCorp Vault, AWS Secrets Manager adapters would be implemented here
      case 'redis':
        throw new Error('Redis adapter not implemented yet')
      
      case 'hashicorp-vault':
        throw new Error('HashiCorp Vault adapter not implemented yet')
      
      case 'aws-secrets-manager':
        throw new Error('AWS Secrets Manager adapter not implemented yet')
      
      case 'azure-key-vault':
        throw new Error('Azure Key Vault adapter not implemented yet')
      
      default:
        throw new Error(`Unsupported adapter type: ${type}`)
    }
  }

  /**
   * Add adapters to the manager
   */
  private static async addAdapters(
    manager: SecretsManagerService,
    config: SecretsManagerConfig,
    options?: {
      knex?: Knex
      encryptionKey?: string
      redisClient?: any
    }
  ): Promise<void> {
    const adapterTypes = new Set<SecretsAdapterType>()
    
    // Add primary adapter
    adapterTypes.add(config.adapter)
    
    // Add fallback adapters
    if (config.fallbackAdapters) {
      config.fallbackAdapters.forEach(type => adapterTypes.add(type))
    }
    
    // Create and add each unique adapter
    for (const type of adapterTypes) {
      try {
        const adapterConfig = (config.adapters as any)[type]
        if (!adapterConfig) {
          console.warn(`No configuration found for adapter type: ${type}`)
          continue
        }
        
        const adapter = await this.createAdapter(type, adapterConfig, options)
        manager.addAdapter(adapter)
      } catch (error) {
        console.warn(`Failed to create adapter ${type}:`, error instanceof Error ? error.message : error)
      }
    }
  }

  /**
   * Builder pattern for secrets manager configuration
   */
  public static builder(): SecretsManagerBuilder {
    return new SecretsManagerBuilder()
  }
}

/**
 * Builder for creating secrets manager with fluent API
 */
export class SecretsManagerBuilder {
  private config: Partial<SecretsManagerConfig> = {}
  private options: {
    knex?: Knex
    encryptionKey?: string
    redisClient?: any
  } = {}

  public withPrimaryAdapter(
    type: SecretsAdapterType,
    config?: any
  ): SecretsManagerBuilder {
    this.config.adapter = type
    if (!this.config.adapters) {
      this.config.adapters = {}
    }
    ;(this.config.adapters as any)[type] = config || {}
    return this
  }

  public withFallbackAdapter(
    type: SecretsAdapterType,
    config?: any
  ): SecretsManagerBuilder {
    if (!this.config.fallbackAdapters) {
      this.config.fallbackAdapters = []
    }
    this.config.fallbackAdapters.push(type)
    
    if (!this.config.adapters) {
      this.config.adapters = {}
    }
    ;(this.config.adapters as any)[type] = config || {}
    return this
  }

  public withCaching(
    enabled: boolean = true,
    ttl: number = 300000,
    maxSize: number = 1000
  ): SecretsManagerBuilder {
    this.config.cache = {
      enabled,
      ttl,
      maxSize,
      refreshThreshold: 0.8
    }
    return this
  }

  public withEncryption(
    encryptionKey: string,
    algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305' = 'aes-256-gcm'
  ): SecretsManagerBuilder {
    this.options.encryptionKey = encryptionKey
    this.config.encryption = {
      enabled: true,
      algorithm,
      keyDerivation: {
        algorithm: 'pbkdf2',
        iterations: 100000,
        saltLength: 32,
        keyLength: 32
      }
    }
    return this
  }

  public withSecurity(
    maskLogging: boolean = true,
    auditAccess: boolean = true,
    requireNamespace: boolean = false
  ): SecretsManagerBuilder {
    this.config.security = {
      maskLogging,
      auditAccess,
      requireNamespace
    }
    return this
  }

  public withDatabase(knex: Knex): SecretsManagerBuilder {
    this.options.knex = knex
    return this
  }

  public withHealthCheck(
    enabled: boolean = true,
    interval: number = 30000
  ): SecretsManagerBuilder {
    this.config.healthCheck = {
      enabled,
      interval,
      timeout: 5000
    }
    return this
  }

  public async build(): Promise<ISecretsManager> {
    // Set defaults
    const finalConfig: SecretsManagerConfig = {
      adapter: 'environment',
      adapters: {},
      ...DefaultSecretsManagerConfig,
      ...this.config
    }
    
    if (!finalConfig.adapter) {
      finalConfig.adapter = 'environment'
    }
    
    if (!finalConfig.adapters) {
      finalConfig.adapters = {}
    }
    
    // Ensure primary adapter has configuration
    if (!(finalConfig.adapters as any)[finalConfig.adapter]) {
      ;(finalConfig.adapters as any)[finalConfig.adapter] = {}
    }
    
    return SecretsManagerFactory.create(finalConfig, this.options)
  }
}