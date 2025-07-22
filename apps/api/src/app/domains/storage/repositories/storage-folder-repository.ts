/**
 * Storage Folder Repository
 * 
 * Database operations for folder management in the storage system
 */

import { Knex } from 'knex'
import { 
  StorageFolder, 
  CreateFolderOptions, 
  FolderListOptions,
  FolderTreeNode
} from '../types/storage.types'

export class StorageFolderRepository {
  private knex: Knex

  constructor(knex: Knex) {
    this.knex = knex
  }

  /**
   * Create a new folder
   */
  async createFolder(options: CreateFolderOptions, userId?: string): Promise<StorageFolder> {
    const now = new Date()
    
    // Generate path if not provided
    let folderPath = options.path
    if (!folderPath) {
      if (options.parentId) {
        const parent = await this.getFolderById(options.parentId)
        if (!parent) {
          const error = new Error('Parent folder not found')
          error.name = 'PARENT_NOT_FOUND'
          throw error
        }
        folderPath = `${parent.path}/${options.name}`
      } else {
        folderPath = options.name
      }
    }

    // Check if folder already exists at this path
    const existing = await this.knex('storage_folders')
      .where('path', folderPath)
      .where('status', 'active')
      .first()

    if (existing) {
      const error = new Error(`Folder already exists at path: ${folderPath}`)
      error.name = 'FOLDER_EXISTS'
      throw error
    }

    const folderData = {
      name: options.name,
      path: folderPath,
      parent_id: options.parentId || null,
      description: options.description || null,
      metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      icon: options.icon || null,
      color: options.color || null,
      data_classification: options.dataClassification || 'internal',
      inherit_permissions: options.inheritPermissions !== false,
      custom_permissions: options.customPermissions ? JSON.stringify(options.customPermissions) : null,
      file_count: 0,
      subfolder_count: 0,
      total_size: 0,
      created_by: userId || null,
      updated_by: userId || null,
      created_at: now,
      updated_at: now,
      status: 'active'
    }

    const [folderId] = await this.knex('storage_folders')
      .insert(folderData)
      .returning('id')

    // Update parent folder's subfolder count
    if (options.parentId) {
      await this.updateFolderStats(options.parentId)
    }

    const folder = await this.getFolderById(folderId.id || folderId)
    if (!folder) {
      throw new Error('Failed to retrieve created folder')
    }
    return folder
  }

  /**
   * Get folder by ID
   */
  async getFolderById(folderId: number): Promise<StorageFolder | null> {
    const row = await this.knex('storage_folders')
      .where('id', folderId)
      .where('status', '!=', 'deleted')
      .first()

    if (!row) return null

    return this.mapRowToFolder(row)
  }

  /**
   * Get folder by path
   */
  async getFolderByPath(path: string): Promise<StorageFolder | null> {
    const row = await this.knex('storage_folders')
      .where('path', path)
      .where('status', 'active')
      .first()

    if (!row) return null

    return this.mapRowToFolder(row)
  }

  /**
   * List folders with filtering and pagination
   */
  async listFolders(options: FolderListOptions = {}): Promise<{
    folders: StorageFolder[]
    total: number
    hasMore: boolean
  }> {
    let query = this.knex('storage_folders')

    // Filters
    if (options.parentId !== undefined) {
      query = query.where('parent_id', options.parentId)
    }
    
    if (options.path) {
      if (options.recursive) {
        query = query.where('path', 'like', `${options.path}%`)
      } else {
        query = query.where('path', options.path)
      }
    }

    if (options.status) {
      query = query.where('status', options.status)
    } else {
      query = query.where('status', '!=', 'deleted')
    }

    // Count total
    const totalQuery = query.clone()
    const [{ count }] = await totalQuery.count('* as count')
    const total = parseInt(count as string)

    // Apply sorting
    const sortBy = options.sortBy || 'name'
    const sortOrder = options.sortOrder || 'asc'
    
    if (sortBy === 'size') {
      query = query.orderBy('total_size', sortOrder)
    } else {
      query = query.orderBy(sortBy, sortOrder)
    }

    // Apply pagination
    const limit = options.limit || 50
    const offset = options.offset || 0
    
    query = query.limit(limit).offset(offset)

    const rows = await query
    const folders = rows.map(row => this.mapRowToFolder(row))

    return {
      folders,
      total,
      hasMore: offset + folders.length < total
    }
  }

  /**
   * Update folder
   */
  async updateFolder(
    folderId: number, 
    updates: Partial<CreateFolderOptions>,
    userId?: string
  ): Promise<StorageFolder | null> {
    const updateData: any = {
      updated_by: userId || null,
      updated_at: new Date()
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata)
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.dataClassification !== undefined) updateData.data_classification = updates.dataClassification
    if (updates.inheritPermissions !== undefined) updateData.inherit_permissions = updates.inheritPermissions
    if (updates.customPermissions !== undefined) updateData.custom_permissions = JSON.stringify(updates.customPermissions)

    const updatedRows = await this.knex('storage_folders')
      .where('id', folderId)
      .where('status', '!=', 'deleted')
      .update(updateData)

    if (updatedRows === 0) return null

    return this.getFolderById(folderId)
  }

  /**
   * Delete folder (soft delete)
   */
  async deleteFolder(folderId: number, userId?: string): Promise<{
    success: boolean
    deletedFolders: number
    deletedFiles: number
  }> {
    const folder = await this.getFolderById(folderId)
    if (!folder) {
      return { success: false, deletedFolders: 0, deletedFiles: 0 }
    }

    const now = new Date()

    // Get all subfolders to delete
    const subfolders = await this.knex('storage_folders')
      .where('path', 'like', `${folder.path}%`)
      .where('status', '!=', 'deleted')

    // Count files in these folders
    const files = await this.knex('storage_files')
      .join('storage_folders', 'storage_files.folder_id', 'storage_folders.id')
      .whereIn('storage_folders.id', subfolders.map(f => f.id))
      .where('storage_files.status', '!=', 'deleted')

    // Soft delete all subfolders
    await this.knex('storage_folders')
      .whereIn('id', subfolders.map(f => f.id))
      .update({
        status: 'deleted',
        deleted_at: now,
        updated_by: userId || null,
        updated_at: now
      })

    // Soft delete all files in these folders
    await this.knex('storage_files')
      .whereIn('folder_id', subfolders.map(f => f.id))
      .update({
        status: 'deleted',
        deleted_at: now,
        updated_by: userId || null,
        updated_at: now
      })

    // Update parent folder stats
    if (folder.parentId) {
      await this.updateFolderStats(folder.parentId)
    }

    return {
      success: true,
      deletedFolders: subfolders.length,
      deletedFiles: files.length
    }
  }

  /**
   * Get detailed folder statistics
   */
  async getFolderStats(folderId: number): Promise<{
    fileCount: number
    subfolderCount: number
    totalSize: number
  }> {
    const folder = await this.getFolderById(folderId)
    if (!folder) {
      return { fileCount: 0, subfolderCount: 0, totalSize: 0 }
    }

    // Count files directly in this folder and all subfolders
    const fileStats = await this.knex('storage_files')
      .join('storage_folders', 'storage_files.folder_id', 'storage_folders.id')
      .where('storage_folders.path', 'like', `${folder.path}%`)
      .where('storage_files.status', '!=', 'deleted')
      .where('storage_folders.status', '!=', 'deleted')
      .select(
        this.knex.raw('COUNT(*) as file_count'),
        this.knex.raw('COALESCE(SUM(storage_files.size), 0) as total_size')
      )
      .first()

    // Count subfolders
    const subfolderCount = await this.knex('storage_folders')
      .where('path', 'like', `${folder.path}/%`)
      .where('status', '!=', 'deleted')
      .count('* as count')
      .first()

    return {
      fileCount: parseInt(fileStats?.file_count || '0'),
      subfolderCount: parseInt(String(subfolderCount?.count || '0')),
      totalSize: parseInt(fileStats?.total_size || '0')
    }
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(rootFolderId?: number | null, includeFiles = false): Promise<FolderTreeNode[]> {
    // Get all folders
    let foldersQuery = this.knex('storage_folders')
      .where('status', 'active')
      .orderBy('path')

    if (rootFolderId !== undefined) {
      if (rootFolderId === null) {
        foldersQuery = foldersQuery.whereNull('parent_id')
      } else {
        const rootFolder = await this.getFolderById(rootFolderId)
        if (!rootFolder) return []
        foldersQuery = foldersQuery.where('path', 'like', `${rootFolder.path}%`)
      }
    }

    const folderRows = await foldersQuery
    const folders = folderRows.map(row => this.mapRowToFolder(row))

    // Build tree structure
    const folderMap = new Map<string, FolderTreeNode>()
    const rootNodes: FolderTreeNode[] = []

    // Create nodes for all folders
    for (const folder of folders) {
      const node: FolderTreeNode = {
        folder,
        children: [],
        files: includeFiles ? [] : undefined
      }
      folderMap.set(folder.id.toString(), node)
    }

    // Build parent-child relationships
    for (const folder of folders) {
      const node = folderMap.get(folder.id.toString())!
      
      if (folder.parentId && folderMap.has(folder.parentId.toString())) {
        const parentNode = folderMap.get(folder.parentId.toString())!
        parentNode.children!.push(node)
      } else {
        rootNodes.push(node)
      }
    }

    // Load files if requested
    if (includeFiles) {
      const fileRows = await this.knex('storage_files')
        .whereIn('folder_id', folders.map(f => f.id))
        .where('status', 'active')
        .orderBy('filename')

      for (const fileRow of fileRows) {
        const folderId = fileRow.folder_id
        if (folderMap.has(folderId)) {
          const node = folderMap.get(folderId)!
          if (node.files) {
            node.files.push(this.mapFileRowToMetadata(fileRow))
          }
        }
      }
    }

    return rootNodes
  }

  /**
   * Update folder statistics (file count, size, etc.)
   */
  async updateFolderStats(folderId: number): Promise<void> {
    const folder = await this.getFolderById(folderId)
    if (!folder) return

    // Count direct subfolders
    const [{ count: subfolderCount }] = await this.knex('storage_folders')
      .where('parent_id', folderId)
      .where('status', 'active')
      .count('* as count')

    // Count files and total size
    const fileStats = await this.knex('storage_files')
      .where('folder_id', folderId)
      .where('status', 'active')
      .select(
        this.knex.raw('COUNT(*) as file_count'),
        this.knex.raw('COALESCE(SUM(size), 0) as total_size')
      )
      .first()

    await this.knex('storage_folders')
      .where('id', folderId)
      .update({
        subfolder_count: parseInt(subfolderCount as string),
        file_count: parseInt(fileStats.file_count),
        total_size: parseInt(fileStats.total_size),
        updated_at: new Date()
      })

    // Recursively update parent folders
    if (folder.parentId) {
      await this.updateFolderStats(folder.parentId)
    }
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(folderId: number, newParentId: number | null, userId?: string): Promise<StorageFolder | null> {
    const folder = await this.getFolderById(folderId)
    if (!folder) return null

    // Validate new parent
    if (newParentId) {
      const newParent = await this.getFolderById(newParentId)
      if (!newParent) {
        throw new Error('New parent folder not found')
      }
      
      // Check for circular dependency
      if (newParent.path.startsWith(folder.path + '/')) {
        throw new Error('Cannot move folder into its own subfolder')
      }
    }

    // Calculate new path
    let newPath: string
    if (newParentId) {
      const newParent = await this.getFolderById(newParentId)!
      newPath = `${newParent!.path}/${folder.name}`
    } else {
      newPath = folder.name
    }

    const oldPath = folder.path
    const oldParentId = folder.parentId

    // Update folder and all subfolders
    await this.knex.transaction(async (trx) => {
      // Update the moved folder
      await trx('storage_folders')
        .where('id', folderId)
        .update({
          parent_id: newParentId,
          path: newPath,
          updated_by: userId || null,
          updated_at: new Date()
        })

      // Update all subfolders' paths
      const subfolders = await trx('storage_folders')
        .where('path', 'like', `${oldPath}/%`)
        .where('status', '!=', 'deleted')

      for (const subfolder of subfolders) {
        const newSubfolderPath = subfolder.path.replace(oldPath, newPath)
        await trx('storage_folders')
          .where('id', subfolder.id)
          .update({ path: newSubfolderPath })
      }
    })

    // Update folder stats for old and new parents
    if (oldParentId) {
      await this.updateFolderStats(oldParentId)
    }
    if (newParentId) {
      await this.updateFolderStats(newParentId)
    }

    return this.getFolderById(folderId)
  }

  /**
   * Map database row to StorageFolder
   */
  private mapRowToFolder(row: any): StorageFolder {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      parentId: row.parent_id,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      icon: row.icon,
      color: row.color,
      dataClassification: row.data_classification,
      inheritPermissions: row.inherit_permissions,
      customPermissions: row.custom_permissions ? JSON.parse(row.custom_permissions) : undefined,
      fileCount: row.file_count,
      subfolderCount: row.subfolder_count,
      totalSize: row.total_size,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
      status: row.status,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    }
  }

  /**
   * Map file row to metadata (simplified for tree view)
   */
  private mapFileRowToMetadata(row: any): any {
    return {
      id: row.id,
      fileId: row.file_id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      checksum: row.checksum,
      dataClassification: row.data_classification,
      encrypted: row.encrypted,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      customMetadata: row.custom_metadata ? JSON.parse(row.custom_metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
      accessCount: row.access_count,
      status: row.status
    }
  }
}