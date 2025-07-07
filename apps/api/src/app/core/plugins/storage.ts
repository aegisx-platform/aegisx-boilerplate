/**
 * Storage Fastify Plugin
 * 
 * Registers storage service and provides global access with enterprise features
 * including health checks, metrics, and administrative endpoints
 */

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { storageFactory } from '../shared/services/storage.factory'
import { StorageService, IStorageService } from '../shared/services/storage.service'
import {
  StorageConfig
} from '../shared/types/storage.types'

// Declare module to extend Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    storage: IStorageService
    storageFactory: typeof storageFactory
  }
}

interface StoragePluginOptions {
  /**
   * Storage service configuration
   */
  config?: Partial<StorageConfig>

  /**
   * Named storage configurations for multiple storage backends
   */
  namedStorages?: {
    [name: string]: Partial<StorageConfig>
  }

  /**
   * Enable automatic connection on plugin registration
   */
  autoConnect?: boolean

  /**
   * Enable health check endpoint for storage service
   */
  enableHealthCheck?: boolean

  /**
   * Enable metrics endpoint for storage statistics
   */
  enableMetrics?: boolean

  /**
   * Enable administrative endpoints
   */
  enableAdminEndpoints?: boolean
}

const storagePlugin: FastifyPluginAsync<StoragePluginOptions> = async (
  fastify,
  options
) => {
  const {
    config = {},
    namedStorages = {},
    autoConnect = true,
    enableHealthCheck = true,
    enableMetrics = true,
    enableAdminEndpoints = true
  } = options

  // Merge configuration with defaults
  const envConfig = storageFactory.createConfigFromEnv()
  const mergedConfig = { ...envConfig, ...config }

  // Create dependencies from existing Fastify decorators (all optional)
  const dependencies = {
    eventBus: (fastify as any).eventBus || undefined,
    circuitBreaker: (fastify as any).circuitBreaker || undefined,
    retry: (fastify as any).retryService || undefined,
    cache: (fastify as any).cache || (fastify as any).cacheManager || undefined,
    metrics: (fastify as any).metrics || (fastify as any).customMetrics || undefined
  }

  // Create default storage service
  const defaultStorage = storageFactory.createStorageService(mergedConfig, dependencies)

  // Create named storage services
  const namedStorageServices: { [name: string]: IStorageService } = {}
  for (const [name, storageConfig] of Object.entries(namedStorages)) {
    try {
      namedStorageServices[name] = storageFactory.createStorageService(storageConfig, dependencies)
    } catch (error) {
      fastify.log.error({
        plugin: 'storage',
        namedStorage: name,
        error: (error as Error).message
      }, `Failed to create named storage service: ${name}`)
    }
  }

  // Decorate Fastify instance
  fastify.decorate('storage', defaultStorage)
  fastify.decorate('storageFactory', storageFactory)

  // Decorate with named storage services
  for (const [name, service] of Object.entries(namedStorageServices)) {
    fastify.decorate(`${name}Storage`, service)
  }

  // Auto-connect if enabled
  if (autoConnect) {
    try {
      await defaultStorage.connect()
      
      // Connect named storages
      for (const [name, service] of Object.entries(namedStorageServices)) {
        try {
          await service.connect()
        } catch (error) {
          fastify.log.error({
            plugin: 'storage',
            namedStorage: name,
            error: (error as Error).message
          }, `Failed to connect named storage service: ${name}`)
        }
      }
    } catch (error) {
      fastify.log.error({
        plugin: 'storage',
        error: (error as Error).message
      }, 'Failed to connect default storage service')
      
      if (mergedConfig.provider === 'minio') {
        fastify.log.warn('MinIO connection failed, consider checking configuration or using local storage for development')
      }
    }
  }

  // Health check endpoint
  if (enableHealthCheck) {
    fastify.get('/health/storage', async (request, reply) => {
      const healthStatus: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        storages: {}
      }

      try {
        // Check default storage
        const defaultHealth = await defaultStorage.getHealth()
        healthStatus.storages.default = {
          ...defaultHealth,
          connected: defaultStorage.isConnected()
        }

        // Check named storages
        for (const [name, service] of Object.entries(namedStorageServices)) {
          try {
            const health = await service.getHealth()
            healthStatus.storages[name] = {
              ...health,
              connected: service.isConnected()
            }
          } catch (error) {
            healthStatus.storages[name] = {
              status: 'unhealthy',
              connected: false,
              error: (error as Error).message
            }
          }
        }

        // Determine overall health
        const allHealthy = Object.values(healthStatus.storages).every(
          (storage: any) => storage.status === 'healthy'
        )
        healthStatus.status = allHealthy ? 'healthy' : 'unhealthy'

        reply.code(allHealthy ? 200 : 503).send(healthStatus)

      } catch (error) {
        reply.code(503).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: (error as Error).message
        })
      }
    })
  }

  // Metrics endpoint
  if (enableMetrics) {
    fastify.get('/metrics/storage', async (request, reply) => {
      const metrics: any = {
        timestamp: new Date().toISOString(),
        storages: {}
      }

      try {
        // Default storage metrics
        metrics.storages.default = await defaultStorage.getStats()

        // Named storage metrics
        for (const [name, service] of Object.entries(namedStorageServices)) {
          try {
            metrics.storages[name] = await service.getStats()
          } catch (error) {
            metrics.storages[name] = {
              error: (error as Error).message
            }
          }
        }

        // Aggregate metrics
        const storageStats = Object.values(metrics.storages).filter((s: any) => !s.error)
        metrics.aggregate = {
          totalFiles: storageStats.reduce((sum: number, s: any) => sum + (s.storage?.totalFiles || 0), 0),
          totalSize: storageStats.reduce((sum: number, s: any) => sum + (s.storage?.totalSize || 0), 0),
          totalOperations: storageStats.reduce((sum: number, s: any) => sum + (s.operations?.uploads || 0) + (s.operations?.downloads || 0) + (s.operations?.deletes || 0), 0),
          averageUploadTime: (storageStats.reduce((sum: number, s: any) => sum + (s.performance?.averageUploadTime || 0), 0) as number) / Math.max(storageStats.length, 1),
          averageDownloadTime: (storageStats.reduce((sum: number, s: any) => sum + (s.performance?.averageDownloadTime || 0), 0) as number) / Math.max(storageStats.length, 1)
        }

        reply.send(metrics)

      } catch (error) {
        reply.code(500).send({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  // Administrative endpoints
  if (enableAdminEndpoints) {
    // Storage configuration endpoint
    fastify.get('/admin/storage/config', {
      schema: {
        description: 'Get storage configuration (Admin only)',
        tags: ['Storage', 'Admin'],
        security: [{ bearerAuth: [] }],
        headers: {
          type: 'object',
          properties: {
            authorization: {
              type: 'string',
              description: 'Bearer token'
            }
          },
          required: ['authorization']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              default: { type: 'object' },
              named: { type: 'array' }
            }
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      },
      preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
    }, async (request, reply) => {
      const sanitizedConfig = {
        ...mergedConfig,
        // Remove sensitive information
        minio: mergedConfig.minio ? {
          ...mergedConfig.minio,
          accessKey: '[REDACTED]',
          secretKey: '[REDACTED]'
        } : undefined
      }

      reply.send({
        default: sanitizedConfig,
        named: Object.keys(namedStorages)
      })
    })

    // Storage cleanup endpoint
    fastify.post('/admin/storage/cleanup', {
      schema: {
        description: 'Cleanup storage files (Admin only)',
        tags: ['Storage', 'Admin'],
        security: [{ bearerAuth: [] }],
        headers: {
          type: 'object',
          properties: {
            authorization: {
              type: 'string',
              description: 'Bearer token'
            }
          },
          required: ['authorization']
        },
        body: {
          type: 'object',
          properties: {
            storage: { type: 'string' },
            olderThan: { type: 'string', format: 'date-time' },
            sizeThreshold: { type: 'number' },
            tempFiles: { type: 'boolean' },
            corruptedFiles: { type: 'boolean' },
            dryRun: { type: 'boolean' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              result: { type: 'object' },
              storage: { type: 'string' }
            }
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      },
      preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
    }, async (request, reply) => {
      const { storage: storageName, ...cleanupOptions } = request.body as any
      
      try {
        const targetStorage = storageName && namedStorageServices[storageName] 
          ? namedStorageServices[storageName] 
          : defaultStorage

        const result = await targetStorage.cleanup(cleanupOptions)
        
        reply.send({
          success: true,
          result,
          storage: storageName || 'default'
        })

      } catch (error) {
        reply.code(500).send({
          success: false,
          error: (error as Error).message,
          storage: storageName || 'default'
        })
      }
    })

    // HIPAA compliance endpoint removed
  }

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    try {
      await defaultStorage.disconnect()
      
      for (const [name, service] of Object.entries(namedStorageServices)) {
        try {
          await service.disconnect()
        } catch (error) {
          fastify.log.error({
            plugin: 'storage',
            namedStorage: name,
            error: (error as Error).message
          }, `Failed to disconnect named storage service: ${name}`)
        }
      }
    } catch (error) {
      fastify.log.error(error, 'Failed to disconnect storage services')
    }
  })

  // Log successful registration
  fastify.log.info({
    plugin: 'storage',
    provider: mergedConfig.provider,
    namedStorages: Object.keys(namedStorages),
    autoConnect,
    healthCheck: enableHealthCheck,
    metrics: enableMetrics,
    adminEndpoints: enableAdminEndpoints
  }, 'Storage plugin registered successfully')
}

export default fp(storagePlugin, {
  name: 'storage',
  dependencies: [] // Optional dependencies will be injected if available
})

// Export types and services for convenience
export {
  storageFactory,
  StorageService
}

export * from '../shared/types/storage.types'