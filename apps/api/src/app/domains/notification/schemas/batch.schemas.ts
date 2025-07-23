import { Type } from '@sinclair/typebox';
import { CreateNotificationSchema } from './notification.schemas';

// TypeBox schemas for batch operations
export const BatchCreateSchema = Type.Object({
  notifications: Type.Array(Type.String({ description: 'Notification IDs to process in batch' })),
  options: Type.Optional(Type.Object({
    channel: Type.Optional(Type.Union([
      Type.Literal('email'),
      Type.Literal('sms'),
      Type.Literal('push'),
      Type.Literal('webhook'),
      Type.Literal('slack'),
      Type.Literal('in-app')
    ], { description: 'Notification channel filter' })),
    priority: Type.Optional(Type.Union([
      Type.Literal('critical'),
      Type.Literal('urgent'),
      Type.Literal('high'),
      Type.Literal('normal'),
      Type.Literal('low')
    ], { description: 'Batch processing priority' })),
    delayBetweenItems: Type.Optional(Type.Number({ 
      minimum: 0, 
      maximum: 10000,
      description: 'Delay in milliseconds between processing each notification' 
    })),
    maxConcurrency: Type.Optional(Type.Number({ 
      minimum: 1, 
      maximum: 20,
      description: 'Maximum concurrent notifications to process' 
    }))
  }))
});

// Schema for bulk create with notification objects
export const BulkBatchCreateSchema = Type.Object({
  name: Type.Optional(Type.String({ description: 'Batch name' })),
  notifications: Type.Array(CreateNotificationSchema, { description: 'Array of notification objects to create and batch' }),
  metadata: Type.Optional(Type.Object({}, { additionalProperties: true }))
});

export const BatchCreateResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    batchId: Type.String({ description: 'Created batch job ID' }),
    notificationCount: Type.Number({ description: 'Number of notifications in batch' }),
    estimatedProcessingTime: Type.Number({ description: 'Estimated processing time in milliseconds' })
  }),
  message: Type.String()
});

export const BatchStatusSchema = Type.Object({
  id: Type.String({ description: 'Batch job ID' }),
  status: Type.Union([
    Type.Literal('waiting'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('delayed'),
    Type.Literal('paused')
  ], { description: 'Current batch job status' }),
  progress: Type.Number({ 
    minimum: 0, 
    maximum: 100,
    description: 'Batch processing progress percentage' 
  }),
  attempts: Type.Number({ description: 'Number of processing attempts' }),
  data: Type.Object({
    type: Type.String({ description: 'Batch job type' }),
    notifications: Type.Array(Type.String(), { description: 'Notification IDs in batch' }),
    channel: Type.Optional(Type.String({ description: 'Channel filter' })),
    priority: Type.String({ description: 'Batch priority' })
  }),
  processedOn: Type.Optional(Type.Number({ description: 'Processing start timestamp' })),
  finishedOn: Type.Optional(Type.Number({ description: 'Processing completion timestamp' })),
  failedReason: Type.Optional(Type.String({ description: 'Failure reason if batch failed' }))
});

export const BatchStatusResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: BatchStatusSchema,
  message: Type.String()
});

export const BatchMetricsSchema = Type.Object({
  name: Type.String({ description: 'Batch queue name' }),
  broker: Type.Union([Type.Literal('redis'), Type.Literal('rabbitmq')]),
  waiting: Type.Number({ description: 'Number of waiting batch jobs' }),
  active: Type.Number({ description: 'Number of active batch jobs' }),
  completed: Type.Number({ description: 'Number of completed batch jobs' }),
  failed: Type.Number({ description: 'Number of failed batch jobs' }),
  delayed: Type.Number({ description: 'Number of delayed batch jobs' }),
  paused: Type.Number({ description: 'Number of paused batch jobs' }),
  processingRate: Type.Number({ description: 'Batch jobs processed per minute' }),
  errorRate: Type.Number({ description: 'Batch job error rate percentage' }),
  avgProcessingTime: Type.Number({ description: 'Average batch processing time in milliseconds' }),
  isPaused: Type.Boolean({ description: 'Whether batch processing is paused' }),
  lastActivity: Type.Optional(Type.String({ format: 'date-time', description: 'Last batch activity timestamp' }))
});

export const BatchMetricsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: BatchMetricsSchema,
  message: Type.String()
});

export const BatchListQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('waiting'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('delayed'),
    Type.Literal('paused')
  ], { description: 'Filter batches by status' })),
  limit: Type.Optional(Type.Number({ 
    minimum: 1, 
    maximum: 100, 
    default: 20,
    description: 'Maximum number of batches to return' 
  })),
  offset: Type.Optional(Type.Number({ 
    minimum: 0, 
    default: 0,
    description: 'Number of batches to skip' 
  }))
});

export const BatchListResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    batches: Type.Array(BatchStatusSchema),
    total: Type.Number({ description: 'Total number of batches' }),
    limit: Type.Number({ description: 'Requested limit' }),
    offset: Type.Number({ description: 'Requested offset' })
  }),
  message: Type.String()
});

export const BatchOperationResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Any(),
  message: Type.Optional(Type.String())
});

export const BatchRetryResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    batchId: Type.String(),
    newBatchId: Type.String({ description: 'New batch job ID for retry' })
  }),
  message: Type.String()
});

export const BatchCancelResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    batchId: Type.String(),
    cancelled: Type.Boolean()
  }),
  message: Type.String()
});

export const BatchHealthResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    status: Type.Union([Type.Literal('healthy'), Type.Literal('degraded'), Type.Literal('unhealthy')]),
    batchQueue: Type.Object({
      connected: Type.Boolean(),
      broker: Type.String(),
      queueDepth: Type.Number()
    }),
    workers: Type.Object({
      active: Type.Number(),
      total: Type.Number()
    }),
    lastActivity: Type.Optional(Type.String({ format: 'date-time' }))
  }),
  message: Type.String()
});

export const BatchParamsSchema = Type.Object({
  batchId: Type.String({ description: 'Batch job ID' })
});

export const BatchErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String()
});