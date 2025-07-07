/**
 * Storage File Repository
 * 
 * Handles database operations for storage files, operations, and related data
 */

import { Knex } from 'knex'

export interface StorageFileRecord {
  id: string
  file_id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  checksum: string
  checksum_algorithm: string
  encoding?: string
  provider: string
  provider_path: string
  provider_metadata?: string
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
  encrypted: boolean
  encryption_key_id?: string
  tags?: string
  custom_metadata?: string
  created_by?: string
  updated_by?: string
  created_at: Date
  updated_at: Date
  last_accessed_at?: Date
  access_count: number
  status: 'active' | 'archived' | 'deleted' | 'corrupted'
  deleted_at?: Date
}

export interface StorageOperationRecord {
  id: string
  file_id: string
  operation: 'upload' | 'download' | 'delete' | 'copy' | 'move' | 'update_metadata' | 'image_process' | 'image_convert' | 'image_optimize'
  status: 'success' | 'failed' | 'pending'
  provider: string
  bytes_transferred?: number
  duration_ms?: number
  client_ip?: string
  user_agent?: string
  user_id?: string
  session_id?: string
  correlation_id?: string
  error_code?: string
  error_message?: string
  error_details?: string
  purpose?: string
  metadata?: string
  created_at: Date
}

export interface StorageFileShareRecord {
  id: string
  file_id: string
  shared_by: string
  shared_with: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  can_share: boolean
  expires_at?: Date
  requires_password: boolean
  password_hash?: string
  max_downloads?: number
  download_count: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  last_accessed_at?: Date
}

export interface StorageQuotaRecord {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  max_storage_bytes: number
  max_files: number
  max_file_size_bytes: number
  used_storage_bytes: number
  used_files: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  last_calculated_at?: Date
}

export interface FileListOptions {
  userId?: string
  provider?: string
  mimeType?: string
  dataClassification?: string
  status?: string
  tags?: string[]
  limit?: number
  offset?: number
  sortBy?: 'filename' | 'size' | 'created_at' | 'last_accessed_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface StorageStatsResult {
  totalFiles: number
  totalSize: number
  filesByProvider: Record<string, number>
  filesByMimeType: Record<string, number>
  filesByClassification: Record<string, number>
  averageFileSize: number
  largestFile: number
  recentUploads: number
  recentDownloads: number
}

export class StorageFileRepository {
  constructor(private knex: Knex) {}

  // File Management Operations
  
  async createFile(fileData: Omit<StorageFileRecord, 'id' | 'created_at' | 'updated_at'>): Promise<StorageFileRecord> {
    const [record] = await this.knex('storage_files')
      .insert({
        ...fileData,
        tags: fileData.tags ? JSON.stringify(fileData.tags) : null,
        custom_metadata: fileData.custom_metadata ? JSON.stringify(fileData.custom_metadata) : null,
        provider_metadata: fileData.provider_metadata ? JSON.stringify(fileData.provider_metadata) : null
      })
      .returning('*')
    
    return this.parseFileRecord(record)
  }

  async getFileById(id: string): Promise<StorageFileRecord | null> {
    const record = await this.knex('storage_files')
      .where({ id })
      .first()
    
    return record ? this.parseFileRecord(record) : null
  }

  async getFileByFileId(fileId: string): Promise<StorageFileRecord | null> {
    const record = await this.knex('storage_files')
      .where({ file_id: fileId, status: 'active' })
      .first()
    
    return record ? this.parseFileRecord(record) : null
  }

  async updateFile(id: string, updates: Partial<StorageFileRecord>): Promise<boolean> {
    const updateData = { ...updates }
    
    // Handle JSON fields
    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags)
    }
    if (updateData.custom_metadata) {
      updateData.custom_metadata = JSON.stringify(updateData.custom_metadata)
    }
    if (updateData.provider_metadata) {
      updateData.provider_metadata = JSON.stringify(updateData.provider_metadata)
    }
    
    const result = await this.knex('storage_files')
      .where({ id })
      .update({
        ...updateData,
        updated_at: this.knex.fn.now()
      })
    
    return result > 0
  }

  async updateAccessInfo(fileId: string): Promise<void> {
    await this.knex('storage_files')
      .where({ file_id: fileId })
      .update({
        last_accessed_at: this.knex.fn.now(),
        access_count: this.knex.raw('access_count + 1')
      })
  }

  async deleteFile(id: string, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const result = await this.knex('storage_files')
        .where({ id })
        .update({
          status: 'deleted',
          deleted_at: this.knex.fn.now(),
          updated_at: this.knex.fn.now()
        })
      return result > 0
    } else {
      const result = await this.knex('storage_files')
        .where({ id })
        .del()
      return result > 0
    }
  }

  async listFiles(options: FileListOptions = {}): Promise<{
    files: StorageFileRecord[]
    total: number
    hasMore: boolean
  }> {
    let query = this.knex('storage_files')
      .where({ status: options.status || 'active' })

    // Apply filters
    if (options.userId) {
      query = query.where('created_by', options.userId)
    }
    if (options.provider) {
      query = query.where('provider', options.provider)
    }
    if (options.mimeType) {
      query = query.where('mime_type', 'like', `${options.mimeType}%`)
    }
    if (options.dataClassification) {
      query = query.where('data_classification', options.dataClassification)
    }
    if (options.search) {
      query = query.where(function() {
        this.where('filename', 'ilike', `%${options.search}%`)
          .orWhere('original_name', 'ilike', `%${options.search}%`)
      })
    }
    if (options.tags && options.tags.length > 0) {
      // Search for any of the provided tags
      query = query.where(function() {
        options.tags!.forEach(tag => {
          this.orWhere('tags', 'like', `%"${tag}"%`)
        })
      })
    }

    // Count total records
    const countQuery = query.clone()
    const [{ count }] = await countQuery.count('* as count')
    const total = parseInt(count as string)

    // Apply sorting
    const sortBy = options.sortBy || 'created_at'
    const sortOrder = options.sortOrder || 'desc'
    query = query.orderBy(sortBy, sortOrder)

    // Apply pagination
    const limit = options.limit || 50
    const offset = options.offset || 0
    query = query.limit(limit).offset(offset)

    const records = await query
    const files = records.map(record => this.parseFileRecord(record))

    return {
      files,
      total,
      hasMore: offset + limit < total
    }
  }

  // Operation Logging

  async logOperation(operationData: Omit<StorageOperationRecord, 'id' | 'created_at'>): Promise<StorageOperationRecord> {
    const [record] = await this.knex('storage_operations')
      .insert({
        ...operationData,
        metadata: operationData.metadata ? JSON.stringify(operationData.metadata) : null,
        error_details: operationData.error_details ? JSON.stringify(operationData.error_details) : null
      })
      .returning('*')
    
    return this.parseOperationRecord(record)
  }

  async getOperationsByFileId(fileId: string, limit = 100): Promise<StorageOperationRecord[]> {
    const records = await this.knex('storage_operations')
      .where({ file_id: fileId })
      .orderBy('created_at', 'desc')
      .limit(limit)
    
    return records.map(record => this.parseOperationRecord(record))
  }

  async getOperationsByUserId(userId: string, limit = 100): Promise<StorageOperationRecord[]> {
    const records = await this.knex('storage_operations')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
    
    return records.map(record => this.parseOperationRecord(record))
  }

  // File Sharing

  async createShare(shareData: Omit<StorageFileShareRecord, 'id' | 'created_at' | 'updated_at'>): Promise<StorageFileShareRecord> {
    const [record] = await this.knex('storage_file_shares')
      .insert(shareData)
      .returning('*')
    
    return record
  }

  async getFileShares(fileId: string): Promise<StorageFileShareRecord[]> {
    return await this.knex('storage_file_shares')
      .where({ file_id: fileId, is_active: true })
      .orderBy('created_at', 'desc')
  }

  async getUserShares(userId: string): Promise<StorageFileShareRecord[]> {
    return await this.knex('storage_file_shares')
      .where({ shared_with: userId, is_active: true })
      .orderBy('created_at', 'desc')
  }

  async getMyShares(userId: string): Promise<StorageFileShareRecord[]> {
    return await this.knex('storage_file_shares')
      .where({ shared_by: userId, is_active: true })
      .orderBy('created_at', 'desc')
  }

  async getShareById(shareId: string): Promise<StorageFileShareRecord | null> {
    return await this.knex('storage_file_shares')
      .where({ id: shareId })
      .first()
  }

  async revokeShare(shareId: string, userId: string): Promise<boolean> {
    const result = await this.knex('storage_file_shares')
      .where({ id: shareId, shared_by: userId })
      .update({
        is_active: false,
        updated_at: this.knex.fn.now()
      })
    
    return result > 0
  }

  async getSharedFilesWithDetails(userId: string): Promise<any[]> {
    return await this.knex('storage_file_shares as sfs')
      .join('storage_files as sf', 'sfs.file_id', 'sf.id')
      .join('users as u', 'sfs.shared_by', 'u.id')
      .select(
        'sf.*',
        'sfs.id as share_id',
        'sfs.can_read',
        'sfs.can_write', 
        'sfs.can_delete',
        'sfs.can_share',
        'sfs.expires_at',
        'sfs.created_at as shared_at',
        'u.username as shared_by_username',
        'u.email as shared_by_email'
      )
      .where('sfs.shared_with', userId)
      .where('sfs.is_active', true)
      .where('sf.status', 'active')
      .where(function() {
        this.whereNull('sfs.expires_at')
          .orWhere('sfs.expires_at', '>', new Date())
      })
      .orderBy('sfs.created_at', 'desc')
  }

  async getMySharesWithDetails(userId: string): Promise<any[]> {
    return await this.knex('storage_file_shares as sfs')
      .join('storage_files as sf', 'sfs.file_id', 'sf.id')
      .join('users as u', 'sfs.shared_with', 'u.id')
      .select(
        'sf.*',
        'sfs.id as share_id',
        'sfs.can_read',
        'sfs.can_write',
        'sfs.can_delete', 
        'sfs.can_share',
        'sfs.expires_at',
        'sfs.created_at as shared_at',
        'sfs.last_accessed_at as share_last_accessed_at',
        'u.username as shared_with_username',
        'u.email as shared_with_email'
      )
      .where('sfs.shared_by', userId)
      .where('sfs.is_active', true)
      .where('sf.status', 'active')
      .orderBy('sfs.created_at', 'desc')
  }

  // Quota Management

  async getUserQuota(userId: string): Promise<StorageQuotaRecord | null> {
    return await this.knex('storage_quotas')
      .where({ user_id: userId, entity_type: 'user', is_active: true })
      .first()
  }

  async updateQuotaUsage(userId: string, sizeDelta: number, fileCountDelta: number): Promise<void> {
    await this.knex('storage_quotas')
      .where({ user_id: userId, entity_type: 'user' })
      .update({
        used_storage_bytes: this.knex.raw('used_storage_bytes + ?', [sizeDelta]),
        used_files: this.knex.raw('used_files + ?', [fileCountDelta]),
        last_calculated_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now()
      })
  }

  async checkQuotaExceeded(userId: string, additionalSize: number): Promise<boolean> {
    const quota = await this.getUserQuota(userId)
    if (!quota) return false

    return (quota.used_storage_bytes + additionalSize) > quota.max_storage_bytes ||
           (quota.used_files + 1) > quota.max_files
  }

  // Statistics and Analytics

  async getStorageStats(userId?: string): Promise<StorageStatsResult> {
    let baseQuery = this.knex('storage_files').where({ status: 'active' })
    
    if (userId) {
      baseQuery = baseQuery.where('created_by', userId)
    }

    // Get basic counts and sizes
    const [totals] = await baseQuery.clone()
      .select(
        this.knex.raw('COUNT(*) as total_files'),
        this.knex.raw('COALESCE(SUM(size), 0) as total_size'),
        this.knex.raw('COALESCE(AVG(size), 0) as average_file_size'),
        this.knex.raw('COALESCE(MAX(size), 0) as largest_file')
      )

    // Get files by provider
    const providerStats = await baseQuery.clone()
      .select('provider')
      .count('* as count')
      .groupBy('provider')

    // Get files by MIME type
    const mimeStats = await baseQuery.clone()
      .select('mime_type')
      .count('* as count')
      .groupBy('mime_type')
      .limit(10)

    // Get files by classification
    const classificationStats = await baseQuery.clone()
      .select('data_classification')
      .count('* as count')
      .groupBy('data_classification')

    // Get recent operations
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentOps = await this.knex('storage_operations')
      .select('operation')
      .count('* as count')
      .where('created_at', '>=', since24h)
      .whereIn('operation', ['upload', 'download'])
      .groupBy('operation')

    return {
      totalFiles: parseInt(totals.total_files),
      totalSize: parseInt(totals.total_size),
      filesByProvider: Object.fromEntries(
        providerStats.map(row => [row.provider, parseInt(String(row.count))])
      ),
      filesByMimeType: Object.fromEntries(
        mimeStats.map(row => [row.mime_type, parseInt(String(row.count))])
      ),
      filesByClassification: Object.fromEntries(
        classificationStats.map(row => [row.data_classification, parseInt(String(row.count))])
      ),
      averageFileSize: parseFloat(totals.average_file_size),
      largestFile: parseInt(totals.largest_file),
      recentUploads: parseInt(String(recentOps.find(op => op.operation === 'upload')?.count || 0)),
      recentDownloads: parseInt(String(recentOps.find(op => op.operation === 'download')?.count || 0))
    }
  }

  async getFilesByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<StorageFileRecord[]> {
    let query = this.knex('storage_files')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .where({ status: 'active' })

    if (userId) {
      query = query.where('created_by', userId)
    }

    const records = await query.orderBy('created_at', 'desc')
    return records.map(record => this.parseFileRecord(record))
  }

  // Cleanup Operations

  async markFilesAsCorrupted(fileIds: string[]): Promise<number> {
    const result = await this.knex('storage_files')
      .whereIn('file_id', fileIds)
      .update({
        status: 'corrupted',
        updated_at: this.knex.fn.now()
      })
    
    return result
  }

  async findOrphanedFiles(): Promise<StorageFileRecord[]> {
    // Files that have been marked as deleted for more than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const records = await this.knex('storage_files')
      .where({ status: 'deleted' })
      .where('deleted_at', '<', thirtyDaysAgo)
    
    return records.map(record => this.parseFileRecord(record))
  }

  async cleanupOldOperations(olderThanDays = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const result = await this.knex('storage_operations')
      .where('created_at', '<', cutoffDate)
      .del()
    
    return result
  }

  // Private helper methods

  private parseFileRecord(record: any): StorageFileRecord {
    return {
      ...record,
      tags: record.tags ? JSON.parse(record.tags) : undefined,
      custom_metadata: record.custom_metadata ? JSON.parse(record.custom_metadata) : undefined,
      provider_metadata: record.provider_metadata ? JSON.parse(record.provider_metadata) : undefined,
      encrypted: Boolean(record.encrypted),
      access_count: parseInt(record.access_count),
      size: parseInt(record.size)
    }
  }

  private parseOperationRecord(record: any): StorageOperationRecord {
    return {
      ...record,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      error_details: record.error_details ? JSON.parse(record.error_details) : undefined,
      bytes_transferred: record.bytes_transferred ? parseInt(record.bytes_transferred) : undefined,
      duration_ms: record.duration_ms ? parseInt(record.duration_ms) : undefined
    }
  }
}