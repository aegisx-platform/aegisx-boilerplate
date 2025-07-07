/**
 * Report Template Controller
 * 
 * HTTP request handlers for report template management operations
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ReportTemplateService } from '../services/report-template-service'
import { 
  CreateReportTemplateRequest,
  UpdateReportTemplateRequest,
  TemplateError,
  ReportType,
  ReportFormat,
  AccessLevel
} from '../types/report-types'

export interface TemplateListQuery {
  type?: ReportType
  format?: ReportFormat
  accessLevel?: AccessLevel
  isActive?: boolean
  isPublic?: boolean
  dataSourceId?: string
  search?: string
  createdBy?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  includeParameters?: boolean
}

export interface DuplicateTemplateBody {
  name: string
  slug: string
}

export class ReportTemplateController {
  constructor(private templateService: ReportTemplateService) {}

  // Template CRUD Operations

  async createTemplate(
    request: FastifyRequest<{ Body: CreateReportTemplateRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id
      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const template = await this.templateService.createTemplate(request.body, userId)

      reply.code(201).send({
        success: true,
        data: template
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template creation failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create template'
          }
        })
      }
    }
  }

  async getTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      const template = await this.templateService.getTemplate(id, userId)
      
      if (!template) {
        reply.code(404).send({
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        data: template
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template retrieval failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve template'
          }
        })
      }
    }
  }

  async getTemplateBySlug(
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { slug } = request.params
      const userId = request.user?.id

      const template = await this.templateService.getTemplateBySlug(slug, userId)
      
      if (!template) {
        reply.code(404).send({
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        data: template
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template retrieval by slug failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve template'
          }
        })
      }
    }
  }

  async updateTemplate(
    request: FastifyRequest<{ 
      Params: { id: string }
      Body: UpdateReportTemplateRequest 
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const template = await this.templateService.updateTemplate(id, request.body, userId)

      reply.send({
        success: true,
        data: template
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template update failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update template'
          }
        })
      }
    }
  }

  async deleteTemplate(
    request: FastifyRequest<{ 
      Params: { id: string }
      Querystring: { hard?: boolean }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const { hard = false } = request.query
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const success = await this.templateService.deleteTemplate(id, userId, hard)

      if (!success) {
        reply.code(404).send({
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        message: `Template ${hard ? 'permanently deleted' : 'deactivated'} successfully`
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template deletion failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete template'
          }
        })
      }
    }
  }

  async duplicateTemplate(
    request: FastifyRequest<{ 
      Params: { id: string }
      Body: DuplicateTemplateBody 
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const { name, slug } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      if (!name || !slug) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and slug are required for duplication'
          }
        })
        return
      }

      const duplicatedTemplate = await this.templateService.duplicateTemplate(
        id, 
        name, 
        slug, 
        userId
      )

      reply.code(201).send({
        success: true,
        data: duplicatedTemplate
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template duplication failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to duplicate template'
          }
        })
      }
    }
  }

  // Template Listing and Search

  async listTemplates(
    request: FastifyRequest<{ Querystring: TemplateListQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id
      const query = request.query

      // Parse pagination
      const page = Math.max(1, query.page || 1)
      const limit = Math.min(100, Math.max(1, query.limit || 50))
      const offset = (page - 1) * limit

      // Build options
      const options = {
        type: query.type,
        format: query.format,
        accessLevel: query.accessLevel,
        isActive: query.isActive,
        isPublic: query.isPublic,
        dataSourceId: query.dataSourceId,
        search: query.search,
        createdBy: query.createdBy,
        limit,
        offset,
        sortBy: query.sortBy as 'name' | 'created_at' | 'updated_at' | 'last_used_at' | 'usage_count' | undefined,
        sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
        includeParameters: query.includeParameters
      }

      const result = await this.templateService.listTemplates(options, userId)

      reply.send({
        success: true,
        data: result.templates,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / result.limit)
        }
      })
    } catch (error: any) {
      request.log.error('Template listing failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list templates'
        }
      })
    }
  }

  async searchTemplates(
    request: FastifyRequest<{ 
      Querystring: { q: string } & Partial<TemplateListQuery>
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { q: query, ...options } = request.query
      const userId = request.user?.id

      if (!query || query.trim().length < 2) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query must be at least 2 characters long'
          }
        })
        return
      }

      const typedOptions = {
        ...options,
        sortBy: options.sortBy as 'name' | 'created_at' | 'updated_at' | 'last_used_at' | 'usage_count' | undefined,
        sortOrder: options.sortOrder as 'asc' | 'desc' | undefined
      }
      const templates = await this.templateService.searchTemplates(query, userId, typedOptions)

      reply.send({
        success: true,
        data: templates,
        query: query,
        count: templates.length
      })
    } catch (error: any) {
      request.log.error('Template search failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search templates'
        }
      })
    }
  }

  async getPopularTemplates(
    request: FastifyRequest<{ Querystring: { limit?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { limit = 10 } = request.query
      const userId = request.user?.id

      const templates = await this.templateService.getPopularTemplates(
        Math.min(50, Math.max(1, limit)), 
        userId
      )

      reply.send({
        success: true,
        data: templates
      })
    } catch (error: any) {
      request.log.error('Popular templates retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve popular templates'
        }
      })
    }
  }

  async getRecentTemplates(
    request: FastifyRequest<{ Querystring: { limit?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { limit = 10 } = request.query
      const userId = request.user?.id

      const templates = await this.templateService.getRecentTemplates(
        Math.min(50, Math.max(1, limit)), 
        userId
      )

      reply.send({
        success: true,
        data: templates
      })
    } catch (error: any) {
      request.log.error('Recent templates retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve recent templates'
        }
      })
    }
  }

  // Template Parameters

  async getTemplateParameters(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      // Check template access first
      const template = await this.templateService.getTemplate(id, userId)
      if (!template) {
        reply.code(404).send({
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        })
        return
      }

      const parameters = await this.templateService.getTemplateParameters(id)

      reply.send({
        success: true,
        data: parameters
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template parameters retrieval failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve template parameters'
          }
        })
      }
    }
  }

  // Template Versions

  async getTemplateVersions(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      const versions = await this.templateService.getTemplateVersions(id, userId)

      reply.send({
        success: true,
        data: versions
      })
    } catch (error: any) {
      if (error instanceof TemplateError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Template versions retrieval failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve template versions'
          }
        })
      }
    }
  }

  async getCurrentVersion(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params

      const currentVersion = await this.templateService.getCurrentVersion(id)

      if (!currentVersion) {
        reply.code(404).send({
          error: {
            code: 'VERSION_NOT_FOUND',
            message: 'Current version not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        data: currentVersion
      })
    } catch (error: any) {
      request.log.error('Current version retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve current version'
        }
      })
    }
  }

  // Analytics and Statistics

  async getTemplateStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id

      const stats = await this.templateService.getTemplateStats(userId)

      reply.send({
        success: true,
        data: stats
      })
    } catch (error: any) {
      request.log.error('Template stats retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve template statistics'
        }
      })
    }
  }

  // Template Access Control

  async checkTemplateAccess(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const hasAccess = await this.templateService.checkTemplateAccess(id, userId)

      reply.send({
        success: true,
        data: {
          templateId: id,
          hasAccess
        }
      })
    } catch (error: any) {
      request.log.error('Template access check failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check template access'
        }
      })
    }
  }
}