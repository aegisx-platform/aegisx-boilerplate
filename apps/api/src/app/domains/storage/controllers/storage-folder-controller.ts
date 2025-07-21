/**
 * Storage Folder Controller
 * 
 * HTTP request handlers for folder management operations
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { StorageFolderService } from '../services/storage-folder-service'
import {
  CreateFolderRequest,
  FolderResponse,
  ListFoldersRequest,
  ListFoldersResponse,
  UpdateFolderRequest,
  DeleteFolderResponse,
  FolderTreeResponse,
  FolderIdParams
} from '../schemas/storage.schemas'
import { 
  CreateFolderOptions, 
  FolderListOptions 
} from '../types/storage.types'

export class StorageFolderController {
  private folderService: StorageFolderService

  constructor(folderService: StorageFolderService) {
    this.folderService = folderService
  }

  /**
   * Create a new folder
   * POST /storage/folders
   */
  async createFolder(
    request: FastifyRequest<{ Body: CreateFolderRequest }>,
    reply: FastifyReply
  ): Promise<FolderResponse> {
    try {
      const userId = request.user?.id
      const { name, path, parentId, description, metadata, icon, color, dataClassification, inheritPermissions } = request.body

      const options: CreateFolderOptions = {
        name,
        path,
        parentId,
        description,
        metadata,
        icon,
        color,
        dataClassification,
        inheritPermissions
      }

      const folder = await this.folderService.createFolder(options, userId)

      const response: FolderResponse = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        description: folder.description,
        metadata: folder.metadata,
        icon: folder.icon,
        color: folder.color,
        dataClassification: folder.dataClassification,
        inheritPermissions: folder.inheritPermissions,
        fileCount: folder.fileCount,
        subfolderCount: folder.subfolderCount,
        totalSize: folder.totalSize,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        lastAccessedAt: folder.lastAccessedAt?.toISOString(),
        status: folder.status,
        deletedAt: folder.deletedAt?.toISOString()
      }

      reply.code(201)
      return response
    } catch (error) {
      request.log.error('Error creating folder', {
        error: (error as Error).message,
        body: request.body,
        userId: request.user?.id
      })

      if ((error as Error).message.includes('already exists')) {
        reply.code(409)
        throw request.server.httpErrors.conflict((error as Error).message)
      }

      if ((error as Error).message.includes('not found')) {
        reply.code(404)
        throw request.server.httpErrors.notFound((error as Error).message)
      }

      reply.code(400)
      throw request.server.httpErrors.badRequest((error as Error).message)
    }
  }

  /**
   * Get folder by ID
   * GET /storage/folders/:folderId
   */
  async getFolderById(
    request: FastifyRequest<{ Params: { folderId: string } }>,
    reply: FastifyReply
  ): Promise<FolderResponse> {
    try {
      const folderId = parseInt(request.params.folderId)
      const userId = request.user?.id

      if (isNaN(folderId)) {
        reply.code(400)
        throw request.server.httpErrors.badRequest('Invalid folder ID')
      }

      const folder = await this.folderService.getFolderById(folderId, userId)

      if (!folder) {
        reply.code(404)
        throw request.server.httpErrors.notFound('Folder not found')
      }

      const response: FolderResponse = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        description: folder.description,
        metadata: folder.metadata,
        icon: folder.icon,
        color: folder.color,
        dataClassification: folder.dataClassification,
        inheritPermissions: folder.inheritPermissions,
        fileCount: folder.fileCount,
        subfolderCount: folder.subfolderCount,
        totalSize: folder.totalSize,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        lastAccessedAt: folder.lastAccessedAt?.toISOString(),
        status: folder.status,
        deletedAt: folder.deletedAt?.toISOString()
      }

      return response
    } catch (error) {
      if ((error as any).statusCode) {
        throw error // Re-throw HTTP errors
      }

      request.log.error('Error getting folder', {
        error: (error as Error).message,
        folderId: request.params.folderId,
        userId: request.user?.id
      })

      reply.code(500)
      throw request.server.httpErrors.internalServerError('Failed to retrieve folder')
    }
  }

  /**
   * List folders
   * GET /storage/folders
   */
  async listFolders(
    request: FastifyRequest<{ Querystring: ListFoldersRequest }>,
    reply: FastifyReply
  ): Promise<ListFoldersResponse> {
    try {
      const userId = request.user?.id
      const query = request.query

      const options: FolderListOptions = {
        parentId: query.parentId,
        path: query.path,
        recursive: query.recursive,
        includeFiles: query.includeFiles,
        includeStats: query.includeStats,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset
      }

      const result = await this.folderService.listFolders(options, userId)

      const response: ListFoldersResponse = {
        folders: result.folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          parentId: folder.parentId,
          description: folder.description,
          metadata: folder.metadata,
          icon: folder.icon,
          color: folder.color,
          dataClassification: folder.dataClassification,
          inheritPermissions: folder.inheritPermissions,
          fileCount: folder.fileCount,
          subfolderCount: folder.subfolderCount,
          totalSize: folder.totalSize,
          createdAt: folder.createdAt.toISOString(),
          updatedAt: folder.updatedAt.toISOString(),
          lastAccessedAt: folder.lastAccessedAt?.toISOString(),
          status: folder.status,
          deletedAt: folder.deletedAt?.toISOString()
        })),
        files: query.includeFiles ? [] : undefined, // TODO: Add files when requested
        total: result.total,
        hasMore: result.hasMore,
        pagination: {
          limit: options.limit || 50,
          offset: options.offset || 0,
          total: result.total
        }
      }

      return response
    } catch (error) {
      request.log.error('Error listing folders', {
        error: (error as Error).message,
        query: request.query,
        userId: request.user?.id
      })

      reply.code(500)
      throw request.server.httpErrors.internalServerError('Failed to list folders')
    }
  }

  /**
   * Update folder
   * PATCH /storage/folders/:folderId
   */
  async updateFolder(
    request: FastifyRequest<{ 
      Params: { folderId: string }
      Body: UpdateFolderRequest 
    }>,
    reply: FastifyReply
  ): Promise<FolderResponse> {
    try {
      const folderId = parseInt(request.params.folderId)
      const userId = request.user?.id
      const updates = request.body

      if (isNaN(folderId)) {
        reply.code(400)
        throw request.server.httpErrors.badRequest('Invalid folder ID')
      }

      const folder = await this.folderService.updateFolder(folderId, updates, userId)

      if (!folder) {
        reply.code(404)
        throw request.server.httpErrors.notFound('Folder not found')
      }

      const response: FolderResponse = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        description: folder.description,
        metadata: folder.metadata,
        icon: folder.icon,
        color: folder.color,
        dataClassification: folder.dataClassification,
        inheritPermissions: folder.inheritPermissions,
        fileCount: folder.fileCount,
        subfolderCount: folder.subfolderCount,
        totalSize: folder.totalSize,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        lastAccessedAt: folder.lastAccessedAt?.toISOString(),
        status: folder.status,
        deletedAt: folder.deletedAt?.toISOString()
      }

      return response
    } catch (error) {
      if ((error as any).statusCode) {
        throw error // Re-throw HTTP errors
      }

      request.log.error('Error updating folder', {
        error: (error as Error).message,
        folderId: request.params.folderId,
        updates: request.body,
        userId: request.user?.id
      })

      reply.code(400)
      throw request.server.httpErrors.badRequest((error as Error).message)
    }
  }

  /**
   * Delete folder
   * DELETE /storage/folders/:folderId
   */
  async deleteFolder(
    request: FastifyRequest<{ Params: { folderId: string } }>,
    reply: FastifyReply
  ): Promise<DeleteFolderResponse> {
    try {
      const folderId = parseInt(request.params.folderId)
      const userId = request.user?.id

      if (isNaN(folderId)) {
        reply.code(400)
        throw request.server.httpErrors.badRequest('Invalid folder ID')
      }

      const result = await this.folderService.deleteFolder(folderId, userId)

      if (!result.success) {
        reply.code(404)
        throw request.server.httpErrors.notFound('Folder not found')
      }

      const response: DeleteFolderResponse = {
        success: result.success,
        folderId,
        deletedFolders: result.deletedFolders,
        deletedFiles: result.deletedFiles,
        message: `Successfully deleted ${result.deletedFolders} folder(s) and ${result.deletedFiles} file(s)`
      }

      return response
    } catch (error) {
      if ((error as any).statusCode) {
        throw error // Re-throw HTTP errors
      }

      request.log.error('Error deleting folder', {
        error: (error as Error).message,
        folderId: request.params.folderId,
        userId: request.user?.id
      })

      reply.code(500)
      throw request.server.httpErrors.internalServerError('Failed to delete folder')
    }
  }

  /**
   * Get folder tree
   * GET /storage/folders/tree
   */
  async getFolderTree(
    request: FastifyRequest<{ 
      Querystring: { 
        rootFolderId?: string
        includeFiles?: boolean 
      } 
    }>,
    reply: FastifyReply
  ): Promise<FolderTreeResponse> {
    try {
      const userId = request.user?.id
      const { rootFolderId, includeFiles } = request.query

      let parsedRootFolderId: number | null = null
      if (rootFolderId) {
        parsedRootFolderId = parseInt(rootFolderId)
        if (isNaN(parsedRootFolderId)) {
          reply.code(400)
          throw request.server.httpErrors.badRequest('Invalid root folder ID')
        }
      }

      const tree = await this.folderService.getFolderTree(
        parsedRootFolderId, 
        includeFiles || false, 
        userId
      )

      // Calculate totals
      let totalFolders = 0
      let totalFiles = 0
      let totalSize = 0

      const countNodes = (nodes: any[]): void => {
        for (const node of nodes) {
          totalFolders++
          totalSize += node.folder.totalSize || 0
          
          if (node.files) {
            totalFiles += node.files.length
          }
          
          if (node.children) {
            countNodes(node.children)
          }
        }
      }

      countNodes(tree)

      const response: FolderTreeResponse = {
        tree: tree.map(node => this.mapTreeNode(node)),
        totalFolders,
        totalFiles,
        totalSize
      }

      return response
    } catch (error) {
      request.log.error('Error getting folder tree', {
        error: (error as Error).message,
        query: request.query,
        userId: request.user?.id
      })

      reply.code(500)
      throw request.server.httpErrors.internalServerError('Failed to retrieve folder tree')
    }
  }

  /**
   * Move folder
   * POST /storage/folders/:folderId/move
   */
  async moveFolder(
    request: FastifyRequest<{ 
      Params: { folderId: string }
      Body: { newParentId?: number | null } 
    }>,
    reply: FastifyReply
  ): Promise<FolderResponse> {
    try {
      const folderId = parseInt(request.params.folderId)
      const { newParentId } = request.body
      const userId = request.user?.id

      if (isNaN(folderId)) {
        reply.code(400)
        throw request.server.httpErrors.badRequest('Invalid folder ID')
      }

      const folder = await this.folderService.moveFolder(folderId, newParentId || null, userId)

      if (!folder) {
        reply.code(404)
        throw request.server.httpErrors.notFound('Folder not found')
      }

      const response: FolderResponse = {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        description: folder.description,
        metadata: folder.metadata,
        icon: folder.icon,
        color: folder.color,
        dataClassification: folder.dataClassification,
        inheritPermissions: folder.inheritPermissions,
        fileCount: folder.fileCount,
        subfolderCount: folder.subfolderCount,
        totalSize: folder.totalSize,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        lastAccessedAt: folder.lastAccessedAt?.toISOString(),
        status: folder.status,
        deletedAt: folder.deletedAt?.toISOString()
      }

      return response
    } catch (error) {
      if ((error as any).statusCode) {
        throw error // Re-throw HTTP errors
      }

      request.log.error('Error moving folder', {
        error: (error as Error).message,
        folderId: request.params.folderId,
        newParentId: request.body.newParentId,
        userId: request.user?.id
      })

      reply.code(400)
      throw request.server.httpErrors.badRequest((error as Error).message)
    }
  }

  /**
   * Map tree node for response
   */
  private mapTreeNode(node: any): any {
    return {
      folder: {
        id: node.folder.id,
        name: node.folder.name,
        path: node.folder.path,
        parentId: node.folder.parentId,
        description: node.folder.description,
        metadata: node.folder.metadata,
        icon: node.folder.icon,
        color: node.folder.color,
        dataClassification: node.folder.dataClassification,
        inheritPermissions: node.folder.inheritPermissions,
        fileCount: node.folder.fileCount,
        subfolderCount: node.folder.subfolderCount,
        totalSize: node.folder.totalSize,
        createdAt: node.folder.createdAt.toISOString(),
        updatedAt: node.folder.updatedAt.toISOString(),
        lastAccessedAt: node.folder.lastAccessedAt?.toISOString(),
        status: node.folder.status,
        deletedAt: node.folder.deletedAt?.toISOString()
      },
      children: node.children ? node.children.map((child: any) => this.mapTreeNode(child)) : undefined,
      files: node.files ? node.files.map((file: any) => ({
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
      })) : undefined
    }
  }
}