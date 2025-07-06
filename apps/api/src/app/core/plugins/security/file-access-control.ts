/**
 * File Access Control Plugin
 * 
 * Provides middleware for checking file access permissions based on:
 * 1. File ownership (created_by)
 * 2. Shared file permissions (storage_file_shares)
 * 
 * Integrates with storage domain and shared files management
 */

import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify'
import { StorageFileRepository } from '../../../domains/storage/repositories/storage-file-repository'
import { StorageDatabaseService } from '../../../domains/storage/services/storage-database-service'

declare module 'fastify' {
  interface FastifyInstance {
    checkFileAccess: (operation: FileOperation) => preHandlerHookHandler
    fileAccessControl: FileAccessControlService
    auditLog?: {
      log: (logData: any) => Promise<void>
    }
  }
}

export type FileOperation = 'read' | 'write' | 'delete' | 'share'

interface FileAccessControlOptions {
  // Add any configuration options here
  enableCache?: boolean
  cacheExpiration?: number
  enableAuditLogging?: boolean
}

interface FileAccessResult {
  allowed: boolean
  reason?: string
  isOwner?: boolean
  shareId?: string
  permissions?: {
    canRead: boolean
    canWrite: boolean
    canDelete: boolean
    canShare: boolean
  }
}

class FileAccessControlService {
  private repository: StorageFileRepository
  private cache = new Map<string, { result: FileAccessResult; expires: number }>()

  constructor(
    repository: StorageFileRepository,
    _databaseService: StorageDatabaseService,
    private options: FileAccessControlOptions = {}
  ) {
    this.repository = repository
  }

  /**
   * Check if user has access to perform operation on file
   */
  async checkAccess(
    fileId: string,
    userId: string,
    operation: FileOperation
  ): Promise<FileAccessResult> {
    // Check cache first
    if (this.options.enableCache) {
      const cacheKey = `${fileId}:${userId}:${operation}`
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        return cached.result
      }
    }

    try {
      // Get file metadata
      const file = await this.repository.getFileByFileId(fileId)
      if (!file) {
        return { allowed: false, reason: 'File not found' }
      }

      if (file.status !== 'active') {
        return { allowed: false, reason: 'File is not active' }
      }

      // Check if user is the owner
      if (file.created_by === userId) {
        const result: FileAccessResult = {
          allowed: true,
          isOwner: true,
          reason: 'File owner'
        }
        this.cacheResult(`${fileId}:${userId}:${operation}`, result)
        return result
      }

      // Check shared permissions
      const shares = await this.repository.getSharedFilesWithDetails(userId)
      const fileShare = shares.find(share => share.file_id === file.id)

      if (!fileShare) {
        return { allowed: false, reason: 'No access permission' }
      }

      // Check if share is active and not expired
      if (!fileShare.is_active) {
        return { allowed: false, reason: 'Share is inactive' }
      }

      if (fileShare.expires_at && new Date(fileShare.expires_at) < new Date()) {
        return { allowed: false, reason: 'Share has expired' }
      }

      // Check specific operation permission
      const permissions = {
        canRead: fileShare.can_read,
        canWrite: fileShare.can_write,
        canDelete: fileShare.can_delete,
        canShare: fileShare.can_share
      }

      let hasPermission = false
      switch (operation) {
        case 'read':
          hasPermission = permissions.canRead
          break
        case 'write':
          hasPermission = permissions.canWrite
          break
        case 'delete':
          hasPermission = permissions.canDelete
          break
        case 'share':
          hasPermission = permissions.canShare
          break
        default:
          hasPermission = false
      }

      const result: FileAccessResult = {
        allowed: hasPermission,
        reason: hasPermission ? `Share permission: ${operation}` : `No ${operation} permission`,
        isOwner: false,
        shareId: fileShare.share_id,
        permissions
      }

      this.cacheResult(`${fileId}:${userId}:${operation}`, result)
      return result

    } catch (error) {
      return {
        allowed: false,
        reason: `Access check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Cache access result
   */
  private cacheResult(key: string, result: FileAccessResult): void {
    if (!this.options.enableCache) return

    const expiration = Date.now() + (this.options.cacheExpiration || 5 * 60 * 1000) // 5 minutes default
    this.cache.set(key, { result, expires: expiration })

    // Simple cache cleanup
    if (this.cache.size > 1000) {
      const now = Date.now()
      for (const [cacheKey, cached] of this.cache.entries()) {
        if (cached.expires < now) {
          this.cache.delete(cacheKey)
        }
      }
    }
  }

  /**
   * Clear cache for specific file or user
   */
  clearCache(fileId?: string, userId?: string): void {
    if (!fileId && !userId) {
      this.cache.clear()
      return
    }

    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      const [cacheFileId, cacheUserId] = key.split(':')
      if ((fileId && cacheFileId === fileId) || (userId && cacheUserId === userId)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

async function fileAccessControlPlugin(
  fastify: FastifyInstance,
  options: FileAccessControlOptions = {}
) {
  // Initialize dependencies
  if (!fastify.knex) {
    throw new Error('File Access Control plugin requires database plugin to be registered first')
  }

  const repository = new StorageFileRepository(fastify.knex)
  const databaseService = new StorageDatabaseService(repository)
  const fileAccessControl = new FileAccessControlService(repository, databaseService, {
    enableCache: true,
    cacheExpiration: 5 * 60 * 1000, // 5 minutes
    enableAuditLogging: true,
    ...options
  })

  // Register service
  fastify.decorate('fileAccessControl', fileAccessControl)

  // Middleware factory for file access control
  const checkFileAccess = (operation: FileOperation): preHandlerHookHandler => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Check if user is authenticated
        const user = (request as any).user
        if (!user || !user.id) {
          return reply.code(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          })
        }

        // Get fileId from params
        const params = request.params as any
        const fileId = params.fileId || params.id
        if (!fileId) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_REQUEST',
              message: 'File ID is required'
            }
          })
        }

        // Check access
        const accessResult = await fileAccessControl.checkAccess(fileId, user.id, operation)

        if (!accessResult.allowed) {
          // Audit log for access denial
          if (options.enableAuditLogging && fastify.auditLog) {
            await fastify.auditLog.log({
              action: `file.access.denied.${operation}`,
              resource: 'storage',
              resourceId: fileId,
              details: {
                reason: accessResult.reason,
                operation,
                isOwner: accessResult.isOwner
              }
            })
          }

          const statusCode = accessResult.reason === 'File not found' ? 404 : 403
          return reply.code(statusCode).send({
            error: {
              code: accessResult.reason === 'File not found' ? 'FILE_NOT_FOUND' : 'ACCESS_DENIED',
              message: accessResult.reason || 'Access denied'
            }
          })
        }

        // Audit log for successful access
        if (options.enableAuditLogging && fastify.auditLog) {
          await fastify.auditLog.log({
            action: `file.access.granted.${operation}`,
            resource: 'storage',
            resourceId: fileId,
            details: {
              operation,
              isOwner: accessResult.isOwner,
              shareId: accessResult.shareId,
              permissions: accessResult.permissions
            }
          })
        }

        // Store access result in request for use in handlers
        ;(request as any).fileAccess = accessResult

        // Continue to next handler
      } catch (error) {
        fastify.log.error('File access control failed:', error)
        return reply.code(500).send({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Access control check failed'
          }
        })
      }
    }
  }

  // Register middleware factory
  fastify.decorate('checkFileAccess', checkFileAccess)

  // Hook to clear cache when shares are modified
  fastify.addHook('onRequest', async (request) => {
    const url = request.url
    if (url.includes('/storage/share') || url.includes('/storage/shares/')) {
      // Clear cache for all users when shares are modified
      fileAccessControl.clearCache()
    }
  })
}

export default fp(fileAccessControlPlugin, {
  name: 'file-access-control',
  dependencies: ['knex-plugin', 'audit-plugin']
})

export { fileAccessControlPlugin, FileAccessControlService }