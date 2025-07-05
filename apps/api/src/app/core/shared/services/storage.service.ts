/**
 * Enterprise Storage Service
 * 
 * Comprehensive storage service with multi-provider support, healthcare compliance,
 * and integration with enterprise infrastructure services
 */

import { EventBus } from '../events/interfaces/event-bus.interface'
import { StorageOperationEvent } from '../events/types/service-events.types'
import { CircuitBreakerService } from './circuit-breaker.service'
import { RetryService } from './retry.service'
import { CacheManagerService } from './cache-manager.service'
import { CustomMetricsService } from './custom-metrics.service'
import { LocalStorageProvider } from './storage-providers/local-storage.provider'
import { MinIOStorageProvider } from './storage-providers/minio-storage.provider'
import { StorageDatabaseService } from '../../../domains/storage/services/storage-database-service'
import { StorageFileRepository } from '../../../domains/storage/repositories/storage-file-repository'
import { Knex } from 'knex'
import {
  IStorageProvider,
  StorageConfig,
  UploadRequest,
  DownloadRequest,
  StorageResult,
  DownloadResult,
  FileMetadata,
  FileInfo,
  ListOptions,
  FileList,
  PresignedUrlRequest,
  PresignedUrlResult,
  StorageHealth,
  StorageStats,
  CleanupOptions,
  CleanupResult,
  StorageError,
  StorageEventData,
  DefaultStorageConfig
  // DataClassification removed
} from '../types/storage.types'

export interface IStorageService {
  // Core operations
  upload(request: UploadRequest): Promise<StorageResult>
  download(request: DownloadRequest): Promise<DownloadResult>
  delete(fileId: string): Promise<boolean>
  exists(fileId: string): Promise<boolean>
  
  // File management
  getFileInfo(fileId: string): Promise<FileInfo>
  updateMetadata(fileId: string, metadata: Partial<FileMetadata>): Promise<boolean>
  copyFile(sourceId: string, destinationPath: string): Promise<StorageResult>
  moveFile(sourceId: string, destinationPath: string): Promise<StorageResult>
  
  // Batch operations
  uploadMultiple(requests: UploadRequest[]): Promise<StorageResult[]>
  downloadMultiple(requests: DownloadRequest[]): Promise<DownloadResult[]>
  deleteMultiple(fileIds: string[]): Promise<boolean[]>
  
  // Listing and search
  listFiles(options?: ListOptions): Promise<FileList>
  searchFiles(query: string, options?: ListOptions): Promise<FileList>
  
  // URL generation
  generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResult>
  
  // Data management
  // Healthcare compliance methods removed
  
  // Health and monitoring
  getHealth(): Promise<StorageHealth>
  getStats(): Promise<StorageStats>
  
  // Management operations
  cleanup(options?: CleanupOptions): Promise<CleanupResult>
  validateConfiguration(): Promise<boolean>
  
  // Connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

export class StorageService implements IStorageService {
  private provider: IStorageProvider
  private connected = false
  private metrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    totalBytes: 0,
    operationTimes: [] as number[]
  }

  private databaseService?: StorageDatabaseService

  constructor(
    private config: StorageConfig = DefaultStorageConfig,
    private eventBus?: EventBus,
    private circuitBreaker?: CircuitBreakerService,
    private retry?: RetryService,
    private cache?: CacheManagerService,
    private metricsService?: CustomMetricsService,
    private knex?: Knex
  ) {
    this.provider = this.createProvider()
    
    // Initialize database service if Knex is available
    if (this.knex) {
      const repository = new StorageFileRepository(this.knex)
      this.databaseService = new StorageDatabaseService(repository)
    }
  }

  async connect(): Promise<void> {
    try {
      // Validate configuration
      await this.validateConfiguration()

      // Connect to storage provider
      await this.executeWithResilience(async () => {
        await this.provider.connect()
      }, 'storage.connect')

      this.connected = true

      // Emit connection event
      await this.emitEvent('connect', {
        provider: this.config.provider,
        success: true
      })

      // Record metrics
      await this.recordMetric('storage.connection.established', 1, {
        provider: this.config.provider
      })

    } catch (error) {
      const storageError = error instanceof StorageError ? error : new StorageError(
        `Failed to connect to storage: ${(error as Error).message}`,
        'PROVIDER_UNAVAILABLE',
        this.config.provider,
        undefined,
        undefined,
        error as Error
      )

      await this.emitEvent('error', {
        provider: this.config.provider,
        error: storageError,
        success: false
      })

      throw storageError
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.provider && this.connected) {
        await this.provider.disconnect()
      }
      
      this.connected = false

      await this.emitEvent('disconnect', {
        provider: this.config.provider,
        success: true
      })

    } catch (error) {
      await this.emitEvent('error', {
        provider: this.config.provider,
        error: error as StorageError,
        success: false
      })

      throw new StorageError(
        `Failed to disconnect from storage: ${(error as Error).message}`,
        'PROVIDER_UNAVAILABLE',
        this.config.provider,
        undefined,
        undefined,
        error as Error
      )
    }
  }

  isConnected(): boolean {
    return this.connected && this.provider.isConnected()
  }

  async upload(request: UploadRequest): Promise<StorageResult> {
    return this.executeOperation(async () => {
      // Enhanced validation with healthcare compliance
      await this.validateUploadRequest(request)

      // Data classification handled by application if needed

      // Check cache for duplicate files
      const cacheKey = `upload:${this.calculateChecksum(request.file)}`
      if (this.cache && this.config.caching.enabled) {
        const cached = await this.cache.get<StorageResult>(cacheKey)
        if (cached) {
          await this.recordMetric('storage.upload.cache_hit', 1)
          return cached
        }
      }

      // Execute upload with resilience patterns
      const result = await this.executeWithResilience(async () => {
        return await this.provider.upload(request)
      }, 'storage.upload')

      // Save to database if successful
      if (result.success && this.databaseService) {
        try {
          // Step 1: Save file metadata first
          await this.databaseService.saveFileMetadata(result.metadata, request, result.fileId)
          
          // Step 2: Log successful upload operation (only if metadata saved successfully)
          try {
            await this.databaseService.logOperation({
              operation: 'upload',
              status: 'success',
              provider: this.config.provider,
              fileId: result.fileId,
              userId: request.metadata?.createdBy,
              bytesTransferred: request.file.length,
              purpose: 'File upload'
            })
          } catch (logError) {
            console.warn('Failed to log upload operation:', logError)
          }
          
          // Step 3: Update quota if user provided
          if (request.metadata?.createdBy) {
            try {
              await this.databaseService.updateQuota(request.metadata.createdBy, request.file.length, 1)
            } catch (quotaError) {
              console.warn('Failed to update quota:', quotaError)
            }
          }
        } catch (dbError) {
          console.warn('Failed to save file metadata to database:', dbError)
          // Don't fail the upload if database operation fails
        }
      }

      // Cache result if successful
      if (result.success && this.cache && this.config.caching.enabled) {
        await this.cache.set(cacheKey, result, {
          ttl: this.config.caching.metadataCache.ttl
        })
      }

      // File uploaded successfully

      // Record metrics
      await this.recordMetric('storage.upload.success', 1, {
        provider: this.config.provider,
        size: request.file.length,
        mimeType: request.mimeType
      })

      // Emit event
      await this.emitEvent('upload', {
        fileId: result.fileId,
        filename: request.filename,
        size: request.file.length,
        provider: this.config.provider,
        success: true
      })

      this.metrics.totalBytes += request.file.length

      return result

    }, 'upload')
  }

  async download(request: DownloadRequest): Promise<DownloadResult> {
    return this.executeOperation(async () => {
      // Check cache first
      const cacheKey = `download:${request.fileId}`
      if (this.cache && this.config.caching.fileCache.enabled) {
        const cached = await this.cache.get<DownloadResult>(cacheKey)
        if (cached) {
          await this.recordMetric('storage.download.cache_hit', 1)
          
          // Mark file as accessed in database
          if (this.databaseService) {
            try {
              await this.databaseService.markFileAsAccessed(request.fileId)
            } catch (dbError) {
              console.warn('Failed to update file access info in database:', dbError)
            }
          }
          
          return { ...cached, cached: true }
        }
      }

      // Execute download with resilience patterns
      const result = await this.executeWithResilience(async () => {
        return await this.provider.download(request)
      }, 'storage.download')

      // Update database if successful
      if (result.success && this.databaseService) {
        try {
          // Mark file as accessed
          await this.databaseService.markFileAsAccessed(request.fileId)
          
          // Log successful download operation
          await this.databaseService.logOperation({
            operation: 'download',
            status: 'success',
            provider: this.config.provider,
            fileId: request.fileId,
            userId: request.userId,
            bytesTransferred: result.size,
            purpose: 'File download'
          })
        } catch (dbError) {
          console.warn('Failed to update file access info in database:', dbError)
        }
      }

      // Cache small files
      if (result.success && this.cache && this.config.caching.fileCache.enabled) {
        if (result.size <= this.config.caching.fileCache.maxFileSize) {
          await this.cache.set(cacheKey, result, {
            ttl: this.config.caching.fileCache.ttl
          })
        }
      }

      // File downloaded successfully

      // Record metrics
      await this.recordMetric('storage.download.success', 1, {
        provider: this.config.provider,
        size: result.size,
        cached: result.cached
      })

      // Emit event
      await this.emitEvent('download', {
        fileId: request.fileId,
        filename: result.filename,
        size: result.size,
        provider: this.config.provider,
        success: true
      })

      return result

    }, 'download')
  }

  async delete(fileId: string): Promise<boolean> {
    return this.executeOperation(async () => {
      // Get metadata for audit purposes and quota calculation
      let metadata: FileMetadata | undefined
      let databaseMetadata: any = undefined
      try {
        metadata = await this.provider.getMetadata(fileId)
        
        // Get database metadata for quota updates
        if (this.databaseService) {
          databaseMetadata = await this.databaseService.getFileMetadata(fileId)
        }
      } catch {
        // File might not exist
      }

      // Execute delete with resilience patterns
      const success = await this.executeWithResilience(async () => {
        return await this.provider.delete(fileId)
      }, 'storage.delete')

      // Update database if successful
      if (success && this.databaseService) {
        try {
          // Mark file as deleted in database (soft delete)
          await this.databaseService.deleteFileMetadata(fileId, true)
          
          // Log successful delete operation
          await this.databaseService.logOperation({
            operation: 'delete',
            status: 'success',
            provider: this.config.provider,
            fileId: fileId,
            bytesTransferred: metadata?.size || databaseMetadata?.size,
            purpose: 'File deletion'
          })
          
          // Update quota if file metadata available
          if (databaseMetadata && databaseMetadata.createdBy) {
            const sizeToRemove = -(databaseMetadata.size || 0)
            await this.databaseService.updateQuota(databaseMetadata.createdBy, sizeToRemove, -1)
          }
        } catch (dbError) {
          console.warn('Failed to update file deletion in database:', dbError)
        }
      }

      // Clear related cache entries
      if (this.cache && this.config.caching.enabled) {
        await this.cache.delete(`download:${fileId}`)
        await this.cache.delete(`metadata:${fileId}`)
      }

      // File deleted successfully

      // Record metrics
      if (success) {
        await this.recordMetric('storage.delete.success', 1, {
          provider: this.config.provider
        })

        // Emit event
        await this.emitEvent('delete', {
          fileId,
          filename: metadata?.originalName || databaseMetadata?.originalName,
          provider: this.config.provider,
          success: true
        })
      }

      return success

    }, 'delete')
  }

  async exists(fileId: string): Promise<boolean> {
    return this.executeOperation(async () => {
      return await this.executeWithResilience(async () => {
        return await this.provider.exists(fileId)
      }, 'storage.exists')
    }, 'exists')
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    return this.executeOperation(async () => {
      // Check cache first
      const cacheKey = `fileinfo:${fileId}`
      if (this.cache && this.config.caching.metadataCache.enabled) {
        const cached = await this.cache.get<FileInfo>(cacheKey)
        if (cached) {
          return cached
        }
      }

      // Get metadata from provider
      const metadata = await this.executeWithResilience(async () => {
        return await this.provider.getMetadata(fileId)
      }, 'storage.getMetadata')

      // Generate URLs
      const downloadUrl = await this.generatePresignedUrl({
        fileId,
        operation: 'read',
        expiresIn: 3600
      })

      const fileInfo: FileInfo = {
        fileId,
        filename: metadata.filename,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        path: metadata.providerPath,
        checksum: metadata.checksum,
        metadata,
        urls: {
          download: downloadUrl.url
        },
        permissions: {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
          allowedUsers: [],
          allowedRoles: []
        }
      }

      // Cache the result
      if (this.cache && this.config.caching.metadataCache.enabled) {
        await this.cache.set(cacheKey, fileInfo, {
          ttl: this.config.caching.metadataCache.ttl
        })
      }

      return fileInfo

    }, 'getFileInfo')
  }

  async updateMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<boolean> {
    return this.executeOperation(async () => {
      const success = await this.executeWithResilience(async () => {
        return await this.provider.updateMetadata(fileId, updates)
      }, 'storage.updateMetadata')

      // Update database if successful
      if (success && this.databaseService) {
        try {
          await this.databaseService.updateFileMetadata(fileId, updates)
          
          // Log successful metadata update operation
          await this.databaseService.logOperation({
            operation: 'update_metadata',
            status: 'success',
            provider: this.config.provider,
            fileId: fileId,
            purpose: 'File metadata update',
            metadata: updates
          })
        } catch (dbError) {
          console.warn('Failed to update file metadata in database:', dbError)
        }
      }

      // Clear cache
      if (success && this.cache) {
        await this.cache.delete(`fileinfo:${fileId}`)
        await this.cache.delete(`metadata:${fileId}`)
      }

      return success

    }, 'updateMetadata')
  }

  async copyFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    return this.executeOperation(async () => {
      const result = await this.executeWithResilience(async () => {
        return await this.provider.copyFile(sourceId, destinationPath)
      }, 'storage.copy')

      // Save copied file to database if successful
      if (result.success && this.databaseService) {
        try {
          // Get original file metadata for copying
          const originalFile = await this.databaseService.getFileMetadata(sourceId)
          if (originalFile) {
            // Create new database entry for copied file
            const uploadRequest: UploadRequest = {
              file: Buffer.alloc(0), // Placeholder since it's a copy
              filename: result.metadata.filename,
              mimeType: result.metadata.mimeType,
              metadata: {
                customMetadata: {
                  ...originalFile.customMetadata,
                  copiedFrom: sourceId
                },
                createdBy: originalFile.createdBy
              }
            }
            await this.databaseService.saveFileMetadata(result.metadata, uploadRequest, result.fileId)
          }

          // Log successful copy operation
          await this.databaseService.logOperation({
            operation: 'copy',
            status: 'success',
            provider: this.config.provider,
            fileId: result.fileId,
            purpose: `File copied from ${sourceId}`,
            metadata: { sourceId, destinationPath }
          })
        } catch (dbError) {
          console.warn('Failed to save copied file metadata to database:', dbError)
        }
      }

      return result
    }, 'copy')
  }

  async moveFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    return this.executeOperation(async () => {
      const result = await this.executeWithResilience(async () => {
        return await this.provider.moveFile(sourceId, destinationPath)
      }, 'storage.move')

      // Update database if successful
      if (result.success && this.databaseService) {
        try {
          // Update file metadata with new path information
          await this.databaseService.updateFileMetadata(sourceId, {
            filename: result.metadata.filename,
            providerPath: result.metadata.providerPath
          })

          // Log successful move operation
          await this.databaseService.logOperation({
            operation: 'move',
            status: 'success',
            provider: this.config.provider,
            fileId: sourceId,
            purpose: `File moved to ${destinationPath}`,
            metadata: { sourceId, destinationPath }
          })
        } catch (dbError) {
          console.warn('Failed to update moved file metadata in database:', dbError)
        }
      }

      // Clear cache for old file
      if (this.cache) {
        await this.cache.delete(`download:${sourceId}`)
        await this.cache.delete(`fileinfo:${sourceId}`)
        await this.cache.delete(`metadata:${sourceId}`)
      }

      return result

    }, 'move')
  }

  async uploadMultiple(requests: UploadRequest[]): Promise<StorageResult[]> {
    return this.executeOperation(async () => {
      return await this.executeWithResilience(async () => {
        return await this.provider.uploadMultiple(requests)
      }, 'storage.uploadMultiple')
    }, 'uploadMultiple')
  }

  async downloadMultiple(requests: DownloadRequest[]): Promise<DownloadResult[]> {
    return this.executeOperation(async () => {
      return await this.executeWithResilience(async () => {
        return await this.provider.downloadMultiple(requests)
      }, 'storage.downloadMultiple')
    }, 'downloadMultiple')
  }

  async deleteMultiple(fileIds: string[]): Promise<boolean[]> {
    return this.executeOperation(async () => {
      const results = await this.executeWithResilience(async () => {
        return await this.provider.deleteMultiple(fileIds)
      }, 'storage.deleteMultiple')

      // Clear cache for all deleted files
      if (this.cache) {
        for (const fileId of fileIds) {
          await this.cache.delete(`download:${fileId}`)
          await this.cache.delete(`fileinfo:${fileId}`)
          await this.cache.delete(`metadata:${fileId}`)
        }
      }

      return results

    }, 'deleteMultiple')
  }

  async listFiles(options: ListOptions = {}): Promise<FileList> {
    return this.executeOperation(async () => {
      // Check cache for list results
      const cacheKey = `list:${JSON.stringify(options)}`
      if (this.cache && this.config.caching.metadataCache.enabled) {
        const cached = await this.cache.get<FileList>(cacheKey)
        if (cached) {
          return cached
        }
      }

      const result = await this.executeWithResilience(async () => {
        return await this.provider.listFiles(options)
      }, 'storage.list')

      // Cache the result
      if (this.cache && this.config.caching.metadataCache.enabled) {
        await this.cache.set(cacheKey, result, {
          ttl: this.config.caching.metadataCache.ttl / 2 // Shorter TTL for lists
        })
      }

      return result

    }, 'listFiles')
  }

  async searchFiles(query: string, options: ListOptions = {}): Promise<FileList> {
    return this.executeOperation(async () => {
      return await this.executeWithResilience(async () => {
        return await this.provider.searchFiles(query, options)
      }, 'storage.search')
    }, 'searchFiles')
  }

  async generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResult> {
    return this.executeOperation(async () => {
      // Check cache for presigned URLs
      let cacheKey = `presigned:${request.fileId || request.path}:${request.operation}`
      try {
        // Safe JSON stringification with error handling
        const requestForCache = {
          fileId: request.fileId,
          path: request.path,
          operation: request.operation,
          expiresIn: request.expiresIn,
          contentType: request.contentType
        }
        cacheKey = `presigned:${JSON.stringify(requestForCache)}`
      } catch (stringifyError) {
        console.warn('Failed to stringify request for cache key, using fallback:', stringifyError)
        cacheKey = `presigned:${request.fileId || request.path}:${request.operation}:${request.expiresIn || 3600}`
      }
      
      if (this.cache && this.config.caching.presignedUrlCache.enabled) {
        const cached = await this.cache.get<PresignedUrlResult>(cacheKey)
        if (cached && cached.expiresAt > new Date()) {
          return cached
        }
      }

      const result = await this.executeWithResilience(async () => {
        return await this.provider.generatePresignedUrl(request)
      }, 'storage.generatePresignedUrl')

      // Cache the result
      if (this.cache && this.config.caching.presignedUrlCache.enabled) {
        const ttl = Math.min(
          this.config.caching.presignedUrlCache.ttl,
          result.expiresAt.getTime() - Date.now()
        )
        
        if (ttl > 0) {
          await this.cache.set(cacheKey, result, {
            ttl
          })
        }
      }

      return result

    }, 'generatePresignedUrl')
  }

  // HIPAA compliance methods removed from storage service

  // Data classification moved to application level if needed

  // Healthcare audit trails removed - use general audit system if needed

  async getHealth(): Promise<StorageHealth> {
    try {
      const providerHealth = await this.provider.getHealth()
      
      // Calculate overall health including service integrations
      let overallScore = providerHealth.score
      const issues = [...providerHealth.issues]
      const recommendations = [...providerHealth.recommendations]

      // Check circuit breaker state
      if (this.circuitBreaker) {
        // Circuit breaker health check implementation depends on the actual service
        // For now, assume it's healthy if it exists
        const circuitBreakerHealthy = true
        if (!circuitBreakerHealthy) {
          overallScore -= 10
          issues.push('Circuit breaker is open')
        }
      }

      // Check cache health
      if (this.cache && this.config.caching.enabled) {
        try {
          const cacheHealth = await this.cache.getHealth()
          if (cacheHealth.status !== 'healthy') {
            overallScore -= 5
            issues.push('Cache is unhealthy')
          }
        } catch {
          overallScore -= 5
          issues.push('Cache health check failed')
        }
      }

      const finalStatus = overallScore >= 80 ? 'healthy' : overallScore >= 50 ? 'degraded' : 'unhealthy'

      return {
        ...providerHealth,
        status: finalStatus,
        score: Math.max(0, overallScore),
        issues,
        recommendations
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        score: 0,
        provider: this.config.provider,
        connected: false,
        latency: 0,
        errorRate: 1,
        issues: [`Health check failed: ${(error as Error).message}`],
        recommendations: ['Check storage service configuration'],
        lastCheck: new Date()
      }
    }
  }

  async getStats(): Promise<StorageStats> {
    const providerStats = await this.provider.getStats()
    
    // Enhance with service-level metrics
    return {
      ...providerStats,
      operations: {
        ...providerStats.operations,
        uploads: (providerStats.operations?.uploads || 0) + this.metrics.successfulOperations,
        downloads: providerStats.operations?.downloads || 0,
        deletes: providerStats.operations?.deletes || 0,
        errors: (providerStats.operations?.errors || 0) + this.metrics.failedOperations
      },
      performance: {
        ...providerStats.performance,
        averageUploadTime: providerStats.performance?.averageUploadTime || this.calculateAverage(this.metrics.operationTimes),
        averageDownloadTime: providerStats.performance?.averageDownloadTime || 0,
        averageLatency: providerStats.performance?.averageLatency || this.calculateAverage(this.metrics.operationTimes),
        throughput: providerStats.performance?.throughput || 0
      },
      storage: {
        ...providerStats.storage,
        // Remove totalBytesProcessed as it's not in the interface
      }
    }
  }

  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    return this.executeOperation(async () => {
      const result = await this.executeWithResilience(async () => {
        return await this.provider.cleanup(options)
      }, 'storage.cleanup')

      // Clear related cache entries
      if (this.cache && result.filesRemoved > 0) {
        await this.cache.clear('file-*')
        await this.cache.clear('metadata-*')
      }

      return result

    }, 'cleanup')
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Validate basic configuration
      if (!this.config.provider) {
        throw new Error('Storage provider not specified')
      }

      if (!this.config.enabled) {
        throw new Error('Storage service is disabled')
      }

      // Validate provider-specific configuration
      if (this.config.provider === 'local' && !this.config.local?.basePath) {
        throw new Error('Local storage base path not configured')
      }

      if (this.config.provider === 'minio') {
        const minioConfig = this.config.minio
        if (!minioConfig?.endpoint || !minioConfig?.accessKey || !minioConfig?.secretKey || !minioConfig?.bucket) {
          throw new Error('MinIO configuration incomplete')
        }
      }

      // Basic validation completed

      return true

    } catch (error) {
      throw new StorageError(
        `Configuration validation failed: ${(error as Error).message}`,
        'CONFIGURATION_ERROR',
        this.config.provider,
        undefined,
        undefined,
        error as Error
      )
    }
  }

  // Private helper methods

  private createProvider(): IStorageProvider {
    switch (this.config.provider) {
      case 'local':
        if (!this.config.local) {
          throw new StorageError(
            'Local storage configuration not found',
            'CONFIGURATION_ERROR',
            'local'
          )
        }
        return new LocalStorageProvider(this.config.local, this.config)

      case 'minio':
        if (!this.config.minio) {
          throw new StorageError(
            'MinIO storage configuration not found',
            'CONFIGURATION_ERROR',
            'minio'
          )
        }
        return new MinIOStorageProvider(this.config.minio, this.config)

      default:
        throw new StorageError(
          `Unsupported storage provider: ${this.config.provider}`,
          'CONFIGURATION_ERROR',
          this.config.provider
        )
    }
  }

  private async executeOperation<T>(operation: () => Promise<T>, operationType: string): Promise<T> {
    const startTime = Date.now()
    this.metrics.totalOperations++

    try {
      const result = await operation()
      
      this.metrics.successfulOperations++
      this.metrics.operationTimes.push(Date.now() - startTime)
      
      return result

    } catch (error) {
      this.metrics.failedOperations++
      
      await this.recordMetric(`storage.${operationType}.error`, 1, {
        provider: this.config.provider,
        error: (error as Error).message
      })

      throw error
    }
  }

  private async executeWithResilience<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    // Apply circuit breaker if available
    if (this.circuitBreaker && this.config.integration.circuitBreaker.enabled) {
      return await this.circuitBreaker.execute(async () => {
        // Apply retry if available
        if (this.retry && typeof this.retry.execute === 'function' && this.config.integration.retry.enabled) {
          return await this.retry.execute({
            operation,
            strategy: 'standard'
          })
        }
        return await operation()
      })
    }

    // Apply retry only if circuit breaker is not available
    if (this.retry && typeof this.retry.execute === 'function' && this.config.integration.retry.enabled) {
      return await this.retry.execute({
        operation,
        strategy: 'standard'
      })
    }

    return await operation()
  }

  private async validateUploadRequest(request: UploadRequest): Promise<void> {
    // Basic validation
    if (!request.file || request.file.length === 0) {
      throw new StorageError(
        'File data is required and cannot be empty',
        'INVALID_FILE_TYPE',
        this.config.provider
      )
    }

    if (!request.filename) {
      throw new StorageError(
        'Filename is required',
        'INVALID_FILE_TYPE',
        this.config.provider
      )
    }

    if (!request.mimeType) {
      throw new StorageError(
        'MIME type is required',
        'INVALID_FILE_TYPE',
        this.config.provider
      )
    }

    // Additional validation can be added here if needed
  }

  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  // Healthcare data detection removed

  // Sensitive data detection removed

  private async emitEvent(type: string, data: Partial<StorageEventData>): Promise<void> {
    if (!this.eventBus || !this.config.integration.eventBus.enabled) {
      return
    }

    try {
      const eventData: StorageOperationEvent = {
        operation: this.mapEventTypeToFileOperation(type),
        fileId: data.fileId,
        filename: data.filename,
        path: data.path,
        provider: data.provider || this.config.provider,
        userId: data.userId,
        success: data.success ?? true,
        duration: data.duration,
        size: data.size,
        metadata: data.metadata,
        timestamp: new Date()
      }

      await this.eventBus.publish('storage.operation', eventData)

    } catch (error) {
      console.warn('Failed to emit storage event:', error)
    }
  }

  private async recordMetric(name: string, value: number, tags?: Record<string, any>): Promise<void> {
    if (!this.metricsService || !this.config.integration.metrics.enabled) {
      return
    }

    try {
      this.metricsService.recordCounter(name, value, {
        service: 'storage',
        provider: this.config.provider,
        ...tags
      })
    } catch (error) {
      console.warn('Failed to record storage metric:', error)
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private mapEventTypeToFileOperation(type: string): any {
    const mappings: Record<string, any> = {
      'upload': 'upload',
      'download': 'download', 
      'delete': 'delete',
      'connect': 'read',
      'disconnect': 'read',
      'error': 'read',
      'audit': 'read'
    }
    return mappings[type] || 'read'
  }}
