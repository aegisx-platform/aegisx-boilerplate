/**
 * Storage Image Controller
 * 
 * Handles image processing operations for files stored in the storage system.
 * Integrates with existing storage service and authentication/authorization.
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ImageProcessingService, ImageProcessingOptions } from '../../../core/shared/services/image-processing.service'
import { StorageService } from '../../../core/shared/services/storage.service'
import { StorageDatabaseService } from '../services/storage-database-service'

export interface ImageProcessRequest {
  fileId: string
  operations: ImageProcessingOptions
  saveAsNew?: boolean
  filename?: string
}

export interface ImageConvertRequest {
  fileId: string
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff'
  quality?: number
  lossless?: boolean
  progressive?: boolean
  saveAsNew?: boolean
  filename?: string
}

export interface ImageOptimizeRequest {
  fileId: string
  quality?: number
  progressive?: boolean
  stripMetadata?: boolean
  saveAsNew?: boolean
  filename?: string
}

export interface ImageMetadataRequest {
  fileId: string
}

export interface BatchProcessRequest {
  fileIds: string[]
  operations: ImageProcessingOptions
  saveAsNew?: boolean
}

export interface ImageProcessResponse {
  success: boolean
  originalFileId: string
  processedFileId?: string
  operation: string
  parameters: Record<string, any>
  processingTime: number
  metadata: {
    originalSize: number
    processedSize: number
    format: string
    dimensions: {
      original: { width: number; height: number }
      processed: { width: number; height: number }
    }
    operations: string[]
  }
}

export class StorageImageController {
  private imageProcessingService = new ImageProcessingService()

  constructor(
    private storageService: StorageService,
    private databaseService: StorageDatabaseService
  ) {}

  /**
   * Process image with comprehensive operations
   * POST /api/v1/storage/images/process/:fileId
   */
  async processImage(
    request: FastifyRequest<{ 
      Params: { fileId: string }
      Body: Omit<ImageProcessRequest, 'fileId'>
    }>, 
    reply: FastifyReply
  ) {
    try {
      const { fileId } = request.params
      const { operations, saveAsNew = true, filename } = request.body
      const userId = (request as any).user?.id

      // Download original file
      const downloadResult = await this.storageService.download({
        fileId,
        userId,
        options: { auditAccess: true }
      })

      if (!downloadResult.success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Original file not found'
          }
        })
      }

      // Check if file is an image
      if (!ImageProcessingService.canProcessImage(downloadResult.mimeType)) {
        return reply.code(400).send({
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `Image processing not supported for ${downloadResult.mimeType}`
          }
        })
      }

      // Process image
      const startTime = Date.now()
      const processResult = await this.imageProcessingService.processImage(
        downloadResult.data,
        downloadResult.mimeType,
        operations
      )
      const processingTime = Date.now() - startTime

      let processedFileId = fileId
      
      if (saveAsNew) {
        // Save processed image as new file
        const newFilename = filename || this.generateProcessedFilename(
          downloadResult.filename,
          operations
        )

        const uploadResult = await this.storageService.upload({
          file: processResult.buffer,
          filename: newFilename,
          mimeType: `image/${processResult.format}`,
          metadata: {
            createdBy: userId,
            tags: ['processed', 'image'],
            customMetadata: {
              originalFileId: fileId,
              processingOperations: processResult.metadata?.operations || [],
              processingTime
            }
          }
        })

        if (uploadResult.success) {
          processedFileId = uploadResult.fileId
        }
      }

      // Log operation in database
      if (this.databaseService) {
        try {
          await this.databaseService.logOperation({
            operation: 'image_process',
            status: 'success',
            provider: this.storageService.getCurrentProvider(),
            fileId: processedFileId,
            userId,
            bytesTransferred: processResult.size,
            duration: processingTime,
            purpose: 'Image processing',
            metadata: {
              originalFileId: fileId,
              operations: processResult.metadata?.operations,
              originalSize: downloadResult.data.length,
              processedSize: processResult.size
            }
          })
        } catch (error) {
          console.warn('Failed to log image processing operation:', error)
        }
      }

      const response: ImageProcessResponse = {
        success: true,
        originalFileId: fileId,
        processedFileId: saveAsNew ? processedFileId : undefined,
        operation: 'process',
        parameters: operations,
        processingTime,
        metadata: {
          originalSize: downloadResult.data.length,
          processedSize: processResult.size,
          format: processResult.format,
          dimensions: {
            original: {
              width: processResult.metadata?.originalWidth || 0,
              height: processResult.metadata?.originalHeight || 0
            },
            processed: {
              width: processResult.width,
              height: processResult.height
            }
          },
          operations: processResult.metadata?.operations || []
        }
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('Image processing failed:', error)
      return reply.code(500).send({
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Image processing failed',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      })
    }
  }

  /**
   * Convert image format
   * POST /api/v1/storage/images/convert/:fileId
   */
  async convertFormat(
    request: FastifyRequest<{ 
      Params: { fileId: string }
      Body: Omit<ImageConvertRequest, 'fileId'>
    }>, 
    reply: FastifyReply
  ) {
    try {
      const { fileId } = request.params
      const { format, quality, lossless, progressive, saveAsNew = true, filename } = request.body
      const userId = (request as any).user?.id

      // Download original file
      const downloadResult = await this.storageService.download({
        fileId,
        userId,
        options: { auditAccess: true }
      })

      if (!downloadResult.success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Original file not found'
          }
        })
      }

      // Convert format
      const convertResult = await this.imageProcessingService.convertFormat(
        downloadResult.data,
        format,
        { quality, lossless, progressive }
      )

      let processedFileId = fileId

      if (saveAsNew) {
        // Save converted image as new file
        const newFilename = filename || this.generateConvertedFilename(
          downloadResult.filename,
          format
        )

        const uploadResult = await this.storageService.upload({
          file: convertResult.buffer,
          filename: newFilename,
          mimeType: `image/${format}`,
          metadata: {
            createdBy: userId,
            tags: ['converted', 'image'],
            customMetadata: {
              originalFileId: fileId,
              originalFormat: downloadResult.mimeType,
              convertedFormat: format
            }
          }
        })

        if (uploadResult.success) {
          processedFileId = uploadResult.fileId
        }
      }

      const response: ImageProcessResponse = {
        success: true,
        originalFileId: fileId,
        processedFileId: saveAsNew ? processedFileId : undefined,
        operation: 'convert',
        parameters: { format, quality, lossless, progressive },
        processingTime: convertResult.metadata?.processingTime || 0,
        metadata: {
          originalSize: downloadResult.data.length,
          processedSize: convertResult.size,
          format: convertResult.format,
          dimensions: {
            original: {
              width: convertResult.metadata?.originalWidth || 0,
              height: convertResult.metadata?.originalHeight || 0
            },
            processed: {
              width: convertResult.width,
              height: convertResult.height
            }
          },
          operations: [`convert-to-${format}`]
        }
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('Format conversion failed:', error)
      return reply.code(500).send({
        error: {
          code: 'CONVERSION_FAILED',
          message: 'Format conversion failed',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      })
    }
  }

  /**
   * Optimize image (reduce file size)
   * POST /api/v1/storage/images/optimize/:fileId
   */
  async optimizeImage(
    request: FastifyRequest<{ 
      Params: { fileId: string }
      Body: Omit<ImageOptimizeRequest, 'fileId'>
    }>, 
    reply: FastifyReply
  ) {
    try {
      const { fileId } = request.params
      const { quality, progressive, stripMetadata, saveAsNew = true, filename } = request.body
      const userId = (request as any).user?.id

      // Download original file
      const downloadResult = await this.storageService.download({
        fileId,
        userId,
        options: { auditAccess: true }
      })

      if (!downloadResult.success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Original file not found'
          }
        })
      }

      // Optimize image
      const optimizeResult = await this.imageProcessingService.optimizeImage(
        downloadResult.data,
        downloadResult.mimeType,
        { quality, progressive, stripMetadata }
      )

      let processedFileId = fileId

      if (saveAsNew) {
        // Save optimized image as new file
        const newFilename = filename || this.generateOptimizedFilename(
          downloadResult.filename
        )

        const uploadResult = await this.storageService.upload({
          file: optimizeResult.buffer,
          filename: newFilename,
          mimeType: `image/${optimizeResult.format}`,
          metadata: {
            createdBy: userId,
            tags: ['optimized', 'image'],
            customMetadata: {
              originalFileId: fileId,
              originalSize: downloadResult.data.length,
              optimizedSize: optimizeResult.size,
              compressionRatio: ((downloadResult.data.length - optimizeResult.size) / downloadResult.data.length * 100).toFixed(2) + '%'
            }
          }
        })

        if (uploadResult.success) {
          processedFileId = uploadResult.fileId
        }
      }

      const response: ImageProcessResponse = {
        success: true,
        originalFileId: fileId,
        processedFileId: saveAsNew ? processedFileId : undefined,
        operation: 'optimize',
        parameters: { quality, progressive, stripMetadata },
        processingTime: optimizeResult.metadata?.processingTime || 0,
        metadata: {
          originalSize: downloadResult.data.length,
          processedSize: optimizeResult.size,
          format: optimizeResult.format,
          dimensions: {
            original: {
              width: optimizeResult.metadata?.originalWidth || 0,
              height: optimizeResult.metadata?.originalHeight || 0
            },
            processed: {
              width: optimizeResult.width,
              height: optimizeResult.height
            }
          },
          operations: ['optimize']
        }
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('Image optimization failed:', error)
      return reply.code(500).send({
        error: {
          code: 'OPTIMIZATION_FAILED',
          message: 'Image optimization failed',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      })
    }
  }

  /**
   * Get image metadata
   * GET /api/v1/storage/images/metadata/:fileId
   */
  async getImageMetadata(
    request: FastifyRequest<{ Params: { fileId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const { fileId } = request.params
      const userId = (request as any).user?.id

      // Download file
      const downloadResult = await this.storageService.download({
        fileId,
        userId,
        options: { auditAccess: true }
      })

      if (!downloadResult.success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found'
          }
        })
      }

      // Check if file is an image
      if (!ImageProcessingService.canProcessImage(downloadResult.mimeType)) {
        return reply.code(400).send({
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `Not an image file: ${downloadResult.mimeType}`
          }
        })
      }

      // Extract metadata
      const metadata = await this.imageProcessingService.getImageMetadata(downloadResult.data)

      return reply.send({
        success: true,
        fileId,
        metadata
      })

    } catch (error) {
      request.log.error('Get image metadata failed:', error)
      return reply.code(500).send({
        error: {
          code: 'METADATA_EXTRACTION_FAILED',
          message: 'Failed to extract image metadata',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      })
    }
  }

  /**
   * Get supported formats
   * GET /api/v1/storage/images/formats
   */
  async getSupportedFormats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const formats = ImageProcessingService.getSupportedFormats()
      
      return reply.send({
        success: true,
        formats: {
          input: formats,
          output: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'],
          recommended: {
            photos: 'jpeg',
            graphics: 'png',
            web: 'webp',
            nextGen: 'avif'
          }
        }
      })
    } catch (error) {
      request.log.error('Get supported formats failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get supported formats'
        }
      })
    }
  }

  // Helper methods for filename generation
  private generateProcessedFilename(originalFilename: string, operations: ImageProcessingOptions): string {
    const baseName = originalFilename.replace(/\.[^/.]+$/, '')
    const ext = this.getFileExtension(originalFilename)
    const format = operations.format || ext.slice(1)
    
    const operationSuffix = this.generateOperationSuffix(operations)
    return `${baseName}_processed${operationSuffix}.${format}`
  }

  private generateConvertedFilename(originalFilename: string, format: string): string {
    const baseName = originalFilename.replace(/\.[^/.]+$/, '')
    return `${baseName}_converted.${format}`
  }

  private generateOptimizedFilename(originalFilename: string): string {
    const baseName = originalFilename.replace(/\.[^/.]+$/, '')
    const ext = this.getFileExtension(originalFilename)
    return `${baseName}_optimized${ext}`
  }

  private generateOperationSuffix(operations: ImageProcessingOptions): string {
    const suffixes = []
    
    if (operations.resize) {
      const { width, height } = operations.resize
      suffixes.push(`${width || 'auto'}x${height || 'auto'}`)
    }
    if (operations.crop) suffixes.push('cropped')
    if (operations.rotate) suffixes.push(`rot${operations.rotate.angle}`)
    if (operations.blur) suffixes.push('blur')
    if (operations.sharpen) suffixes.push('sharp')
    if (operations.grayscale) suffixes.push('gray')
    
    return suffixes.length > 0 ? `_${suffixes.join('_')}` : ''
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '.jpg'
  }
}