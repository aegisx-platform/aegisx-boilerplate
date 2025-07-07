/**
 * Report Data Source Repository
 * 
 * Data access layer for data source connections and configurations
 */

import { Knex } from 'knex'
import { 
  DataSourceType,
  DataClassification
} from '../types/report-types'
import { DataSourceTestResult } from '../types/data-source-types'

export interface ReportDataSourceRecord {
  id: string
  name: string
  description?: string
  type: DataSourceType
  connection_config: string // JSON encrypted
  connection_string?: string
  headers?: string // JSON
  auth_config?: string // JSON encrypted
  is_active: boolean
  requires_auth: boolean
  timeout_seconds: number
  max_rows: number
  data_classification: DataClassification
  allowed_tables?: string // JSON
  allowed_endpoints?: string // JSON
  created_by: string
  updated_by?: string
  created_at: Date
  updated_at: Date
  last_tested_at?: Date
  last_test_result?: string // JSON
}

export interface DataSourceListOptions {
  userId?: string
  type?: DataSourceType
  dataClassification?: DataClassification
  isActive?: boolean
  requiresAuth?: boolean
  createdBy?: string
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at' | 'last_tested_at'
  sortOrder?: 'asc' | 'desc'
}

export interface DataSourceStatsResult {
  totalDataSources: number
  activeDataSources: number
  dataSourcesByType: Record<DataSourceType, number>
  dataSourcesByClassification: Record<DataClassification, number>
  averageResponseTime: number
  healthyDataSources: number
  recentlyTested: number
  mostUsedDataSource: string | null
}

export class ReportDataSourceRepository {
  constructor(private knex: Knex) {}

  // Data Source Management Operations

  async createDataSource(dataSourceData: Omit<ReportDataSourceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ReportDataSourceRecord> {
    const [record] = await this.knex('report_data_sources')
      .insert({
        ...dataSourceData,
        connection_config: this.stringifyIfObject(dataSourceData.connection_config),
        headers: this.stringifyIfObject(dataSourceData.headers),
        auth_config: this.stringifyIfObject(dataSourceData.auth_config),
        allowed_tables: this.stringifyIfObject(dataSourceData.allowed_tables),
        allowed_endpoints: this.stringifyIfObject(dataSourceData.allowed_endpoints),
        last_test_result: this.stringifyIfObject(dataSourceData.last_test_result)
      })
      .returning('*')
    
    return this.parseDataSourceRecord(record)
  }

  async getDataSourceById(id: string): Promise<ReportDataSourceRecord | null> {
    const record = await this.knex('report_data_sources')
      .where({ id })
      .first()
    
    return record ? this.parseDataSourceRecord(record) : null
  }

  async getDataSourceByName(name: string, userId?: string): Promise<ReportDataSourceRecord | null> {
    let query = this.knex('report_data_sources')
      .where({ name, is_active: true })

    if (userId) {
      query = query.where(function() {
        this.where('created_by', userId)
          .orWhere('data_classification', 'public')
      })
    }

    const record = await query.first()
    return record ? this.parseDataSourceRecord(record) : null
  }

  async updateDataSource(id: string, updates: Partial<ReportDataSourceRecord>): Promise<boolean> {
    const updateData = { ...updates }
    
    // Handle JSON fields
    if (updateData.connection_config) {
      updateData.connection_config = this.stringifyIfObject(updateData.connection_config)
    }
    if (updateData.headers) {
      updateData.headers = this.stringifyIfObject(updateData.headers)
    }
    if (updateData.auth_config) {
      updateData.auth_config = this.stringifyIfObject(updateData.auth_config)
    }
    if (updateData.allowed_tables) {
      updateData.allowed_tables = this.stringifyIfObject(updateData.allowed_tables)
    }
    if (updateData.allowed_endpoints) {
      updateData.allowed_endpoints = this.stringifyIfObject(updateData.allowed_endpoints)
    }
    if (updateData.last_test_result) {
      updateData.last_test_result = this.stringifyIfObject(updateData.last_test_result)
    }
    
    const result = await this.knex('report_data_sources')
      .where({ id })
      .update({
        ...updateData,
        updated_at: this.knex.fn.now()
      })
    
    return result > 0
  }

  async deleteDataSource(id: string, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const result = await this.knex('report_data_sources')
        .where({ id })
        .update({
          is_active: false,
          updated_at: this.knex.fn.now()
        })
      return result > 0
    } else {
      const result = await this.knex('report_data_sources')
        .where({ id })
        .del()
      return result > 0
    }
  }

  async updateTestResult(dataSourceId: string, testResult: DataSourceTestResult): Promise<void> {
    await this.knex('report_data_sources')
      .where({ id: dataSourceId })
      .update({
        last_tested_at: this.knex.fn.now(),
        last_test_result: JSON.stringify(testResult),
        updated_at: this.knex.fn.now()
      })
  }

  async listDataSources(options: DataSourceListOptions = {}): Promise<{
    dataSources: ReportDataSourceRecord[]
    total: number
    hasMore: boolean
  }> {
    let query = this.knex('report_data_sources')
      .where('is_active', options.isActive !== false)

    // Apply filters
    if (options.userId) {
      // Check access based on data classification and ownership
      query = query.where(function() {
        this.where('created_by', options.userId!)
          .orWhere('data_classification', 'public')
      })
    }

    if (options.type) {
      query = query.where('type', options.type)
    }
    if (options.dataClassification) {
      query = query.where('data_classification', options.dataClassification)
    }
    if (options.requiresAuth !== undefined) {
      query = query.where('requires_auth', options.requiresAuth)
    }
    if (options.createdBy) {
      query = query.where('created_by', options.createdBy)
    }
    if (options.search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${options.search}%`)
          .orWhere('description', 'ilike', `%${options.search}%`)
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
    const dataSources = records.map(record => this.parseDataSourceRecord(record))

    return {
      dataSources,
      total,
      hasMore: offset + limit < total
    }
  }

  // Access Control

  async checkUserAccess(dataSourceId: string, userId: string): Promise<boolean> {
    const dataSource = await this.getDataSourceById(dataSourceId)
    if (!dataSource) return false

    // Data source owner always has access
    if (dataSource.created_by === userId) return true

    // Public data sources
    if (dataSource.data_classification === 'public') return true

    // Internal classification - check if user is part of organization (simplified)
    if (dataSource.data_classification === 'internal') {
      // In a real implementation, you'd check organization membership
      return true
    }

    return false
  }

  async getUserAccessibleDataSources(userId: string): Promise<string[]> {
    const results = await this.knex('report_data_sources')
      .select('id')
      .where('is_active', true)
      .where(function() {
        // Owner access
        this.where('created_by', userId)
        // Public access
        .orWhere('data_classification', 'public')
        // Internal access (simplified - all users in org)
        .orWhere('data_classification', 'internal')
      })

    return results.map(r => r.id)
  }

  // Connection Health and Monitoring

  async getDataSourceHealth(dataSourceId: string): Promise<{
    isHealthy: boolean
    lastTested?: Date
    lastTestResult?: DataSourceTestResult
    connectionCount?: number
  }> {
    const dataSource = await this.getDataSourceById(dataSourceId)
    if (!dataSource) {
      return { isHealthy: false }
    }

    const lastTestResult = dataSource.last_test_result ? JSON.parse(dataSource.last_test_result) : null
    const isHealthy = lastTestResult?.success === true
    
    return {
      isHealthy,
      lastTested: dataSource.last_tested_at,
      lastTestResult: lastTestResult,
      connectionCount: 0 // Would be implemented with connection pooling
    }
  }

  async getUnhealthyDataSources(userId?: string): Promise<ReportDataSourceRecord[]> {
    let query = this.knex('report_data_sources')
      .where('is_active', true)
      .where(function() {
        // No test result or failed test
        this.whereNull('last_test_result')
          .orWhereRaw("(last_test_result::json->>'success')::boolean = false")
      })

    if (userId) {
      query = query.where(function() {
        this.where('created_by', userId)
          .orWhere('data_classification', 'public')
      })
    }

    const records = await query.orderBy('last_tested_at', 'asc')
    return records.map(record => this.parseDataSourceRecord(record))
  }

  // Statistics and Analytics

  async getDataSourceStats(userId?: string): Promise<DataSourceStatsResult> {
    let baseQuery = this.knex('report_data_sources').where('is_active', true)
    
    if (userId) {
      baseQuery = baseQuery.where(function() {
        this.where('created_by', userId)
          .orWhere('data_classification', 'public')
      })
    }

    // Get basic counts
    const [totals] = await baseQuery.clone()
      .select(
        this.knex.raw('COUNT(*) as total_data_sources'),
        this.knex.raw('COUNT(CASE WHEN is_active THEN 1 END) as active_data_sources'),
        this.knex.raw(`COUNT(CASE WHEN (last_test_result::json->>'success')::boolean = true THEN 1 END) as healthy_data_sources`)
      )

    // Get data sources by type
    const typeStats = await baseQuery.clone()
      .select('type')
      .count('* as count')
      .groupBy('type')

    // Get data sources by classification
    const classificationStats = await baseQuery.clone()
      .select('data_classification')
      .count('* as count')
      .groupBy('data_classification')

    // Get recent testing activity
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [recentActivity] = await baseQuery.clone()
      .select(
        this.knex.raw('COUNT(CASE WHEN last_tested_at >= ? THEN 1 END) as recently_tested', [since24h])
      )

    // Get most used data source (based on template associations)
    const [mostUsed] = await this.knex('report_templates')
      .select('data_source_id')
      .count('* as usage_count')
      .whereNotNull('data_source_id')
      .groupBy('data_source_id')
      .orderBy('usage_count', 'desc')
      .limit(1)

    // Calculate average response time from test results
    const responseTimeQuery = await baseQuery.clone()
      .select(this.knex.raw("last_test_result::json->>'connectionTime' as connection_time"))
      .whereNotNull('last_test_result')
      .whereRaw("(last_test_result::json->>'success')::boolean = true")

    const avgResponseTime = responseTimeQuery
      .map(r => parseFloat(r.connection_time))
      .filter(t => !isNaN(t))
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0)

    return {
      totalDataSources: parseInt(totals.total_data_sources),
      activeDataSources: parseInt(totals.active_data_sources),
      dataSourcesByType: Object.fromEntries(
        typeStats.map(row => [row.type, parseInt(String(row.count))])
      ) as Record<DataSourceType, number>,
      dataSourcesByClassification: Object.fromEntries(
        classificationStats.map(row => [row.data_classification, parseInt(String(row.count))])
      ) as Record<DataClassification, number>,
      averageResponseTime: avgResponseTime || 0,
      healthyDataSources: parseInt(totals.healthy_data_sources),
      recentlyTested: parseInt(recentActivity.recently_tested),
      mostUsedDataSource: mostUsed?.data_source_id?.toString() || null
    }
  }

  async getDataSourceUsage(dataSourceId: string): Promise<{
    templateCount: number
    totalGenerations: number
    lastUsed?: Date
    topTemplates: Array<{ templateId: string; templateName: string; usageCount: number }>
  }> {
    // Count templates using this data source
    const [templateCount] = await this.knex('report_templates')
      .count('* as count')
      .where('data_source_id', dataSourceId)
      .where('is_active', true)

    // Get total generations for templates using this data source
    const [totalGenerations] = await this.knex('report_instances as ri')
      .join('report_templates as rt', 'ri.template_id', 'rt.id')
      .count('ri.* as count')
      .where('rt.data_source_id', dataSourceId)
      .where('ri.status', 'completed')

    // Get last used date
    const [lastUsed] = await this.knex('report_instances as ri')
      .join('report_templates as rt', 'ri.template_id', 'rt.id')
      .select('ri.created_at')
      .where('rt.data_source_id', dataSourceId)
      .orderBy('ri.created_at', 'desc')
      .limit(1)

    // Get top templates using this data source
    const topTemplates = await this.knex('report_templates')
      .select('id as templateId', 'name as templateName', 'usage_count as usageCount')
      .where('data_source_id', dataSourceId)
      .where('is_active', true)
      .orderBy('usage_count', 'desc')
      .limit(5)

    return {
      templateCount: parseInt(String(templateCount.count)),
      totalGenerations: parseInt(String(totalGenerations.count)),
      lastUsed: lastUsed?.created_at,
      topTemplates
    }
  }

  // Data Source Validation

  async checkNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = this.knex('report_data_sources')
      .where({ name })

    if (excludeId) {
      query = query.whereNot({ id: excludeId })
    }

    const result = await query.first()
    return !!result
  }

  async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName
    let counter = 1

    while (await this.checkNameExists(name)) {
      name = `${baseName} (${counter})`
      counter++
    }

    return name
  }

  // Connection Management

  async getActiveConnections(dataSourceId: string): Promise<number> {
    // This would be implemented with actual connection pooling
    // For now, return 0
    return 0
  }

  async getConnectionPool(dataSourceId: string): Promise<{
    total: number
    active: number
    idle: number
    waiting: number
  }> {
    // This would be implemented with actual connection pooling
    return {
      total: 0,
      active: 0,
      idle: 0,
      waiting: 0
    }
  }

  // Cleanup Operations

  async cleanupOldTestResults(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const result = await this.knex('report_data_sources')
      .where('last_tested_at', '<', cutoffDate)
      .update({
        last_test_result: null,
        last_tested_at: null,
        updated_at: this.knex.fn.now()
      })
    
    return result
  }

  async findUnusedDataSources(olderThanDays = 90): Promise<ReportDataSourceRecord[]> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const unusedIds = await this.knex('report_data_sources as rds')
      .select('rds.id')
      .leftJoin('report_templates as rt', 'rds.id', 'rt.data_source_id')
      .whereNull('rt.data_source_id')
      .where('rds.created_at', '<', cutoffDate)
      .where('rds.is_active', true)

    if (unusedIds.length === 0) return []

    const records = await this.knex('report_data_sources')
      .whereIn('id', unusedIds.map(r => r.id))

    return records.map(record => this.parseDataSourceRecord(record))
  }

  // Private helper methods

  private parseDataSourceRecord(record: any): ReportDataSourceRecord {
    return {
      ...record,
      connection_config: this.parseIfString(record.connection_config),
      headers: this.parseIfString(record.headers),
      auth_config: this.parseIfString(record.auth_config),
      allowed_tables: this.parseIfString(record.allowed_tables),
      allowed_endpoints: this.parseIfString(record.allowed_endpoints),
      last_test_result: this.parseIfString(record.last_test_result),
      is_active: Boolean(record.is_active),
      requires_auth: Boolean(record.requires_auth),
      timeout_seconds: parseInt(record.timeout_seconds),
      max_rows: parseInt(record.max_rows)
    }
  }

  private stringifyIfObject(value: any): string | undefined {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  private parseIfString(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  }
}