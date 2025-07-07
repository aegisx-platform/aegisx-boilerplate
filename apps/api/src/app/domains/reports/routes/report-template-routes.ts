/**
 * Report Template Routes
 * 
 * API routes for report template management operations
 */

import { FastifyInstance } from 'fastify'
import { ReportTemplateController } from '../controllers/report-template-controller'
import {
  CreateReportTemplateSchema,
  UpdateReportTemplateSchema,
  DuplicateTemplateSchema,
  TemplateListQuerySchema,
  TemplateSearchQuerySchema,
  ReportTemplateResponseSchema,
  TemplateListResponseSchema,
  TemplateStatsResponseSchema,
  TemplateErrorSchema,
  TemplateSuccessResponseSchema
} from '../schemas/report-template-schemas'

export default async function reportTemplateRoutes(fastify: FastifyInstance) {
  const controller = new ReportTemplateController(fastify.reportTemplateService)

  // Template CRUD Operations

  // Create template
  fastify.route({
    method: 'POST',
    url: '/templates',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:create:template'])],
    schema: {
      description: 'Create a new report template',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      body: CreateReportTemplateSchema,
      response: {
        201: TemplateSuccessResponseSchema,
        400: TemplateErrorSchema,
        401: TemplateErrorSchema,
        403: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.createTemplate.bind(controller) as any
  })

  // Get template by ID
  fastify.route({
    method: 'GET',
    url: '/templates/:id',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get template by ID',
      tags: ['Report Templates'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: TemplateSuccessResponseSchema,
        404: TemplateErrorSchema,
        403: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getTemplate.bind(controller) as any
  })

  // Get template by slug
  fastify.route({
    method: 'GET',
    url: '/templates/slug/:slug',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get template by slug',
      tags: ['Report Templates'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string', pattern: '^[a-z0-9-_]+$' }
        },
        required: ['slug']
      },
      response: {
        200: TemplateSuccessResponseSchema,
        404: TemplateErrorSchema,
        403: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getTemplateBySlug.bind(controller) as any
  })

  // Update template
  fastify.route({
    method: 'PUT',
    url: '/templates/:id',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:update:template'])],
    schema: {
      description: 'Update a report template',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: UpdateReportTemplateSchema,
      response: {
        200: TemplateSuccessResponseSchema,
        400: TemplateErrorSchema,
        401: TemplateErrorSchema,
        403: TemplateErrorSchema,
        404: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.updateTemplate.bind(controller) as any
  })

  // Delete template
  fastify.route({
    method: 'DELETE',
    url: '/templates/:id',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:delete:template'])],
    schema: {
      description: 'Delete a report template',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          hard: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: TemplateErrorSchema,
        403: TemplateErrorSchema,
        404: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.deleteTemplate.bind(controller) as any
  })

  // Duplicate template
  fastify.route({
    method: 'POST',
    url: '/templates/:id/duplicate',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:create:template'])],
    schema: {
      description: 'Duplicate a report template',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: DuplicateTemplateSchema,
      response: {
        201: TemplateSuccessResponseSchema,
        400: TemplateErrorSchema,
        401: TemplateErrorSchema,
        403: TemplateErrorSchema,
        404: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.duplicateTemplate.bind(controller) as any
  })

  // Template Listing and Search

  // List templates
  fastify.route({
    method: 'GET',
    url: '/templates',
    // Public endpoint - no authentication required
    schema: {
      description: 'List report templates with filtering and pagination',
      tags: ['Report Templates'],
      querystring: TemplateListQuerySchema,
      response: {
        200: TemplateListResponseSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.listTemplates.bind(controller) as any
  })

  // Search templates
  fastify.route({
    method: 'GET',
    url: '/templates/search',
    // Public endpoint - no authentication required
    schema: {
      description: 'Search report templates',
      tags: ['Report Templates'],
      querystring: TemplateSearchQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: ReportTemplateResponseSchema },
            query: { type: 'string' },
            count: { type: 'number' }
          }
        },
        400: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.searchTemplates.bind(controller) as any
  })

  // Get popular templates
  fastify.route({
    method: 'GET',
    url: '/templates/popular',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get popular report templates',
      tags: ['Report Templates'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: ReportTemplateResponseSchema }
          }
        },
        500: TemplateErrorSchema
      }
    },
    handler: controller.getPopularTemplates.bind(controller) as any
  })

  // Get recent templates
  fastify.route({
    method: 'GET',
    url: '/templates/recent',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get recently created templates',
      tags: ['Report Templates'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: ReportTemplateResponseSchema }
          }
        },
        500: TemplateErrorSchema
      }
    },
    handler: controller.getRecentTemplates.bind(controller) as any
  })

  // Template Parameters

  // Get template parameters
  fastify.route({
    method: 'GET',
    url: '/templates/:id/parameters',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get template parameters',
      tags: ['Report Templates'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  templateId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  label: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string' },
                  inputType: { type: 'string' },
                  isRequired: { type: 'boolean' },
                  defaultValue: {},
                  validationRules: {},
                  options: { type: 'array' },
                  placeholder: { type: 'string' },
                  sortOrder: { type: 'number' },
                  isVisible: { type: 'boolean' },
                  isFilterable: { type: 'boolean' },
                  groupName: { type: 'string' }
                }
              }
            }
          }
        },
        404: TemplateErrorSchema,
        403: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getTemplateParameters.bind(controller) as any
  })

  // Template Versions

  // Get template versions
  fastify.route({
    method: 'GET',
    url: '/templates/:id/versions',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get template versions',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: ReportTemplateResponseSchema }
          }
        },
        401: TemplateErrorSchema,
        403: TemplateErrorSchema,
        404: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getTemplateVersions.bind(controller) as any
  })

  // Get current version
  fastify.route({
    method: 'GET',
    url: '/templates/:id/current-version',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get current version of template',
      tags: ['Report Templates'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: TemplateSuccessResponseSchema,
        404: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getCurrentVersion.bind(controller) as any
  })

  // Analytics and Statistics

  // Get template statistics
  fastify.route({
    method: 'GET',
    url: '/templates/stats',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get template statistics',
      tags: ['Report Templates'],
      response: {
        200: TemplateStatsResponseSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.getTemplateStats.bind(controller) as any
  })

  // Template Access Control

  // Check template access
  fastify.route({
    method: 'GET',
    url: '/templates/:id/access',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Check user access to template',
      tags: ['Report Templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                templateId: { type: 'string', format: 'uuid' },
                hasAccess: { type: 'boolean' }
              }
            }
          }
        },
        401: TemplateErrorSchema,
        500: TemplateErrorSchema
      }
    },
    handler: controller.checkTemplateAccess.bind(controller) as any
  })

  fastify.log.info('✅ Report template routes loaded')
}