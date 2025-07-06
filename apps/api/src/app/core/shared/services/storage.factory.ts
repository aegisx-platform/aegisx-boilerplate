/**
 * Storage Service Factory
 * 
 * Factory for creating and configuring storage service instances
 * with proper dependency injection and enterprise service integration
 */

import { StorageService } from './storage.service'
import { EventBus } from '../events/interfaces/event-bus.interface'
import { CircuitBreakerService } from './circuit-breaker.service'
import { RetryService } from './retry.service'
import { CacheManagerService } from './cache-manager.service'
import { CustomMetricsService } from './custom-metrics.service'
import {
  StorageConfig,
  DefaultStorageConfig,
  StorageError
} from '../types/storage.types'

export interface StorageFactoryConfig {
  storage: Partial<StorageConfig>
  enableIntegrations?: {
    eventBus?: boolean
    circuitBreaker?: boolean
    retry?: boolean
    cache?: boolean
    metrics?: boolean
  }
}

export interface StorageFactoryDependencies {
  eventBus?: EventBus
  circuitBreaker?: CircuitBreakerService
  retry?: RetryService
  cache?: CacheManagerService
  metrics?: CustomMetricsService
  knex?: any // Knex instance for database integration
}

export class StorageFactory {
  private static instance: StorageFactory
  private serviceCache = new Map<string, StorageService>()

  private constructor() {}

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory()
    }
    return StorageFactory.instance
  }

  /**
   * Create a new storage service instance
   */
  createStorageService(
    config: Partial<StorageConfig> = {},
    dependencies: StorageFactoryDependencies = {}
  ): StorageService {
    try {
      // Merge with default configuration
      const mergedConfig = this.mergeConfigurations(DefaultStorageConfig, config)
      
      // Validate configuration
      this.validateConfiguration(mergedConfig)
      
      // Create service instance
      const service = new StorageService(
        mergedConfig,
        dependencies.eventBus,
        dependencies.circuitBreaker,
        dependencies.retry,
        dependencies.cache,
        dependencies.metrics,
        dependencies.knex
      )

      return service

    } catch (error) {
      throw new StorageError(
        `Failed to create storage service: ${(error as Error).message}`,
        'CONFIGURATION_ERROR',
        config.provider,
        undefined,
        undefined,
        error as Error
      )
    }
  }

  /**
   * Create a cached storage service instance
   */
  createCachedStorageService(
    cacheKey: string,
    config: Partial<StorageConfig> = {},
    dependencies: StorageFactoryDependencies = {}
  ): StorageService {
    // Check if service already exists in cache
    if (this.serviceCache.has(cacheKey)) {
      const existingService = this.serviceCache.get(cacheKey)!
      
      // Verify the cached service is still valid
      if (this.isServiceConfigurationCompatible(existingService, config)) {
        return existingService
      }
      
      // Remove outdated service from cache
      this.serviceCache.delete(cacheKey)
    }

    // Create new service and cache it
    const service = this.createStorageService(config, dependencies)
    this.serviceCache.set(cacheKey, service)
    
    return service
  }

  /**
   * Create storage service from environment variables
   */
  createFromEnvironment(dependencies: StorageFactoryDependencies = {}): StorageService {
    const config = this.createConfigFromEnvironment()
    return this.createStorageService(config, dependencies)
  }

  /**
   * Create configuration from environment variables (public method)
   */
  createConfigFromEnv(): Partial<StorageConfig> {
    return this.createConfigFromEnvironment()
  }

  /**
   * Create multiple storage service instances with different configurations
   */
  createMultipleServices(
    configs: Record<string, Partial<StorageConfig>>,
    dependencies: StorageFactoryDependencies = {}
  ): Record<string, StorageService> {
    const services: Record<string, StorageService> = {}

    for (const [name, config] of Object.entries(configs)) {
      try {
        services[name] = this.createStorageService(config, dependencies)
      } catch (error) {
        console.error(`Failed to create storage service '${name}':`, error)
        // Continue creating other services
      }
    }

    return services
  }

  /**
   * Create storage service with automatic provider selection
   */
  createWithAutoProvider(
    preferences: string[] = ['minio', 'local'],
    baseConfig: Partial<StorageConfig> = {},
    dependencies: StorageFactoryDependencies = {}
  ): StorageService {
    for (const provider of preferences) {
      try {
        const config = {
          ...baseConfig,
          provider: provider as any
        }

        // Test if the provider configuration is available
        if (this.isProviderConfigurationAvailable(provider, config)) {
          return this.createStorageService(config, dependencies)
        }
      } catch (error) {
        console.warn(`Failed to create storage service with provider '${provider}':`, error)
        // Try next provider
      }
    }

    throw new StorageError(
      `Failed to create storage service with any of the preferred providers: ${preferences.join(', ')}`,
      'CONFIGURATION_ERROR'
    )
  }

  /**
   * Get service configuration templates
   */
  getConfigurationTemplates(): Record<string, Partial<StorageConfig>> {
    return {
      // Local development configuration
      development: {
        provider: 'local',
        enabled: true,
        local: {
          basePath: './storage/dev',
          permissions: '0755',
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 1000
        },
        encryption: {
          enabled: false,
          algorithm: 'AES-256-GCM',
          keyManagement: {
            provider: 'local',
            keyRotationInterval: 90 * 24 * 60 * 60 * 1000
          },
          encryptMetadata: false,
          encryptFilenames: false
        },
        // Healthcare configuration removed,
        integration: {
          circuitBreaker: { enabled: false, failureThreshold: 5, timeout: 60000 },
          retry: { enabled: false, attempts: 3, delay: 1000 },
          eventBus: { enabled: false, publishEvents: false },
          audit: { enabled: false, logOperations: false, includeMetadata: false },
          metrics: { enabled: false, collectMetrics: false, customMetrics: false }
        }
      },

      // Production configuration with MinIO
      production: {
        provider: 'minio',
        enabled: true,
        minio: {
          endpoint: process.env.MINIO_ENDPOINT || 'localhost',
          port: parseInt(process.env.MINIO_PORT || '9000'),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY || '',
          secretKey: process.env.MINIO_SECRET_KEY || '',
          bucket: process.env.MINIO_BUCKET || 'aegisx-storage',
          region: process.env.MINIO_REGION || 'us-east-1',
          presignedUrlExpiry: 3600,
          maxFileSize: 100 * 1024 * 1024, // 100MB
          multipartThreshold: 64 * 1024 * 1024, // 64MB
          multipartChunkSize: 16 * 1024 * 1024 // 16MB
        },
        encryption: {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyManagement: {
            provider: 'local',
            keyRotationInterval: 90 * 24 * 60 * 60 * 1000
          },
          encryptMetadata: true,
          encryptFilenames: false
        },
        // Healthcare configuration removed,
        integration: {
          circuitBreaker: { enabled: true, failureThreshold: 5, timeout: 60000 },
          retry: { enabled: true, attempts: 3, delay: 1000 },
          eventBus: { enabled: true, publishEvents: true },
          audit: { enabled: true, logOperations: true, includeMetadata: true },
          metrics: { enabled: true, collectMetrics: true, customMetrics: true }
        }
      },

      // Healthcare-focused configuration
      healthcare: {
        provider: 'minio',
        enabled: true,
        encryption: {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyManagement: {
            provider: 'local',
            keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
          },
          encryptMetadata: true,
          encryptFilenames: true
        },
        // Healthcare configuration removed,
        processing: {
          thumbnails: { enabled: false, sizes: [], quality: 0, formats: [] },
          virusScanning: { enabled: true, provider: 'clamav' },
          contentAnalysis: { enabled: true, extractText: false, detectLanguage: false, classifyContent: true }
        },
        integration: {
          circuitBreaker: { enabled: true, failureThreshold: 3, timeout: 30000 },
          retry: { enabled: true, attempts: 5, delay: 2000 },
          eventBus: { enabled: true, publishEvents: true },
          audit: { enabled: true, logOperations: true, includeMetadata: true },
          metrics: { enabled: true, collectMetrics: true, customMetrics: true }
        }
      },

      // High-performance configuration
      highPerformance: {
        provider: 'minio',
        enabled: true,
        compression: {
          enabled: true,
          algorithm: 'lz4',
          threshold: 1024,
          level: 1,
          mimeTypes: ['text/*', 'application/json', 'application/xml']
        },
        caching: {
          enabled: true,
          metadataCache: {
            enabled: true,
            ttl: 1800000, // 30 minutes
            maxSize: 10000
          },
          fileCache: {
            enabled: true,
            ttl: 600000, // 10 minutes
            maxSize: 1000,
            maxFileSize: 5 * 1024 * 1024 // 5MB
          },
          presignedUrlCache: {
            enabled: true,
            ttl: 300000 // 5 minutes
          }
        },
        integration: {
          circuitBreaker: { enabled: true, failureThreshold: 10, timeout: 120000 },
          retry: { enabled: true, attempts: 2, delay: 500 },
          eventBus: { enabled: true, publishEvents: true },
          audit: { enabled: false, logOperations: false, includeMetadata: false },
          metrics: { enabled: true, collectMetrics: true, customMetrics: true }
        }
      }
    }
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.serviceCache.clear()
  }

  /**
   * Get cached service count
   */
  getCachedServiceCount(): number {
    return this.serviceCache.size
  }

  // Private helper methods

  private mergeConfigurations(
    defaultConfig: StorageConfig,
    userConfig: Partial<StorageConfig>
  ): StorageConfig {
    // Deep merge configurations
    return {
      ...defaultConfig,
      ...userConfig,
      local: userConfig.local ? { ...defaultConfig.local, ...userConfig.local } : defaultConfig.local,
      minio: userConfig.minio ? { ...defaultConfig.minio, ...userConfig.minio } : defaultConfig.minio,
      encryption: { ...defaultConfig.encryption, ...userConfig.encryption },
      compression: { ...defaultConfig.compression, ...userConfig.compression },
      caching: {
        ...defaultConfig.caching,
        ...userConfig.caching,
        metadataCache: { ...defaultConfig.caching.metadataCache, ...userConfig.caching?.metadataCache },
        fileCache: { ...defaultConfig.caching.fileCache, ...userConfig.caching?.fileCache },
        presignedUrlCache: { ...defaultConfig.caching.presignedUrlCache, ...userConfig.caching?.presignedUrlCache }
      },
      // Healthcare configuration removed,
      processing: {
        ...defaultConfig.processing,
        ...userConfig.processing,
        thumbnails: { ...defaultConfig.processing.thumbnails, ...userConfig.processing?.thumbnails },
        virusScanning: { ...defaultConfig.processing.virusScanning, ...userConfig.processing?.virusScanning },
        contentAnalysis: { ...defaultConfig.processing.contentAnalysis, ...userConfig.processing?.contentAnalysis }
      },
      integration: {
        ...defaultConfig.integration,
        ...userConfig.integration,
        circuitBreaker: { ...defaultConfig.integration.circuitBreaker, ...userConfig.integration?.circuitBreaker },
        retry: { ...defaultConfig.integration.retry, ...userConfig.integration?.retry },
        eventBus: { ...defaultConfig.integration.eventBus, ...userConfig.integration?.eventBus },
        audit: { ...defaultConfig.integration.audit, ...userConfig.integration?.audit },
        metrics: { ...defaultConfig.integration.metrics, ...userConfig.integration?.metrics }
      },
      monitoring: {
        ...defaultConfig.monitoring,
        ...userConfig.monitoring,
        healthChecks: { ...defaultConfig.monitoring.healthChecks, ...userConfig.monitoring?.healthChecks },
        alerts: {
          ...defaultConfig.monitoring.alerts,
          ...userConfig.monitoring?.alerts,
          thresholds: { ...defaultConfig.monitoring.alerts.thresholds, ...userConfig.monitoring?.alerts?.thresholds }
        },
        logging: { ...defaultConfig.monitoring.logging, ...userConfig.monitoring?.logging }
      }
    }
  }

  private validateConfiguration(config: StorageConfig): void {
    if (!config.provider) {
      throw new Error('Storage provider must be specified')
    }

    if (!config.enabled) {
      throw new Error('Storage service must be enabled')
    }

    // Validate provider-specific configuration
    switch (config.provider) {
      case 'local':
        if (!config.local?.basePath) {
          throw new Error('Local storage base path is required')
        }
        break

      case 'minio':
        if (!config.minio?.endpoint || !config.minio?.accessKey || !config.minio?.secretKey || !config.minio?.bucket) {
          throw new Error('MinIO configuration is incomplete (endpoint, accessKey, secretKey, bucket required)')
        }
        break

      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`)
    }

    // Healthcare validation removed
  }

  private isServiceConfigurationCompatible(service: StorageService, newConfig: Partial<StorageConfig>): boolean {
    // Simple compatibility check - in production, you might want more sophisticated logic
    return service.isConnected()
  }

  private isProviderConfigurationAvailable(provider: string, config: Partial<StorageConfig>): boolean {
    switch (provider) {
      case 'local':
        return !!(config.local?.basePath || process.env.STORAGE_LOCAL_BASE_PATH)

      case 'minio':
        return !!(
          (config.minio?.endpoint || process.env.MINIO_ENDPOINT) &&
          (config.minio?.accessKey || process.env.MINIO_ACCESS_KEY) &&
          (config.minio?.secretKey || process.env.MINIO_SECRET_KEY) &&
          (config.minio?.bucket || process.env.MINIO_BUCKET)
        )

      default:
        return false
    }
  }

  private createConfigFromEnvironment(): Partial<StorageConfig> {
    const provider = (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'minio'
    
    const config: Partial<StorageConfig> = {
      provider,
      enabled: process.env.STORAGE_ENABLED !== 'false'
    }

    // Local configuration from environment
    if (provider === 'local') {
      config.local = {
        basePath: process.env.STORAGE_LOCAL_BASE_PATH || './storage',
        permissions: process.env.STORAGE_LOCAL_PERMISSIONS || '0755',
        maxFileSize: parseInt(process.env.STORAGE_LOCAL_MAX_FILE_SIZE || '104857600'), // 100MB
        maxFiles: parseInt(process.env.STORAGE_LOCAL_MAX_FILES || '10000')
      }
    }

    // MinIO configuration from environment
    if (provider === 'minio') {
      config.minio = {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || '',
        secretKey: process.env.MINIO_SECRET_KEY || '',
        bucket: process.env.MINIO_BUCKET || 'aegisx-storage',
        region: process.env.MINIO_REGION || 'us-east-1',
        externalEndpoint: process.env.MINIO_EXTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost',
        presignedUrlExpiry: parseInt(process.env.MINIO_PRESIGNED_URL_EXPIRY || '3600'),
        maxFileSize: parseInt(process.env.MINIO_MAX_FILE_SIZE || '104857600'), // 100MB
        multipartThreshold: parseInt(process.env.MINIO_MULTIPART_THRESHOLD || '67108864'), // 64MB
        multipartChunkSize: parseInt(process.env.MINIO_MULTIPART_CHUNK_SIZE || '16777216') // 16MB
      }
    }

    // Encryption configuration from environment
    config.encryption = {
      enabled: process.env.STORAGE_ENCRYPTION_ENABLED === 'true',
      algorithm: (process.env.STORAGE_ENCRYPTION_ALGORITHM || 'AES-256-GCM') as any,
      keyManagement: {
        provider: (process.env.STORAGE_KEY_PROVIDER || 'local') as any,
        keyRotationInterval: parseInt(process.env.STORAGE_KEY_ROTATION_INTERVAL || '7776000000') // 90 days
      },
      encryptMetadata: process.env.STORAGE_ENCRYPT_METADATA === 'true',
      encryptFilenames: process.env.STORAGE_ENCRYPT_FILENAMES === 'true'
    }

    // Healthcare configuration removed from environment parsing

    return config
  }
}

// Export singleton instance
export const storageFactory = StorageFactory.getInstance()