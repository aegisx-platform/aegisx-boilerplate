/**
 * Report Data Source Service
 * 
 * Business logic service for data source management, connections, and operations
 */

import { FastifyInstance } from 'fastify'
import { 
  ReportDataSourceRepository,
  ReportDataSourceRecord,
  DataSourceListOptions
} from '../repositories/report-data-source-repository'
import {
  ReportDataSource,
  CreateDataSourceRequest,
  TestDataSourceRequest,
  DataSourceError,
  DataSourceType
} from '../types/report-types'
import {
  DataSourceConfig,
  DataSourceQuery,
  DataSourceResult,
  DataSourceTestResult,
  DatabaseConfig,
  APIConfig,
  FileConfig,
  StaticConfig
} from '../types/data-source-types'

export interface DataSourceServiceConfig {
  maxDataSourcesPerUser?: number
  encryptionEnabled?: boolean
  connectionTimeout?: number
  maxRetryAttempts?: number
  cacheEnabled?: boolean
  cacheDuration?: number
}

export class ReportDataSourceService {
  private config: DataSourceServiceConfig
  private fastify?: FastifyInstance
  private connectionPool: Map<string, any> = new Map()

  constructor(
    private dataSourceRepository: ReportDataSourceRepository,
    config: DataSourceServiceConfig = {},
    fastify?: FastifyInstance
  ) {
    this.config = {
      maxDataSourcesPerUser: 50,
      encryptionEnabled: true,
      connectionTimeout: 30000,
      maxRetryAttempts: 3,
      cacheEnabled: true,
      cacheDuration: 300, // 5 minutes
      ...config
    }
    this.fastify = fastify
  }

  // Data Source Management Operations

  async createDataSource(
    dataSourceData: CreateDataSourceRequest, 
    userId: string
  ): Promise<ReportDataSource> {
    // Validate data source data
    await this.validateDataSourceData(dataSourceData, userId)

    // Encrypt sensitive configuration
    const encryptedConfig = await this.encryptSensitiveData(dataSourceData.connectionConfig)
    const encryptedAuthConfig = dataSourceData.authConfig 
      ? await this.encryptSensitiveData(dataSourceData.authConfig)
      : undefined

    // Generate unique name if needed
    const name = await this.ensureUniqueName(dataSourceData.name)

    // Prepare data source record
    const dataSourceRecord: Omit<ReportDataSourceRecord, 'id' | 'created_at' | 'updated_at'> = {
      name,
      description: dataSourceData.description,
      type: dataSourceData.type,
      connection_config: encryptedConfig,
      connection_string: dataSourceData.connectionString,
      headers: dataSourceData.headers ? JSON.stringify(dataSourceData.headers) : undefined,
      auth_config: encryptedAuthConfig,
      is_active: true,
      requires_auth: dataSourceData.requiresAuth || false,
      timeout_seconds: dataSourceData.timeoutSeconds || 30,
      max_rows: dataSourceData.maxRows || 10000,
      data_classification: dataSourceData.dataClassification || 'internal',
      allowed_tables: dataSourceData.allowedTables ? JSON.stringify(dataSourceData.allowedTables) : undefined,
      allowed_endpoints: dataSourceData.allowedEndpoints ? JSON.stringify(dataSourceData.allowedEndpoints) : undefined,
      created_by: userId,
      updated_by: userId,
      last_tested_at: undefined,
      last_test_result: undefined
    }

    // Create data source
    const createdDataSource = await this.dataSourceRepository.createDataSource(dataSourceRecord)

    // Test connection
    try {
      const testResult = await this.testDataSourceConnection(createdDataSource.id, userId)
      await this.dataSourceRepository.updateTestResult(createdDataSource.id, testResult)
    } catch (error) {
      // Log test failure but don't fail creation
      console.warn(`Data source created but connection test failed: ${error}`)
    }

    // Log creation event
    await this.logDataSourceEvent('create', createdDataSource.id, userId, {
      dataSourceName: createdDataSource.name,
      dataSourceType: createdDataSource.type
    })

    // Publish event
    await this.publishDataSourceEvent('datasource.created', {
      dataSourceId: createdDataSource.id,
      userId,
      dataSourceData: createdDataSource
    })

    return this.mapRecordToDataSource(createdDataSource)
  }

  async getDataSource(dataSourceId: string, userId?: string): Promise<ReportDataSource | null> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) return null

    // Check access permissions
    if (userId && !await this.checkDataSourceAccess(dataSourceId, userId)) {
      throw new DataSourceError('Access denied to this data source', { dataSourceId, userId })
    }

    return this.mapRecordToDataSource(dataSource)
  }

  async updateDataSource(
    dataSourceId: string,
    updates: Partial<CreateDataSourceRequest>,
    userId: string
  ): Promise<ReportDataSource> {
    const existingDataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!existingDataSource) {
      throw new DataSourceError('Data source not found', { dataSourceId })
    }

    // Check ownership or edit permissions
    if (!await this.checkDataSourceEditAccess(dataSourceId, userId)) {
      throw new DataSourceError('Access denied to edit this data source', { dataSourceId, userId })
    }

    // Prepare update data
    const updateData: Partial<ReportDataSourceRecord> = {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.connectionString !== undefined && { connection_string: updates.connectionString }),
      ...(updates.headers !== undefined && { headers: JSON.stringify(updates.headers) }),
      ...(updates.requiresAuth !== undefined && { requires_auth: updates.requiresAuth }),
      ...(updates.timeoutSeconds !== undefined && { timeout_seconds: updates.timeoutSeconds }),
      ...(updates.maxRows !== undefined && { max_rows: updates.maxRows }),
      ...(updates.dataClassification !== undefined && { data_classification: updates.dataClassification }),
      ...(updates.allowedTables !== undefined && { allowed_tables: JSON.stringify(updates.allowedTables) }),
      ...(updates.allowedEndpoints !== undefined && { allowed_endpoints: JSON.stringify(updates.allowedEndpoints) }),
      updated_by: userId
    }

    // Handle encryption of sensitive data
    if (updates.connectionConfig) {
      updateData.connection_config = await this.encryptSensitiveData(updates.connectionConfig)
    }
    if (updates.authConfig) {
      updateData.auth_config = await this.encryptSensitiveData(updates.authConfig)
    }

    const success = await this.dataSourceRepository.updateDataSource(dataSourceId, updateData)
    if (!success) {
      throw new DataSourceError('Failed to update data source', { dataSourceId })
    }

    // Re-test connection if configuration changed
    if (updates.connectionConfig || updates.authConfig || updates.connectionString) {
      try {
        const testResult = await this.testDataSourceConnection(dataSourceId, userId)
        await this.dataSourceRepository.updateTestResult(dataSourceId, testResult)
      } catch (error) {
        console.warn(`Data source updated but connection test failed: ${error}`)
      }
    }

    // Get updated data source
    const updatedDataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)

    // Log update event
    await this.logDataSourceEvent('update', dataSourceId, userId, {
      changes: updates
    })

    // Publish event
    await this.publishDataSourceEvent('datasource.updated', {
      dataSourceId,
      userId,
      changes: updates
    })

    return this.mapRecordToDataSource(updatedDataSource!)
  }

  async deleteDataSource(dataSourceId: string, userId: string, hardDelete = false): Promise<boolean> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) {
      throw new DataSourceError('Data source not found', { dataSourceId })
    }

    // Check ownership or delete permissions
    if (!await this.checkDataSourceDeleteAccess(dataSourceId, userId)) {
      throw new DataSourceError('Access denied to delete this data source', { dataSourceId, userId })
    }

    // Check if data source is being used
    const isInUse = await this.isDataSourceInUse(dataSourceId)
    if (isInUse && hardDelete) {
      throw new DataSourceError('Cannot delete data source that is currently in use', { dataSourceId })
    }

    // Close any active connections
    await this.closeDataSourceConnections(dataSourceId)

    const success = await this.dataSourceRepository.deleteDataSource(dataSourceId, !hardDelete)

    if (success) {
      // Log deletion event
      await this.logDataSourceEvent('delete', dataSourceId, userId, {
        dataSourceName: dataSource.name,
        hardDelete
      })

      // Publish event
      await this.publishDataSourceEvent('datasource.deleted', {
        dataSourceId,
        userId,
        dataSourceData: dataSource,
        hardDelete
      })
    }

    return success
  }

  // Data Source Listing and Search

  async listDataSources(options: DataSourceListOptions, userId?: string): Promise<{
    dataSources: ReportDataSource[]
    total: number
    hasMore: boolean
    page: number
    limit: number
  }> {
    // Add user context to options
    const listOptions = {
      ...options,
      userId
    }

    const result = await this.dataSourceRepository.listDataSources(listOptions)

    const dataSources = result.dataSources.map(ds => this.mapRecordToDataSource(ds))

    const page = Math.floor((options.offset || 0) / (options.limit || 50)) + 1
    const limit = options.limit || 50

    return {
      dataSources,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit
    }
  }

  // Connection Testing and Validation

  async testDataSourceConnection(
    dataSourceId: string, 
    userId?: string,
    testRequest?: TestDataSourceRequest
  ): Promise<DataSourceTestResult> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) {
      throw new DataSourceError('Data source not found', { dataSourceId })
    }

    // Check access permissions
    if (userId && !await this.checkDataSourceAccess(dataSourceId, userId)) {
      throw new DataSourceError('Access denied to test this data source', { dataSourceId, userId })
    }

    try {
      // Decrypt configuration
      const config = await this.decryptSensitiveData(dataSource.connection_config)
      const authConfig = dataSource.auth_config 
        ? await this.decryptSensitiveData(dataSource.auth_config)
        : undefined

      // Build full configuration
      const fullConfig: DataSourceConfig = {
        ...config,
        type: dataSource.type,
        headers: dataSource.headers,
        authConfig,
        timeoutSeconds: dataSource.timeout_seconds,
        maxRows: dataSource.max_rows
      } as DataSourceConfig

      // Perform connection test
      const testResult = await this.performConnectionTest(fullConfig, testRequest)

      // Update test result in database
      await this.dataSourceRepository.updateTestResult(dataSourceId, testResult)

      // Log test event
      await this.logDataSourceEvent('test', dataSourceId, userId, {
        testResult,
        testQuery: testRequest?.testQuery
      })

      return testResult

    } catch (error: any) {
      const failureResult: DataSourceTestResult = {
        success: false,
        errors: [error.message],
        connectionTime: 0
      }

      // Update test result in database
      await this.dataSourceRepository.updateTestResult(dataSourceId, failureResult)

      return failureResult
    }
  }

  async testDataSourceConfig(
    config: DataSourceConfig, 
    testRequest?: TestDataSourceRequest
  ): Promise<DataSourceTestResult> {
    return this.performConnectionTest(config, testRequest)
  }

  // Data Querying

  async executeQuery(
    dataSourceId: string,
    query: DataSourceQuery,
    userId?: string
  ): Promise<DataSourceResult> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) {
      throw new DataSourceError('Data source not found', { dataSourceId })
    }

    // Check access permissions
    if (userId && !await this.checkDataSourceAccess(dataSourceId, userId)) {
      throw new DataSourceError('Access denied to query this data source', { dataSourceId, userId })
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(dataSourceId, query)
    if (this.config.cacheEnabled) {
      const cachedResult = await this.getCachedResult(cacheKey)
      if (cachedResult) {
        return cachedResult
      }
    }

    try {
      // Get or create connection
      const connection = await this.getDataSourceConnection(dataSourceId)

      // Execute query
      const result = await this.executeDataSourceQuery(connection, query)

      // Cache result if enabled
      if (this.config.cacheEnabled && result.success) {
        await this.setCachedResult(cacheKey, result, this.config.cacheDuration!)
      }

      // Log query execution
      await this.logDataSourceEvent('query', dataSourceId, userId, {
        query: query.query,
        parameters: query.parameters,
        resultRows: result.data?.length,
        executionTime: result.executionTime
      })

      return result

    } catch (error: any) {
      // Log query error
      await this.logDataSourceEvent('query_error', dataSourceId, userId, {
        query: query.query,
        parameters: query.parameters,
        error: error.message
      })

      throw new DataSourceError(`Query execution failed: ${error.message}`, {
        dataSourceId,
        query,
        error: error.message
      })
    }
  }

  // Access Control

  async checkDataSourceAccess(dataSourceId: string, userId: string): Promise<boolean> {
    return this.dataSourceRepository.checkUserAccess(dataSourceId, userId)
  }

  async checkDataSourceEditAccess(dataSourceId: string, userId: string): Promise<boolean> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) return false

    // Owner can always edit
    if (dataSource.created_by === userId) return true

    // Check if user has edit role/permission (would be implemented with RBAC)
    // For now, only owner can edit
    return false
  }

  async checkDataSourceDeleteAccess(dataSourceId: string, userId: string): Promise<boolean> {
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) return false

    // Owner can always delete
    if (dataSource.created_by === userId) return true

    // Check if user has delete role/permission (would be implemented with RBAC)
    // For now, only owner can delete
    return false
  }

  // Health and Monitoring

  async getDataSourceHealth(dataSourceId: string): Promise<{
    isHealthy: boolean
    lastTested?: Date
    lastTestResult?: DataSourceTestResult
    activeConnections: number
  }> {
    const health = await this.dataSourceRepository.getDataSourceHealth(dataSourceId)
    const activeConnections = await this.dataSourceRepository.getActiveConnections(dataSourceId)

    return {
      ...health,
      activeConnections
    }
  }

  async getUnhealthyDataSources(userId?: string): Promise<ReportDataSource[]> {
    const unhealthyRecords = await this.dataSourceRepository.getUnhealthyDataSources(userId)
    return unhealthyRecords.map(record => this.mapRecordToDataSource(record))
  }

  // Statistics and Analytics

  async getDataSourceStats(userId?: string): Promise<any> {
    return this.dataSourceRepository.getDataSourceStats(userId)
  }

  async getDataSourceUsage(dataSourceId: string): Promise<any> {
    return this.dataSourceRepository.getDataSourceUsage(dataSourceId)
  }

  // Private Helper Methods

  private async validateDataSourceData(
    dataSourceData: CreateDataSourceRequest, 
    userId: string
  ): Promise<void> {
    // Check user data source quota
    if (this.config.maxDataSourcesPerUser) {
      const userDataSources = await this.dataSourceRepository.listDataSources({ 
        createdBy: userId, 
        limit: this.config.maxDataSourcesPerUser + 1 
      })
      
      if (userDataSources.total >= this.config.maxDataSourcesPerUser) {
        throw new DataSourceError(
          `Maximum data source limit reached (${this.config.maxDataSourcesPerUser})`,
          { userId, limit: this.config.maxDataSourcesPerUser }
        )
      }
    }

    // Validate configuration based on type
    this.validateDataSourceConfig(dataSourceData.connectionConfig, dataSourceData.type)
  }

  private validateDataSourceConfig(config: any, type: DataSourceType): void {
    if (!config) {
      throw new DataSourceError('Connection configuration is required')
    }

    switch (type) {
      case 'database':
        this.validateDatabaseConfig(config as DatabaseConfig)
        break
      case 'api':
        this.validateAPIConfig(config as APIConfig)
        break
      case 'file':
        this.validateFileConfig(config as FileConfig)
        break
      case 'static':
        this.validateStaticConfig(config as StaticConfig)
        break
    }
  }

  private validateDatabaseConfig(config: DatabaseConfig): void {
    if (!config.host || !config.database) {
      throw new DataSourceError('Database configuration must include host and database')
    }
  }

  private validateAPIConfig(config: APIConfig): void {
    if (!config.baseUrl) {
      throw new DataSourceError('API configuration must include baseUrl')
    }
  }

  private validateFileConfig(config: FileConfig): void {
    if (!config.source) {
      throw new DataSourceError('File configuration must include source')
    }
  }

  private validateStaticConfig(config: StaticConfig): void {
    if (!config.data || !Array.isArray(config.data)) {
      throw new DataSourceError('Static configuration must include data array')
    }
  }

  private async ensureUniqueName(baseName: string): Promise<string> {
    return this.dataSourceRepository.generateUniqueName(baseName)
  }

  private async encryptSensitiveData(data: any): Promise<string> {
    if (!this.config.encryptionEnabled) {
      return JSON.stringify(data)
    }

    // Use Fastify secrets manager if available
    if ((this.fastify as any)?.secrets) {
      return (this.fastify as any).secrets.encrypt(JSON.stringify(data))
    }

    // Fallback to basic encoding (not secure - implement proper encryption)
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  private async decryptSensitiveData(encryptedData: string): Promise<any> {
    if (!this.config.encryptionEnabled) {
      return JSON.parse(encryptedData)
    }

    // Use Fastify secrets manager if available
    if ((this.fastify as any)?.secrets) {
      const decrypted = await (this.fastify as any).secrets.decrypt(encryptedData)
      return JSON.parse(decrypted)
    }

    // Fallback to basic decoding (not secure - implement proper decryption)
    const decoded = Buffer.from(encryptedData, 'base64').toString()
    return JSON.parse(decoded)
  }

  private async performConnectionTest(
    config: DataSourceConfig,
    testRequest?: TestDataSourceRequest
  ): Promise<DataSourceTestResult> {
    const startTime = Date.now()

    try {
      // This would be implemented with actual connection testing
      // For now, return a mock successful result
      await this.delay(500) // Simulate connection time

      const connectionTime = Date.now() - startTime

      return {
        success: true,
        connectionTime,
        recordCount: 100,
        sampleData: [
          { id: 1, name: 'Test Record 1' },
          { id: 2, name: 'Test Record 2' }
        ]
      }
    } catch (error: any) {
      return {
        success: false,
        connectionTime: Date.now() - startTime,
        errors: [error.message]
      }
    }
  }

  private async getDataSourceConnection(dataSourceId: string): Promise<any> {
    // Check if connection exists in pool
    if (this.connectionPool.has(dataSourceId)) {
      return this.connectionPool.get(dataSourceId)
    }

    // Create new connection
    const dataSource = await this.dataSourceRepository.getDataSourceById(dataSourceId)
    if (!dataSource) {
      throw new DataSourceError('Data source not found', { dataSourceId })
    }

    // This would create actual database/API connections
    const connection = { id: dataSourceId, created: new Date() }
    this.connectionPool.set(dataSourceId, connection)

    return connection
  }

  private async executeDataSourceQuery(connection: any, query: DataSourceQuery): Promise<DataSourceResult> {
    // This would execute actual queries based on data source type
    // For now, return mock data
    await this.delay(200) // Simulate query time

    return {
      success: true,
      data: [
        { id: 1, name: 'Record 1', value: 100 },
        { id: 2, name: 'Record 2', value: 200 }
      ],
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'value', type: 'number' }
      ],
      totalRows: 2,
      executionTime: 200,
      cached: false
    }
  }

  private async closeDataSourceConnections(dataSourceId: string): Promise<void> {
    if (this.connectionPool.has(dataSourceId)) {
      // Close actual connection here
      this.connectionPool.delete(dataSourceId)
    }
  }

  private async isDataSourceInUse(dataSourceId: string): Promise<boolean> {
    // Check if data source is used by any templates
    const usage = await this.dataSourceRepository.getDataSourceUsage(dataSourceId)
    return usage.templateCount > 0
  }

  private generateCacheKey(dataSourceId: string, query: DataSourceQuery): string {
    const queryStr = typeof query.query === 'string' ? query.query : JSON.stringify(query.query)
    const paramsStr = JSON.stringify(query.parameters || {})
    return `ds:${dataSourceId}:${Buffer.from(queryStr + paramsStr).toString('base64')}`
  }

  private async getCachedResult(cacheKey: string): Promise<DataSourceResult | null> {
    if ((this.fastify as any)?.cache) {
      return (this.fastify as any).cache.get(cacheKey)
    }
    return null
  }

  private async setCachedResult(
    cacheKey: string, 
    result: DataSourceResult, 
    ttl: number
  ): Promise<void> {
    if ((this.fastify as any)?.cache) {
      await (this.fastify as any).cache.set(cacheKey, result, ttl)
    }
  }

  private mapRecordToDataSource(record: ReportDataSourceRecord): ReportDataSource {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      type: record.type,
      connectionConfig: typeof record.connection_config === 'string' ? JSON.parse(record.connection_config) : record.connection_config,
      connectionString: record.connection_string,
      headers: record.headers ? (typeof record.headers === 'string' ? JSON.parse(record.headers) : record.headers) : undefined,
      authConfig: record.auth_config ? (typeof record.auth_config === 'string' ? JSON.parse(record.auth_config) : record.auth_config) : undefined,
      isActive: record.is_active,
      requiresAuth: record.requires_auth,
      timeoutSeconds: record.timeout_seconds,
      maxRows: record.max_rows,
      dataClassification: record.data_classification,
      allowedTables: record.allowed_tables ? (typeof record.allowed_tables === 'string' ? JSON.parse(record.allowed_tables) : record.allowed_tables) : undefined,
      allowedEndpoints: record.allowed_endpoints ? (typeof record.allowed_endpoints === 'string' ? JSON.parse(record.allowed_endpoints) : record.allowed_endpoints) : undefined,
      createdBy: record.created_by,
      updatedBy: record.updated_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      lastTestedAt: record.last_tested_at,
      lastTestResult: record.last_test_result ? (typeof record.last_test_result === 'string' ? JSON.parse(record.last_test_result) : record.last_test_result) : undefined
    }
  }

  private async logDataSourceEvent(
    action: string,
    dataSourceId: string,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    if (this.fastify?.auditLog) {
      await this.fastify.auditLog.log({
        action: `datasource.${action}`,
        resource: 'report_data_sources',
        resourceId: dataSourceId,
        userId,
        details: metadata
      })
    }
  }

  private async publishDataSourceEvent(eventType: string, data: any): Promise<void> {
    if (this.fastify?.eventBus) {
      await this.fastify.eventBus.publish(eventType, data)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}