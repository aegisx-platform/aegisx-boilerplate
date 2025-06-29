/**
 * Storage Fastify Plugin
 * 
 * Registers storage service and provides global access with enterprise features
 * including health checks, metrics, and administrative endpoints
 */

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { storageFactory } from '../shared/services/storage.factory'
import { StorageService, IStorageService } from '../shared/services/storage.service'
import {
  StorageConfig,
  UploadRequest,
  ListOptions
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

  /**
   * Enable file upload/download endpoints
   */
  enableFileEndpoints?: boolean

  /**
   * Maximum file size for uploads (in bytes)
   */
  maxFileSize?: number

  /**
   * Allowed MIME types for uploads
   */
  allowedMimeTypes?: string[]

  /**
   * Upload path prefix for file endpoints
   */
  uploadPathPrefix?: string

  /**
   * Download path prefix for file endpoints
   */
  downloadPathPrefix?: string
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
    enableAdminEndpoints = true,
    enableFileEndpoints = true,
    maxFileSize = 100 * 1024 * 1024, // 100MB
    allowedMimeTypes = [],
    uploadPathPrefix = '/api/storage/upload',
    downloadPathPrefix = '/api/storage/download'
  } = options

  // Register multipart plugin for file uploads
  if (enableFileEndpoints) {
    await fastify.register(multipart, {
      limits: {
        fileSize: maxFileSize,
        files: 1, // Allow only one file per request
        fieldSize: 1024 * 1024, // 1MB for form fields
        fields: 10 // Max number of non-file fields
      },
      attachFieldsToBody: true,
      throwFileSizeLimit: true
    })
  }

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
          averageUploadTime: storageStats.reduce((sum: number, s: any) => sum + (s.performance?.averageUploadTime || 0), 0) / Math.max(storageStats.length, 1),
          averageDownloadTime: storageStats.reduce((sum: number, s: any) => sum + (s.performance?.averageDownloadTime || 0), 0) / Math.max(storageStats.length, 1)
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

  // File upload/download endpoints
  if (enableFileEndpoints) {
    // File upload endpoint
    fastify.post(`${uploadPathPrefix}`, {
      schema: {
        consumes: ['multipart/form-data'],
        description: 'Upload a file to storage with optional metadata',
        tags: ['Storage'],
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
        // Body schema disabled for multipart/form-data - @fastify/multipart handles validation
        // Available form fields:
        // - file (required): Binary file data
        // - path (optional): Storage path for the file  
        // - tags (optional): Comma-separated tags
        // - metadata (optional): JSON string with custom metadata
        // - dataClassification (optional): public|internal|confidential|restricted
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              fileId: { type: 'string' },
              filename: { type: 'string' },
              size: { type: 'number' },
              url: { type: 'string' },
              checksum: { type: 'string' }
            }
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
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
          },
          413: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      },
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        // Get multipart data from request body (attached by @fastify/multipart)
        const body = request.body as any
        
        if (!body || !body.file) {
          return reply.code(400).send({ error: 'No file provided' })
        }

        // Extract file data
        const fileData = body.file
        const fileBuffer = await fileData.toBuffer()
        
        // Validate file size
        if (fileBuffer.length > maxFileSize) {
          return reply.code(413).send({ error: 'File too large' })
        }

        // Validate MIME type
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(fileData.mimetype)) {
          return reply.code(400).send({ error: 'File type not allowed' })
        }

        // Parse additional form fields with error handling
        let tags: string[] = []
        let customMetadata: any = {}
        
        try {
          tags = body.tags?.value ? body.tags.value.split(',').map((tag: string) => tag.trim()) : []
        } catch (error) {
          return reply.code(400).send({ error: 'Invalid tags format' })
        }
        
        try {
          customMetadata = body.metadata?.value ? JSON.parse(body.metadata.value) : {}
        } catch (error) {
          return reply.code(400).send({ error: 'Invalid metadata JSON format' })
        }
        
        // Healthcare data handling removed
        
        const dataClassification = body.dataClassification?.value || 'internal'

        // Prepare upload request
        const uploadRequest: UploadRequest = {
          file: fileBuffer,
          filename: fileData.filename,
          mimeType: fileData.mimetype,
          metadata: {
            createdBy: (request as any).user?.id // From JWT if available
          },
          options: {
            path: body.path?.value,
            tags,
            customMetadata,
            dataClassification: dataClassification as any
            // Healthcare data removed
          }
        }

        // Upload file
        const result = await defaultStorage.upload(uploadRequest)

        if (result.success) {
          reply.send({
            success: true,
            fileId: result.fileId,
            filename: result.filename,
            size: result.size,
            url: result.url,
            checksum: result.checksum
          })
        } else {
          reply.code(500).send({
            success: false,
            error: result.error?.message || 'Upload failed'
          })
        }

      } catch (error) {
        fastify.log.error(error, 'File upload failed')
        reply.code(500).send({
          success: false,
          error: (error as Error).message
        })
      }
    })

    // File download endpoint
    fastify.get(`${downloadPathPrefix}/:fileId`, {
      schema: {
        description: 'Download a file from storage',
        tags: ['Storage'],
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
        params: {
          type: 'object',
          properties: {
            fileId: { 
              type: 'string',
              description: 'Unique file identifier'
            }
          },
          required: ['fileId']
        },
        querystring: {
          type: 'object',
          properties: {
            purpose: {
              type: 'string',
              description: 'Purpose of file access for audit logging'
            },
            validateChecksum: {
              type: 'boolean',
              description: 'Whether to validate file checksum',
              default: false
            },
            decrypt: {
              type: 'boolean',
              description: 'Whether to decrypt the file if encrypted',
              default: true
            },
            decompress: {
              type: 'boolean',
              description: 'Whether to decompress the file if compressed',
              default: true
            }
          }
        },
        response: {
          200: {
            type: 'string',
            format: 'binary',
            description: 'File content'
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
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      },
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        const { fileId } = request.params as { fileId: string }
        const { purpose } = request.query as { purpose?: string }

        // Download file
        const result = await defaultStorage.download({
          fileId,
          options: {
            auditAccess: true,
            purpose: purpose || 'File download'
          }
        })

        if (result.success) {
          reply
            .type(result.mimeType)
            .header('Content-Disposition', `attachment; filename="${result.filename}"`)
            .header('Content-Length', result.size.toString())
            .header('X-File-ID', fileId)
            .header('X-Checksum', result.metadata.checksum)
            .send(result.data)
        } else {
          reply.code(404).send({
            success: false,
            error: result.error?.message || 'File not found'
          })
        }

      } catch (error) {
        fastify.log.error(error, 'File download failed')
        reply.code(500).send({
          success: false,
          error: (error as Error).message
        })
      }
    })

    // File info endpoint
    fastify.get(`${downloadPathPrefix}/:fileId/info`, {
      schema: {
        description: 'Get file information',
        tags: ['Storage'],
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
        params: {
          type: 'object',
          properties: {
            fileId: { 
              type: 'string',
              description: 'Unique file identifier'
            }
          },
          required: ['fileId']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              fileInfo: {
                type: 'object',
                properties: {
                  fileId: { type: 'string' },
                  filename: { type: 'string' },
                  originalName: { type: 'string' },
                  mimeType: { type: 'string' },
                  size: { type: 'number' },
                  path: { type: 'string' },
                  checksum: { type: 'string' },
                  metadata: { type: 'object' },
                  urls: {
                    type: 'object',
                    properties: {
                      download: { type: 'string' }
                    }
                  },
                  permissions: { type: 'object' },
                  healthcare: { type: 'object' }
                }
              }
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
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      },
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        const { fileId } = request.params as { fileId: string }

        const fileInfo = await defaultStorage.getFileInfo(fileId)
        
        reply.send({
          success: true,
          fileInfo
        })

      } catch (error) {
        fastify.log.error(error, 'Get file info failed')
        reply.code(404).send({
          success: false,
          error: (error as Error).message
        })
      }
    })

    // File list endpoint
    fastify.get('/api/storage/files', {
      schema: {
        description: 'List files with filtering and pagination',
        tags: ['Storage'],
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
        querystring: {
          type: 'object',
          properties: {
            limit: { 
              type: 'integer', 
              minimum: 1, 
              maximum: 1000, 
              default: 50,
              description: 'Maximum number of files to return'
            },
            offset: { 
              type: 'integer', 
              minimum: 0, 
              default: 0,
              description: 'Number of files to skip'
            },
            sortBy: { 
              type: 'string', 
              enum: ['name', 'size', 'created', 'modified'], 
              default: 'created',
              description: 'Field to sort by'
            },
            sortOrder: { 
              type: 'string', 
              enum: ['asc', 'desc'], 
              default: 'desc',
              description: 'Sort order'
            },
            mimeType: { 
              type: 'string',
              description: 'Filter by MIME type'
            },
            tags: { 
              type: 'string',
              description: 'Comma-separated list of tags to filter by'
            },
            dataClassification: {
              type: 'string',
              enum: ['public', 'internal', 'confidential', 'restricted'],
              description: 'Filter by data classification'
            },
            sizeMin: {
              type: 'integer',
              minimum: 0,
              description: 'Minimum file size in bytes'
            },
            sizeMax: {
              type: 'integer',
              minimum: 1,
              description: 'Maximum file size in bytes'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              files: { type: 'array' },
              total: { type: 'number' },
              hasMore: { type: 'boolean' }
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
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        const query = request.query as any
        
        const options: ListOptions = {
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filters: {
            mimeTypes: query.mimeType ? [query.mimeType] : undefined,
            tags: query.tags ? query.tags.split(',') : undefined
          }
        }

        const result = await defaultStorage.listFiles(options)
        
        reply.send({
          success: true,
          ...result
        })

      } catch (error) {
        fastify.log.error(error, 'List files failed')
        reply.code(500).send({
          success: false,
          error: (error as Error).message
        })
      }
    })

    // File delete endpoint
    fastify.delete(`${downloadPathPrefix}/:fileId`, {
      schema: {
        description: 'Delete a file from storage',
        tags: ['Storage'],
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
        params: {
          type: 'object',
          properties: {
            fileId: { 
              type: 'string',
              description: 'Unique file identifier to delete'
            }
          },
          required: ['fileId']
        },
        querystring: {
          type: 'object',
          properties: {
            force: {
              type: 'boolean',
              description: 'Force delete even if file is locked or has dependencies',
              default: false
            },
            reason: {
              type: 'string',
              description: 'Reason for deletion (for audit purposes)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
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
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      },
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        const { fileId } = request.params as { fileId: string }

        const deleted = await defaultStorage.delete(fileId)
        
        if (deleted) {
          reply.send({
            success: true,
            message: 'File deleted successfully'
          })
        } else {
          reply.code(404).send({
            success: false,
            error: 'File not found'
          })
        }

      } catch (error) {
        fastify.log.error(error, 'File deletion failed')
        reply.code(500).send({
          success: false,
          error: (error as Error).message
        })
      }
    })

    // Presigned URL endpoint
    fastify.post('/api/storage/presigned-url', {
      schema: {
        description: 'Generate presigned URL for file operations',
        tags: ['Storage'],
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
            fileId: { type: 'string' },
            path: { type: 'string' },
            operation: { type: 'string', enum: ['read', 'write'] },
            expiresIn: { type: 'integer', minimum: 60, maximum: 86400, default: 3600 }
          },
          anyOf: [
            { required: ['fileId', 'operation'] },
            { required: ['path', 'operation'] }
          ]
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              url: { type: 'string' },
              method: { type: 'string' },
              expiresAt: { type: 'string' }
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
      preHandler: fastify.authenticate
    }, async (request, reply) => {
      try {
        const body = request.body as any

        const result = await defaultStorage.generatePresignedUrl({
          fileId: body.fileId,
          path: body.path,
          operation: body.operation,
          expiresIn: body.expiresIn
        })
        
        reply.send({
          success: true,
          ...result
        })

      } catch (error) {
        fastify.log.error(error, 'Presigned URL generation failed')
        reply.code(500).send({
          success: false,
          error: (error as Error).message
        })
      }
    })
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
    adminEndpoints: enableAdminEndpoints,
    fileEndpoints: enableFileEndpoints
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