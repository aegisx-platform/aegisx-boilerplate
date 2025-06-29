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
  DefaultStorageConfig,
  DataClassification
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
  
  // Healthcare & compliance
  validateHIPAACompliance(fileId: string): Promise<boolean>
  classifyData(file: Buffer, metadata?: Partial<FileMetadata>): Promise<DataClassification>
  auditFileAccess(fileId: string, operation: string, purpose?: string): Promise<void>
  
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

  constructor(
    private config: StorageConfig = DefaultStorageConfig,
    private eventBus?: EventBus,
    private circuitBreaker?: CircuitBreakerService,
    private retry?: RetryService,
    private cache?: CacheManagerService,
    private metricsService?: CustomMetricsService
  ) {
    this.provider = this.createProvider()
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

      // Auto-classify data if not specified
      if (!request.options?.dataClassification && this.config.healthcare.enabled) {
        request.options = {
          ...request.options,
          dataClassification: await this.classifyData(request.file, request.metadata)
        }
      }

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

      // Cache result if successful
      if (result.success && this.cache && this.config.caching.enabled) {
        await this.cache.set(cacheKey, result, {
          ttl: this.config.caching.metadataCache.ttl
        })
      }

      // Audit for healthcare compliance
      if (this.config.healthcare.enabled && request.options?.healthcare) {
        await this.auditFileAccess(result.fileId, 'upload', 'File upload')
      }

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
          return { ...cached, cached: true }
        }
      }

      // Execute download with resilience patterns
      const result = await this.executeWithResilience(async () => {
        return await this.provider.download(request)
      }, 'storage.download')

      // Cache small files
      if (result.success && this.cache && this.config.caching.fileCache.enabled) {
        if (result.size <= this.config.caching.fileCache.maxFileSize) {
          await this.cache.set(cacheKey, result, {
            ttl: this.config.caching.fileCache.ttl
          })
        }
      }

      // Audit for healthcare compliance
      if (this.config.healthcare.enabled && result.metadata.healthcare) {
        await this.auditFileAccess(request.fileId, 'download', request.options?.purpose)
      }

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
      // Get metadata for audit purposes
      let metadata: FileMetadata | undefined
      try {
        metadata = await this.provider.getMetadata(fileId)
      } catch {
        // File might not exist
      }

      // Execute delete with resilience patterns
      const success = await this.executeWithResilience(async () => {
        return await this.provider.delete(fileId)
      }, 'storage.delete')

      // Clear related cache entries
      if (this.cache && this.config.caching.enabled) {
        await this.cache.delete(`download:${fileId}`)
        await this.cache.delete(`metadata:${fileId}`)
      }

      // Audit for healthcare compliance
      if (success && this.config.healthcare.enabled && metadata?.healthcare) {
        await this.auditFileAccess(fileId, 'delete', 'File deletion')
      }

      // Record metrics
      if (success) {
        await this.recordMetric('storage.delete.success', 1, {
          provider: this.config.provider
        })

        // Emit event
        await this.emitEvent('delete', {
          fileId,
          filename: metadata?.originalName,
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
        },
        healthcare: metadata.healthcare
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
      return await this.executeWithResilience(async () => {
        return await this.provider.copyFile(sourceId, destinationPath)
      }, 'storage.copy')
    }, 'copy')
  }

  async moveFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    return this.executeOperation(async () => {
      const result = await this.executeWithResilience(async () => {
        return await this.provider.moveFile(sourceId, destinationPath)
      }, 'storage.move')

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
      const cacheKey = `presigned:${JSON.stringify(request)}`
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

  async validateHIPAACompliance(fileId: string): Promise<boolean> {
    try {
      const metadata = await this.provider.getMetadata(fileId)
      
      if (!this.config.healthcare.enabled) {
        return true
      }

      // Check encryption requirement
      if (this.config.healthcare.encryptionRequired && !metadata.encrypted) {
        return false
      }

      // Check data classification
      if (metadata.dataClassification === 'restricted' && !metadata.encrypted) {
        return false
      }

      // Check healthcare metadata
      if (metadata.healthcare) {
        if (!metadata.healthcare.hipaaCompliant) {
          return false
        }

        // Check consent requirements
        if (metadata.healthcare.consentRequired && !metadata.healthcare.accessLog.length) {
          return false
        }
      }

      return true

    } catch (error) {
      throw new StorageError(
        `HIPAA compliance validation failed: ${(error as Error).message}`,
        'HIPAA_VIOLATION',
        this.config.provider,
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async classifyData(file: Buffer, metadata?: Partial<FileMetadata>): Promise<DataClassification> {
    // This is a simplified implementation
    // In production, you would use more sophisticated classification algorithms
    
    // Check for healthcare indicators
    if (metadata?.healthcare || this.containsHealthcareData(file)) {
      return 'restricted'
    }

    // Check for sensitive patterns
    if (this.containsSensitiveData(file)) {
      return 'confidential'
    }

    // Check file size and type
    if (file.length > 10 * 1024 * 1024) { // 10MB
      return 'internal'
    }

    return 'public'
  }

  async auditFileAccess(fileId: string, operation: string, purpose?: string): Promise<void> {
    if (!this.config.healthcare.auditTrail) {
      return
    }

    try {
      // This would integrate with the existing audit system
      await this.emitEvent('audit', {
        fileId,
        operation: operation as any,
        provider: this.config.provider,
        timestamp: new Date(),
        success: true
      })

      // Record metric
      await this.recordMetric('storage.audit.logged', 1, {
        operation,
        provider: this.config.provider
      })

    } catch (error) {
      // Don't fail the operation if audit logging fails
      console.error('Failed to audit file access:', error)
    }
  }

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

      // Validate healthcare configuration
      if (this.config.healthcare.enabled) {
        if (this.config.healthcare.encryptionRequired && !this.config.encryption.enabled) {
          throw new Error('Healthcare compliance requires encryption to be enabled')
        }
      }

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

    // Healthcare validation
    if (this.config.healthcare.enabled && request.options?.healthcare) {
      if (request.options.healthcare.classification === 'restricted' && !this.config.encryption.enabled) {
        throw new StorageError(
          'Restricted healthcare data requires encryption',
          'HIPAA_VIOLATION',
          this.config.provider
        )
      }
    }
  }

  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private containsHealthcareData(file: Buffer): boolean {
    // Simple pattern matching for healthcare data
    const content = file.toString('utf8', 0, Math.min(1024, file.length))
    const healthcarePatterns = [
      /patient|medical|health|diagnosis|treatment|prescription/i,
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Z]{1,2}\d{2,3}\.\d{1,3}\b/ // ICD code pattern
    ]
    
    return healthcarePatterns.some(pattern => pattern.test(content))
  }

  private containsSensitiveData(file: Buffer): boolean {
    // Simple pattern matching for sensitive data
    const content = file.toString('utf8', 0, Math.min(1024, file.length))
    const sensitivePatterns = [
      /password|secret|key|token|private/i,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email pattern
    ]
    
    return sensitivePatterns.some(pattern => pattern.test(content))
  }

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
