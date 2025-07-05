/**
 * Storage Database Service
 * 
 * Manages database operations for storage files and integrates with the storage providers
 */

import { StorageFileRepository, StorageFileRecord, StorageOperationRecord, FileListOptions } from '../repositories/storage-file-repository'
import { FileMetadata, UploadRequest, DataClassification } from '../../../core/shared/types/storage.types'
import { FileSearchOptions } from '../types/storage.types'

export interface DatabaseFileMetadata {
  id: string
  fileId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  checksum: string
  provider: string
  providerPath: string
  dataClassification: DataClassification
  encrypted: boolean
  tags?: string[]
  customMetadata?: Record<string, any>
  createdBy?: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date
  accessCount: number
  status: 'active' | 'archived' | 'deleted' | 'corrupted'
}

export interface StorageOperationLog {
  operation: 'upload' | 'download' | 'delete' | 'copy' | 'move' | 'update_metadata'
  status: 'success' | 'failed' | 'pending'
  provider: string
  fileId: string
  userId?: string
  sessionId?: string
  correlationId?: string
  clientIp?: string
  userAgent?: string
  bytesTransferred?: number
  duration?: number
  errorCode?: string
  errorMessage?: string
  purpose?: string
  metadata?: Record<string, any>
}

export class StorageDatabaseService {
  constructor(private repository: StorageFileRepository) {}

  // File Management Operations

  async saveFileMetadata(fileMetadata: FileMetadata, uploadRequest: UploadRequest, fileId: string): Promise<DatabaseFileMetadata> {
    const fileRecord: Omit<StorageFileRecord, 'id' | 'created_at' | 'updated_at'> = {
      file_id: fileId, // Use the same fileId from storage provider
      filename: fileMetadata.filename,
      original_name: fileMetadata.originalName,
      mime_type: fileMetadata.mimeType,
      size: fileMetadata.size,
      checksum: fileMetadata.checksum,
      checksum_algorithm: fileMetadata.checksumAlgorithm || 'sha256',
      encoding: fileMetadata.encoding,
      provider: fileMetadata.provider,
      provider_path: fileMetadata.providerPath,
      provider_metadata: fileMetadata.providerMetadata ? JSON.stringify(fileMetadata.providerMetadata) : undefined,
      data_classification: fileMetadata.dataClassification,
      encrypted: fileMetadata.encrypted,
      encryption_key_id: fileMetadata.encryptionKeyId,
      tags: fileMetadata.tags ? JSON.stringify(fileMetadata.tags) : undefined,
      custom_metadata: fileMetadata.customMetadata ? JSON.stringify(fileMetadata.customMetadata) : undefined,
      created_by: fileMetadata.createdBy,
      updated_by: fileMetadata.createdBy,
      last_accessed_at: undefined,
      access_count: 0,
      status: 'active',
      deleted_at: undefined
    }

    const savedRecord = await this.repository.createFile(fileRecord)
    return this.mapRecordToMetadata(savedRecord)
  }

  async getFileMetadata(fileId: string): Promise<DatabaseFileMetadata | null> {
    const record = await this.repository.getFileByFileId(fileId)
    return record ? this.mapRecordToMetadata(record) : null
  }

  async getFileById(id: string): Promise<DatabaseFileMetadata | null> {
    const record = await this.repository.getFileById(id)
    return record ? this.mapRecordToMetadata(record) : null
  }

  async updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<boolean> {
    const existingFile = await this.repository.getFileByFileId(fileId)
    if (!existingFile) return false

    const updateData: Partial<StorageFileRecord> = {}

    if (updates.filename) updateData.filename = updates.filename
    if (updates.mimeType) updateData.mime_type = updates.mimeType
    if (updates.dataClassification) updateData.data_classification = updates.dataClassification
    if (updates.tags) updateData.tags = JSON.stringify(updates.tags)
    if (updates.customMetadata) updateData.custom_metadata = JSON.stringify(updates.customMetadata)
    if (updates.providerMetadata) updateData.provider_metadata = JSON.stringify(updates.providerMetadata)

    return await this.repository.updateFile(existingFile.id, updateData)
  }

  async markFileAsAccessed(fileId: string): Promise<void> {
    await this.repository.updateAccessInfo(fileId)
  }

  async deleteFileMetadata(fileId: string, softDelete = true): Promise<boolean> {
    const file = await this.repository.getFileByFileId(fileId)
    if (!file) return false

    return await this.repository.deleteFile(file.id, softDelete)
  }

  async listFiles(options: FileSearchOptions = {}): Promise<{
    files: DatabaseFileMetadata[]
    total: number
    hasMore: boolean
  }> {
    const repositoryOptions: FileListOptions = {
      ...options,
      status: options.includeDeleted ? undefined : 'active'
    }

    const result = await this.repository.listFiles(repositoryOptions)

    return {
      files: result.files.map(record => this.mapRecordToMetadata(record)),
      total: result.total,
      hasMore: result.hasMore
    }
  }

  async searchFiles(query: string, options: FileSearchOptions = {}): Promise<DatabaseFileMetadata[]> {
    const searchOptions: FileListOptions = {
      ...options,
      search: query,
      status: options.includeDeleted ? undefined : 'active'
    }

    const result = await this.repository.listFiles(searchOptions)
    return result.files.map(record => this.mapRecordToMetadata(record))
  }

  // Operation Logging

  async logOperation(operationLog: StorageOperationLog): Promise<void> {
    const operationRecord: Omit<StorageOperationRecord, 'id' | 'created_at'> = {
      file_id: await this.getInternalFileId(operationLog.fileId),
      operation: operationLog.operation,
      status: operationLog.status,
      provider: operationLog.provider,
      bytes_transferred: operationLog.bytesTransferred,
      duration_ms: operationLog.duration,
      client_ip: operationLog.clientIp,
      user_agent: operationLog.userAgent,
      user_id: operationLog.userId,
      session_id: operationLog.sessionId,
      correlation_id: operationLog.correlationId,
      error_code: operationLog.errorCode,
      error_message: operationLog.errorMessage,
      error_details: operationLog.errorCode ? JSON.stringify({
        code: operationLog.errorCode,
        message: operationLog.errorMessage,
        metadata: operationLog.metadata
      }) : undefined,
      purpose: operationLog.purpose,
      metadata: operationLog.metadata ? JSON.stringify(operationLog.metadata) : undefined
    }

    await this.repository.logOperation(operationRecord)
  }

  async getFileOperations(fileId: string, limit = 100): Promise<StorageOperationRecord[]> {
    const internalId = await this.getInternalFileId(fileId)
    return await this.repository.getOperationsByFileId(internalId, limit)
  }

  async getUserOperations(userId: string, limit = 100): Promise<StorageOperationRecord[]> {
    return await this.repository.getOperationsByUserId(userId, limit)
  }

  // Quota Management

  async checkQuota(userId: string, fileSize: number): Promise<{
    allowed: boolean
    reason?: string
    quotaInfo?: {
      maxStorage: number
      usedStorage: number
      maxFiles: number
      usedFiles: number
    }
  }> {
    const quota = await this.repository.getUserQuota(userId)
    
    if (!quota) {
      return { allowed: true } // No quota restrictions
    }

    const wouldExceedStorage = (quota.used_storage_bytes + fileSize) > quota.max_storage_bytes
    const wouldExceedFileCount = (quota.used_files + 1) > quota.max_files

    if (wouldExceedStorage || wouldExceedFileCount) {
      return {
        allowed: false,
        reason: wouldExceedStorage ? 'Storage quota exceeded' : 'File count quota exceeded',
        quotaInfo: {
          maxStorage: quota.max_storage_bytes,
          usedStorage: quota.used_storage_bytes,
          maxFiles: quota.max_files,
          usedFiles: quota.used_files
        }
      }
    }

    return {
      allowed: true,
      quotaInfo: {
        maxStorage: quota.max_storage_bytes,
        usedStorage: quota.used_storage_bytes,
        maxFiles: quota.max_files,
        usedFiles: quota.used_files
      }
    }
  }

  async updateQuota(userId: string, sizeDelta: number, fileCountDelta: number): Promise<void> {
    await this.repository.updateQuotaUsage(userId, sizeDelta, fileCountDelta)
  }

  // Statistics and Analytics

  async getStorageStatistics(userId?: string): Promise<{
    totalFiles: number
    totalSize: number
    filesByProvider: Record<string, number>
    filesByMimeType: Record<string, number>
    filesByClassification: Record<string, number>
    averageFileSize: number
    largestFile: number
    recentActivity: {
      uploads: number
      downloads: number
    }
  }> {
    const stats = await this.repository.getStorageStats(userId)
    
    return {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      filesByProvider: stats.filesByProvider,
      filesByMimeType: stats.filesByMimeType,
      filesByClassification: stats.filesByClassification,
      averageFileSize: stats.averageFileSize,
      largestFile: stats.largestFile,
      recentActivity: {
        uploads: stats.recentUploads,
        downloads: stats.recentDownloads
      }
    }
  }

  async getFilesByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<DatabaseFileMetadata[]> {
    const records = await this.repository.getFilesByDateRange(startDate, endDate, userId)
    return records.map(record => this.mapRecordToMetadata(record))
  }

  // File Sharing (if needed)

  async shareFile(fileId: string, sharedBy: string, sharedWith: string, permissions: {
    canRead?: boolean
    canWrite?: boolean
    canDelete?: boolean
    canShare?: boolean
    expiresAt?: Date
  }): Promise<boolean> {
    const file = await this.repository.getFileByFileId(fileId)
    if (!file) return false

    const shareData = {
      file_id: file.id,
      shared_by: sharedBy,
      shared_with: sharedWith,
      can_read: permissions.canRead ?? true,
      can_write: permissions.canWrite ?? false,
      can_delete: permissions.canDelete ?? false,
      can_share: permissions.canShare ?? false,
      expires_at: permissions.expiresAt,
      requires_password: false,
      max_downloads: undefined,
      download_count: 0,
      is_active: true,
      last_accessed_at: undefined
    }

    await this.repository.createShare(shareData)
    return true
  }

  async getSharedFiles(userId: string): Promise<{
    files: DatabaseFileMetadata[]
    shares: any[]
  }> {
    const sharedFilesWithDetails = await this.repository.getSharedFilesWithDetails(userId)
    
    const files = sharedFilesWithDetails.map(record => {
      const fileRecord = { ...record }
      // Remove share-specific fields to create clean file record
      delete fileRecord.share_id
      delete fileRecord.can_read
      delete fileRecord.can_write
      delete fileRecord.can_delete
      delete fileRecord.can_share
      delete fileRecord.expires_at
      delete fileRecord.shared_at
      delete fileRecord.shared_by_username
      delete fileRecord.shared_by_email
      
      return this.mapRecordToMetadata(fileRecord)
    })

    const shares = sharedFilesWithDetails.map(record => ({
      shareId: record.share_id,
      fileId: record.file_id,
      permissions: {
        canRead: record.can_read,
        canWrite: record.can_write,
        canDelete: record.can_delete,
        canShare: record.can_share
      },
      expiresAt: record.expires_at,
      sharedAt: record.shared_at,
      sharedBy: {
        username: record.shared_by_username,
        email: record.shared_by_email
      }
    }))

    return { files, shares }
  }

  async getMyShares(userId: string): Promise<{
    files: DatabaseFileMetadata[]
    shares: any[]
  }> {
    const mySharesWithDetails = await this.repository.getMySharesWithDetails(userId)
    
    const files = mySharesWithDetails.map(record => {
      const fileRecord = { ...record }
      // Remove share-specific fields to create clean file record
      delete fileRecord.share_id
      delete fileRecord.can_read
      delete fileRecord.can_write
      delete fileRecord.can_delete
      delete fileRecord.can_share
      delete fileRecord.expires_at
      delete fileRecord.shared_at
      delete fileRecord.share_last_accessed_at
      delete fileRecord.shared_with_username
      delete fileRecord.shared_with_email
      
      return this.mapRecordToMetadata(fileRecord)
    })

    const shares = mySharesWithDetails.map(record => ({
      shareId: record.share_id,
      fileId: record.file_id,
      permissions: {
        canRead: record.can_read,
        canWrite: record.can_write,
        canDelete: record.can_delete,
        canShare: record.can_share
      },
      expiresAt: record.expires_at,
      sharedAt: record.shared_at,
      lastAccessedAt: record.share_last_accessed_at,
      sharedWith: {
        username: record.shared_with_username,
        email: record.shared_with_email
      }
    }))

    return { files, shares }
  }

  async revokeShare(shareId: string, userId: string): Promise<{
    success: boolean
    message: string
  }> {
    const share = await this.repository.getShareById(shareId)
    
    if (!share) {
      return {
        success: false,
        message: 'Share not found'
      }
    }

    if (share.shared_by !== userId) {
      return {
        success: false,
        message: 'You can only revoke shares you created'
      }
    }

    if (!share.is_active) {
      return {
        success: false,
        message: 'Share is already inactive'
      }
    }

    const success = await this.repository.revokeShare(shareId, userId)
    
    return {
      success,
      message: success ? 'Share revoked successfully' : 'Failed to revoke share'
    }
  }

  // Cleanup Operations

  async markCorruptedFiles(fileIds: string[]): Promise<number> {
    return await this.repository.markFilesAsCorrupted(fileIds)
  }

  async findOrphanedFiles(): Promise<DatabaseFileMetadata[]> {
    const records = await this.repository.findOrphanedFiles()
    return records.map(record => this.mapRecordToMetadata(record))
  }

  async cleanupOldOperations(olderThanDays = 90): Promise<number> {
    return await this.repository.cleanupOldOperations(olderThanDays)
  }

  // Private Helper Methods

  private async getInternalFileId(fileId: string): Promise<string> {
    const file = await this.repository.getFileByFileId(fileId)
    return file ? file.id : fileId // Fallback to original ID if not found
  }

  private mapRecordToMetadata(record: StorageFileRecord): DatabaseFileMetadata {
    try {
      // Handle tags parsing
      let tags: string[] | undefined
      if (record.tags) {
        if (Array.isArray(record.tags)) {
          tags = record.tags
        } else if (typeof record.tags === 'string') {
          // Handle PostgreSQL array format
          tags = this.parsePostgresArray(record.tags)
        }
      }

      // Handle custom metadata parsing
      let customMetadata: Record<string, any> | undefined
      if (record.custom_metadata) {
        if (typeof record.custom_metadata === 'object' && record.custom_metadata !== null) {
          customMetadata = record.custom_metadata
        } else if (typeof record.custom_metadata === 'string') {
          try {
            customMetadata = JSON.parse(record.custom_metadata)
          } catch (e) {
            console.error('Failed to parse custom_metadata:', record.custom_metadata)
            console.error('Parse error:', e)
            customMetadata = undefined
          }
        }
      }

      return {
        id: record.id,
        fileId: record.file_id,
        filename: record.filename,
        originalName: record.original_name,
        mimeType: record.mime_type,
        size: record.size,
        checksum: record.checksum,
        provider: record.provider,
        providerPath: record.provider_path,
        dataClassification: record.data_classification,
        encrypted: record.encrypted,
        tags,
        customMetadata,
        createdBy: record.created_by,
        updatedBy: record.updated_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        lastAccessedAt: record.last_accessed_at,
        accessCount: record.access_count,
        status: record.status
      }
    } catch (error) {
      console.error('Error in mapRecordToMetadata:', error)
      console.error('Record that caused error:', JSON.stringify(record, null, 2))
      throw error
    }
  }

  private parsePostgresArray(value: string): string[] {
    // Handle PostgreSQL array format like {value1,value2} or {"value1","value2"}
    if (typeof value !== 'string') return []
    
    // Remove curly braces
    const cleaned = value.replace(/^\{|\}$/g, '')
    
    // Handle empty array
    if (!cleaned) return []
    
    // Split by comma, handling quoted values
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i]
      
      if (char === '"' && (i === 0 || cleaned[i-1] !== '\\')) {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    
    if (current) {
      result.push(current.trim().replace(/^"|"$/g, ''))
    }
    
    return result
  }

  // Maintenance Operations

  async getDatabaseHealthInfo(): Promise<{
    totalFiles: number
    totalOperations: number
    storageUsed: number
    oldestFile: Date | null
    newestFile: Date | null
    corruptedFiles: number
    deletedFiles: number
  }> {
    const stats = await this.repository.getStorageStats()
    
    // Get additional health metrics
    const [healthMetrics] = await this.repository['knex']('storage_files')
      .select(
        this.repository['knex'].raw('MIN(created_at) as oldest_file'),
        this.repository['knex'].raw('MAX(created_at) as newest_file'),
        this.repository['knex'].raw('COUNT(CASE WHEN status = \'corrupted\' THEN 1 END) as corrupted_count'),
        this.repository['knex'].raw('COUNT(CASE WHEN status = \'deleted\' THEN 1 END) as deleted_count')
      )

    const [operationCount] = await this.repository['knex']('storage_operations')
      .count('* as total')

    return {
      totalFiles: stats.totalFiles,
      totalOperations: parseInt(operationCount.total as string),
      storageUsed: stats.totalSize,
      oldestFile: healthMetrics.oldest_file,
      newestFile: healthMetrics.newest_file,
      corruptedFiles: parseInt(healthMetrics.corrupted_count),
      deletedFiles: parseInt(healthMetrics.deleted_count)
    }
  }
}