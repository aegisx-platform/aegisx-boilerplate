/**
 * MinIO Storage Provider
 * 
 * Implements file storage operations using MinIO (S3-compatible object storage)
 * with enterprise features including encryption and health monitoring
 */

import { Client as MinioClient, PostPolicy } from 'minio'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import zlib from 'zlib'
import { promisify } from 'util'
import {
  IStorageProvider,
  StorageConfig,
  MinIOStorageConfig,
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
  FileValidationResult,
  DataClassification
} from '../../types/storage.types'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export class MinIOStorageProvider implements IStorageProvider {
  private client: MinioClient
  private connected = false
  private stats = {
    uploads: 0,
    downloads: 0,
    deletes: 0,
    errors: 0,
    totalSize: 0,
    totalFiles: 0,
    uploadTimes: [] as number[],
    downloadTimes: [] as number[]
  }

  constructor(
    private config: MinIOStorageConfig,
    private globalConfig: StorageConfig
  ) {
    this.client = new MinioClient({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      region: this.config.region,
      pathStyle: this.config.pathStyle
    })
  }

  async connect(): Promise<void> {
    try {
      // Test connection by listing buckets
      await this.client.listBuckets()

      // Ensure bucket exists
      const bucketExists = await this.client.bucketExists(this.config.bucket)
      if (!bucketExists) {
        await this.client.makeBucket(this.config.bucket, this.config.region)
      }

      // Set bucket policy for public read if needed
      await this.setBucketPolicy()

      // Enable versioning if supported
      try {
        await this.client.setBucketVersioning(this.config.bucket, { Status: 'Enabled' })
      } catch {
        // Versioning might not be supported in all MinIO versions
      }

      this.connected = true
    } catch (error) {
      throw new StorageError(
        `Failed to connect to MinIO: ${(error as Error).message}`,
        'PROVIDER_UNAVAILABLE',
        'minio',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async upload(request: UploadRequest): Promise<StorageResult> {
    if (!this.connected) {
      throw new StorageError(
        'MinIO storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'minio'
      )
    }

    const startTime = Date.now()

    try {
      // Validate file
      const validationResult = await this.validateFile(request)
      if (!validationResult.valid) {
        throw new StorageError(
          `File validation failed: ${validationResult.errors.map((e: any) => e.message).join(', ')}`,
          'INVALID_FILE_TYPE',
          'minio'
        )
      }

      // Generate file ID and object name
      const fileId = uuidv4()
      const extension = this.getFileExtension(request.filename)
      const objectName = this.generateObjectName(fileId, extension, request.options?.path)

      // Check file size limits
      if (request.file.length > this.config.maxFileSize) {
        throw new StorageError(
          `File size ${request.file.length} exceeds maximum ${this.config.maxFileSize}`,
          'FILE_TOO_LARGE',
          'minio',
          fileId
        )
      }

      // Process file data
      let fileData = request.file
      let compressed = false
      let encrypted = false

      // Compress if needed
      if (this.shouldCompress(request)) {
        fileData = await this.compressFile(fileData)
        compressed = true
      }

      // Encrypt if needed
      if (this.shouldEncrypt(request)) {
        fileData = await this.encryptFile(fileData, fileId)
        encrypted = true
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(request.file)

      // Prepare metadata for MinIO
      const minioMetadata = this.prepareMinIOMetadata(request, fileId, checksum, compressed, encrypted)

      // Upload file to MinIO
      const uploadInfo = await this.uploadToMinIO(objectName, fileData, minioMetadata)

      // Create file metadata
      const metadata: FileMetadata = {
        filename: objectName,
        originalName: request.filename,
        mimeType: request.mimeType,
        size: request.file.length,
        checksum,
        checksumAlgorithm: 'sha256',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: request.metadata?.createdBy,
        tags: request.metadata?.tags || [],
        customMetadata: request.metadata?.customMetadata || {},
        // Healthcare metadata removed,
        encrypted,
        encryptionKeyId: encrypted ? fileId : undefined,
        dataClassification: request.metadata?.dataClassification || 'internal',
        provider: 'minio',
        providerPath: objectName,
        providerMetadata: {
          compressed,
          originalSize: request.file.length,
          storedSize: fileData.length,
          etag: uploadInfo.etag,
          versionId: uploadInfo.versionId,
          bucket: this.config.bucket
        }
      }

      // Save metadata as a separate object
      await this.saveMetadata(fileId, metadata)

      // Update statistics
      this.stats.uploads++
      this.stats.totalFiles++
      this.stats.totalSize += request.file.length
      this.stats.uploadTimes.push(Date.now() - startTime)

      // Generate URLs
      const downloadUrl = await this.generatePresignedUrl({
        fileId,
        operation: 'read',
        expiresIn: this.config.presignedUrlExpiry
      })

      return {
        success: true,
        fileId,
        filename: objectName,
        path: objectName,
        size: request.file.length,
        checksum,
        mimeType: request.mimeType,
        metadata,
        url: downloadUrl.url,
        presignedUrl: downloadUrl.url,
        expiresAt: downloadUrl.expiresAt
      }

    } catch (error) {
      this.stats.errors++
      
      if (error instanceof StorageError) {
        throw error
      }

      throw new StorageError(
        `Upload failed: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'minio',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  async download(request: DownloadRequest): Promise<DownloadResult> {
    if (!this.connected) {
      throw new StorageError(
        'MinIO storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'minio'
      )
    }

    const startTime = Date.now()

    try {
      // Get metadata
      const metadata = await this.getMetadata(request.fileId)

      // Check if object exists
      if (!await this.objectExists(metadata.providerPath)) {
        throw new StorageError(
          `File not found: ${request.fileId}`,
          'FILE_NOT_FOUND',
          'minio',
          request.fileId
        )
      }

      // Download file from MinIO
      const stream = await this.client.getObject(this.config.bucket, metadata.providerPath)
      let fileData = await this.streamToBuffer(stream)

      // Decrypt if needed
      if (metadata.encrypted && request.options?.decrypt !== false) {
        fileData = await this.decryptFile(fileData, request.fileId)
      }

      // Decompress if needed
      if (metadata.providerMetadata?.compressed && request.options?.decompress !== false) {
        fileData = await this.decompressFile(fileData)
      }

      // Validate checksum if requested
      if (request.options?.validateChecksum) {
        const calculatedChecksum = this.calculateChecksum(fileData)
        if (calculatedChecksum !== metadata.checksum) {
          throw new StorageError(
            'Checksum validation failed',
            'CHECKSUM_MISMATCH',
            'minio',
            request.fileId
          )
        }
      }

      // Update statistics
      this.stats.downloads++
      this.stats.downloadTimes.push(Date.now() - startTime)

      // Healthcare access logging removed

      return {
        success: true,
        fileId: request.fileId,
        filename: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        data: fileData,
        metadata,
        cached: false
      }

    } catch (error) {
      this.stats.errors++
      
      if (error instanceof StorageError) {
        throw error
      }

      throw new StorageError(
        `Download failed: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'minio',
        request.fileId,
        undefined,
        error as Error
      )
    }
  }

  async delete(fileId: string): Promise<boolean> {
    if (!this.connected) {
      throw new StorageError(
        'MinIO storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'minio'
      )
    }

    try {
      // Get metadata
      const metadata = await this.getMetadata(fileId)

      // Delete file from MinIO
      await this.client.removeObject(this.config.bucket, metadata.providerPath)

      // Delete metadata
      await this.deleteMetadata(fileId)

      // Update statistics
      this.stats.deletes++
      this.stats.totalFiles = Math.max(0, this.stats.totalFiles - 1)
      this.stats.totalSize = Math.max(0, this.stats.totalSize - metadata.size)

      return true

    } catch (error) {
      this.stats.errors++
      
      if (error instanceof StorageError && error.code === 'FILE_NOT_FOUND') {
        return false
      }

      throw new StorageError(
        `Delete failed: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'minio',
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async exists(fileId: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(fileId)
      return await this.objectExists(metadata.providerPath)
    } catch {
      return false
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata> {
    const metadataObjectName = `metadata/${fileId}.json`
    
    try {
      const stream = await this.client.getObject(this.config.bucket, metadataObjectName)
      const metadataContent = await this.streamToBuffer(stream)
      const metadataString = metadataContent.toString()
      
      let metadata: FileMetadata
      try {
        metadata = JSON.parse(metadataString) as FileMetadata
      } catch (parseError) {
        console.error('JSON parsing error for file:', fileId)
        console.error('Metadata content:', metadataString)
        console.error('Parse error:', parseError)
        throw new StorageError(
          `Invalid metadata JSON for file: ${fileId}`,
          'CONFIGURATION_ERROR',
          'minio',
          fileId,
          undefined,
          parseError as Error
        )
      }
      
      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt)
      metadata.updatedAt = new Date(metadata.updatedAt)
      
      return metadata
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        `Metadata not found for file: ${fileId}`,
        'FILE_NOT_FOUND',
        'minio',
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async updateMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<boolean> {
    try {
      const existingMetadata = await this.getMetadata(fileId)
      const updatedMetadata: FileMetadata = {
        ...existingMetadata,
        ...updates,
        updatedAt: new Date()
      }
      
      await this.saveMetadata(fileId, updatedMetadata)
      return true
    } catch (error) {
      throw new StorageError(
        `Failed to update metadata for file: ${fileId}`,
        'UNKNOWN_ERROR',
        'minio',
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async copyFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    // Get source metadata
    const sourceMetadata = await this.getMetadata(sourceId)
    
    // Generate new file ID for the copy
    const newFileId = uuidv4()
    const extension = this.getFileExtension(sourceMetadata.originalName)
    const newObjectName = this.generateObjectName(newFileId, extension, destinationPath)
    
    // Copy object in MinIO
    await this.client.copyObject(
      this.config.bucket,
      newObjectName,
      `/${this.config.bucket}/${sourceMetadata.providerPath}`
    )
    
    // Create new metadata
    const newMetadata: FileMetadata = {
      ...sourceMetadata,
      filename: newObjectName,
      providerPath: newObjectName,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await this.saveMetadata(newFileId, newMetadata)
    
    return {
      success: true,
      fileId: newFileId,
      filename: newObjectName,
      path: newObjectName,
      size: sourceMetadata.size,
      checksum: sourceMetadata.checksum,
      mimeType: sourceMetadata.mimeType,
      metadata: newMetadata
    }
  }

  async moveFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    // Copy file to new location
    const result = await this.copyFile(sourceId, destinationPath)
    
    // Delete original file
    await this.delete(sourceId)
    
    return result
  }

  async uploadMultiple(requests: UploadRequest[]): Promise<StorageResult[]> {
    const results: StorageResult[] = []
    
    // Process uploads in parallel with concurrency limit
    const concurrency = 5
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(request => this.upload(request))
      )
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            fileId: '',
            filename: '',
            path: '',
            size: 0,
            checksum: '',
            mimeType: '',
            metadata: {} as FileMetadata,
            error: result.reason
          })
        }
      }
    }
    
    return results
  }

  async downloadMultiple(requests: DownloadRequest[]): Promise<DownloadResult[]> {
    const results: DownloadResult[] = []
    
    // Process downloads in parallel with concurrency limit
    const concurrency = 5
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(request => this.download(request))
      )
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            fileId: '',
            filename: '',
            mimeType: '',
            size: 0,
            data: Buffer.alloc(0),
            metadata: {} as FileMetadata,
            cached: false,
            error: result.reason
          })
        }
      }
    }
    
    return results
  }

  async deleteMultiple(fileIds: string[]): Promise<boolean[]> {
    const results: boolean[] = []
    
    // Process deletes in parallel
    const deleteResults = await Promise.allSettled(
      fileIds.map(fileId => this.delete(fileId))
    )
    
    for (const result of deleteResults) {
      results.push(result.status === 'fulfilled' ? result.value : false)
    }
    
    return results
  }

  async listFiles(options: ListOptions = {}): Promise<FileList> {
    try {
      const metadataPrefix = 'metadata/'
      const objectStream = this.client.listObjects(this.config.bucket, metadataPrefix, options.recursive)
      
      const fileInfos: FileInfo[] = []
      
      for await (const obj of objectStream) {
        if (!obj.name?.endsWith('.json')) continue
        
        const fileId = obj.name.replace(metadataPrefix, '').replace('.json', '')
        
        try {
          const metadata = await this.getMetadata(fileId)
          
          // Apply filters
          if (!this.matchesFilters(metadata, options.filters)) {
            continue
          }
          
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
              download: await this.generatePresignedUrl({
                fileId,
                operation: 'read',
                expiresIn: 3600
              }).then(result => result.url)
            },
            permissions: {
              canRead: true,
              canWrite: true,
              canDelete: true,
              canShare: true,
              allowedUsers: [],
              allowedRoles: []
            },
            // Healthcare metadata removed
          }
          
          fileInfos.push(fileInfo)
        } catch (error) {
          // Skip files with invalid metadata
          continue
        }
      }
      
      // Apply sorting
      this.sortFiles(fileInfos, options.sortBy, options.sortOrder)
      
      // Apply pagination
      const total = fileInfos.length
      const offset = options.offset || 0
      const limit = options.limit || total
      const paginatedFiles = fileInfos.slice(offset, offset + limit)
      
      // Calculate aggregations
      const aggregations = {
        totalSize: fileInfos.reduce((sum, file) => sum + file.size, 0),
        fileTypes: this.calculateFileTypeStats(fileInfos),
        classifications: this.calculateClassificationStats(fileInfos)
      }
      
      return {
        files: paginatedFiles,
        total,
        hasMore: offset + limit < total,
        nextOffset: offset + limit < total ? offset + limit : undefined,
        aggregations
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to list files: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'minio',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  async searchFiles(query: string, options?: ListOptions): Promise<FileList> {
    const allFiles = await this.listFiles(options)
    
    const filteredFiles = allFiles.files.filter(file => {
      const searchText = `${file.originalName} ${file.metadata.tags?.join(' ')} ${JSON.stringify(file.metadata.customMetadata)}`.toLowerCase()
      return searchText.includes(query.toLowerCase())
    })
    
    return {
      files: filteredFiles,
      total: filteredFiles.length,
      hasMore: false,
      aggregations: {
        totalSize: filteredFiles.reduce((sum, file) => sum + file.size, 0),
        fileTypes: this.calculateFileTypeStats(filteredFiles),
        classifications: this.calculateClassificationStats(filteredFiles)
      }
    }
  }

  async generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResult> {
    try {
      let objectName: string
      
      if (request.fileId) {
        const metadata = await this.getMetadata(request.fileId)
        objectName = metadata.providerPath
      } else if (request.path) {
        objectName = request.path
      } else {
        throw new StorageError(
          'Either fileId or path is required for presigned URL generation',
          'CONFIGURATION_ERROR',
          'minio'
        )
      }
      
      const expiresIn = request.expiresIn || this.config.presignedUrlExpiry
      
      let url: string
      let method: string
      
      if (request.operation === 'read') {
        url = await this.client.presignedGetObject(this.config.bucket, objectName, expiresIn)
        method = 'GET'
      } else {
        // For write operations, create a presigned POST policy
        const policy = new PostPolicy()
        policy.setBucket(this.config.bucket)
        policy.setKey(objectName)
        policy.setExpires(new Date(Date.now() + expiresIn * 1000))
        
        if (request.conditions?.maxFileSize) {
          policy.setContentLengthRange(0, request.conditions.maxFileSize)
        }
        
        if (request.contentType) {
          policy.setContentType(request.contentType)
        }
        
        const postData = await this.client.presignedPostPolicy(policy)
        url = postData.postURL
        method = 'POST'
      }
      
      return {
        url,
        method,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        conditions: request.conditions || {}
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to generate presigned URL: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'minio',
        request.fileId,
        undefined,
        error as Error
      )
    }
  }

  async getHealth(): Promise<StorageHealth> {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100
    let latency = 0
    
    try {
      // Test connection and measure latency
      const startTime = Date.now()
      
      if (!this.connected) {
        issues.push('Provider not connected')
        score -= 50
      } else {
        try {
          await this.client.bucketExists(this.config.bucket)
          latency = Date.now() - startTime
          
          if (latency > 5000) {
            issues.push(`High latency: ${latency}ms`)
            score -= 20
          } else if (latency > 2000) {
            recommendations.push('Monitor connection latency')
            score -= 10
          }
        } catch {
          issues.push('Bucket not accessible')
          score -= 30
        }
      }
      
      // Check error rate
      const totalOperations = this.stats.uploads + this.stats.downloads + this.stats.deletes
      const errorRate = totalOperations > 0 ? this.stats.errors / totalOperations : 0
      
      if (errorRate > 0.1) {
        issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`)
        score -= 15
      }
      
      const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'unhealthy'
      
      return {
        status,
        score: Math.max(0, score),
        provider: 'minio',
        connected: this.connected,
        latency,
        errorRate,
        issues,
        recommendations,
        lastCheck: new Date()
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        score: 0,
        provider: 'minio',
        connected: false,
        latency: 0,
        errorRate: 1,
        issues: [`Health check failed: ${(error as Error).message}`],
        recommendations: ['Check MinIO configuration and network connectivity'],
        lastCheck: new Date()
      }
    }
  }

  async getStats(): Promise<StorageStats> {
    return {
      provider: 'minio',
      operations: {
        uploads: this.stats.uploads,
        downloads: this.stats.downloads,
        deletes: this.stats.deletes,
        errors: this.stats.errors
      },
      performance: {
        averageUploadTime: this.calculateAverage(this.stats.uploadTimes),
        averageDownloadTime: this.calculateAverage(this.stats.downloadTimes),
        averageLatency: this.calculateAverageLatency(),
        throughput: this.calculateThroughput()
      },
      storage: {
        totalFiles: this.stats.totalFiles,
        totalSize: this.stats.totalSize,
        averageFileSize: this.stats.totalFiles > 0 ? this.stats.totalSize / this.stats.totalFiles : 0,
        largestFile: await this.findLargestFile()
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        evictions: 0
      },
      timeRange: {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endTime: new Date()
      }
    }
  }

  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesRemoved: 0,
      bytesFreed: 0,
      errors: [],
      summary: {
        tempFiles: 0,
        oldFiles: 0,
        unusedFiles: 0,
        corruptedFiles: 0
      }
    }
    
    try {
      const allFiles = await this.listFiles()
      
      for (const file of allFiles.files) {
        let shouldDelete = false
        let category: keyof typeof result.summary = 'unusedFiles'
        
        // Check age
        if (options.olderThan && file.metadata.createdAt < options.olderThan) {
          shouldDelete = true
          category = 'oldFiles'
        }
        
        // Check size threshold
        if (options.sizeThreshold && file.size > options.sizeThreshold) {
          shouldDelete = true
        }
        
        // Check temp files
        if (options.tempFiles && file.path.includes('temp')) {
          shouldDelete = true
          category = 'tempFiles'
        }
        
        // Check corrupted files
        if (options.corruptedFiles) {
          try {
            const downloadResult = await this.download({ 
              fileId: file.fileId,
              options: { validateChecksum: true }
            })
            if (!downloadResult.success) {
              shouldDelete = true
              category = 'corruptedFiles'
            }
          } catch {
            shouldDelete = true
            category = 'corruptedFiles'
          }
        }
        
        if (shouldDelete && !options.dryRun) {
          try {
            await this.delete(file.fileId)
            result.filesRemoved++
            result.bytesFreed += file.size
            result.summary[category]++
          } catch (error) {
            result.errors.push({
              fileId: file.fileId,
              path: file.path,
              error: (error as Error).message,
              type: 'unknown'
            })
          }
        }
      }
      
    } catch (error) {
      result.errors.push({
        fileId: '',
        path: '',
        error: (error as Error).message,
        type: 'unknown'
      })
    }
    
    return result
  }

  // Private helper methods

  private async setBucketPolicy(): Promise<void> {
    // Set a basic bucket policy - customize as needed
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.config.bucket}/public/*`]
        }
      ]
    }
    
    try {
      await this.client.setBucketPolicy(this.config.bucket, JSON.stringify(policy))
    } catch {
      // Policy setting might fail in some MinIO configurations
    }
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : ''
  }

  private generateObjectName(fileId: string, extension: string, customPath?: string): string {
    if (customPath) {
      return `${customPath}/${fileId}${extension}`
    }
    
    // Create a nested structure based on file ID
    const dir1 = fileId.substring(0, 2)
    const dir2 = fileId.substring(2, 4)
    return `files/${dir1}/${dir2}/${fileId}${extension}`
  }

  private prepareMinIOMetadata(request: UploadRequest, fileId: string, checksum: string, compressed: boolean, encrypted: boolean): Record<string, string> {
    return {
      'file-id': fileId,
      'original-name': request.filename,
      'content-type': request.mimeType,
      'checksum': checksum,
      'compressed': compressed.toString(),
      'encrypted': encrypted.toString(),
      'upload-date': new Date().toISOString(),
      'data-classification': request.options?.dataClassification || 'internal',
      ...Object.fromEntries(
        Object.entries(request.options?.customMetadata || {}).map(([key, value]) => [
          `custom-${key}`,
          String(value)
        ])
      )
    }
  }

  private async uploadToMinIO(objectName: string, data: Buffer, metadata: Record<string, string>): Promise<any> {
    // Use multipart upload for large files
    if (data.length > this.config.multipartThreshold) {
      return await this.client.putObject(this.config.bucket, objectName, data, data.length, {
        'Content-Type': metadata['content-type'],
        ...metadata
      })
    } else {
      return await this.client.putObject(this.config.bucket, objectName, data, data.length, {
        'Content-Type': metadata['content-type'],
        ...metadata
      })
    }
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = []
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }

  private async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.config.bucket, objectName)
      return true
    } catch {
      return false
    }
  }

  private async saveMetadata(fileId: string, metadata: FileMetadata): Promise<void> {
    const metadataObjectName = `metadata/${fileId}.json`
    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2))
    
    await this.client.putObject(
      this.config.bucket,
      metadataObjectName,
      metadataBuffer,
      metadataBuffer.length,
      { 'Content-Type': 'application/json' }
    )
  }

  private async deleteMetadata(fileId: string): Promise<void> {
    const metadataObjectName = `metadata/${fileId}.json`
    
    try {
      await this.client.removeObject(this.config.bucket, metadataObjectName)
    } catch {
      // Metadata might not exist
    }
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private shouldCompress(request: UploadRequest): boolean {
    if (!this.globalConfig.compression.enabled) return false
    if (request.file.length < this.globalConfig.compression.threshold) return false
    
    return this.globalConfig.compression.mimeTypes.some(type => {
      if (type.endsWith('/*')) {
        return request.mimeType.startsWith(type.slice(0, -1))
      }
      return request.mimeType === type
    })
  }

  private shouldEncrypt(request: UploadRequest): boolean {
    // Explicit encryption request (override global config)
    if (request.options?.encrypt === true) return true
    
    if (!this.globalConfig.encryption.enabled) return false
    
    // Always encrypt restricted data
    if (request.metadata?.dataClassification === 'restricted') return true
    
    // Encrypt confidential data
    if (request.metadata?.dataClassification === 'confidential') return true
    
    // Healthcare encryption logic removed
    
    return false
  }

  private async compressFile(data: Buffer): Promise<Buffer> {
    return await gzip(data)
  }

  private async decompressFile(data: Buffer): Promise<Buffer> {
    return await gunzip(data)
  }

  private async encryptFile(data: Buffer, fileId: string): Promise<Buffer> {
    const key = crypto.scryptSync(fileId, 'salt', 32)
    const iv = crypto.randomBytes(16) // Generate random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    
    const encrypted = Buffer.concat([
      iv, // Prepend IV to encrypted data
      cipher.update(data),
      cipher.final()
    ])
    
    return encrypted
  }

  private async decryptFile(encryptedData: Buffer, fileId: string): Promise<Buffer> {
    const key = crypto.scryptSync(fileId, 'salt', 32)
    const iv = encryptedData.subarray(0, 16) // Extract IV from beginning
    const ciphertext = encryptedData.subarray(16) // Rest is the actual encrypted data
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ])
    
    return decrypted
  }

  private async validateFile(request: UploadRequest): Promise<FileValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    
    // Check file size
    if (request.file.length === 0) {
      errors.push({ code: 'EMPTY_FILE', message: 'File is empty' })
    }
    
    if (request.file.length > this.config.maxFileSize) {
      errors.push({ 
        code: 'FILE_TOO_LARGE', 
        message: `File size exceeds limit of ${this.config.maxFileSize} bytes` 
      })
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {}
    }
  }

  // Healthcare access logging method removed

  private matchesFilters(metadata: FileMetadata, filters?: any): boolean {
    if (!filters) return true
    
    // Apply various filters
    if (filters.mimeTypes && !filters.mimeTypes.includes(metadata.mimeType)) {
      return false
    }
    
    if (filters.sizeMin && metadata.size < filters.sizeMin) {
      return false
    }
    
    if (filters.sizeMax && metadata.size > filters.sizeMax) {
      return false
    }
    
    if (filters.dataClassification && !filters.dataClassification.includes(metadata.dataClassification)) {
      return false
    }
    
    return true
  }

  private sortFiles(files: FileInfo[], sortBy?: string, sortOrder?: string): void {
    const ascending = sortOrder !== 'desc'
    
    files.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'size':
          aValue = a.size
          bValue = b.size
          break
        case 'created':
          aValue = a.metadata.createdAt
          bValue = b.metadata.createdAt
          break
        case 'modified':
          aValue = a.metadata.updatedAt
          bValue = b.metadata.updatedAt
          break
        default:
          aValue = a.originalName.toLowerCase()
          bValue = b.originalName.toLowerCase()
      }
      
      if (aValue < bValue) return ascending ? -1 : 1
      if (aValue > bValue) return ascending ? 1 : -1
      return 0
    })
  }

  private calculateFileTypeStats(files: FileInfo[]): Record<string, number> {
    const stats: Record<string, number> = {}
    
    for (const file of files) {
      const type = file.mimeType.split('/')[0]
      stats[type] = (stats[type] || 0) + 1
    }
    
    return stats
  }

  private calculateClassificationStats(files: FileInfo[]): Record<DataClassification, number> {
    const stats: Record<DataClassification, number> = {
      public: 0,
      internal: 0,
      confidential: 0,
      restricted: 0
    }
    
    for (const file of files) {
      stats[file.metadata.dataClassification]++
    }
    
    return stats
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateAverageLatency(): number {
    const allTimes = [...this.stats.uploadTimes, ...this.stats.downloadTimes]
    return this.calculateAverage(allTimes)
  }

  private calculateThroughput(): number {
    const totalOperations = this.stats.uploads + this.stats.downloads
    const timeWindowHours = 24 // Last 24 hours
    return totalOperations / timeWindowHours
  }

  private async findLargestFile(): Promise<number> {
    try {
      const files = await this.listFiles()
      return Math.max(...files.files.map(f => f.size), 0)
    } catch {
      return 0
    }
  }
}