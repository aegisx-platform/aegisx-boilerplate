/**
 * Storage Domain Types
 * 
 * TypeScript interfaces for storage domain business logic
 */

import { ThumbnailInfo, ThumbnailSize } from '../../../core/shared/types/storage.types'

export interface StorageFileMetadata {
  id: string
  fileId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  checksum: string
  provider: string
  providerPath: string
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted'
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

export interface StorageOperation {
  id: string
  fileId: string
  operation: 'upload' | 'download' | 'delete' | 'copy' | 'move' | 'update_metadata'
  status: 'success' | 'failed' | 'pending'
  provider: string
  bytesTransferred?: number
  duration?: number
  userId?: string
  clientIp?: string
  userAgent?: string
  sessionId?: string
  correlationId?: string
  errorCode?: string
  errorMessage?: string
  purpose?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface FileShare {
  id: string
  fileId: string
  sharedBy: string
  sharedWith: string
  permissions: {
    canRead: boolean
    canWrite: boolean
    canDelete: boolean
    canShare: boolean
  }
  expiresAt?: Date
  requiresPassword: boolean
  maxDownloads?: number
  downloadCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date
}

export interface StorageQuota {
  id: string
  userId: string
  entityType: string
  entityId: string
  maxStorageBytes: number
  maxFiles: number
  maxFileSizeBytes: number
  usedStorageBytes: number
  usedFiles: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastCalculatedAt?: Date
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  quotaInfo?: {
    maxStorage: number
    usedStorage: number
    maxFiles: number
    usedFiles: number
    percentageUsed: number
  }
}

export interface StorageStatistics {
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
}

export interface FileSearchOptions {
  userId?: string
  provider?: string
  mimeType?: string
  dataClassification?: string
  status?: string
  tags?: string[]
  search?: string
  sortBy?: 'filename' | 'size' | 'created_at' | 'last_accessed_at'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
  includeDeleted?: boolean
  includeShared?: boolean
}

export interface FileListResult {
  files: StorageFileMetadata[]
  total: number
  hasMore: boolean
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface UploadOptions {
  path?: string
  encrypt?: boolean
  overwrite?: boolean
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
  tags?: string[]
  customMetadata?: Record<string, any>
}

export interface DownloadOptions {
  userId?: string
  auditAccess?: boolean
  decrypt?: boolean
}

export interface ShareOptions {
  permissions: {
    canRead?: boolean
    canWrite?: boolean
    canDelete?: boolean
    canShare?: boolean
  }
  expiresAt?: Date
  requiresPassword?: boolean
  password?: string
  maxDownloads?: number
}

// Request/Response interfaces for API
export interface ApiUploadRequest {
  filename: string
  mimeType: string
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
  tags?: string[]
  customMetadata?: Record<string, any>
  path?: string
  encrypt?: boolean
  overwrite?: boolean
  generateThumbnail?: boolean
  thumbnailSizes?: ThumbnailSize[]
}

export interface ApiUploadResponse {
  success: boolean
  fileId: string
  filename: string
  size: number
  mimeType: string
  checksum: string
  url?: string
  thumbnails?: ThumbnailInfo[]
  metadata: {
    filename: string
    originalName: string
    mimeType: string
    size: number
    checksum: string
    provider: string
    providerPath: string
    dataClassification: string
    encrypted: boolean
    createdAt: string
    updatedAt: string
    createdBy?: string
  }
}

export interface ApiFileInfoResponse {
  fileId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  checksum: string
  metadata: StorageFileMetadata
  urls: {
    download?: string
  }
  permissions: {
    canRead: boolean
    canWrite: boolean
    canDelete: boolean
    canShare: boolean
    allowedUsers: string[]
    allowedRoles: string[]
  }
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

// Event types for storage operations
export interface StorageEventData {
  operation: string
  fileId?: string
  filename?: string
  userId?: string
  provider?: string
  size?: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
  timestamp: Date
}