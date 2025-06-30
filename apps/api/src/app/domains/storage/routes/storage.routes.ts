/**
 * Storage Routes
 *
 * Fastify route definitions for storage API endpoints with schema validation
 */

import { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { StorageController } from '../controllers/storage-controller'
import { StorageDatabaseService } from '../services/storage-database-service'
import { StorageFileRepository } from '../repositories/storage-file-repository'
import { storageFactory } from '../../../core/shared/services/storage.factory'

import {
  UploadResponseSchema,
  FileIdParamsSchema,
  FileInfoResponseSchema,
  ListFilesRequestSchema,
  ListFilesResponseSchema,
  DeleteResponseSchema,
  ShareFileRequestSchema,
  ShareResponseSchema,
  StorageStatsResponseSchema,
  PresignedUrlRequestSchema,
  PresignedUrlResponseSchema,
  ErrorResponseSchema
} from '../schemas/storage.schemas'

export async function storageRoutes(fastify: FastifyInstance): Promise<void> {

  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 1, // Allow only one file per request
      fieldSize: 1024 * 1024, // 1MB for form fields
      fields: 10 // Max number of non-file fields
    },
    attachFieldsToBody: false, // Don't attach fields to body - use request.parts() instead
    throwFileSizeLimit: true
  })

  // Initialize storage dependencies first
  const repository = new StorageFileRepository((fastify as any).knex)
  const databaseService = new StorageDatabaseService(repository)

  // Initialize storage service if not already decorated
  if (!fastify.hasDecorator('storage')) {
    const envConfig = storageFactory.createConfigFromEnv()
    const dependencies = {
      eventBus: (fastify as any).eventBus || undefined,
      circuitBreaker: (fastify as any).circuitBreaker || undefined,
      retry: (fastify as any).retryService || undefined,
      cache: (fastify as any).cache || (fastify as any).cacheManager || undefined,
      metrics: (fastify as any).metrics || (fastify as any).customMetrics || undefined,
      knex: (fastify as any).knex // Add knex for database integration
    }
    const storageService = storageFactory.createStorageService(envConfig, dependencies)
    fastify.decorate('storage', storageService)

    // Auto-connect
    try {
      await storageService.connect()
    } catch (error) {
      fastify.log.error(error, 'Failed to connect storage service')
    }
  }

  const controller = new StorageController((fastify as any).storage, databaseService)

  // Upload file
  fastify.post('/upload', {
    preHandler: (fastify as any).authenticate, // Require authentication

    schema: {
      consumes: ['multipart/form-data'],
      description: 'Upload a file to storage with metadata\n\n**Form Fields:**\n- **file** (required): File to upload\n- **path** (optional): Storage folder path\n- **dataClassification** (optional): Data level - public|internal|confidential|restricted (default: internal)\n- **tags** (optional): JSON array string (e.g., ["tag1", "tag2"])\n- **customMetadata** (optional): JSON object string (e.g., {"key": "value"})\n- **encrypt** (optional): "true"/"false" (default: false)\n- **overwrite** (optional): "true"/"false" (default: false)',
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
      // Don't define body schema for multipart - let @fastify/multipart handle it
      response: {
        201: UploadResponseSchema,
        400: ErrorResponseSchema,
        413: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, controller.upload.bind(controller))

  // Download file
  fastify.get('/download/:fileId', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Download a file from storage',
      tags: ['Storage'],
      params: FileIdParamsSchema,
      response: {
        200: {
          type: 'string',
          format: 'binary',
          description: 'File content'
        },
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.download(request as any, reply)
  })

  // Get file information
  fastify.get('/files/:fileId', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Get file information and metadata',
      tags: ['Storage'],
      params: FileIdParamsSchema,
      response: {
        200: FileInfoResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.getFileInfo(request as any, reply)
  })

  // List files
  fastify.get('/files', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'List files with optional filtering and pagination',
      tags: ['Storage'],
      querystring: ListFilesRequestSchema,
      response: {
        200: ListFilesResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.listFiles(request as any, reply)
  })

  // Delete file
  fastify.delete('/files/:fileId', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Delete a file from storage',
      tags: ['Storage'],
      params: FileIdParamsSchema,
      response: {
        200: DeleteResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.deleteFile(request as any, reply)
  })

  // Generate presigned URL
  fastify.post('/presigned-url', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Generate a presigned URL for file operations',
      tags: ['Storage'],
      body: PresignedUrlRequestSchema,
      response: {
        200: PresignedUrlResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.generatePresignedUrl(request as any, reply)
  })

  // Get storage statistics
  fastify.get('/stats', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Get storage usage statistics',
      tags: ['Storage'],
      response: {
        200: StorageStatsResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.getStats(request as any, reply)
  })

  // Share file
  fastify.post('/share', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Share a file with another user',
      tags: ['Storage'],
      body: ShareFileRequestSchema,
      response: {
        200: ShareResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.shareFile(request as any, reply)
  })
}

export default storageRoutes
