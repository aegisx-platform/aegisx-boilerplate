/**
 * Report Generation Validation Schemas
 * 
 * TypeBox schemas for report generation request/response validation
 */

import { Type, Static } from '@sinclair/typebox'
import { ReportFormatSchema } from './report-template-schemas'

// Generation status enum
export const GenerationStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('generating'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cached')
])

// Export status enum
export const ExportStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('processing'),
  Type.Literal('completed'),
  Type.Literal('failed')
])

// Export format enum
export const ExportFormatSchema = Type.Union([
  Type.Literal('pdf'),
  Type.Literal('excel'),
  Type.Literal('csv'),
  Type.Literal('json'),
  Type.Literal('png'),
  Type.Literal('jpeg')
])

// Request schemas
export const GenerateReportSchema = Type.Object({
  parameters: Type.Optional(Type.Record(Type.String(), Type.Any())),
  format: Type.Optional(ReportFormatSchema),
  cacheOverride: Type.Optional(Type.Boolean()),
  correlationId: Type.Optional(Type.String({ format: 'uuid' }))
})

export const GeneratePublicReportQuerySchema = Type.Object({
  format: Type.Optional(ReportFormatSchema),
  cache: Type.Optional(Type.Boolean())
}, {
  additionalProperties: true // Allow dynamic parameters
})

export const ValidateParametersSchema = Type.Object({
  parameters: Type.Record(Type.String(), Type.Any())
})

export const ScheduleGenerationSchema = Type.Object({
  templateId: Type.String({ format: 'uuid' }),
  parameters: Type.Record(Type.String(), Type.Any()),
  priority: Type.Optional(Type.Union([
    Type.Literal('low'),
    Type.Literal('normal'),
    Type.Literal('high')
  ]))
})

export const BatchGenerationRequestSchema = Type.Object({
  templateId: Type.String({ format: 'uuid' }),
  parameters: Type.Record(Type.String(), Type.Any()),
  format: Type.Optional(ReportFormatSchema)
})

export const BatchGenerationSchema = Type.Object({
  requests: Type.Array(BatchGenerationRequestSchema, { minItems: 1, maxItems: 10 }),
  priority: Type.Optional(Type.Union([
    Type.Literal('low'),
    Type.Literal('normal'),
    Type.Literal('high')
  ]))
})

export const GenerateAndExportSchema = Type.Intersect([
  GenerateReportSchema,
  Type.Object({
    exportFormat: ExportFormatSchema,
    exportOptions: Type.Optional(Type.Object({
      quality: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
      compression: Type.Optional(Type.Boolean()),
      password: Type.Optional(Type.String()),
      metadata: Type.Optional(Type.Boolean()),
      watermark: Type.Optional(Type.Object({
        text: Type.Optional(Type.String()),
        image: Type.Optional(Type.String()),
        opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
        position: Type.Optional(Type.Union([
          Type.Literal('center'),
          Type.Literal('top-left'),
          Type.Literal('top-right'),
          Type.Literal('bottom-left'),
          Type.Literal('bottom-right')
        ])),
        rotation: Type.Optional(Type.Number({ minimum: -360, maximum: 360 }))
      }))
    }))
  })
])

// Report instance schemas
export const ReportInstanceSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  templateId: Type.String({ format: 'uuid' }),
  parameters: Type.Record(Type.String(), Type.Any()),
  generatedData: Type.Optional(Type.Any()),
  generatedHtml: Type.Optional(Type.String()),
  dataRowCount: Type.Optional(Type.Number()),
  dataSizeBytes: Type.Optional(Type.Number()),
  status: GenerationStatusSchema,
  errorMessage: Type.Optional(Type.String()),
  errorDetails: Type.Optional(Type.Any()),
  generationDurationMs: Type.Optional(Type.Number()),
  isCached: Type.Boolean(),
  cacheExpiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  cacheKey: Type.Optional(Type.String()),
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  clientIp: Type.Optional(Type.String()),
  userAgent: Type.Optional(Type.String()),
  sessionId: Type.Optional(Type.String()),
  correlationId: Type.Optional(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  completedAt: Type.Optional(Type.String({ format: 'date-time' })),
  lastAccessedAt: Type.Optional(Type.String({ format: 'date-time' })),
  accessCount: Type.Number()
})

export const ReportExportSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  instanceId: Type.String({ format: 'uuid' }),
  templateId: Type.String({ format: 'uuid' }),
  format: ExportFormatSchema,
  exportConfig: Type.Optional(Type.Any()),
  fileSizeBytes: Type.Optional(Type.Number()),
  fileName: Type.Optional(Type.String()),
  storageFileId: Type.Optional(Type.String()),
  downloadUrl: Type.Optional(Type.String()),
  urlExpiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  status: ExportStatusSchema,
  errorMessage: Type.Optional(Type.String()),
  exportDurationMs: Type.Optional(Type.Number()),
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.String({ format: 'date-time' }),
  completedAt: Type.Optional(Type.String({ format: 'date-time' })),
  lastDownloadedAt: Type.Optional(Type.String({ format: 'date-time' })),
  downloadCount: Type.Number()
})

// Response schemas
export const GenerateReportResponseSchema = Type.Object({
  instance: ReportInstanceSchema,
  html: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
  cached: Type.Boolean(),
  generationTime: Type.Number()
})

export const ReportInstanceResponseSchema = Type.Object({
  instance: ReportInstanceSchema,
  template: Type.Optional(Type.Any()), // Would reference ReportTemplateResponseSchema
  exports: Type.Optional(Type.Array(ReportExportSchema))
})

export const GenerationStatusResponseSchema = Type.Object({
  correlationId: Type.String(),
  status: GenerationStatusSchema,
  progress: Type.Number({ minimum: 0, maximum: 100 }),
  message: Type.Optional(Type.String()),
  startedAt: Type.Optional(Type.String({ format: 'date-time' })),
  completedAt: Type.Optional(Type.String({ format: 'date-time' })),
  estimatedCompletion: Type.Optional(Type.String({ format: 'date-time' })),
  currentStep: Type.Optional(Type.String()),
  totalSteps: Type.Optional(Type.Number()),
  errors: Type.Optional(Type.Array(Type.String()))
})

export const ValidationResultSchema = Type.Object({
  valid: Type.Boolean(),
  errors: Type.Array(Type.String()),
  warnings: Type.Array(Type.String())
})

export const ScheduledGenerationResponseSchema = Type.Object({
  jobId: Type.String({ format: 'uuid' }),
  status: Type.Literal('scheduled'),
  message: Type.String(),
  estimatedStartTime: Type.Optional(Type.String({ format: 'date-time' })),
  priority: Type.Union([
    Type.Literal('low'),
    Type.Literal('normal'),
    Type.Literal('high')
  ])
})

export const BatchGenerationResponseSchema = Type.Object({
  batchId: Type.String(),
  jobIds: Type.Array(Type.String({ format: 'uuid' })),
  totalRequests: Type.Number(),
  scheduledJobs: Type.Number(),
  status: Type.Literal('scheduled'),
  message: Type.String(),
  estimatedCompletion: Type.Optional(Type.String({ format: 'date-time' }))
})

export const CancelGenerationResponseSchema = Type.Object({
  correlationId: Type.String(),
  cancelled: Type.Boolean(),
  message: Type.String()
})

export const GenerateAndExportResponseSchema = Type.Object({
  generation: GenerateReportResponseSchema,
  export: Type.Object({
    format: ExportFormatSchema,
    options: Type.Optional(Type.Any()),
    status: Type.Union([
      Type.Literal('scheduled'),
      Type.Literal('processing'),
      Type.Literal('completed'),
      Type.Literal('failed')
    ]),
    message: Type.String(),
    exportId: Type.Optional(Type.String({ format: 'uuid' })),
    downloadUrl: Type.Optional(Type.String()),
    expiresAt: Type.Optional(Type.String({ format: 'date-time' }))
  })
})

// Success response wrappers
export const GenerateReportSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: GenerateReportResponseSchema
})

export const ReportInstanceSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: ReportInstanceResponseSchema
})

export const ValidationSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: ValidationResultSchema
})

export const GenerationStatusSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: GenerationStatusResponseSchema
})

export const ScheduledGenerationSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: ScheduledGenerationResponseSchema
})

export const BatchGenerationSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: BatchGenerationResponseSchema
})

export const CancelGenerationSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: CancelGenerationResponseSchema
})

export const GenerateAndExportSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: GenerateAndExportResponseSchema
})

// Error schemas
export const GenerationErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any()),
    correlationId: Type.Optional(Type.String()),
    templateId: Type.Optional(Type.String({ format: 'uuid' })),
    step: Type.Optional(Type.String())
  })
})

// Parameter validation schemas
export const ParameterValueSchema = Type.Object({
  name: Type.String(),
  value: Type.Any(),
  type: Type.Union([
    Type.Literal('string'),
    Type.Literal('number'),
    Type.Literal('boolean'),
    Type.Literal('date'),
    Type.Literal('datetime'),
    Type.Literal('array'),
    Type.Literal('select')
  ]),
  required: Type.Boolean(),
  valid: Type.Boolean(),
  errors: Type.Optional(Type.Array(Type.String())),
  warnings: Type.Optional(Type.Array(Type.String()))
})

export const ParameterValidationResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    valid: Type.Boolean(),
    parameters: Type.Array(ParameterValueSchema),
    globalErrors: Type.Optional(Type.Array(Type.String())),
    globalWarnings: Type.Optional(Type.Array(Type.String()))
  })
})

// Analytics and metrics schemas
export const GenerationMetricsSchema = Type.Object({
  totalGenerations: Type.Number(),
  successfulGenerations: Type.Number(),
  failedGenerations: Type.Number(),
  averageGenerationTime: Type.Number(),
  cacheHitRate: Type.Number(),
  popularTemplates: Type.Array(Type.Object({
    templateId: Type.String({ format: 'uuid' }),
    templateName: Type.String(),
    generationCount: Type.Number(),
    averageTime: Type.Number()
  })),
  errorsByType: Type.Record(Type.String(), Type.Number()),
  generationsByFormat: Type.Record(ReportFormatSchema, Type.Number()),
  generationsByTimeOfDay: Type.Array(Type.Object({
    hour: Type.Number({ minimum: 0, maximum: 23 }),
    count: Type.Number()
  })),
  recentActivity: Type.Array(Type.Object({
    date: Type.String({ format: 'date' }),
    generations: Type.Number(),
    errors: Type.Number()
  }))
})

export const GenerationMetricsSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: GenerationMetricsSchema
})

// Queue and job management schemas
export const JobStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('active'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('delayed'),
  Type.Literal('waiting')
])

export const BackgroundJobSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  data: Type.Any(),
  opts: Type.Object({
    priority: Type.Number(),
    delay: Type.Optional(Type.Number()),
    attempts: Type.Optional(Type.Number()),
    backoff: Type.Optional(Type.Any())
  }),
  progress: Type.Number({ minimum: 0, maximum: 100 }),
  attemptsMade: Type.Number(),
  finishedOn: Type.Optional(Type.Number()),
  processedOn: Type.Optional(Type.Number()),
  timestamp: Type.Number(),
  returnvalue: Type.Optional(Type.Any()),
  failedReason: Type.Optional(Type.String())
})

export const QueueStatusSchema = Type.Object({
  waiting: Type.Number(),
  active: Type.Number(),
  completed: Type.Number(),
  failed: Type.Number(),
  delayed: Type.Number(),
  paused: Type.Boolean()
})

export const QueueStatusSuccessSchema = Type.Object({
  success: Type.Literal(true),
  data: QueueStatusSchema
})

// Type exports for TypeScript
export type GenerateReportType = Static<typeof GenerateReportSchema>
export type GeneratePublicReportQueryType = Static<typeof GeneratePublicReportQuerySchema>
export type ValidateParametersType = Static<typeof ValidateParametersSchema>
export type ScheduleGenerationType = Static<typeof ScheduleGenerationSchema>
export type BatchGenerationType = Static<typeof BatchGenerationSchema>
export type GenerateAndExportType = Static<typeof GenerateAndExportSchema>
export type ReportInstanceType = Static<typeof ReportInstanceSchema>
export type ReportExportType = Static<typeof ReportExportSchema>
export type GenerateReportResponseType = Static<typeof GenerateReportResponseSchema>
export type ReportInstanceResponseType = Static<typeof ReportInstanceResponseSchema>
export type GenerationStatusType = Static<typeof GenerationStatusSchema>
export type GenerationStatusResponseType = Static<typeof GenerationStatusResponseSchema>
export type ValidationResultType = Static<typeof ValidationResultSchema>
export type ScheduledGenerationResponseType = Static<typeof ScheduledGenerationResponseSchema>
export type BatchGenerationResponseType = Static<typeof BatchGenerationResponseSchema>
export type CancelGenerationResponseType = Static<typeof CancelGenerationResponseSchema>
export type GenerateAndExportResponseType = Static<typeof GenerateAndExportResponseSchema>
export type GenerationErrorType = Static<typeof GenerationErrorSchema>
export type ParameterValueType = Static<typeof ParameterValueSchema>
export type ParameterValidationResponseType = Static<typeof ParameterValidationResponseSchema>
export type GenerationMetricsType = Static<typeof GenerationMetricsSchema>
export type BackgroundJobType = Static<typeof BackgroundJobSchema>
export type QueueStatusType = Static<typeof QueueStatusSchema>