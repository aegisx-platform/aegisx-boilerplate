/**
 * Report Template Repository
 * 
 * Data access layer for report templates, parameters, and related operations
 */

import { Knex } from 'knex'
import { 
  ReportFormat,
  AccessLevel,
  ReportType
} from '../types/report-types'

export interface ReportTemplateRecord {
  id: string
  name: string
  description?: string
  slug: string
  type: ReportType
  format: ReportFormat
  template_config: string // JSON
  style_config?: string // JSON
  layout_config?: string // JSON
  data_source_id?: string
  query_template?: string
  data_transform?: string // JSON
  is_public: boolean
  is_active: boolean
  requires_auth: boolean
  cache_enabled: boolean
  cache_duration_minutes: number
  access_level: AccessLevel
  allowed_roles?: string // JSON
  allowed_users?: string // JSON
  version: number
  parent_template_id?: string
  is_current_version: boolean
  created_by: string
  updated_by?: string
  created_at: Date
  updated_at: Date
  last_used_at?: Date
  usage_count: number
}

export interface ReportParameterRecord {
  id: string
  template_id: string
  name: string
  label: string
  description?: string
  type: string
  input_type: string
  is_required: boolean
  default_value?: string // JSON
  validation_rules?: string // JSON
  options?: string // JSON
  placeholder?: string
  sort_order: number
  is_visible: boolean
  is_filterable: boolean
  group_name?: string
}

export interface TemplateListOptions {
  userId?: string
  type?: ReportType
  format?: ReportFormat
  accessLevel?: AccessLevel
  isActive?: boolean
  isPublic?: boolean
  dataSourceId?: string
  search?: string
  tags?: string[]
  createdBy?: string
  limit?: number
  offset?: number
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'last_used_at' | 'usage_count'
  sortOrder?: 'asc' | 'desc'
  includeParameters?: boolean
}

export interface TemplateStatsResult {
  totalTemplates: number
  activeTemplates: number
  publicTemplates: number
  templatesByType: Record<ReportType, number>
  templatesByFormat: Record<ReportFormat, number>
  templatesByAccessLevel: Record<AccessLevel, number>
  avgUsageCount: number
  mostUsedTemplate: string | null
  recentlyCreated: number
  recentlyUsed: number
}

export class ReportTemplateRepository {
  constructor(private knex: Knex) {}

  // Template Management Operations

  async createTemplate(templateData: Omit<ReportTemplateRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ReportTemplateRecord> {
    const [record] = await this.knex('report_templates')
      .insert({
        ...templateData,
        template_config: this.stringifyIfObject(templateData.template_config),
        style_config: this.stringifyIfObject(templateData.style_config),
        layout_config: this.stringifyIfObject(templateData.layout_config),
        data_transform: this.stringifyIfObject(templateData.data_transform),
        allowed_roles: this.stringifyIfObject(templateData.allowed_roles),
        allowed_users: this.stringifyIfObject(templateData.allowed_users)
      })
      .returning('*')
    
    return this.parseTemplateRecord(record)
  }

  async getTemplateById(id: string): Promise<ReportTemplateRecord | null> {
    const record = await this.knex('report_templates')
      .where({ id })
      .first()
    
    return record ? this.parseTemplateRecord(record) : null
  }

  async getTemplateBySlug(slug: string): Promise<ReportTemplateRecord | null> {
    const record = await this.knex('report_templates')
      .where({ slug, is_active: true })
      .first()
    
    return record ? this.parseTemplateRecord(record) : null
  }

  async updateTemplate(id: string, updates: Partial<ReportTemplateRecord>): Promise<boolean> {
    const updateData = { ...updates }
    
    // Handle JSON fields
    if (updateData.template_config) {
      updateData.template_config = this.stringifyIfObject(updateData.template_config)
    }
    if (updateData.style_config) {
      updateData.style_config = this.stringifyIfObject(updateData.style_config)
    }
    if (updateData.layout_config) {
      updateData.layout_config = this.stringifyIfObject(updateData.layout_config)
    }
    if (updateData.data_transform) {
      updateData.data_transform = this.stringifyIfObject(updateData.data_transform)
    }
    if (updateData.allowed_roles) {
      updateData.allowed_roles = this.stringifyIfObject(updateData.allowed_roles)
    }
    if (updateData.allowed_users) {
      updateData.allowed_users = this.stringifyIfObject(updateData.allowed_users)
    }
    
    const result = await this.knex('report_templates')
      .where({ id })
      .update({
        ...updateData,
        updated_at: this.knex.fn.now()
      })
    
    return result > 0
  }

  async deleteTemplate(id: string, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const result = await this.knex('report_templates')
        .where({ id })
        .update({
          is_active: false,
          updated_at: this.knex.fn.now()
        })
      return result > 0
    } else {
      const result = await this.knex('report_templates')
        .where({ id })
        .del()
      return result > 0
    }
  }

  async updateUsageStats(templateId: string): Promise<void> {
    await this.knex('report_templates')
      .where({ id: templateId })
      .update({
        last_used_at: this.knex.fn.now(),
        usage_count: this.knex.raw('usage_count + 1'),
        updated_at: this.knex.fn.now()
      })
  }

  async listTemplates(options: TemplateListOptions = {}): Promise<{
    templates: ReportTemplateRecord[]
    total: number
    hasMore: boolean
  }> {
    let query = this.knex('report_templates')
      .where('is_active', options.isActive !== false)

    // Apply filters
    if (options.userId) {
      // Check if user has access based on access level and permissions
      query = query.where(function() {
        this.where('created_by', options.userId!)
          .orWhere('access_level', 'public')
          .orWhere('access_level', 'organization')
          .orWhere(function() {
            this.where('access_level', 'shared')
              .andWhere(function() {
                this.whereRaw("allowed_users::jsonb ? ?", [options.userId!])
              })
          })
      })
    }

    if (options.type) {
      query = query.where('type', options.type)
    }
    if (options.format) {
      query = query.where('format', options.format)
    }
    if (options.accessLevel) {
      query = query.where('access_level', options.accessLevel)
    }
    if (options.isPublic !== undefined) {
      query = query.where('is_public', options.isPublic)
    }
    if (options.dataSourceId) {
      query = query.where('data_source_id', options.dataSourceId)
    }
    if (options.createdBy) {
      query = query.where('created_by', options.createdBy)
    }
    if (options.search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${options.search}%`)
          .orWhere('description', 'ilike', `%${options.search}%`)
          .orWhere('slug', 'ilike', `%${options.search}%`)
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
    const templates = records.map(record => this.parseTemplateRecord(record))

    return {
      templates,
      total,
      hasMore: offset + limit < total
    }
  }

  // Version Management

  async createTemplateVersion(
    originalId: string, 
    newTemplateData: Omit<ReportTemplateRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ReportTemplateRecord> {
    return await this.knex.transaction(async (trx) => {
      // Mark current version as not current
      await trx('report_templates')
        .where({ parent_template_id: originalId, is_current_version: true })
        .orWhere({ id: originalId, is_current_version: true })
        .update({ is_current_version: false })

      // Get current max version
      const [{ max_version }] = await trx('report_templates')
        .where(function() {
          this.where('parent_template_id', originalId)
            .orWhere('id', originalId)
        })
        .max('version as max_version')

      // Create new version
      const [newRecord] = await trx('report_templates')
        .insert({
          ...newTemplateData,
          parent_template_id: originalId,
          version: (max_version || 0) + 1,
          is_current_version: true,
          template_config: this.stringifyIfObject(newTemplateData.template_config),
          style_config: this.stringifyIfObject(newTemplateData.style_config),
          layout_config: this.stringifyIfObject(newTemplateData.layout_config),
          data_transform: this.stringifyIfObject(newTemplateData.data_transform),
          allowed_roles: this.stringifyIfObject(newTemplateData.allowed_roles),
          allowed_users: this.stringifyIfObject(newTemplateData.allowed_users)
        })
        .returning('*')

      return this.parseTemplateRecord(newRecord)
    })
  }

  async getTemplateVersions(templateId: string): Promise<ReportTemplateRecord[]> {
    const records = await this.knex('report_templates')
      .where(function() {
        this.where('parent_template_id', templateId)
          .orWhere('id', templateId)
      })
      .orderBy('version', 'desc')

    return records.map(record => this.parseTemplateRecord(record))
  }

  async getCurrentVersion(templateId: string): Promise<ReportTemplateRecord | null> {
    const record = await this.knex('report_templates')
      .where(function() {
        this.where('parent_template_id', templateId)
          .orWhere('id', templateId)
      })
      .where('is_current_version', true)
      .first()

    return record ? this.parseTemplateRecord(record) : null
  }

  // Parameter Management

  async createParameters(templateId: string, parameters: Omit<ReportParameterRecord, 'id' | 'template_id'>[]): Promise<ReportParameterRecord[]> {
    const parameterRecords = parameters.map(param => ({
      ...param,
      template_id: templateId,
      default_value: this.stringifyIfObject(param.default_value),
      validation_rules: this.stringifyIfObject(param.validation_rules),
      options: this.stringifyIfObject(param.options)
    }))

    const records = await this.knex('report_parameters')
      .insert(parameterRecords)
      .returning('*')

    return records.map(record => this.parseParameterRecord(record))
  }

  async getTemplateParameters(templateId: string): Promise<ReportParameterRecord[]> {
    const records = await this.knex('report_parameters')
      .where({ template_id: templateId })
      .orderBy('sort_order', 'asc')

    return records.map(record => this.parseParameterRecord(record))
  }

  async updateParameter(parameterId: string, updates: Partial<ReportParameterRecord>): Promise<boolean> {
    const updateData = { ...updates }

    // Handle JSON fields
    if (updateData.default_value) {
      updateData.default_value = this.stringifyIfObject(updateData.default_value)
    }
    if (updateData.validation_rules) {
      updateData.validation_rules = this.stringifyIfObject(updateData.validation_rules)
    }
    if (updateData.options) {
      updateData.options = this.stringifyIfObject(updateData.options)
    }

    const result = await this.knex('report_parameters')
      .where({ id: parameterId })
      .update(updateData)

    return result > 0
  }

  async deleteParameter(parameterId: string): Promise<boolean> {
    const result = await this.knex('report_parameters')
      .where({ id: parameterId })
      .del()

    return result > 0
  }

  async deleteTemplateParameters(templateId: string): Promise<number> {
    return await this.knex('report_parameters')
      .where({ template_id: templateId })
      .del()
  }

  // Access Control

  async checkUserAccess(templateId: string, userId: string, userRoles: string[] = []): Promise<boolean> {
    const template = await this.getTemplateById(templateId)
    if (!template) return false

    // Template owner always has access
    if (template.created_by === userId) return true

    // Public templates
    if (template.access_level === 'public' || template.is_public) return true

    // Organization level (assuming all users in org have access)
    if (template.access_level === 'organization') return true

    // Shared templates - check user and role access
    if (template.access_level === 'shared') {
      // Check if user is explicitly allowed
      if (template.allowed_users && template.allowed_users.includes(userId)) {
        return true
      }

      // Check if any of user's roles are allowed
      if (template.allowed_roles && userRoles.length > 0) {
        const allowedRoles = template.allowed_roles
        return userRoles.some(role => allowedRoles.includes(role))
      }
    }

    return false
  }

  async getUserAccessibleTemplates(userId: string, userRoles: string[] = []): Promise<string[]> {
    const query = this.knex('report_templates')
      .select('id')
      .where('is_active', true)
      .where(function() {
        // Owner access
        this.where('created_by', userId)
        // Public access
        .orWhere('is_public', true)
        .orWhere('access_level', 'public')
        // Organization access
        .orWhere('access_level', 'organization')
        // Shared access - user specific
        .orWhere(function() {
          this.where('access_level', 'shared')
            .whereRaw("allowed_users::jsonb ? ?", [userId])
        })
      })

    // Add role-based access if user has roles
    if (userRoles.length > 0) {
      query.orWhere(function() {
        this.where('access_level', 'shared')
        userRoles.forEach(role => {
          this.orWhereRaw("allowed_roles::jsonb ? ?", [role])
        })
      })
    }

    const results = await query
    return results.map(r => r.id)
  }

  // Statistics and Analytics

  async getTemplateStats(userId?: string): Promise<TemplateStatsResult> {
    let baseQuery = this.knex('report_templates').where('is_active', true)
    
    if (userId) {
      baseQuery = baseQuery.where('created_by', userId)
    }

    // Get basic counts
    const [totals] = await baseQuery.clone()
      .select(
        this.knex.raw('COUNT(*) as total_templates'),
        this.knex.raw('COUNT(CASE WHEN is_active THEN 1 END) as active_templates'),
        this.knex.raw('COUNT(CASE WHEN is_public THEN 1 END) as public_templates'),
        this.knex.raw('COALESCE(AVG(usage_count), 0) as avg_usage_count')
      )

    // Get templates by type
    const typeStats = await baseQuery.clone()
      .select('type')
      .count('* as count')
      .groupBy('type')

    // Get templates by format
    const formatStats = await baseQuery.clone()
      .select('format')
      .count('* as count')
      .groupBy('format')

    // Get templates by access level
    const accessStats = await baseQuery.clone()
      .select('access_level')
      .count('* as count')
      .groupBy('access_level')

    // Get most used template
    const [mostUsed] = await baseQuery.clone()
      .select('id')
      .orderBy('usage_count', 'desc')
      .limit(1)

    // Get recent activity
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [recentActivity] = await baseQuery.clone()
      .select(
        this.knex.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as recently_created', [since7d]),
        this.knex.raw('COUNT(CASE WHEN last_used_at >= ? THEN 1 END) as recently_used', [since24h])
      )

    return {
      totalTemplates: parseInt(totals.total_templates),
      activeTemplates: parseInt(totals.active_templates),
      publicTemplates: parseInt(totals.public_templates),
      templatesByType: Object.fromEntries(
        typeStats.map(row => [row.type, parseInt(String(row.count))])
      ) as Record<ReportType, number>,
      templatesByFormat: Object.fromEntries(
        formatStats.map(row => [row.format, parseInt(String(row.count))])
      ) as Record<ReportFormat, number>,
      templatesByAccessLevel: Object.fromEntries(
        accessStats.map(row => [row.access_level, parseInt(String(row.count))])
      ) as Record<AccessLevel, number>,
      avgUsageCount: parseFloat(totals.avg_usage_count),
      mostUsedTemplate: mostUsed?.id || null,
      recentlyCreated: parseInt(recentActivity.recently_created),
      recentlyUsed: parseInt(recentActivity.recently_used)
    }
  }

  async getPopularTemplates(limit = 10, userId?: string): Promise<ReportTemplateRecord[]> {
    let query = this.knex('report_templates')
      .where('is_active', true)
      .orderBy('usage_count', 'desc')
      .limit(limit)

    if (userId) {
      query = query.where('created_by', userId)
    }

    const records = await query
    return records.map(record => this.parseTemplateRecord(record))
  }

  async getRecentTemplates(limit = 10, userId?: string): Promise<ReportTemplateRecord[]> {
    let query = this.knex('report_templates')
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .limit(limit)

    if (userId) {
      query = query.where('created_by', userId)
    }

    const records = await query
    return records.map(record => this.parseTemplateRecord(record))
  }

  // Duplicate and Clone Operations

  async duplicateTemplate(originalId: string, newName: string, newSlug: string, userId: string): Promise<ReportTemplateRecord> {
    return await this.knex.transaction(async (trx) => {
      // Get original template
      const original = await trx('report_templates')
        .where({ id: originalId })
        .first()

      if (!original) {
        throw new Error('Original template not found')
      }

      // Create duplicate
      const duplicateData = {
        ...original,
        name: newName,
        slug: newSlug,
        created_by: userId,
        updated_by: userId,
        version: 1,
        parent_template_id: null,
        is_current_version: true,
        usage_count: 0,
        last_used_at: null
      }

      delete duplicateData.id
      delete duplicateData.created_at
      delete duplicateData.updated_at

      const [newTemplate] = await trx('report_templates')
        .insert(duplicateData)
        .returning('*')

      // Duplicate parameters
      const originalParameters = await trx('report_parameters')
        .where({ template_id: originalId })

      if (originalParameters.length > 0) {
        const newParameters = originalParameters.map(param => ({
          ...param,
          template_id: newTemplate.id
        }))

        // Remove id fields
        newParameters.forEach(param => delete param.id)

        await trx('report_parameters')
          .insert(newParameters)
      }

      return this.parseTemplateRecord(newTemplate)
    })
  }

  // Slug management

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    let query = this.knex('report_templates')
      .where({ slug })

    if (excludeId) {
      query = query.whereNot({ id: excludeId })
    }

    const result = await query.first()
    return !!result
  }

  async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug
    let counter = 1

    while (await this.checkSlugExists(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  // Private helper methods

  private parseTemplateRecord(record: any): ReportTemplateRecord {
    return {
      ...record,
      template_config: this.parseIfString(record.template_config),
      style_config: this.parseIfString(record.style_config),
      layout_config: this.parseIfString(record.layout_config),
      data_transform: this.parseIfString(record.data_transform),
      allowed_roles: this.parseIfString(record.allowed_roles),
      allowed_users: this.parseIfString(record.allowed_users),
      is_public: Boolean(record.is_public),
      is_active: Boolean(record.is_active),
      requires_auth: Boolean(record.requires_auth),
      cache_enabled: Boolean(record.cache_enabled),
      is_current_version: Boolean(record.is_current_version),
      usage_count: parseInt(record.usage_count),
      cache_duration_minutes: parseInt(record.cache_duration_minutes),
      version: parseInt(record.version)
    }
  }

  private parseParameterRecord(record: any): ReportParameterRecord {
    return {
      ...record,
      default_value: this.parseIfString(record.default_value),
      validation_rules: this.parseIfString(record.validation_rules),
      options: this.parseIfString(record.options),
      is_required: Boolean(record.is_required),
      is_visible: Boolean(record.is_visible),
      is_filterable: Boolean(record.is_filterable),
      sort_order: parseInt(record.sort_order)
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