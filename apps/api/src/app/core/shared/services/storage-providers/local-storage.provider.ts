/**
 * Local File System Storage Provider
 * 
 * Implements file storage operations using the local file system
 * with enterprise features including encryption and health monitoring
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { promisify } from 'util'
import zlib from 'zlib'
import { v4 as uuidv4 } from 'uuid'
import {
  IStorageProvider,
  StorageConfig,
  LocalStorageConfig,
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

export class LocalStorageProvider implements IStorageProvider {
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
    private config: LocalStorageConfig,
    private globalConfig: StorageConfig
  ) {}

  async connect(): Promise<void> {
    try {
      // Ensure base directories exist
      await this.ensureDirectoryExists(this.config.basePath)
      
      if (this.config.thumbnailPath) {
        await this.ensureDirectoryExists(this.config.thumbnailPath)
      }
      
      if (this.config.tempPath) {
        await this.ensureDirectoryExists(this.config.tempPath)
      }

      // Create metadata directory
      await this.ensureDirectoryExists(path.join(this.config.basePath, '.metadata'))
      
      // Test write permissions
      const testFile = path.join(this.config.basePath, '.write-test')
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)

      this.connected = true
    } catch (error) {
      throw new StorageError(
        `Failed to connect to local storage: ${(error as Error).message}`,
        'PROVIDER_UNAVAILABLE',
        'local',
        undefined,
        this.config.basePath,
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
        'Local storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'local'
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
          'local'
        )
      }

      // Generate file ID and paths
      const fileId = uuidv4()
      const extension = path.extname(request.filename)
      const filename = `${fileId}${extension}`
      const relativePath = request.options?.path || this.generateStoragePath(fileId)
      const fullPath = path.join(this.config.basePath, relativePath, filename)
      
      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(fullPath))

      // Check file size limits
      if (request.file.length > this.config.maxFileSize) {
        throw new StorageError(
          `File size ${request.file.length} exceeds maximum ${this.config.maxFileSize}`,
          'FILE_TOO_LARGE',
          'local',
          fileId
        )
      }

      // Check storage space
      await this.checkStorageSpace(request.file.length)

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

      // Write file
      await fs.writeFile(fullPath, fileData)
      
      // Set file permissions
      await fs.chmod(fullPath, this.config.permissions)

      // Create metadata
      const metadata: FileMetadata = {
        filename,
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
        provider: 'local',
        providerPath: path.relative(this.config.basePath, fullPath),
        providerMetadata: {
          compressed,
          originalSize: request.file.length,
          storedSize: fileData.length
        }
      }

      // Save metadata
      await this.saveMetadata(fileId, metadata)

      // Update statistics
      this.stats.uploads++
      this.stats.totalFiles++
      this.stats.totalSize += request.file.length
      this.stats.uploadTimes.push(Date.now() - startTime)

      // Generate URLs
      const downloadUrl = this.generateLocalUrl(fileId, 'download')
      
      return {
        success: true,
        fileId,
        filename,
        path: relativePath,
        size: request.file.length,
        checksum,
        mimeType: request.mimeType,
        metadata,
        url: downloadUrl
      }

    } catch (error) {
      this.stats.errors++
      
      if (error instanceof StorageError) {
        throw error
      }

      throw new StorageError(
        `Upload failed: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        'local',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  async download(request: DownloadRequest): Promise<DownloadResult> {
    if (!this.connected) {
      throw new StorageError(
        'Local storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'local'
      )
    }

    const startTime = Date.now()

    try {
      // Get metadata
      const metadata = await this.getMetadata(request.fileId)
      const fullPath = path.join(this.config.basePath, metadata.providerPath)

      // Check file exists
      if (!await this.fileExists(fullPath)) {
        throw new StorageError(
          `File not found: ${request.fileId}`,
          'FILE_NOT_FOUND',
          'local',
          request.fileId
        )
      }

      // Read file
      let fileData = await fs.readFile(fullPath)

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
            'local',
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
        'local',
        request.fileId,
        undefined,
        error as Error
      )
    }
  }

  async delete(fileId: string): Promise<boolean> {
    if (!this.connected) {
      throw new StorageError(
        'Local storage provider not connected',
        'PROVIDER_UNAVAILABLE',
        'local'
      )
    }

    try {
      // Get metadata
      const metadata = await this.getMetadata(fileId)
      const fullPath = path.join(this.config.basePath, metadata.providerPath)
      
      // Delete file
      if (await this.fileExists(fullPath)) {
        await fs.unlink(fullPath)
      }

      // Delete metadata
      await this.deleteMetadata(fileId)

      // Delete thumbnails if they exist
      if (this.config.thumbnailPath) {
        await this.deleteThumbnails(fileId)
      }

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
        'local',
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async exists(fileId: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(fileId)
      const fullPath = path.join(this.config.basePath, metadata.providerPath)
      return await this.fileExists(fullPath)
    } catch {
      return false
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata> {
    const metadataPath = path.join(this.config.basePath, '.metadata', `${fileId}.json`)
    
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8')
      const metadata = JSON.parse(metadataContent) as FileMetadata
      
      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt)
      metadata.updatedAt = new Date(metadata.updatedAt)
      
      return metadata
    } catch (error) {
      throw new StorageError(
        `Metadata not found for file: ${fileId}`,
        'FILE_NOT_FOUND',
        'local',
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
        'local',
        fileId,
        undefined,
        error as Error
      )
    }
  }

  async copyFile(sourceId: string, destinationPath: string): Promise<StorageResult> {
    // Get source file and metadata
    const sourceMetadata = await this.getMetadata(sourceId)
    const sourcePath = path.join(this.config.basePath, sourceMetadata.providerPath)
    
    // Read source file
    const fileData = await fs.readFile(sourcePath)
    
    // Create upload request for copy
    const uploadRequest: UploadRequest = {
      file: fileData,
      filename: sourceMetadata.originalName,
      mimeType: sourceMetadata.mimeType,
      options: {
        path: destinationPath,
        dataClassification: sourceMetadata.dataClassification,
        tags: sourceMetadata.tags,
        customMetadata: sourceMetadata.customMetadata
      }
    }
    
    return await this.upload(uploadRequest)
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
    
    for (const request of requests) {
      try {
        const result = await this.upload(request)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          fileId: '',
          filename: request.filename,
          path: '',
          size: 0,
          checksum: '',
          mimeType: request.mimeType,
          metadata: {} as FileMetadata,
          error: error as StorageError
        })
      }
    }
    
    return results
  }

  async downloadMultiple(requests: DownloadRequest[]): Promise<DownloadResult[]> {
    const results: DownloadResult[] = []
    
    for (const request of requests) {
      try {
        const result = await this.download(request)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          fileId: request.fileId,
          filename: '',
          mimeType: '',
          size: 0,
          data: Buffer.alloc(0),
          metadata: {} as FileMetadata,
          cached: false,
          error: error as StorageError
        })
      }
    }
    
    return results
  }

  async deleteMultiple(fileIds: string[]): Promise<boolean[]> {
    const results: boolean[] = []
    
    for (const fileId of fileIds) {
      try {
        const result = await this.delete(fileId)
        results.push(result)
      } catch {
        results.push(false)
      }
    }
    
    return results
  }

  async listFiles(options: ListOptions = {}): Promise<FileList> {
    const metadataDir = path.join(this.config.basePath, '.metadata')
    
    try {
      const metadataFiles = await fs.readdir(metadataDir)
      const fileInfos: FileInfo[] = []
      
      for (const metadataFile of metadataFiles) {
        if (!metadataFile.endsWith('.json')) continue
        
        const fileId = path.basename(metadataFile, '.json')
        
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
              download: this.generateLocalUrl(fileId, 'download')
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
        'local',
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
        totalSize: filteredFiles.reduce((sum: number, file: FileInfo) => sum + file.size, 0),
        fileTypes: this.calculateFileTypeStats(filteredFiles),
        classifications: this.calculateClassificationStats(filteredFiles)
      }
    }
  }

  async generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResult> {
    // For local storage, presigned URLs are not applicable
    // Return a direct download URL instead
    const fileId = request.fileId || request.path?.split('/').pop()
    
    if (!fileId) {
      throw new StorageError(
        'File ID is required for presigned URL generation',
        'CONFIGURATION_ERROR',
        'local'
      )
    }
    
    const operation = request.operation === 'read' ? 'download' : request.operation === 'write' ? 'upload' : 'download'
    const url = this.generateLocalUrl(fileId, operation)
    const expiresAt = new Date(Date.now() + (request.expiresIn || 3600) * 1000)
    
    return {
      url,
      method: request.operation === 'read' ? 'GET' : 'POST',
      expiresAt,
      conditions: request.conditions || {}
    }
  }

  async getHealth(): Promise<StorageHealth> {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100
    
    try {
      // Check connection
      if (!this.connected) {
        issues.push('Provider not connected')
        score -= 50
      }
      
      // Check base path accessibility
      try {
        await fs.access(this.config.basePath, fs.constants.R_OK | fs.constants.W_OK)
      } catch {
        issues.push('Base path not accessible')
        score -= 30
      }
      
      // Check disk usage
      const diskUsage = await this.getDiskUsage()
      if (diskUsage.percentage > 0.9) {
        issues.push(`High disk usage: ${(diskUsage.percentage * 100).toFixed(1)}%`)
        score -= 20
      } else if (diskUsage.percentage > 0.8) {
        recommendations.push('Monitor disk usage')
        score -= 10
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
        provider: 'local',
        connected: this.connected,
        latency: this.calculateAverageLatency(),
        errorRate,
        diskUsage,
        issues,
        recommendations,
        lastCheck: new Date()
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        score: 0,
        provider: 'local',
        connected: false,
        latency: 0,
        errorRate: 1,
        issues: [`Health check failed: ${(error as Error).message}`],
        recommendations: ['Check storage configuration and permissions'],
        lastCheck: new Date()
      }
    }
  }

  async getStats(): Promise<StorageStats> {
    return {
      provider: 'local',
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

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true, mode: this.config.permissions })
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  private generateStoragePath(fileId: string): string {
    // Create a nested directory structure based on file ID
    const dir1 = fileId.substring(0, 2)
    const dir2 = fileId.substring(2, 4)
    return path.join(dir1, dir2)
  }

  private generateLocalUrl(fileId: string, operation: 'download' | 'upload'): string {
    // This would typically be handled by the API server
    return `/api/storage/${operation}/${fileId}`
  }

  private async saveMetadata(fileId: string, metadata: FileMetadata): Promise<void> {
    const metadataPath = path.join(this.config.basePath, '.metadata', `${fileId}.json`)
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  }

  private async deleteMetadata(fileId: string): Promise<void> {
    const metadataPath = path.join(this.config.basePath, '.metadata', `${fileId}.json`)
    try {
      await fs.unlink(metadataPath)
    } catch {
      // Metadata might not exist
    }
  }

  private async deleteThumbnails(fileId: string): Promise<void> {
    if (!this.config.thumbnailPath) return
    
    try {
      const thumbnailDir = path.join(this.config.thumbnailPath, fileId)
      await fs.rmdir(thumbnailDir, { recursive: true })
    } catch {
      // Thumbnails might not exist
    }
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private shouldCompress(request: UploadRequest): boolean {
    if (!this.globalConfig.compression.enabled) return false
    if (request.file.length < this.globalConfig.compression.threshold) return false
    
    return this.globalConfig.compression.mimeTypes.some((type: string) => {
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
    
    // Check allowed mime types
    if (this.config.allowedMimeTypes && !this.config.allowedMimeTypes.includes(request.mimeType)) {
      errors.push({ 
        code: 'INVALID_MIME_TYPE', 
        message: `MIME type ${request.mimeType} not allowed` 
      })
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {}
    }
  }

  private async checkStorageSpace(fileSize: number): Promise<void> {
    const diskUsage = await this.getDiskUsage()
    
    if (diskUsage.percentage > 0.95) {
      throw new StorageError(
        'Storage is full',
        'STORAGE_FULL',
        'local'
      )
    }
    
    if (diskUsage.used + fileSize > diskUsage.total) {
      throw new StorageError(
        'Insufficient storage space',
        'STORAGE_FULL',
        'local'
      )
    }
  }

  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    // This is a simplified implementation
    // In production, you would use proper disk space checking
    return {
      used: this.stats.totalSize,
      total: 1024 * 1024 * 1024 * 100, // 100GB mock total
      percentage: this.stats.totalSize / (1024 * 1024 * 1024 * 100)
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
      return Math.max(...files.files.map((f: FileInfo) => f.size), 0)
    } catch {
      return 0
    }
  }
}