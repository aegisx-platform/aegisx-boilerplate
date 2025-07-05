/**
 * Storage Controller
 *
 * Handles HTTP requests for storage operations including upload, download,
 * file management, and metadata operations
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { StorageService } from '../../../core/shared/services/storage.service'
import { StorageDatabaseService } from '../services/storage-database-service'
import {
  ApiUploadRequest,
  ApiUploadResponse,
  ApiFileInfoResponse,
  ApiErrorResponse,
  FileSearchOptions
} from '../types/storage.types'
import {
  UploadRequest as StorageUploadRequest,
  DownloadRequest as StorageDownloadRequest
} from '../../../core/shared/types/storage.types'

export class StorageController {
  constructor(
    private storageService: StorageService,
    private databaseService: StorageDatabaseService
  ) { }

  /**
   * Validate and parse multipart form data for upload (using @aegisx/fastify-multipart)
   */
  private validateUploadFormData(file: any, fields: any): ApiUploadRequest {
    // Validate required fields
    if (!file.filename) {
      throw new Error('Filename is required')
    }
    if (!file.mimetype) {
      throw new Error('MIME type is required')
    }

    // With @aegisx/fastify-multipart, fields are plain strings
    const dataClassification = fields.dataClassification
    if (dataClassification && !['public', 'internal', 'confidential', 'restricted'].includes(dataClassification)) {
      throw new Error('Invalid data classification. Must be one of: public, internal, confidential, restricted')
    }

    // Parse and validate JSON fields
    let tags: string[] | undefined
    let customMetadata: Record<string, any> | undefined

    if (fields.tags) {
      try {
        tags = JSON.parse(fields.tags)
        if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
          throw new Error('Tags must be an array of strings')
        }
      } catch (error) {
        throw new Error('Invalid tags format. Must be a valid JSON array of strings')
      }
    }

    if (fields.customMetadata) {
      try {
        customMetadata = JSON.parse(fields.customMetadata)
        if (typeof customMetadata !== 'object' || customMetadata === null || Array.isArray(customMetadata)) {
          throw new Error('Custom metadata must be a valid JSON object')
        }
      } catch (error) {
        throw new Error('Invalid customMetadata format. Must be a valid JSON object')
      }
    }

    // Validate filename length
    if (file.filename.length > 255) {
      throw new Error('Filename cannot exceed 255 characters')
    }

    return {
      filename: file.filename,
      mimeType: file.mimetype,
      dataClassification: (dataClassification || 'internal') as 'public' | 'internal' | 'confidential' | 'restricted',
      tags,
      customMetadata,
      path: fields.path,
      encrypt: fields.encrypt === 'true',
      overwrite: fields.overwrite === 'true'
    }
  }




  /**
   * Upload a file
   * POST /storage/upload
   */
  async upload(request: FastifyRequest, reply: FastifyReply): Promise<ApiUploadResponse | ApiErrorResponse> {
    try {
      // Parse multipart data using @aegisx/fastify-multipart
      const { files, fields } = await (request as any).parseMultipart()

      if (!files || files.length === 0) {
        return reply.code(400).send({
          error: {
            code: 'NO_FILE_PROVIDED',
            message: 'No file provided in the request'
          }
        })
      }

      // Get the first file (we only allow one file per request)
      const file = files[0]
      const fileBuffer = await file.toBuffer()

      // Validate and parse form data
      let uploadMetadata: ApiUploadRequest

      try {
        uploadMetadata = this.validateUploadFormData(file, fields)
      } catch (validationError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError instanceof Error ? validationError.message : 'Invalid form data'
          }
        })
      }

      // Get current user from request
      const currentUser = (request as any).user

      // Check quota before upload (skip for admin users)
      if (currentUser?.id && this.databaseService) {
        const isAdmin = currentUser.roles?.includes('admin')

        if (!isAdmin) {
          const quotaCheck = await this.databaseService.checkQuota(currentUser.id, fileBuffer.length)
          if (!quotaCheck.allowed) {
            return reply.code(413).send({
              error: {
                code: 'QUOTA_EXCEEDED',
                message: quotaCheck.reason || 'Storage quota exceeded',
                details: quotaCheck.quotaInfo
              }
            })
          }
        }
      }

      // Prepare storage request
      const storageRequest: StorageUploadRequest = {
        file: fileBuffer,
        filename: uploadMetadata.filename,
        mimeType: uploadMetadata.mimeType,
        metadata: {
          dataClassification: uploadMetadata.dataClassification,
          tags: uploadMetadata.tags,
          customMetadata: uploadMetadata.customMetadata,
          createdBy: currentUser?.id
        },
        options: {
          path: uploadMetadata.path,
          encrypt: uploadMetadata.encrypt,
          overwrite: uploadMetadata.overwrite
        }
      }

      // Upload file (this already saves to database internally)
      const result = await this.storageService.upload(storageRequest)

      if (!result.success) {
        return reply.code(500).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload file',
            details: result.error
          }
        })
      }

      // Return success response
      const response: ApiUploadResponse = {
        success: true,
        fileId: result.fileId,
        filename: result.metadata.filename,
        size: result.metadata.size,
        mimeType: result.metadata.mimeType,
        checksum: result.metadata.checksum,
        metadata: {
          filename: result.metadata.filename,
          originalName: result.metadata.originalName,
          mimeType: result.metadata.mimeType,
          size: result.metadata.size,
          checksum: result.metadata.checksum,
          provider: result.metadata.provider,
          providerPath: result.metadata.providerPath,
          dataClassification: result.metadata.dataClassification,
          encrypted: result.metadata.encrypted,
          createdAt: result.metadata.createdAt.toISOString(),
          updatedAt: result.metadata.updatedAt.toISOString(),
          createdBy: result.metadata.createdBy
        }
      }

      return reply.code(201).send(response)

    } catch (error) {
      request.log.error('Upload failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error during upload',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      })
    }
  }

  /**
   * Download a file
   * GET /storage/download/:fileId
   */
  async download(request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) {
    try {
      const { fileId } = request.params
      const currentUser = (request as any).user

      // Check file exists and user has permission
      if (this.databaseService) {
        const fileMetadata = await this.databaseService.getFileMetadata(fileId)
        if (!fileMetadata) {
          return reply.code(404).send({
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'File not found'
            }
          })
        }

        // TODO: Add permission checking logic here
        // For now, allow all authenticated users to download
      }

      // Prepare download request
      const downloadRequest: StorageDownloadRequest = {
        fileId,
        userId: currentUser?.id
      }

      // Download file
      const result = await this.storageService.download(downloadRequest)

      if (!result.success) {
        return reply.code(404).send({
          error: {
            code: 'DOWNLOAD_FAILED',
            message: 'Failed to download file',
            details: result.error
          }
        })
      }

      // Set response headers
      reply.header('Content-Type', result.mimeType || 'application/octet-stream')
      reply.header('Content-Length', result.size)
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`)

      // Stream file data
      return reply.send(result.data)

    } catch (error) {
      request.log.error('Download failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error during download'
        }
      })
    }
  }

  /**
   * Get file information
   * GET /storage/files/:fileId
   */
  async getFileInfo(request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply): Promise<ApiFileInfoResponse | ApiErrorResponse> {
    try {
      const { fileId } = request.params

      // Get file info from storage service
      const fileInfo = await this.storageService.getFileInfo(fileId)

      const response: ApiFileInfoResponse = {
        fileId: fileInfo.fileId,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        path: fileInfo.path,
        checksum: fileInfo.checksum,
        metadata: {
          id: '',
          fileId: fileInfo.fileId,
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          mimeType: fileInfo.mimeType,
          size: fileInfo.size,
          checksum: fileInfo.checksum,
          provider: fileInfo.metadata.provider,
          providerPath: fileInfo.metadata.providerPath,
          dataClassification: fileInfo.metadata.dataClassification,
          encrypted: fileInfo.metadata.encrypted,
          tags: fileInfo.metadata.tags,
          customMetadata: fileInfo.metadata.customMetadata,
          createdBy: fileInfo.metadata.createdBy,
          updatedBy: fileInfo.metadata.createdBy,
          createdAt: fileInfo.metadata.createdAt,
          updatedAt: fileInfo.metadata.updatedAt,
          lastAccessedAt: undefined,
          accessCount: 0,
          status: 'active'
        },
        urls: fileInfo.urls,
        permissions: fileInfo.permissions
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('Get file info failed:', error)
      return reply.code(404).send({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      })
    }
  }

  /**
   * List files
   * GET /storage/files
   */
  async listFiles(request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user
      const query = request.query as any

      // Parse query parameters
      const searchOptions: FileSearchOptions = {
        userId: currentUser?.id,
        provider: query.provider,
        mimeType: query.mimeType,
        dataClassification: query.dataClassification,
        status: query.status || 'active',
        tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
        search: query.search,
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder || 'desc',
        limit: parseInt(query.limit) || 50,
        offset: parseInt(query.offset) || 0
      }

      // Check if database service is available
      if (!this.databaseService) {
        return reply.code(503).send({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is not available'
          }
        })
      }

      // Get files from database service
      const result = await this.databaseService.listFiles(searchOptions)

      const response = {
        files: result.files.map(file => ({
          fileId: file.fileId,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          checksum: file.checksum,
          dataClassification: file.dataClassification,
          encrypted: file.encrypted,
          tags: file.tags,
          customMetadata: file.customMetadata,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
          lastAccessedAt: file.lastAccessedAt?.toISOString(),
          accessCount: file.accessCount,
          status: file.status
        })),
        total: result.total,
        hasMore: result.hasMore,
        pagination: {
          limit: searchOptions.limit || 50,
          offset: searchOptions.offset || 0,
          total: result.total
        }
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('List files failed:', error)
      
      // Log the full error for debugging
      console.error('Storage listFiles error:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list files',
          details: process.env.NODE_ENV === 'development' ? {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            raw: error
          } : undefined
        }
      })
    }
  }

  /**
   * Delete a file
   * DELETE /storage/files/:fileId
   */
  async deleteFile(request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) {
    try {
      const { fileId } = request.params

      // Delete file
      const success = await this.storageService.delete(fileId)

      if (!success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found or could not be deleted'
          }
        })
      }

      return reply.send({
        success: true,
        fileId,
        message: 'File deleted successfully'
      })

    } catch (error) {
      request.log.error('Delete file failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file'
        }
      })
    }
  }

  /**
   * Generate presigned URL
   * POST /storage/presigned-url
   */
  async generatePresignedUrl(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const { fileId, operation, expiresIn } = request.body as any

      if (!fileId || !operation) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'fileId and operation are required'
          }
        })
      }

      // Validate operation
      if (!['read', 'write'].includes(operation)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_OPERATION',
            message: 'operation must be either "read" or "write"'
          }
        })
      }

      const result = await this.storageService.generatePresignedUrl({
        fileId,
        operation,
        expiresIn: expiresIn || 3600
      })

      return reply.send({
        url: result.url,
        method: result.method,
        headers: result.headers,
        formData: result.formData,
        expiresAt: result.expiresAt.toISOString()
      })

    } catch (error) {
      request.log.error('Generate presigned URL failed:', error)
      
      // Log detailed error information for debugging
      console.error('Presigned URL generation error:', error)
      console.error('Request body:', request.body)
      
      // Handle StorageError specifically
      if (error && typeof error === 'object' && 'code' in error) {
        const storageError = error as any
        
        if (storageError.code === 'FILE_NOT_FOUND') {
          return reply.code(404).send({
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'File not found or inaccessible',
              details: process.env.NODE_ENV === 'development' ? storageError.message : undefined
            }
          })
        }
        
        if (storageError.code === 'CONFIGURATION_ERROR') {
          return reply.code(500).send({
            error: {
              code: 'METADATA_PARSE_ERROR',
              message: 'Failed to parse file metadata',
              details: process.env.NODE_ENV === 'development' ? storageError.message : undefined
            }
          })
        }
      }
      
      // Handle generic error cases
      if (error instanceof Error && error.message.includes('JSON')) {
        return reply.code(500).send({
          error: {
            code: 'METADATA_PARSE_ERROR',
            message: 'Failed to parse file metadata',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          }
        })
      }
      
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate presigned URL',
          details: process.env.NODE_ENV === 'development' ? {
            message: error instanceof Error ? error.message : String(error),
            type: error ? error.constructor.name : 'Unknown'
          } : undefined
        }
      })
    }
  }

  /**
   * Get storage statistics
   * GET /storage/stats
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user

      // Get statistics from database service
      const stats = await this.databaseService.getStorageStatistics(currentUser?.id)

      // Get quota information if available
      let quotaInfo = undefined
      if (currentUser?.id && this.databaseService) {
        const quotaCheck = await this.databaseService.checkQuota(currentUser.id, 0)
        if (quotaCheck.quotaInfo) {
          quotaInfo = {
            ...quotaCheck.quotaInfo,
            percentageUsed: (quotaCheck.quotaInfo.usedStorage / quotaCheck.quotaInfo.maxStorage) * 100
          }
        }
      }

      const response = {
        ...stats,
        quotaInfo
      }

      return reply.send(response)

    } catch (error) {
      request.log.error('Get storage stats failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get storage statistics'
        }
      })
    }
  }

  /**
   * Share a file
   * POST /storage/share
   */
  async shareFile(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user
      const { fileId, sharedWith, permissions, expiresAt } = request.body as any

      if (!fileId || !sharedWith) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'fileId and sharedWith are required'
          }
        })
      }

      // Share the file
      const success = await this.databaseService.shareFile(
        fileId,
        currentUser.id,
        sharedWith,
        {
          canRead: permissions?.canRead ?? true,
          canWrite: permissions?.canWrite ?? false,
          canDelete: permissions?.canDelete ?? false,
          canShare: permissions?.canShare ?? false,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        }
      )

      if (!success) {
        return reply.code(404).send({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found or could not be shared'
          }
        })
      }

      return reply.send({
        success: true,
        fileId,
        sharedWith,
        permissions: {
          canRead: permissions?.canRead ?? true,
          canWrite: permissions?.canWrite ?? false,
          canDelete: permissions?.canDelete ?? false,
          canShare: permissions?.canShare ?? false
        },
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
      })

    } catch (error) {
      request.log.error('Share file failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to share file'
        }
      })
    }
  }

  /**
   * Get files shared with current user
   * GET /storage/shared-files
   */
  async getSharedFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user

      if (!this.databaseService) {
        return reply.code(503).send({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is not available'
          }
        })
      }

      const { files, shares } = await this.databaseService.getSharedFiles(currentUser.id)

      // Map files with their share information
      const sharedFiles = files.map((file, index) => ({
        ...file,
        shareInfo: shares[index]
      }))

      return reply.send({
        files: sharedFiles,
        total: files.length
      })

    } catch (error) {
      request.log.error('Get shared files failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to retrieve shared files'
        }
      })
    }
  }

  /**
   * Get files that current user has shared with others
   * GET /storage/my-shares
   */
  async getMyShares(request: FastifyRequest, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user

      if (!this.databaseService) {
        return reply.code(503).send({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is not available'
          }
        })
      }

      const { files, shares } = await this.databaseService.getMyShares(currentUser.id)

      // Map files with their share information
      const myShares = files.map((file, index) => ({
        ...file,
        shareInfo: shares[index]
      }))

      return reply.send({
        files: myShares,
        total: files.length
      })

    } catch (error) {
      request.log.error('Get my shares failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve your shares'
        }
      })
    }
  }

  /**
   * Revoke a file share
   * DELETE /storage/shares/:shareId
   */
  async revokeShare(request: FastifyRequest<{ Params: { shareId: string } }>, reply: FastifyReply) {
    try {
      const currentUser = (request as any).user
      const { shareId } = request.params

      if (!shareId) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Share ID is required'
          }
        })
      }

      if (!this.databaseService) {
        return reply.code(503).send({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is not available'
          }
        })
      }

      const result = await this.databaseService.revokeShare(shareId, currentUser.id)

      if (!result.success) {
        const statusCode = result.message === 'Share not found' ? 404 : 403
        return reply.code(statusCode).send({
          error: {
            code: result.message === 'Share not found' ? 'SHARE_NOT_FOUND' : 'FORBIDDEN',
            message: result.message
          }
        })
      }

      return reply.send({
        success: true,
        message: result.message,
        shareId
      })

    } catch (error) {
      request.log.error('Revoke share failed:', error)
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke share'
        }
      })
    }
  }
}
