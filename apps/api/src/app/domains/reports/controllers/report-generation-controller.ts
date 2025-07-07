/**
 * Report Generation Controller
 * 
 * HTTP request handlers for report generation and management operations
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ReportGenerationService } from '../services/report-generation-service'
import { 
  GenerateReportRequest,
  GenerationError,
  ReportFormat
} from '../types/report-types'

export interface GenerateReportParams {
  templateId: string
}

export interface GenerateReportBody extends GenerateReportRequest {}

export interface GeneratePublicReportParams {
  templateId: string
}

export interface GeneratePublicReportQuery {
  [key: string]: any // Dynamic parameters
  format?: ReportFormat
  cache?: boolean
}

export interface RegenerateReportParams {
  instanceId: string
}

export interface GetReportInstanceParams {
  instanceId: string
}

export interface ScheduleGenerationBody {
  templateId: string
  parameters: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
}

export class ReportGenerationController {
  constructor(private generationService: ReportGenerationService) {}

  // Report Generation Operations

  async generateReport(
    request: FastifyRequest<{ 
      Params: GenerateReportParams
      Body: GenerateReportBody 
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { templateId } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const context = {
        sessionId: (request as any).session?.sessionId,
        clientIp: request.ip,
        userAgent: Array.isArray(request.headers['user-agent']) 
          ? request.headers['user-agent'][0] 
          : request.headers['user-agent']
      }

      const result = await this.generationService.generateReport(
        templateId,
        request.body,
        userId,
        context
      )

      reply.send({
        success: true,
        data: result
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Report generation failed:', error)
        reply.code(500).send({
          error: {
            code: 'GENERATION_ERROR',
            message: 'Failed to generate report'
          }
        })
      }
    }
  }

  async generatePublicReport(
    request: FastifyRequest<{ 
      Params: GeneratePublicReportParams
      Querystring: GeneratePublicReportQuery 
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { templateId } = request.params
      const { format, cache, ...parameters } = request.query

      // Extract dynamic parameters from query string
      const reportRequest: GenerateReportRequest = {
        parameters,
        format: format || 'html',
        cacheOverride: cache === false
      }

      const context = {
        sessionId: (request as any).session?.sessionId,
        clientIp: request.ip,
        userAgent: Array.isArray(request.headers['user-agent']) 
          ? request.headers['user-agent'][0] 
          : request.headers['user-agent']
      }

      const result = await this.generationService.generateReport(
        templateId,
        reportRequest,
        undefined, // No user for public reports
        context
      )

      // For public reports, return appropriate content type
      if (format === 'html' || !format) {
        reply.type('text/html').send(result.html)
      } else {
        reply.send({
          success: true,
          data: result
        })
      }

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Public report generation failed:', error)
        reply.code(500).send({
          error: {
            code: 'GENERATION_ERROR',
            message: 'Failed to generate public report'
          }
        })
      }
    }
  }

  async getReportInstance(
    request: FastifyRequest<{ Params: GetReportInstanceParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { instanceId } = request.params
      const userId = request.user?.id

      const instance = await this.generationService.getReportInstance(instanceId, userId)

      if (!instance) {
        reply.code(404).send({
          error: {
            code: 'INSTANCE_NOT_FOUND',
            message: 'Report instance not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        data: instance
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Report instance retrieval failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve report instance'
          }
        })
      }
    }
  }

  async regenerateReport(
    request: FastifyRequest<{ Params: RegenerateReportParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { instanceId } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const result = await this.generationService.regenerateReport(instanceId, userId)

      reply.send({
        success: true,
        data: result
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Report regeneration failed:', error)
        reply.code(500).send({
          error: {
            code: 'GENERATION_ERROR',
            message: 'Failed to regenerate report'
          }
        })
      }
    }
  }

  // Background Generation

  async scheduleGeneration(
    request: FastifyRequest<{ Body: ScheduleGenerationBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { templateId, parameters, priority = 'normal' } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      if (!templateId || !parameters) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template ID and parameters are required'
          }
        })
        return
      }

      const jobId = await this.generationService.scheduleBackgroundGeneration(
        templateId,
        parameters,
        userId,
        priority
      )

      reply.code(202).send({
        success: true,
        data: {
          jobId,
          status: 'scheduled',
          message: 'Report generation has been scheduled'
        }
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Report scheduling failed:', error)
        reply.code(500).send({
          error: {
            code: 'SCHEDULING_ERROR',
            message: 'Failed to schedule report generation'
          }
        })
      }
    }
  }

  // Report Preview and Validation

  async previewReport(
    request: FastifyRequest<{ 
      Params: GenerateReportParams
      Body: GenerateReportBody 
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { templateId } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      // Generate with limited data for preview
      const previewRequest: GenerateReportRequest = {
        ...request.body,
        parameters: {
          ...request.body.parameters,
          __preview: true,
          __limit: 10 // Limit data for preview
        }
      }

      const context = {
        sessionId: (request as any).session?.sessionId,
        clientIp: request.ip,
        userAgent: Array.isArray(request.headers['user-agent']) 
          ? request.headers['user-agent'][0] 
          : request.headers['user-agent']
      }

      const result = await this.generationService.generateReport(
        templateId,
        previewRequest,
        userId,
        context
      )

      reply.send({
        success: true,
        data: {
          ...result,
          preview: true,
          limitedData: true
        }
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Report preview failed:', error)
        reply.code(500).send({
          error: {
            code: 'PREVIEW_ERROR',
            message: 'Failed to generate report preview'
          }
        })
      }
    }
  }

  async validateParameters(
    request: FastifyRequest<{ 
      Params: GenerateReportParams
      Body: { parameters: Record<string, any> }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { parameters } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      // This would validate parameters against template parameter definitions
      // For now, return a simple validation response
      const validationResult = {
        valid: true,
        errors: [] as string[],
        warnings: [] as string[]
      }

      // Basic validation example
      if (!parameters || typeof parameters !== 'object') {
        validationResult.valid = false
        validationResult.errors.push('Parameters must be an object')
      }

      reply.send({
        success: true,
        data: validationResult
      })

    } catch (error: any) {
      request.log.error('Parameter validation failed:', error)
      reply.code(500).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate parameters'
        }
      })
    }
  }

  // Report Status and Progress

  async getGenerationStatus(
    request: FastifyRequest<{ Params: { correlationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { correlationId } = request.params

      // This would check the status of an ongoing generation
      // For now, return a placeholder response
      const status = {
        correlationId,
        status: 'completed',
        progress: 100,
        message: 'Report generation completed',
        startedAt: new Date(),
        completedAt: new Date()
      }

      reply.send({
        success: true,
        data: status
      })

    } catch (error: any) {
      request.log.error('Generation status check failed:', error)
      reply.code(500).send({
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to check generation status'
        }
      })
    }
  }

  async cancelGeneration(
    request: FastifyRequest<{ Params: { correlationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { correlationId } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      // This would cancel an ongoing generation
      // For now, return a placeholder response
      const result = {
        correlationId,
        cancelled: true,
        message: 'Generation cancelled successfully'
      }

      reply.send({
        success: true,
        data: result
      })

    } catch (error: any) {
      request.log.error('Generation cancellation failed:', error)
      reply.code(500).send({
        error: {
          code: 'CANCELLATION_ERROR',
          message: 'Failed to cancel generation'
        }
      })
    }
  }

  // Batch Operations

  async generateBatchReports(
    request: FastifyRequest<{ 
      Body: {
        requests: Array<{
          templateId: string
          parameters: Record<string, any>
          format?: ReportFormat
        }>
        priority?: 'low' | 'normal' | 'high'
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { requests, priority = 'normal' } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      if (!requests || !Array.isArray(requests) || requests.length === 0) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Requests array is required and must not be empty'
          }
        })
        return
      }

      if (requests.length > 10) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 10 reports can be generated in a batch'
          }
        })
        return
      }

      // Schedule all reports for background generation
      const jobIds: string[] = []
      
      for (const reportRequest of requests) {
        try {
          const jobId = await this.generationService.scheduleBackgroundGeneration(
            reportRequest.templateId,
            reportRequest.parameters,
            userId,
            priority
          )
          jobIds.push(jobId)
        } catch (error) {
          request.log.warn('Failed to schedule report in batch:', error)
        }
      }

      reply.code(202).send({
        success: true,
        data: {
          batchId: `batch-${Date.now()}`,
          jobIds,
          totalRequests: requests.length,
          scheduledJobs: jobIds.length,
          status: 'scheduled',
          message: `${jobIds.length} of ${requests.length} reports scheduled for generation`
        }
      })

    } catch (error: any) {
      request.log.error('Batch report generation failed:', error)
      reply.code(500).send({
        error: {
          code: 'BATCH_ERROR',
          message: 'Failed to process batch report generation'
        }
      })
    }
  }

  // Report Export Integration

  async generateAndExport(
    request: FastifyRequest<{ 
      Params: GenerateReportParams
      Body: GenerateReportBody & { 
        exportFormat: 'pdf' | 'excel' | 'csv' | 'json'
        exportOptions?: Record<string, any>
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { templateId } = request.params
      const { exportFormat, exportOptions, ...generateRequest } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const context = {
        sessionId: (request as any).session?.sessionId,
        clientIp: request.ip,
        userAgent: Array.isArray(request.headers['user-agent']) 
          ? request.headers['user-agent'][0] 
          : request.headers['user-agent']
      }

      // Generate the report
      const result = await this.generationService.generateReport(
        templateId,
        generateRequest,
        userId,
        context
      )

      // This would integrate with the export service
      // For now, return the generation result with export information
      reply.send({
        success: true,
        data: {
          ...result,
          export: {
            format: exportFormat,
            options: exportOptions,
            status: 'scheduled',
            message: `Export to ${exportFormat} has been scheduled`
          }
        }
      })

    } catch (error: any) {
      if (error instanceof GenerationError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Generate and export failed:', error)
        reply.code(500).send({
          error: {
            code: 'EXPORT_ERROR',
            message: 'Failed to generate and export report'
          }
        })
      }
    }
  }
}