/**
 * Storage Service Types
 * 
 * Comprehensive type definitions for the enterprise storage system
 * with support for local file system and MinIO providers
 */

// Core storage enums
export type StorageProvider = 'local' | 'minio'
export type FileOperation = 'upload' | 'download' | 'delete' | 'read' | 'write' | 'list'
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted'
export type EncryptionAlgorithm = 'AES-256-GCM' | 'AES-256-CBC'
export type CompressionAlgorithm = 'gzip' | 'brotli' | 'lz4'

// File metadata interface
export interface FileMetadata {
  filename: string
  originalName: string
  mimeType: string
  size: number
  encoding?: string
  checksum: string
  checksumAlgorithm: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  tags?: string[]
  customMetadata?: Record<string, any>
  
  // Healthcare metadata removed
  
  // Security
  encrypted: boolean
  encryptionKeyId?: string
  dataClassification: DataClassification
  
  // Storage provider specific
  provider: StorageProvider
  providerPath: string
  providerMetadata?: Record<string, any>
}

// Healthcare metadata removed - implement at application level if needed

// Upload request interface
export interface UploadRequest {
  file: Buffer
  filename: string
  mimeType: string
  metadata?: Partial<FileMetadata>
  options?: UploadOptions
}

// Upload options
export interface UploadOptions {
  path?: string
  encrypt?: boolean
  compress?: boolean
  overwrite?: boolean
  generateThumbnail?: boolean
  virus_scan?: boolean
  dataClassification?: DataClassification
  tags?: string[]
  customMetadata?: Record<string, any>
  // Healthcare data removed
}

// Download request interface
export interface DownloadRequest {
  fileId: string
  options?: DownloadOptions
}

// Download options
export interface DownloadOptions {
  decrypt?: boolean
  decompress?: boolean
  validateChecksum?: boolean
  auditAccess?: boolean
  purpose?: string
}

// Storage result interface
export interface StorageResult {
  success: boolean
  fileId: string
  filename: string
  path: string
  size: number
  checksum: string
  mimeType: string
  metadata: FileMetadata
  url?: string
  presignedUrl?: string
  expiresAt?: Date
  error?: StorageError
}

// Download result interface
export interface DownloadResult {
  success: boolean
  fileId: string
  filename: string
  mimeType: string
  size: number
  data: Buffer
  metadata: FileMetadata
  cached: boolean
  error?: StorageError
}

// File info interface
export interface FileInfo {
  fileId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  checksum: string
  metadata: FileMetadata
  urls: {
    download?: string
    thumbnail?: string
    preview?: string
  }
  permissions: FilePermissions
  // Healthcare metadata removed
}

// File permissions
export interface FilePermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canShare: boolean
  allowedUsers: string[]
  allowedRoles: string[]
}

// List options interface
export interface ListOptions {
  path?: string
  pattern?: string
  recursive?: boolean
  includeMetadata?: boolean
  sortBy?: 'name' | 'size' | 'created' | 'modified'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
  filters?: FileFilters
}

// File filters
export interface FileFilters {
  mimeTypes?: string[]
  sizeMin?: number
  sizeMax?: number
  createdAfter?: Date
  createdBefore?: Date
  tags?: string[]
  dataClassification?: DataClassification[]
  encrypted?: boolean
}

// File list result
export interface FileList {
  files: FileInfo[]
  total: number
  hasMore: boolean
  nextOffset?: number
  aggregations?: {
    totalSize: number
    fileTypes: Record<string, number>
    classifications: Record<DataClassification, number>
  }
}

// Presigned URL request
export interface PresignedUrlRequest {
  fileId?: string
  path?: string
  operation: 'read' | 'write'
  expiresIn?: number
  contentType?: string
  conditions?: PresignedUrlConditions
}

// Presigned URL conditions
export interface PresignedUrlConditions {
  maxFileSize?: number
  allowedMimeTypes?: string[]
  requireEncryption?: boolean
  dataClassification?: DataClassification
}

// Presigned URL result
export interface PresignedUrlResult {
  url: string
  method: string
  headers?: Record<string, string>
  formData?: Record<string, string>
  expiresAt: Date
  conditions: PresignedUrlConditions
}

// Storage configuration interfaces
export interface StorageConfig {
  provider: StorageProvider
  enabled: boolean
  
  // Provider configurations
  local?: LocalStorageConfig
  minio?: MinIOStorageConfig
  
  // Security & encryption
  encryption: EncryptionConfig
  
  // Performance & optimization
  compression: CompressionConfig
  caching: CachingConfig
  
  // Healthcare compliance removed
  
  // File processing
  processing: FileProcessingConfig
  
  // Integration with enterprise services
  integration: IntegrationConfig
  
  // Monitoring & metrics
  monitoring: MonitoringConfig
}

// Local storage configuration
export interface LocalStorageConfig {
  basePath: string
  permissions: string
  maxFileSize: number
  maxFiles: number
  allowedMimeTypes?: string[]
  thumbnailPath?: string
  tempPath?: string
}

// MinIO storage configuration
export interface MinIOStorageConfig {
  endpoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  bucket: string
  region?: string
  pathStyle?: boolean
  presignedUrlExpiry: number
  maxFileSize: number
  multipartThreshold: number
  multipartChunkSize: number
}

// Encryption configuration
export interface EncryptionConfig {
  enabled: boolean
  algorithm: EncryptionAlgorithm
  keyManagement: {
    provider: 'local' | 'aws-kms' | 'azure-keyvault'
    keyRotationInterval: number
    masterKeyId?: string
  }
  encryptMetadata: boolean
  encryptFilenames: boolean
}

// Compression configuration
export interface CompressionConfig {
  enabled: boolean
  algorithm: CompressionAlgorithm
  threshold: number
  level: number
  mimeTypes: string[]
}

// Caching configuration
export interface CachingConfig {
  enabled: boolean
  metadataCache: {
    enabled: boolean
    ttl: number
    maxSize: number
  }
  fileCache: {
    enabled: boolean
    ttl: number
    maxSize: number
    maxFileSize: number
  }
  presignedUrlCache: {
    enabled: boolean
    ttl: number
  }
}

// Healthcare configuration removed - implement at application level if needed

// File processing configuration
export interface FileProcessingConfig {
  thumbnails: {
    enabled: boolean
    sizes: number[]
    quality: number
    formats: string[]
  }
  virusScanning: {
    enabled: boolean
    provider: string
    quarantinePath?: string
  }
  contentAnalysis: {
    enabled: boolean
    extractText: boolean
    detectLanguage: boolean
    classifyContent: boolean
  }
}

// Integration configuration
export interface IntegrationConfig {
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    timeout: number
  }
  retry: {
    enabled: boolean
    attempts: number
    delay: number
  }
  eventBus: {
    enabled: boolean
    publishEvents: boolean
  }
  audit: {
    enabled: boolean
    logOperations: boolean
    includeMetadata: boolean
  }
  metrics: {
    enabled: boolean
    collectMetrics: boolean
    customMetrics: boolean
  }
}

// Monitoring configuration
export interface MonitoringConfig {
  healthChecks: {
    enabled: boolean
    interval: number
    timeout: number
  }
  alerts: {
    enabled: boolean
    thresholds: {
      errorRate: number
      responseTime: number
      diskUsage: number
    }
  }
  logging: {
    enabled: boolean
    level: string
    includeMetadata: boolean
  }
}

// Storage provider interface
export interface IStorageProvider {
  // Connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  // Core operations
  upload(request: UploadRequest): Promise<StorageResult>
  download(request: DownloadRequest): Promise<DownloadResult>
  delete(fileId: string): Promise<boolean>
  exists(fileId: string): Promise<boolean>
  
  // File management
  getMetadata(fileId: string): Promise<FileMetadata>
  updateMetadata(fileId: string, metadata: Partial<FileMetadata>): Promise<boolean>
  copyFile(sourceId: string, destinationPath: string): Promise<StorageResult>
  moveFile(sourceId: string, destinationPath: string): Promise<StorageResult>
  
  // Batch operations
  uploadMultiple(requests: UploadRequest[]): Promise<StorageResult[]>
  downloadMultiple(requests: DownloadRequest[]): Promise<DownloadResult[]>
  deleteMultiple(fileIds: string[]): Promise<boolean[]>
  
  // Listing and search
  listFiles(options: ListOptions): Promise<FileList>
  searchFiles(query: string, options?: ListOptions): Promise<FileList>
  
  // URL generation
  generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResult>
  
  // Health and monitoring
  getHealth(): Promise<StorageHealth>
  getStats(): Promise<StorageStats>
  
  // Cleanup operations
  cleanup(options?: CleanupOptions): Promise<CleanupResult>
}

// Storage health interface
export interface StorageHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  score: number
  provider: StorageProvider
  connected: boolean
  latency: number
  errorRate: number
  diskUsage?: {
    used: number
    total: number
    percentage: number
  }
  issues: string[]
  recommendations: string[]
  lastCheck: Date
}

// Storage statistics interface
export interface StorageStats {
  provider: StorageProvider
  operations: {
    uploads: number
    downloads: number
    deletes: number
    errors: number
  }
  performance: {
    averageUploadTime: number
    averageDownloadTime: number
    averageLatency: number
    throughput: number
  }
  storage: {
    totalFiles: number
    totalSize: number
    averageFileSize: number
    largestFile: number
  }
  cache: {
    hitRate: number
    missRate: number
    evictions: number
  }
  // Healthcare compliance stats removed
  timeRange: {
    startTime: Date
    endTime: Date
  }
}

// Cleanup options
export interface CleanupOptions {
  dryRun?: boolean
  olderThan?: Date
  sizeThreshold?: number
  unusedFiles?: boolean
  tempFiles?: boolean
  corruptedFiles?: boolean
  patterns?: string[]
}

// Cleanup result
export interface CleanupResult {
  filesRemoved: number
  bytesFreed: number
  errors: CleanupError[]
  summary: {
    tempFiles: number
    oldFiles: number
    unusedFiles: number
    corruptedFiles: number
  }
}

// Cleanup error
export interface CleanupError {
  fileId: string
  path: string
  error: string
  type: 'permission' | 'corruption' | 'network' | 'unknown'
}

// Storage events
export interface StorageEventData {
  fileId?: string
  filename?: string
  path?: string
  operation: FileOperation
  provider: StorageProvider
  userId?: string
  metadata?: Partial<FileMetadata>
  error?: StorageError
  duration?: number
  size?: number
  success: boolean
  timestamp: Date
}

// Storage errors
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly provider?: StorageProvider,
    public readonly fileId?: string,
    public readonly path?: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export type StorageErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'PERMISSION_DENIED'
  | 'STORAGE_FULL'
  | 'NETWORK_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR'
  | 'CHECKSUM_MISMATCH'
  | 'VIRUS_DETECTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONFIGURATION_ERROR'
  | 'OPERATION_TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'UNKNOWN_ERROR'

// File validation result
export interface FileValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  metadata: {
    actualMimeType?: string
    virusScanResult?: VirusScanResult
    contentAnalysis?: ContentAnalysisResult
  }
}

// Validation error
export interface ValidationError {
  code: string
  message: string
  field?: string
  value?: any
}

// Validation warning
export interface ValidationWarning {
  code: string
  message: string
  field?: string
  value?: any
}

// Virus scan result
export interface VirusScanResult {
  clean: boolean
  threats: string[]
  scanTime: Date
  scanner: string
  version: string
}

// Content analysis result
export interface ContentAnalysisResult {
  textContent?: string
  language?: string
  classification?: string
  sentiment?: string
  entities?: string[]
  keywords?: string[]
}

// Default configuration
export const DefaultStorageConfig: StorageConfig = {
  provider: 'local',
  enabled: true,
  
  local: {
    basePath: './storage',
    permissions: '0755',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10000,
    thumbnailPath: './storage/thumbnails',
    tempPath: './storage/temp'
  },
  
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyManagement: {
      provider: 'local',
      keyRotationInterval: 90 * 24 * 60 * 60 * 1000 // 90 days
    },
    encryptMetadata: true,
    encryptFilenames: false
  },
  
  compression: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024, // 1KB
    level: 6,
    mimeTypes: ['text/*', 'application/json', 'application/xml']
  },
  
  caching: {
    enabled: true,
    metadataCache: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxSize: 1000
    },
    fileCache: {
      enabled: true,
      ttl: 1800000, // 30 minutes
      maxSize: 100,
      maxFileSize: 1024 * 1024 // 1MB
    },
    presignedUrlCache: {
      enabled: true,
      ttl: 300000 // 5 minutes
    }
  },
  
  // Healthcare configuration removed
  
  processing: {
    thumbnails: {
      enabled: true,
      sizes: [150, 300, 600],
      quality: 80,
      formats: ['webp', 'jpeg']
    },
    virusScanning: {
      enabled: false,
      provider: 'clamav'
    },
    contentAnalysis: {
      enabled: false,
      extractText: false,
      detectLanguage: false,
      classifyContent: false
    }
  },
  
  integration: {
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      timeout: 60000
    },
    retry: {
      enabled: true,
      attempts: 3,
      delay: 1000
    },
    eventBus: {
      enabled: true,
      publishEvents: true
    },
    audit: {
      enabled: true,
      logOperations: true,
      includeMetadata: true
    },
    metrics: {
      enabled: true,
      collectMetrics: true,
      customMetrics: true
    }
  },
  
  monitoring: {
    healthChecks: {
      enabled: true,
      interval: 60000,
      timeout: 5000
    },
    alerts: {
      enabled: true,
      thresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        diskUsage: 0.8 // 80%
      }
    },
    logging: {
      enabled: true,
      level: 'info',
      includeMetadata: true
    }
  }
}