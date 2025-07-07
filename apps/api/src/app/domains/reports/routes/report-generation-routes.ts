/**
 * Report Generation Routes
 * 
 * API routes for report generation and management operations
 */

import { FastifyInstance } from 'fastify'
import { ReportGenerationController } from '../controllers/report-generation-controller'
import {
  GenerateReportSchema,
  GeneratePublicReportQuerySchema,
  ValidateParametersSchema,
  ScheduleGenerationSchema,
  BatchGenerationSchema,
  GenerateAndExportSchema,
  GenerateReportResponseSchema,
  GenerateReportSuccessSchema,
  ReportInstanceSuccessSchema,
  ValidationSuccessSchema,
  GenerationStatusSuccessSchema,
  ScheduledGenerationSuccessSchema,
  BatchGenerationSuccessSchema,
  CancelGenerationSuccessSchema,
  GenerateAndExportSuccessSchema,
  GenerationErrorSchema
} from '../schemas/report-generation-schemas'

export default async function reportGenerationRoutes(fastify: FastifyInstance) {
  const controller = new ReportGenerationController(fastify.reportGenerationService)

  // Add schemas to fastify instance
  fastify.addSchema({
    $id: 'GenerateReportResponse',
    ...GenerateReportResponseSchema
  })

  // Report Generation Operations

  // Generate report
  fastify.route({
    method: 'POST',
    url: '/generate/:templateId',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:generate:own'])],
    schema: {
      description: 'Generate a report from template',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: GenerateReportSchema,
      response: {
        200: GenerateReportSuccessSchema,
        400: GenerationErrorSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.generateReport.bind(controller) as any
  })

  // Generate public report (URL-based access)
  fastify.route({
    method: 'GET',
    url: '/public/:templateId',
    schema: {
      description: 'Generate a public report with URL parameters',
      tags: ['Report Generation'],
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      querystring: GeneratePublicReportQuerySchema,
      response: {
        200: {
          oneOf: [
            { type: 'string', contentMediaType: 'text/html' },
            GenerateReportSuccessSchema
          ]
        },
        400: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.generatePublicReport.bind(controller) as any
  })

  // Get report instance
  fastify.route({
    method: 'GET',
    url: '/instances/:instanceId',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get report instance details',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', format: 'uuid' }
        },
        required: ['instanceId']
      },
      response: {
        200: ReportInstanceSuccessSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.getReportInstance.bind(controller) as any
  })

  // Regenerate report
  fastify.route({
    method: 'POST',
    url: '/instances/:instanceId/regenerate',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:generate:own'])],
    schema: {
      description: 'Regenerate an existing report instance',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', format: 'uuid' }
        },
        required: ['instanceId']
      },
      response: {
        200: GenerateReportSuccessSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.regenerateReport.bind(controller) as any
  })

  // Background Generation

  // Schedule report generation
  fastify.route({
    method: 'POST',
    url: '/schedule',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:schedule:own'])],
    schema: {
      description: 'Schedule background report generation',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      body: ScheduleGenerationSchema,
      response: {
        202: ScheduledGenerationSuccessSchema,
        400: GenerationErrorSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.scheduleGeneration.bind(controller) as any
  })

  // Batch generation
  fastify.route({
    method: 'POST',
    url: '/batch',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:generate:batch'])],
    schema: {
      description: 'Generate multiple reports in batch',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      body: BatchGenerationSchema,
      response: {
        202: BatchGenerationSuccessSchema,
        400: GenerationErrorSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.generateBatchReports.bind(controller) as any
  })

  // Report Preview and Validation

  // Preview report
  fastify.route({
    method: 'POST',
    url: '/preview/:templateId',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:generate:own'])],
    schema: {
      description: 'Generate a limited preview of the report',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: GenerateReportSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              allOf: [
                { $ref: 'GenerateReportResponse#' },
                {
                  type: 'object',
                  properties: {
                    preview: { type: 'boolean' },
                    limitedData: { type: 'boolean' }
                  }
                }
              ]
            }
          }
        },
        400: GenerationErrorSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.previewReport.bind(controller) as any
  })

  // Validate parameters
  fastify.route({
    method: 'POST',
    url: '/validate/:templateId',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Validate report parameters',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: ValidateParametersSchema,
      response: {
        200: ValidationSuccessSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.validateParameters.bind(controller) as any
  })

  // Report Status and Progress

  // Get generation status
  fastify.route({
    method: 'GET',
    url: '/status/:correlationId',
    // Public endpoint - no authentication required
    schema: {
      description: 'Get generation status by correlation ID',
      tags: ['Report Generation'],
      params: {
        type: 'object',
        properties: {
          correlationId: { type: 'string' }
        },
        required: ['correlationId']
      },
      response: {
        200: GenerationStatusSuccessSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.getGenerationStatus.bind(controller) as any
  })

  // Cancel generation
  fastify.route({
    method: 'DELETE',
    url: '/status/:correlationId',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Cancel ongoing report generation',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          correlationId: { type: 'string' }
        },
        required: ['correlationId']
      },
      response: {
        200: CancelGenerationSuccessSchema,
        401: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.cancelGeneration.bind(controller) as any
  })

  // Report Export Integration

  // Generate and export
  fastify.route({
    method: 'POST',
    url: '/generate-export/:templateId',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:export:own'])],
    schema: {
      description: 'Generate report and export to specified format',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        },
        required: ['templateId']
      },
      body: GenerateAndExportSchema,
      response: {
        200: GenerateAndExportSuccessSchema,
        400: GenerationErrorSchema,
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: controller.generateAndExport.bind(controller) as any
  })

  // Report Templates with Dynamic Routing

  // Generate report by slug (public)
  fastify.route({
    method: 'GET',
    url: '/slug/:slug',
    schema: {
      description: 'Generate report by template slug with URL parameters',
      tags: ['Report Generation'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string', pattern: '^[a-z0-9-_]+$' }
        },
        required: ['slug']
      },
      querystring: GeneratePublicReportQuerySchema,
      response: {
        200: {
          oneOf: [
            { type: 'string', contentMediaType: 'text/html' },
            GenerateReportSuccessSchema
          ]
        },
        400: GenerationErrorSchema,
        403: GenerationErrorSchema,
        404: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: async (request, reply) => {
      // This would resolve slug to templateId and then call generatePublicReport
      // For now, delegate to the controller with slug resolution
      const { slug } = request.params as { slug: string }
      
      // Get template by slug (would need to add this to the generation service)
      // For now, return an error indicating implementation needed
      reply.code(501).send({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: `Slug-based generation not implemented yet for slug: ${slug}`
        }
      })
    }
  })

  // Health Check and Monitoring

  // Get generation queue status
  fastify.route({
    method: 'GET',
    url: '/queue/status',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:monitor:queue'])],
    schema: {
      description: 'Get background generation queue status',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                waiting: { type: 'number' },
                active: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
                delayed: { type: 'number' },
                paused: { type: 'boolean' }
              }
            }
          }
        },
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: async (request, reply) => {
      // This would get queue status from background jobs service
      reply.send({
        success: true,
        data: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false
        }
      })
    }
  })

  // Get generation metrics
  fastify.route({
    method: 'GET',
    url: '/metrics',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:view:metrics'])],
    schema: {
      description: 'Get report generation metrics and analytics',
      tags: ['Report Generation'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            default: 'day'
          },
          templateId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalGenerations: { type: 'number' },
                successfulGenerations: { type: 'number' },
                failedGenerations: { type: 'number' },
                averageGenerationTime: { type: 'number' },
                cacheHitRate: { type: 'number' },
                popularTemplates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      templateId: { type: 'string', format: 'uuid' },
                      templateName: { type: 'string' },
                      generationCount: { type: 'number' },
                      averageTime: { type: 'number' }
                    }
                  }
                },
                errorsByType: { type: 'object' },
                generationsByFormat: { type: 'object' },
                generationsByTimeOfDay: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      hour: { type: 'number' },
                      count: { type: 'number' }
                    }
                  }
                },
                recentActivity: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      generations: { type: 'number' },
                      errors: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        401: GenerationErrorSchema,
        403: GenerationErrorSchema,
        500: GenerationErrorSchema
      }
    },
    handler: async (request, reply) => {
      // This would get metrics from analytics service
      reply.send({
        success: true,
        data: {
          totalGenerations: 0,
          successfulGenerations: 0,
          failedGenerations: 0,
          averageGenerationTime: 0,
          cacheHitRate: 0,
          popularTemplates: [],
          errorsByType: {},
          generationsByFormat: {},
          generationsByTimeOfDay: [],
          recentActivity: []
        }
      })
    }
  })

  fastify.log.info('✅ Report generation routes loaded')
}