/**
 * Report Template Service
 * 
 * Business logic service for report template management and operations
 */

import { FastifyInstance } from 'fastify'
import { 
  ReportTemplateRepository, 
  ReportTemplateRecord,
  TemplateListOptions
} from '../repositories/report-template-repository'
import { 
  ReportParameter,
  CreateReportTemplateRequest,
  UpdateReportTemplateRequest,
  ReportTemplateResponse,
  TemplateError,
  ReportType
} from '../types/report-types'

export interface TemplateServiceConfig {
  maxTemplatesPerUser?: number
  maxParametersPerTemplate?: number
  allowedSlugCharacters?: RegExp
  reservedSlugs?: string[]
}

export class ReportTemplateService {
  private config: TemplateServiceConfig
  private fastify?: FastifyInstance

  constructor(
    private templateRepository: ReportTemplateRepository,
    config: TemplateServiceConfig = {},
    fastify?: FastifyInstance
  ) {
    this.config = {
      maxTemplatesPerUser: 100,
      maxParametersPerTemplate: 50,
      allowedSlugCharacters: /^[a-z0-9-_]+$/,
      reservedSlugs: ['admin', 'api', 'app', 'system', 'report', 'template'],
      ...config
    }
    this.fastify = fastify
  }

  // Template Management Operations

  async createTemplate(templateData: CreateReportTemplateRequest, userId: string): Promise<ReportTemplateResponse> {
    // Validate template data
    await this.validateTemplateData(templateData, userId)

    // Generate unique slug if needed
    const slug = await this.ensureUniqueSlug(templateData.slug)

    // Prepare template record
    const templateRecord: Omit<ReportTemplateRecord, 'id' | 'created_at' | 'updated_at'> = {
      name: templateData.name,
      description: templateData.description,
      slug,
      type: templateData.type,
      format: templateData.format || 'html',
      template_config: JSON.stringify(templateData.templateConfig),
      style_config: templateData.styleConfig ? JSON.stringify(templateData.styleConfig) : undefined,
      layout_config: templateData.layoutConfig ? JSON.stringify(templateData.layoutConfig) : undefined,
      data_source_id: templateData.dataSourceId,
      query_template: templateData.queryTemplate,
      data_transform: templateData.dataTransform ? JSON.stringify(templateData.dataTransform) : undefined,
      is_public: templateData.isPublic || false,
      is_active: true,
      requires_auth: templateData.requiresAuth !== false,
      cache_enabled: templateData.cacheEnabled !== false,
      cache_duration_minutes: templateData.cacheDurationMinutes || 60,
      access_level: templateData.accessLevel || 'private',
      allowed_roles: templateData.allowedRoles ? JSON.stringify(templateData.allowedRoles) : undefined,
      allowed_users: templateData.allowedUsers ? JSON.stringify(templateData.allowedUsers) : undefined,
      version: 1,
      parent_template_id: undefined,
      is_current_version: true,
      created_by: userId,
      updated_by: userId,
      last_used_at: undefined,
      usage_count: 0
    }

    // Create template
    const createdTemplate = await this.templateRepository.createTemplate(templateRecord)

    // Create parameters if provided
    if (templateData.parameters && templateData.parameters.length > 0) {
      await this.createTemplateParameters(createdTemplate.id, templateData.parameters)
    }

    // Log creation event
    await this.logTemplateEvent('create', createdTemplate.id, userId, {
      templateName: createdTemplate.name,
      templateType: createdTemplate.type
    })

    // Publish event
    await this.publishTemplateEvent('template.created', {
      templateId: createdTemplate.id,
      userId,
      templateData: createdTemplate
    })

    return this.enrichTemplateResponse(createdTemplate)
  }

  async getTemplate(templateId: string, userId?: string): Promise<ReportTemplateResponse | null> {
    const template = await this.templateRepository.getTemplateById(templateId)
    if (!template) return null

    // Check access permissions
    if (userId && !await this.checkTemplateAccess(templateId, userId)) {
      throw new TemplateError('Access denied to this template', { templateId, userId })
    }

    return this.enrichTemplateResponse(template)
  }

  async getTemplateBySlug(slug: string, userId?: string): Promise<ReportTemplateResponse | null> {
    const template = await this.templateRepository.getTemplateBySlug(slug)
    if (!template) return null

    // Check access permissions
    if (userId && !await this.checkTemplateAccess(template.id, userId)) {
      throw new TemplateError('Access denied to this template', { slug, userId })
    }

    return this.enrichTemplateResponse(template)
  }

  async updateTemplate(
    templateId: string, 
    updates: UpdateReportTemplateRequest, 
    userId: string
  ): Promise<ReportTemplateResponse> {
    const existingTemplate = await this.templateRepository.getTemplateById(templateId)
    if (!existingTemplate) {
      throw new TemplateError('Template not found', { templateId })
    }

    // Check ownership or edit permissions
    if (!await this.checkTemplateEditAccess(templateId, userId)) {
      throw new TemplateError('Access denied to edit this template', { templateId, userId })
    }

    // Validate updates
    if (updates.slug && updates.slug !== existingTemplate.slug) {
      await this.validateSlug(updates.slug, templateId)
    }

    // Handle version creation if significant changes
    const shouldCreateVersion = this.shouldCreateNewVersion(existingTemplate, updates)

    let updatedTemplate: ReportTemplateRecord

    if (shouldCreateVersion) {
      // Create new version
      const newVersionData: Omit<ReportTemplateRecord, 'id' | 'created_at' | 'updated_at'> = {
        ...existingTemplate,
        ...updates,
        updated_by: userId,
        version: existingTemplate.version + 1
      }

      updatedTemplate = await this.templateRepository.createTemplateVersion(templateId, newVersionData)
    } else {
      // Update existing template
      const updateData: Partial<ReportTemplateRecord> = {
        ...updates,
        updated_by: userId
      }

      const success = await this.templateRepository.updateTemplate(templateId, updateData)
      if (!success) {
        throw new TemplateError('Failed to update template', { templateId })
      }

      updatedTemplate = await this.templateRepository.getTemplateById(templateId) as ReportTemplateRecord
    }

    // Update parameters if provided
    if (updates.parameters) {
      await this.updateTemplateParameters(updatedTemplate.id, updates.parameters)
    }

    // Log update event
    await this.logTemplateEvent('update', updatedTemplate.id, userId, {
      changes: updates,
      versionCreated: shouldCreateVersion
    })

    // Publish event
    await this.publishTemplateEvent('template.updated', {
      templateId: updatedTemplate.id,
      userId,
      changes: updates,
      versionCreated: shouldCreateVersion
    })

    return this.enrichTemplateResponse(updatedTemplate)
  }

  async deleteTemplate(templateId: string, userId: string, hardDelete = false): Promise<boolean> {
    const template = await this.templateRepository.getTemplateById(templateId)
    if (!template) {
      throw new TemplateError('Template not found', { templateId })
    }

    // Check ownership or delete permissions
    if (!await this.checkTemplateDeleteAccess(templateId, userId)) {
      throw new TemplateError('Access denied to delete this template', { templateId, userId })
    }

    // Check if template is being used
    const isInUse = await this.isTemplateInUse(templateId)
    if (isInUse && hardDelete) {
      throw new TemplateError('Cannot delete template that is currently in use', { templateId })
    }

    const success = await this.templateRepository.deleteTemplate(templateId, !hardDelete)

    if (success) {
      // Log deletion event
      await this.logTemplateEvent('delete', templateId, userId, {
        templateName: template.name,
        hardDelete
      })

      // Publish event
      await this.publishTemplateEvent('template.deleted', {
        templateId,
        userId,
        templateData: template,
        hardDelete
      })
    }

    return success
  }

  async duplicateTemplate(
    templateId: string, 
    newName: string, 
    newSlug: string, 
    userId: string
  ): Promise<ReportTemplateResponse> {
    const originalTemplate = await this.templateRepository.getTemplateById(templateId)
    if (!originalTemplate) {
      throw new TemplateError('Original template not found', { templateId })
    }

    // Check access to original template
    if (!await this.checkTemplateAccess(templateId, userId)) {
      throw new TemplateError('Access denied to original template', { templateId, userId })
    }

    // Validate new slug
    await this.validateSlug(newSlug)

    // Duplicate template
    const duplicatedTemplate = await this.templateRepository.duplicateTemplate(
      templateId, 
      newName, 
      newSlug, 
      userId
    )

    // Log duplication event
    await this.logTemplateEvent('duplicate', duplicatedTemplate.id, userId, {
      originalTemplateId: templateId,
      newTemplateName: newName
    })

    // Publish event
    await this.publishTemplateEvent('template.duplicated', {
      templateId: duplicatedTemplate.id,
      originalTemplateId: templateId,
      userId,
      templateData: duplicatedTemplate
    })

    return this.enrichTemplateResponse(duplicatedTemplate)
  }

  // Template Listing and Search

  async listTemplates(options: TemplateListOptions, userId?: string): Promise<{
    templates: ReportTemplateResponse[]
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

    const result = await this.templateRepository.listTemplates(listOptions)

    const enrichedTemplates = await Promise.all(
      result.templates.map(template => this.enrichTemplateResponse(template))
    )

    const page = Math.floor((options.offset || 0) / (options.limit || 50)) + 1
    const limit = options.limit || 50

    return {
      templates: enrichedTemplates,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit
    }
  }

  async searchTemplates(query: string, userId?: string, options: Partial<TemplateListOptions> = {}): Promise<ReportTemplateResponse[]> {
    const searchOptions: TemplateListOptions = {
      ...options,
      search: query,
      userId
    }

    const result = await this.templateRepository.listTemplates(searchOptions)

    return Promise.all(
      result.templates.map(template => this.enrichTemplateResponse(template))
    )
  }

  async getPopularTemplates(limit = 10, userId?: string): Promise<ReportTemplateResponse[]> {
    const templates = await this.templateRepository.getPopularTemplates(limit, userId)

    return Promise.all(
      templates.map(template => this.enrichTemplateResponse(template))
    )
  }

  async getRecentTemplates(limit = 10, userId?: string): Promise<ReportTemplateResponse[]> {
    const templates = await this.templateRepository.getRecentTemplates(limit, userId)

    return Promise.all(
      templates.map(template => this.enrichTemplateResponse(template))
    )
  }

  // Template Parameters Management

  async getTemplateParameters(templateId: string): Promise<ReportParameter[]> {
    const parameters = await this.templateRepository.getTemplateParameters(templateId)
    return parameters.map(param => this.mapParameterRecordToParameter(param))
  }

  async updateTemplateParameters(
    templateId: string, 
    parameters: Omit<ReportParameter, 'id' | 'templateId'>[]
  ): Promise<ReportParameter[]> {
    // Delete existing parameters
    await this.templateRepository.deleteTemplateParameters(templateId)

    // Create new parameters
    if (parameters.length > 0) {
      const createdParameters = await this.createTemplateParameters(templateId, parameters)
      return createdParameters
    }

    return []
  }

  // Template Versions

  async getTemplateVersions(templateId: string, userId?: string): Promise<ReportTemplateResponse[]> {
    // Check access to template
    if (userId && !await this.checkTemplateAccess(templateId, userId)) {
      throw new TemplateError('Access denied to template versions', { templateId, userId })
    }

    const versions = await this.templateRepository.getTemplateVersions(templateId)

    return Promise.all(
      versions.map(version => this.enrichTemplateResponse(version))
    )
  }

  async getCurrentVersion(templateId: string): Promise<ReportTemplateResponse | null> {
    const currentVersion = await this.templateRepository.getCurrentVersion(templateId)
    if (!currentVersion) return null

    return this.enrichTemplateResponse(currentVersion)
  }

  // Access Control

  async checkTemplateAccess(templateId: string, userId: string, userRoles: string[] = []): Promise<boolean> {
    return this.templateRepository.checkUserAccess(templateId, userId, userRoles)
  }

  async checkTemplateEditAccess(templateId: string, userId: string): Promise<boolean> {
    const template = await this.templateRepository.getTemplateById(templateId)
    if (!template) return false

    // Owner can always edit
    if (template.created_by === userId) return true

    // Check if user has edit role/permission (would be implemented with RBAC)
    // For now, only owner can edit
    return false
  }

  async checkTemplateDeleteAccess(templateId: string, userId: string): Promise<boolean> {
    const template = await this.templateRepository.getTemplateById(templateId)
    if (!template) return false

    // Owner can always delete
    if (template.created_by === userId) return true

    // Check if user has delete role/permission (would be implemented with RBAC)
    // For now, only owner can delete
    return false
  }

  // Template Usage and Analytics

  async recordTemplateUsage(templateId: string, userId?: string): Promise<void> {
    await this.templateRepository.updateUsageStats(templateId)

    // Log usage event
    await this.logTemplateEvent('use', templateId, userId, {
      timestamp: new Date()
    })

    // Publish event
    await this.publishTemplateEvent('template.used', {
      templateId,
      userId,
      timestamp: new Date()
    })
  }

  async getTemplateStats(userId?: string): Promise<any> {
    return this.templateRepository.getTemplateStats(userId)
  }

  // Private Helper Methods

  private async validateTemplateData(templateData: CreateReportTemplateRequest, userId: string): Promise<void> {
    // Check user template quota
    if (this.config.maxTemplatesPerUser) {
      const userTemplates = await this.templateRepository.listTemplates({ 
        createdBy: userId, 
        limit: this.config.maxTemplatesPerUser + 1 
      })
      
      if (userTemplates.total >= this.config.maxTemplatesPerUser) {
        throw new TemplateError(
          `Maximum template limit reached (${this.config.maxTemplatesPerUser})`,
          { userId, limit: this.config.maxTemplatesPerUser }
        )
      }
    }

    // Validate slug
    await this.validateSlug(templateData.slug)

    // Validate parameters
    if (templateData.parameters && this.config.maxParametersPerTemplate) {
      if (templateData.parameters.length > this.config.maxParametersPerTemplate) {
        throw new TemplateError(
          `Maximum parameter limit exceeded (${this.config.maxParametersPerTemplate})`,
          { parameterCount: templateData.parameters.length }
        )
      }
    }

    // Validate template configuration
    this.validateTemplateConfig(templateData.templateConfig, templateData.type)
  }

  private async validateSlug(slug: string, excludeId?: string): Promise<void> {
    // Check slug format
    if (!this.config.allowedSlugCharacters?.test(slug)) {
      throw new TemplateError('Invalid slug format. Use only lowercase letters, numbers, hyphens, and underscores')
    }

    // Check reserved slugs
    if (this.config.reservedSlugs?.includes(slug)) {
      throw new TemplateError(`Slug '${slug}' is reserved and cannot be used`)
    }

    // Check uniqueness
    const exists = await this.templateRepository.checkSlugExists(slug, excludeId)
    if (exists) {
      throw new TemplateError(`Slug '${slug}' is already in use`)
    }
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    return this.templateRepository.generateUniqueSlug(baseSlug)
  }

  private validateTemplateConfig(config: any, type: ReportType): void {
    // Basic validation - would be expanded based on template types
    if (!config) {
      throw new TemplateError('Template configuration is required')
    }

    switch (type) {
      case 'table':
        if (!config.columns || !Array.isArray(config.columns)) {
          throw new TemplateError('Table templates must define columns')
        }
        break
      case 'chart':
        if (!config.chartType) {
          throw new TemplateError('Chart templates must specify chart type')
        }
        break
      // Add more validation for other types
    }
  }

  private shouldCreateNewVersion(existing: ReportTemplateRecord, updates: UpdateReportTemplateRequest): boolean {
    // Create new version for significant changes
    const significantFields = [
      'templateConfig', 
      'queryTemplate', 
      'dataTransform', 
      'type'
    ]

    return significantFields.some(field => field in updates)
  }

  private async createTemplateParameters(
    templateId: string, 
    parameters: Omit<ReportParameter, 'id' | 'templateId'>[]
  ): Promise<ReportParameter[]> {
    const parameterRecords = parameters.map((param, index) => ({
      name: param.name,
      label: param.label,
      description: param.description,
      type: param.type,
      input_type: param.inputType,
      is_required: param.isRequired,
      default_value: param.defaultValue ? JSON.stringify(param.defaultValue) : undefined,
      validation_rules: param.validationRules ? JSON.stringify(param.validationRules) : undefined,
      options: param.options ? JSON.stringify(param.options) : undefined,
      placeholder: param.placeholder,
      sort_order: param.sortOrder || index,
      is_visible: param.isVisible,
      is_filterable: param.isFilterable,
      group_name: param.groupName
    }))

    const createdParameters = await this.templateRepository.createParameters(templateId, parameterRecords)
    return createdParameters.map(param => this.mapParameterRecordToParameter(param))
  }

  private async isTemplateInUse(templateId: string): Promise<boolean> {
    // Check if template has recent instances, schedules, or shares
    // This would be implemented by checking related tables
    return false // Placeholder
  }

  private async enrichTemplateResponse(template: ReportTemplateRecord): Promise<ReportTemplateResponse> {
    // Get parameters
    const parameters = await this.getTemplateParameters(template.id)

    // Get basic analytics (you might want to cache this)
    const analytics = {
      totalViews: template.usage_count,
      totalGenerations: 0, // Would get from report_instances
      avgGenerationTime: 0, // Would calculate from instances
      lastUsed: template.last_used_at
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      slug: template.slug,
      type: template.type,
      format: template.format,
      templateConfig: typeof template.template_config === 'string' ? JSON.parse(template.template_config) : template.template_config,
      styleConfig: template.style_config ? (typeof template.style_config === 'string' ? JSON.parse(template.style_config) : template.style_config) : undefined,
      layoutConfig: template.layout_config ? (typeof template.layout_config === 'string' ? JSON.parse(template.layout_config) : template.layout_config) : undefined,
      dataSourceId: template.data_source_id,
      queryTemplate: template.query_template,
      dataTransform: template.data_transform ? (typeof template.data_transform === 'string' ? JSON.parse(template.data_transform) : template.data_transform) : undefined,
      isPublic: template.is_public,
      isActive: template.is_active,
      requiresAuth: template.requires_auth,
      cacheEnabled: template.cache_enabled,
      cacheDurationMinutes: template.cache_duration_minutes,
      accessLevel: template.access_level,
      allowedRoles: template.allowed_roles ? (typeof template.allowed_roles === 'string' ? JSON.parse(template.allowed_roles) : template.allowed_roles) : undefined,
      allowedUsers: template.allowed_users ? (typeof template.allowed_users === 'string' ? JSON.parse(template.allowed_users) : template.allowed_users) : undefined,
      version: template.version,
      parentTemplateId: template.parent_template_id,
      isCurrentVersion: template.is_current_version,
      createdBy: template.created_by,
      updatedBy: template.updated_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      lastUsedAt: template.last_used_at,
      usageCount: template.usage_count,
      parameters,
      analytics
    }
  }

  private mapParameterRecordToParameter(record: any): ReportParameter {
    return {
      id: record.id,
      templateId: record.template_id,
      name: record.name,
      label: record.label,
      description: record.description,
      type: record.type,
      inputType: record.input_type,
      isRequired: record.is_required,
      defaultValue: record.default_value ? (typeof record.default_value === 'string' ? JSON.parse(record.default_value) : record.default_value) : undefined,
      validationRules: record.validation_rules ? (typeof record.validation_rules === 'string' ? JSON.parse(record.validation_rules) : record.validation_rules) : undefined,
      options: record.options ? (typeof record.options === 'string' ? JSON.parse(record.options) : record.options) : undefined,
      placeholder: record.placeholder,
      sortOrder: record.sort_order,
      isVisible: record.is_visible,
      isFilterable: record.is_filterable,
      groupName: record.group_name
    }
  }

  private async logTemplateEvent(
    action: string, 
    templateId: string, 
    userId?: string, 
    metadata?: any
  ): Promise<void> {
    if (this.fastify?.auditLog) {
      await this.fastify.auditLog.log({
        action: `template.${action}`,
        resource: 'report_templates',
        resourceId: templateId,
        userId,
        details: metadata
      })
    }
  }

  private async publishTemplateEvent(eventType: string, data: any): Promise<void> {
    if (this.fastify?.eventBus) {
      await this.fastify.eventBus.publish(eventType, data)
    }
  }
}