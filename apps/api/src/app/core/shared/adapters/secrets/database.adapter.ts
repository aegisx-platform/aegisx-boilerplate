/**
 * Database Secrets Adapter
 * 
 * Stores secrets in database with encryption and versioning support
 */

import { Knex } from 'knex'
import {
  ISecretsAdapter,
  DatabaseAdapterConfig,
  SetSecretOptions,
  SecretVersion,
  AdapterHealthStatus,
  AdapterStats,
  SecretsManagerError,
  ValidationError,
  EncryptionResult
} from '../../types/secrets-manager.types'
import { EncryptionService } from '../../utils/encryption'

interface DatabaseSecret {
  id?: number
  key: string
  value: string
  namespace?: string
  version: string
  metadata?: string
  encrypted: boolean
  encryption_data?: string
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
  ttl?: number
  expires_at?: Date
}

export class DatabaseSecretsAdapter implements ISecretsAdapter {
  public readonly name = 'database'
  public readonly priority = 3 // Medium priority
  
  private knex: Knex
  private config: DatabaseAdapterConfig
  private encryptionService?: EncryptionService
  private stats: AdapterStats
  private initialized = false

  constructor(knex: Knex, config: DatabaseAdapterConfig, encryptionKey?: string) {
    this.knex = knex
    this.config = config
    
    if (this.config.encryption && encryptionKey) {
      this.encryptionService = new EncryptionService(encryptionKey)
    }
    
    this.stats = {
      operationCounts: {
        gets: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      },
      averageResponseTime: 0,
      availability: 1,
      lastUsed: new Date()
    }
  }

  /**
   * Check if adapter is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      await this.knex.raw('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  /**
   * Initialize the adapter and create table if needed
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Check if table exists
      const hasTable = await this.knex.schema.hasTable(this.config.table)
      
      if (!hasTable) {
        await this.createSecretsTable()
      }
      
      this.initialized = true
    } catch (error) {
      throw new SecretsManagerError(
        `Failed to initialize database adapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        this.name
      )
    }
  }

  /**
   * Get secret from database
   */
  public async get(key: string, namespace?: string): Promise<string | null> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      
      const query = this.knex(this.config.table)
        .where(this.config.keyColumn, key)
        .first()
      
      if (namespace && this.config.namespaceColumn) {
        query.where(this.config.namespaceColumn, namespace)
      }
      
      const record = await query as DatabaseSecret | undefined
      
      if (!record) {
        this.updateResponseTime(startTime)
        return null
      }
      
      // Check TTL
      if (record.expires_at && record.expires_at < new Date()) {
        await this.delete(key, namespace)
        this.updateResponseTime(startTime)
        return null
      }
      
      let value = record.value
      
      // Decrypt if needed
      if (record.encrypted && this.encryptionService && record.encryption_data) {
        try {
          const encryptionResult: EncryptionResult = JSON.parse(record.encryption_data)
          value = this.encryptionService.decrypt(encryptionResult)
        } catch (error) {
          throw new SecretsManagerError(
            `Failed to decrypt secret: ${key}`,
            'DECRYPTION_ERROR',
            this.name,
            key
          )
        }
      }
      
      this.stats.operationCounts.gets++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
      
      return value
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Set secret in database
   */
  public async set(
    key: string,
    value: string,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      this.validateValue(value)
      
      const now = new Date()
      let encryptedValue = value
      let encryptionData: string | undefined
      let encrypted = false
      
      // Encrypt if needed
      if (this.config.encryption && this.encryptionService) {
        const encryptionResult = this.encryptionService.encrypt(value)
        encryptedValue = '' // Don't store plaintext
        encryptionData = JSON.stringify(encryptionResult)
        encrypted = true
      }
      
      const secretData: Partial<DatabaseSecret> = {
        [this.config.keyColumn]: key,
        [this.config.valueColumn]: encryptedValue,
        version: options?.version || '1',
        encrypted,
        encryption_data: encryptionData,
        updated_at: now,
        updated_by: 'system'
      }
      
      if (namespace && this.config.namespaceColumn) {
        (secretData as any)[this.config.namespaceColumn] = namespace
      }
      
      if (options?.metadata && this.config.metadataColumn) {
        (secretData as any)[this.config.metadataColumn] = JSON.stringify(options.metadata)
      }
      
      if (options?.ttl) {
        secretData.ttl = options.ttl
        secretData.expires_at = new Date(now.getTime() + options.ttl)
      }
      
      // Use upsert (insert or update)
      const whereCondition: any = { [this.config.keyColumn]: key }
      if (namespace && this.config.namespaceColumn) {
        whereCondition[this.config.namespaceColumn] = namespace
      }
      
      const existing = await this.knex(this.config.table)
        .where(whereCondition)
        .first()
      
      if (existing) {
        await this.knex(this.config.table)
          .where(whereCondition)
          .update(secretData)
      } else {
        await this.knex(this.config.table)
          .insert({
            ...secretData,
            created_at: now,
            created_by: 'system'
          })
      }
      
      this.stats.operationCounts.sets++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Delete secret from database
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      
      const whereCondition: any = { [this.config.keyColumn]: key }
      if (namespace && this.config.namespaceColumn) {
        whereCondition[this.config.namespaceColumn] = namespace
      }
      
      const deletedCount = await this.knex(this.config.table)
        .where(whereCondition)
        .del()
      
      this.stats.operationCounts.deletes++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
      
      return deletedCount > 0
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Check if secret exists
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      this.validateKey(key)
      
      const whereCondition: any = { [this.config.keyColumn]: key }
      if (namespace && this.config.namespaceColumn) {
        whereCondition[this.config.namespaceColumn] = namespace
      }
      
      const record = await this.knex(this.config.table)
        .where(whereCondition)
        .first()
      
      return !!record
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Get multiple secrets
   */
  public async getMultiple(
    keys: string[],
    namespace?: string
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    
    // Use Promise.all for parallel execution
    const promises = keys.map(async (key) => {
      const value = await this.get(key, namespace)
      return { key, value }
    })
    
    const keyValues = await Promise.all(promises)
    
    for (const { key, value } of keyValues) {
      results[key] = value
    }
    
    return results
  }

  /**
   * Set multiple secrets
   */
  public async setMultiple(
    secrets: Record<string, string>,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    // Use transaction for consistency
    await this.knex.transaction(async (trx) => {
      const adapter = new DatabaseSecretsAdapter(trx, this.config)
      if (this.encryptionService) {
        adapter.encryptionService = this.encryptionService
      }
      
      for (const [key, value] of Object.entries(secrets)) {
        await adapter.set(key, value, namespace, options)
      }
    })
  }

  /**
   * List namespaces
   */
  public async listNamespaces(): Promise<string[]> {
    if (!this.config.namespaceColumn) {
      return []
    }
    
    const results = await this.knex(this.config.table)
      .distinct(this.config.namespaceColumn)
      .whereNotNull(this.config.namespaceColumn)
      .select(this.config.namespaceColumn)
    
    return results.map(row => row[this.config.namespaceColumn!]).filter(Boolean).sort()
  }

  /**
   * Clear namespace
   */
  public async clearNamespace(namespace: string): Promise<void> {
    if (!this.config.namespaceColumn) {
      throw new SecretsManagerError(
        'Namespace operations not supported - no namespace column configured',
        'NAMESPACE_NOT_SUPPORTED',
        this.name
      )
    }
    
    await this.knex(this.config.table)
      .where(this.config.namespaceColumn, namespace)
      .del()
  }

  /**
   * Rotate secret
   */
  public async rotate(
    key: string,
    newValue: string,
    namespace?: string
  ): Promise<void> {
    // Create new version
    const currentVersion = await this.getCurrentVersion(key, namespace)
    const newVersion = (parseInt(currentVersion) + 1).toString()
    
    await this.set(key, newValue, namespace, { version: newVersion })
  }

  /**
   * Get secret versions
   */
  public async getVersions(key: string, namespace?: string): Promise<SecretVersion[]> {
    // For simplicity, we only keep current version in this implementation
    // In a full implementation, you'd have a separate versions table
    const current = await this.get(key, namespace)
    
    if (!current) {
      return []
    }
    
    const whereCondition: any = { [this.config.keyColumn]: key }
    if (namespace && this.config.namespaceColumn) {
      whereCondition[this.config.namespaceColumn] = namespace
    }
    
    const record = await this.knex(this.config.table)
      .where(whereCondition)
      .first() as DatabaseSecret | undefined
    
    if (!record) {
      return []
    }
    
    return [{
      version: record.version,
      value: current,
      createdAt: record.created_at,
      createdBy: record.created_by,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined
    }]
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<AdapterHealthStatus> {
    try {
      const startTime = Date.now()
      
      // Test database connection
      await this.knex.raw('SELECT 1')
      
      // Test table access
      await this.knex(this.config.table).count('* as count').first()
      
      const responseTime = Date.now() - startTime
      
      return {
        status: 'healthy',
        available: true,
        responseTime,
        errorCount: this.stats.operationCounts.errors,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        available: false,
        responseTime: 0,
        errorCount: this.stats.operationCounts.errors,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      }
    }
  }

  /**
   * Get statistics
   */
  public async getStats(): Promise<AdapterStats> {
    return {
      ...this.stats,
      availability: this.calculateAvailability()
    }
  }

  /**
   * Shutdown adapter
   */
  public async shutdown(): Promise<void> {
    if (this.encryptionService) {
      this.encryptionService.cleanup()
    }
  }

  /**
   * Create secrets table
   */
  private async createSecretsTable(): Promise<void> {
    await this.knex.schema.createTable(this.config.table, (table) => {
      table.increments('id').primary()
      table.string(this.config.keyColumn, 255).notNullable()
      table.text(this.config.valueColumn)
      
      if (this.config.namespaceColumn) {
        table.string(this.config.namespaceColumn, 100).nullable()
      }
      
      table.string('version', 50).defaultTo('1')
      
      if (this.config.metadataColumn) {
        table.text(this.config.metadataColumn).nullable()
      }
      
      table.boolean('encrypted').defaultTo(false)
      table.text('encryption_data').nullable()
      table.timestamps(true, true)
      table.string('created_by', 100).nullable()
      table.string('updated_by', 100).nullable()
      table.integer('ttl').nullable()
      table.timestamp('expires_at').nullable()
      
      // Create indexes
      table.index([this.config.keyColumn])
      
      if (this.config.namespaceColumn) {
        table.index([this.config.namespaceColumn])
        table.unique([this.config.keyColumn, this.config.namespaceColumn])
      } else {
        table.unique([this.config.keyColumn])
      }
      
      table.index('expires_at')
    })
  }

  /**
   * Get current version for a key
   */
  private async getCurrentVersion(key: string, namespace?: string): Promise<string> {
    const whereCondition: any = { [this.config.keyColumn]: key }
    if (namespace && this.config.namespaceColumn) {
      whereCondition[this.config.namespaceColumn] = namespace
    }
    
    const record = await this.knex(this.config.table)
      .where(whereCondition)
      .first() as DatabaseSecret | undefined
    
    return record?.version || '0'
  }

  /**
   * Validate key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new ValidationError('key', 'Key must be a non-empty string')
    }
    
    if (key.length > 255) {
      throw new ValidationError('key', 'Key must be less than 255 characters')
    }
  }

  /**
   * Validate value
   */
  private validateValue(value: string): void {
    if (typeof value !== 'string') {
      throw new ValidationError('value', 'Value must be a string')
    }
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(startTime: bigint): void {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000
    
    const totalOps = Object.values(this.stats.operationCounts).reduce((sum, count) => sum + count, 0)
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (totalOps - 1)) + duration
    ) / totalOps
  }

  /**
   * Calculate availability
   */
  private calculateAvailability(): number {
    const totalOps = Object.values(this.stats.operationCounts).reduce((sum, count) => sum + count, 0)
    
    if (totalOps === 0) return 1
    
    const successOps = totalOps - this.stats.operationCounts.errors
    return successOps / totalOps
  }

  /**
   * Clean up expired secrets
   */
  public async cleanupExpired(): Promise<number> {
    const deletedCount = await this.knex(this.config.table)
      .where('expires_at', '<', new Date())
      .del()
    
    return deletedCount
  }
}