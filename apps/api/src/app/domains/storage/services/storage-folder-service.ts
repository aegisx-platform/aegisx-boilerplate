/**
 * Storage Folder Service
 * 
 * Business logic for folder management in the storage system
 */

import { FastifyInstance } from 'fastify'
import { StorageFolderRepository } from '../repositories/storage-folder-repository'
import { 
  StorageFolder, 
  CreateFolderOptions, 
  FolderListOptions,
  FolderTreeNode,
  StorageEventData
} from '../types/storage.types'

export class StorageFolderService {
  private folderRepository: StorageFolderRepository
  private fastify: FastifyInstance

  constructor(fastify: FastifyInstance, folderRepository: StorageFolderRepository) {
    this.fastify = fastify
    this.folderRepository = folderRepository
  }

  /**
   * Create a new folder
   */
  async createFolder(options: CreateFolderOptions, userId?: string): Promise<StorageFolder> {
    try {
      // Validate folder name
      if (!options.name || options.name.trim() === '') {
        throw new Error('Folder name is required')
      }

      // Sanitize folder name (remove invalid characters)
      const sanitizedName = this.sanitizeFolderName(options.name.trim())
      if (sanitizedName !== options.name.trim()) {
        this.fastify.log.warn('Folder name was sanitized', {
          original: options.name,
          sanitized: sanitizedName,
          userId
        })
      }

      const folderOptions = {
        ...options,
        name: sanitizedName
      }

      // Validate parent folder if specified
      if (options.parentId) {
        const parentFolder = await this.folderRepository.getFolderById(options.parentId)
        if (!parentFolder) {
          throw new Error('Parent folder not found')
        }

        // Check permissions to create in parent folder
        // TODO: Implement permission checking when RBAC is integrated
      }

      const folder = await this.folderRepository.createFolder(folderOptions, userId)

      // Publish folder creation event
      await this.publishFolderEvent('folder.created', folder, userId, true)

      // Audit log
      await this.auditFolderOperation('create', folder.id, userId, {
        folderName: folder.name,
        path: folder.path,
        parentId: folder.parentId
      })

      this.fastify.log.info('Folder created successfully', {
        folderId: folder.id,
        folderName: folder.name,
        path: folder.path,
        userId
      })

      return folder
    } catch (error) {
      // Publish failure event
      await this.publishFolderEvent('folder.create_failed', null, userId, false, (error as Error).message)

      this.fastify.log.error('Failed to create folder', {
        error: (error as Error).message,
        options,
        userId
      })

      throw error
    }
  }

  /**
   * Get folder by ID
   */
  async getFolderById(folderId: number, userId?: string): Promise<StorageFolder | null> {
    const folder = await this.folderRepository.getFolderById(folderId)
    
    if (folder) {
      // Check read permissions
      // TODO: Implement permission checking when RBAC is integrated

      // Update last accessed time
      await this.updateFolderAccess(folderId, userId)
    }

    return folder
  }

  /**
   * Get folder by path
   */
  async getFolderByPath(path: string, userId?: string): Promise<StorageFolder | null> {
    const folder = await this.folderRepository.getFolderByPath(path)
    
    if (folder) {
      // Check read permissions
      // TODO: Implement permission checking when RBAC is integrated

      // Update last accessed time
      await this.updateFolderAccess(folder.id, userId)
    }

    return folder
  }

  /**
   * List folders with filtering and pagination
   */
  async listFolders(options: FolderListOptions = {}, userId?: string): Promise<{
    folders: StorageFolder[]
    total: number
    hasMore: boolean
  }> {
    // TODO: Apply user permissions to filter results
    
    const result = await this.folderRepository.listFolders(options)

    this.fastify.log.debug('Listed folders', {
      total: result.total,
      returned: result.folders.length,
      options,
      userId
    })

    return result
  }

  /**
   * Update folder
   */
  async updateFolder(
    folderId: number, 
    updates: Partial<CreateFolderOptions>,
    userId?: string
  ): Promise<StorageFolder | null> {
    try {
      const existingFolder = await this.folderRepository.getFolderById(folderId)
      if (!existingFolder) {
        throw new Error('Folder not found')
      }

      // Check update permissions
      // TODO: Implement permission checking when RBAC is integrated

      // Sanitize folder name if provided
      if (updates.name !== undefined) {
        const sanitizedName = this.sanitizeFolderName(updates.name.trim())
        updates.name = sanitizedName
      }

      const updatedFolder = await this.folderRepository.updateFolder(folderId, updates, userId)
      
      if (updatedFolder) {
        // Publish update event
        await this.publishFolderEvent('folder.updated', updatedFolder, userId, true)

        // Audit log
        await this.auditFolderOperation('update', folderId, userId, {
          updates,
          folderName: updatedFolder.name
        })

        this.fastify.log.info('Folder updated successfully', {
          folderId,
          updates,
          userId
        })
      }

      return updatedFolder
    } catch (error) {
      // Publish failure event
      await this.publishFolderEvent('folder.update_failed', null, userId, false, (error as Error).message)

      this.fastify.log.error('Failed to update folder', {
        error: (error as Error).message,
        folderId,
        updates,
        userId
      })

      throw error
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(folderId: number, userId?: string): Promise<{
    success: boolean
    deletedFolders: number
    deletedFiles: number
  }> {
    try {
      const folder = await this.folderRepository.getFolderById(folderId)
      if (!folder) {
        throw new Error('Folder not found')
      }

      // Check delete permissions
      // TODO: Implement permission checking when RBAC is integrated

      const result = await this.folderRepository.deleteFolder(folderId, userId)

      if (result.success) {
        // Publish delete event
        await this.publishFolderEvent('folder.deleted', folder, userId, true)

        // Audit log
        await this.auditFolderOperation('delete', folderId, userId, {
          folderName: folder.name,
          path: folder.path,
          deletedFolders: result.deletedFolders,
          deletedFiles: result.deletedFiles
        })

        this.fastify.log.info('Folder deleted successfully', {
          folderId,
          folderName: folder.name,
          deletedFolders: result.deletedFolders,
          deletedFiles: result.deletedFiles,
          userId
        })
      }

      return result
    } catch (error) {
      // Publish failure event
      await this.publishFolderEvent('folder.delete_failed', null, userId, false, (error as Error).message)

      this.fastify.log.error('Failed to delete folder', {
        error: (error as Error).message,
        folderId,
        userId
      })

      throw error
    }
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(
    rootFolderId?: number | null, 
    includeFiles = false,
    userId?: string
  ): Promise<FolderTreeNode[]> {
    // TODO: Apply user permissions to filter tree nodes
    
    const tree = await this.folderRepository.getFolderTree(rootFolderId, includeFiles)

    this.fastify.log.debug('Retrieved folder tree', {
      rootFolderId,
      includeFiles,
      nodeCount: tree.length,
      userId
    })

    return tree
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(folderId: number, newParentId: number | null, userId?: string): Promise<StorageFolder | null> {
    try {
      const folder = await this.folderRepository.getFolderById(folderId)
      if (!folder) {
        throw new Error('Folder not found')
      }

      // Check move permissions
      // TODO: Implement permission checking when RBAC is integrated

      const updatedFolder = await this.folderRepository.moveFolder(folderId, newParentId, userId)

      if (updatedFolder) {
        // Publish move event
        await this.publishFolderEvent('folder.moved', updatedFolder, userId, true)

        // Audit log
        await this.auditFolderOperation('move', folderId, userId, {
          folderName: folder.name,
          oldPath: folder.path,
          newPath: updatedFolder.path,
          oldParentId: folder.parentId,
          newParentId
        })

        this.fastify.log.info('Folder moved successfully', {
          folderId,
          folderName: folder.name,
          oldPath: folder.path,
          newPath: updatedFolder.path,
          userId
        })
      }

      return updatedFolder
    } catch (error) {
      // Publish failure event
      await this.publishFolderEvent('folder.move_failed', null, userId, false, (error as Error).message)

      this.fastify.log.error('Failed to move folder', {
        error: (error as Error).message,
        folderId,
        newParentId,
        userId
      })

      throw error
    }
  }

  /**
   * Update folder last accessed time
   */
  private async updateFolderAccess(folderId: number, userId?: string): Promise<void> {
    try {
      await this.folderRepository.updateFolder(folderId, {}, userId)
    } catch (error) {
      // Don't throw error for access time update failures
      this.fastify.log.warn('Failed to update folder access time', {
        error: (error as Error).message,
        folderId,
        userId
      })
    }
  }

  /**
   * Sanitize folder name
   */
  private sanitizeFolderName(name: string): string {
    // Remove invalid characters for file systems
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .substring(0, 255) // Limit to 255 characters
  }

  /**
   * Publish folder event
   */
  private async publishFolderEvent(
    operation: string,
    folder: StorageFolder | null,
    userId?: string,
    success = true,
    error?: string
  ): Promise<void> {
    try {
      const eventData: StorageEventData = {
        operation,
        folderId: folder?.id,
        folderName: folder?.name,
        userId,
        provider: 'database', // Folders are always stored in database
        success,
        error,
        metadata: folder ? {
          path: folder.path,
          parentId: folder.parentId,
          dataClassification: folder.dataClassification,
          fileCount: folder.fileCount,
          subfolderCount: folder.subfolderCount,
          totalSize: folder.totalSize
        } : undefined,
        timestamp: new Date()
      }

      await this.fastify.eventBus.publish('storage.folder', eventData)
    } catch (error) {
      this.fastify.log.warn('Failed to publish folder event', {
        operation,
        folderId: folder?.id,
        error: (error as Error).message
      })
    }
  }

  /**
   * Audit folder operation
   */
  private async auditFolderOperation(
    operation: string,
    folderId: number,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      if ((this.fastify as any).auditLog) {
        await (this.fastify as any).auditLog.log({
          action: `folder.${operation}`,
          resource: 'storage_folders',
          resourceId: folderId,
          userId,
          details: {
            ...details
          }
        })
      }
    } catch (error) {
      this.fastify.log.warn('Failed to write audit log', {
        operation,
        folderId,
        error: (error as Error).message
      })
    }
  }
}