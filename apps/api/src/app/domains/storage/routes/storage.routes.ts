/**
 * Storage Routes
 *
 * Fastify route definitions for storage API endpoints with schema validation
 */

import { FastifyInstance } from 'fastify'
import multipart from '@aegisx/fastify-multipart'
import { StorageController } from '../controllers/storage-controller'
import { StorageImageController } from '../controllers/storage-image-controller'
import { StorageFolderController } from '../controllers/storage-folder-controller'
import { StorageDatabaseService } from '../services/storage-database-service'
import { StorageFolderService } from '../services/storage-folder-service'
import { StorageFileRepository } from '../repositories/storage-file-repository'
import { StorageFolderRepository } from '../repositories/storage-folder-repository'
import { storageFactory } from '../../../core/shared/services/storage.factory'
import { storageFolderRoutes } from './storage-folder-routes'

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
  ErrorResponseSchema,
  SharedFilesResponseSchema,
  MySharesResponseSchema,
  RevokeShareParamsSchema,
  RevokeShareResponseSchema
} from '../schemas/storage.schemas'

export async function storageRoutes(fastify: FastifyInstance): Promise<void> {

  // Register multipart plugin for file uploads with Swagger support
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 1, // Allow only one file per request
      fieldSize: 1024 * 1024, // 1MB for form fields
      fields: 10 // Max number of non-file fields
    },
    autoContentTypeParser: true // Enable automatic content type parsing for Swagger
  })

  // Set up validation bypass for multipart routes
  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    return function validate(data) {
      // Bypass validation for multipart upload body
      if (httpPart === 'body' && url && url.includes('/upload')) {
        return { value: data }
      }
      // Use default validation for other routes
      return { value: data }
    }
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
  const imageController = new StorageImageController((fastify as any).storage, databaseService)

  // Initialize folder dependencies
  const folderRepository = new StorageFolderRepository((fastify as any).knex)
  const folderService = new StorageFolderService(fastify, folderRepository)
  const folderController = new StorageFolderController(folderService)

  // Decorate fastify with folder service for use in other routes
  if (!fastify.hasDecorator('storageFolder')) {
    fastify.decorate('storageFolder', folderController)
  }

  // Upload file
  fastify.post('/upload', {
    preHandler: (fastify as any).authenticate, // Require authentication
    bodyLimit: 100 * 1024 * 1024, // 100MB

    schema: {
      consumes: ['multipart/form-data'],
      description: 'Upload a file to storage with metadata and optional encryption. Supports file classification for compliance and custom metadata for business requirements.',
      summary: 'Upload file with metadata',
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
          file: {
            type: 'string',
            format: 'binary',
            description: 'File to upload (required)'
          },
          path: {
            type: 'string',
            description: 'Storage folder path (e.g., "documents/2024")'
          },
          dataClassification: {
            type: 'string',
            enum: ['public', 'internal', 'confidential', 'restricted'],
            description: 'Data classification level for compliance (default: internal)'
          },
          tags: {
            type: 'string',
            description: 'JSON array of tags for categorization (e.g., ["invoice", "2024", "customer-123"])'
          },
          customMetadata: {
            type: 'string',
            description: 'JSON object with custom metadata (e.g., {"department": "sales", "project": "Q4-2024"})'
          },
          encrypt: {
            type: 'string',
            enum: ['false', 'true'],
            description: 'Encrypt file at rest (default: false)'
          },
          overwrite: {
            type: 'string',
            enum: ['false', 'true'],
            description: 'Overwrite if file exists (default: false)'
          },
          generateThumbnail: {
            type: 'string',
            enum: ['false', 'true'],
            description: 'Generate thumbnails for image files (default: false)'
          },
          thumbnailSizes: {
            type: 'string',
            description: 'JSON array of thumbnail sizes (e.g., [{"width":150,"height":150,"fit":"cover"}]). If not provided, uses default sizes.'
          }
        },
        required: ['file']
      },
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
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
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

  // Download thumbnail
  fastify.get('/thumbnails/:fileId/:filename', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
    schema: {
      description: 'Download a thumbnail image',
      tags: ['Storage'],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string', format: 'uuid' },
          filename: { type: 'string' }
        },
        required: ['fileId', 'filename']
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image content'
        },
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.downloadThumbnail(request as any, reply)
  })

  // Get file information
  fastify.get('/files/:fileId', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
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
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('delete')
    ],
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
      querystring: {
        type: 'object',
        properties: {
          folderId: {
            type: 'string',
            description: 'Filter statistics by folder ID (optional)'
          }
        }
      },
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
    preHandler: [
      (fastify as any).authenticate,
      async (request: any, reply: any) => {
        // Custom middleware to check share permission with fileId from body
        const user = request.user
        const { fileId } = request.body

        if (!fileId) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_REQUEST',
              message: 'fileId is required'
            }
          })
        }

        const accessResult = await fastify.fileAccessControl.checkAccess(fileId, user.id, 'share')
        if (!accessResult.allowed) {
          return reply.code(403).send({
            error: {
              code: 'ACCESS_DENIED',
              message: accessResult.reason || 'You do not have permission to share this file'
            }
          })
        }
      }
    ],
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

  // Get files shared with current user
  fastify.get('/shared-files', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Get files that have been shared with the current user',
      summary: 'Get shared files',
      tags: ['Storage', 'File Sharing'],
      security: [{ bearerAuth: [] }],
      response: {
        200: SharedFilesResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.getSharedFiles(request as any, reply)
  })

  // Get files that current user has shared
  fastify.get('/my-shares', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Get files that the current user has shared with others',
      summary: 'Get my shares',
      tags: ['Storage', 'File Sharing'],
      security: [{ bearerAuth: [] }],
      response: {
        200: MySharesResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.getMyShares(request as any, reply)
  })

  // Revoke a file share
  fastify.delete('/shares/:shareId', {
    preHandler: (fastify as any).authenticate,
    schema: {
      description: 'Revoke a file share by share ID',
      summary: 'Revoke file share',
      tags: ['Storage', 'File Sharing'],
      security: [{ bearerAuth: [] }],
      params: RevokeShareParamsSchema,
      response: {
        200: RevokeShareResponseSchema,
        400: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return controller.revokeShare(request as any, reply)
  })

  // ================================
  // Image Processing API Endpoints
  // ================================

  // Process image with comprehensive operations
  fastify.post('/images/process/:fileId', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
    schema: {
      description: 'Process image with comprehensive operations including resize, crop, rotate, filters, and format conversion',
      summary: 'Process image with operations',
      tags: ['Storage', 'Image Processing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string', format: 'uuid', description: 'ID of the image file to process' }
        },
        required: ['fileId']
      },
      body: {
        type: 'object',
        properties: {
          operations: {
            type: 'object',
            description: 'Image processing operations to apply',
            properties: {
              resize: {
                type: 'object',
                properties: {
                  width: { type: 'number', minimum: 1, maximum: 4096 },
                  height: { type: 'number', minimum: 1, maximum: 4096 },
                  fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
                  withoutEnlargement: { type: 'boolean' }
                }
              },
              crop: {
                type: 'object',
                properties: {
                  left: { type: 'number', minimum: 0 },
                  top: { type: 'number', minimum: 0 },
                  width: { type: 'number', minimum: 1 },
                  height: { type: 'number', minimum: 1 }
                },
                required: ['left', 'top', 'width', 'height']
              },
              rotate: {
                type: 'object',
                properties: {
                  angle: { type: 'number', minimum: -360, maximum: 360 },
                  background: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
                },
                required: ['angle']
              },
              flip: { type: 'boolean' },
              flop: { type: 'boolean' },
              format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'] },
              quality: { type: 'number', minimum: 1, maximum: 100 },
              progressive: { type: 'boolean' },
              blur: { type: ['number', 'boolean'] },
              sharpen: { type: ['boolean', 'object'] },
              grayscale: { type: 'boolean' },
              modulate: {
                type: 'object',
                properties: {
                  brightness: { type: 'number', minimum: 0, maximum: 3 },
                  saturation: { type: 'number', minimum: 0, maximum: 3 },
                  hue: { type: 'number', minimum: -360, maximum: 360 }
                }
              },
              watermark: {
                type: 'object',
                properties: {
                  text: { type: 'string', maxLength: 100 },
                  position: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] },
                  opacity: { type: 'number', minimum: 0, maximum: 1 }
                }
              }
            }
          },
          saveAsNew: { type: 'boolean', default: true, description: 'Save as new file or overwrite original' },
          filename: { type: 'string', maxLength: 255, description: 'Custom filename for processed image' }
        },
        required: ['operations']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            originalFileId: { type: 'string' },
            processedFileId: { type: 'string' },
            operation: { type: 'string' },
            parameters: { type: 'object' },
            processingTime: { type: 'number' },
            metadata: {
              type: 'object',
              properties: {
                originalSize: { type: 'number' },
                processedSize: { type: 'number' },
                format: { type: 'string' },
                dimensions: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    },
                    processed: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    }
                  }
                },
                operations: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return imageController.processImage(request as any, reply)
  })

  // Convert image format
  fastify.post('/images/convert/:fileId', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
    schema: {
      description: 'Convert image to different format with quality options',
      summary: 'Convert image format',
      tags: ['Storage', 'Image Processing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string', format: 'uuid', description: 'ID of the image file to convert' }
        },
        required: ['fileId']
      },
      body: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['jpeg', 'png', 'webp', 'avif', 'tiff'],
            description: 'Target format for conversion'
          },
          quality: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100,
            description: 'Quality level (1-100)'
          },
          lossless: { type: 'boolean', description: 'Use lossless compression (WebP/AVIF only)' },
          progressive: { type: 'boolean', description: 'Progressive encoding for JPEG' },
          saveAsNew: { type: 'boolean', default: true, description: 'Save as new file or overwrite original' },
          filename: { type: 'string', maxLength: 255, description: 'Custom filename for converted image' }
        },
        required: ['format']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            originalFileId: { type: 'string' },
            processedFileId: { type: 'string' },
            operation: { type: 'string' },
            parameters: { type: 'object' },
            processingTime: { type: 'number' },
            metadata: {
              type: 'object',
              properties: {
                originalSize: { type: 'number' },
                processedSize: { type: 'number' },
                format: { type: 'string' },
                dimensions: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    },
                    processed: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    }
                  }
                },
                operations: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return imageController.convertFormat(request as any, reply)
  })

  // Optimize image (reduce file size)
  fastify.post('/images/optimize/:fileId', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
    schema: {
      description: 'Optimize image to reduce file size while maintaining quality',
      summary: 'Optimize image file size',
      tags: ['Storage', 'Image Processing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string', format: 'uuid', description: 'ID of the image file to optimize' }
        },
        required: ['fileId']
      },
      body: {
        type: 'object',
        properties: {
          quality: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100,
            description: 'Quality level for optimization (default: 85)'
          },
          progressive: { type: 'boolean', description: 'Progressive encoding' },
          stripMetadata: { type: 'boolean', description: 'Remove EXIF and other metadata for privacy' },
          saveAsNew: { type: 'boolean', default: true, description: 'Save as new file or overwrite original' },
          filename: { type: 'string', maxLength: 255, description: 'Custom filename for optimized image' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            originalFileId: { type: 'string' },
            processedFileId: { type: 'string' },
            operation: { type: 'string' },
            parameters: { type: 'object' },
            processingTime: { type: 'number' },
            metadata: {
              type: 'object',
              properties: {
                originalSize: { type: 'number' },
                processedSize: { type: 'number' },
                format: { type: 'string' },
                dimensions: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    },
                    processed: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    }
                  }
                },
                operations: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return imageController.optimizeImage(request as any, reply)
  })

  // Get image metadata
  fastify.get('/images/metadata/:fileId', {
    preHandler: [
      (fastify as any).authenticate,
      (fastify as any).checkFileAccess('read')
    ],
    schema: {
      description: 'Extract comprehensive metadata from image file',
      summary: 'Get image metadata',
      tags: ['Storage', 'Image Processing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string', format: 'uuid', description: 'ID of the image file' }
        },
        required: ['fileId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            fileId: { type: 'string' },
            metadata: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                format: { type: 'string' },
                size: { type: 'number' },
                colorspace: { type: 'string' },
                hasAlpha: { type: 'boolean' },
                density: { type: 'number' },
                orientation: { type: 'number' },
                exif: { type: 'object' }
              }
            }
          }
        },
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return imageController.getImageMetadata(request as any, reply)
  })

  // Get supported formats
  fastify.get('/images/formats', {
    schema: {
      description: 'Get list of supported image formats for input and output',
      summary: 'Get supported image formats',
      tags: ['Storage', 'Image Processing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            formats: {
              type: 'object',
              properties: {
                input: { type: 'array', items: { type: 'string' } },
                output: { type: 'array', items: { type: 'string' } },
                recommended: {
                  type: 'object',
                  properties: {
                    photos: { type: 'string' },
                    graphics: { type: 'string' },
                    web: { type: 'string' },
                    nextGen: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    return imageController.getSupportedFormats(request as any, reply)
  })

  // Register folder management routes
  await fastify.register(storageFolderRoutes)
}

export default storageRoutes
