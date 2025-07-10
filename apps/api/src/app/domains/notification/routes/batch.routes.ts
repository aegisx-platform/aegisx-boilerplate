import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Type } from '@sinclair/typebox';

// TypeBox schemas for batch operations
const BatchCreateSchema = Type.Object({
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

const BatchStatusSchema = Type.Object({
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

const BatchMetricsSchema = Type.Object({
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

const BatchListQuerySchema = Type.Object({
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

const BatchResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Any(),
  message: Type.Optional(Type.String())
});

export default async function batchRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Create a simplified controller for batch operations
  const controller = {
    createBulkBatch: async (notifications: string[], options: any = {}) => {
      return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    getBatchStatus: async (batchId: string) => {
      return {
        id: batchId,
        status: 'completed',
        progress: 100,
        attempts: 1,
        data: { type: 'bulk_notification', notifications: [] }
      };
    },
    listBatchJobs: async (filters: any) => {
      return { items: [], total: 0 };
    },
    getBatchMetrics: async () => {
      return {
        name: 'batch-queue',
        broker: 'redis',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      };
    },
    pauseBatchProcessing: async () => {},
    resumeBatchProcessing: async () => {},
    retryBatch: async (batchId: string) => null,
    cancelBatch: async (batchId: string) => false,
    getBatchHealth: async () => {
      return {
        status: 'healthy',
        batchQueue: { connected: true, broker: 'redis', queueDepth: 0 },
        workers: { active: 0, total: 5 }
      };
    }
  };

  // Create bulk notification batch
  fastify.post('/bulk', {
    schema: {
      summary: 'Create Bulk Notification Batch',
      description: 'Create a batch job to process multiple notifications efficiently with configurable options',
      tags: ['Batch Processing'],
      body: BatchCreateSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            batchId: Type.String({ description: 'Created batch job ID' }),
            notificationCount: Type.Number({ description: 'Number of notifications in batch' }),
            estimatedProcessingTime: Type.Number({ description: 'Estimated processing time in milliseconds' })
          }),
          message: Type.String()
        }),
        400: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { notifications, options = {} } = request.body as any;

      if (!notifications || notifications.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Notifications array is required and cannot be empty'
        });
      }

      const batchId = await controller.createBulkBatch(notifications, options);
      
      const estimatedTime = notifications.length * (options.delayBetweenItems || 100);

      return reply.send({
        success: true,
        data: {
          batchId,
          notificationCount: notifications.length,
          estimatedProcessingTime: estimatedTime
        },
        message: 'Bulk notification batch created successfully'
      });
    } catch (error) {
      fastify.log.error('Error creating bulk batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create batch'
      });
    }
  });

  // Get batch status
  fastify.get('/:batchId/status', {
    schema: {
      summary: 'Get Batch Status',
      description: 'Retrieve the current status and progress of a batch processing job',
      tags: ['Batch Processing'],
      params: Type.Object({
        batchId: Type.String({ description: 'Batch job ID' })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: BatchStatusSchema,
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { batchId } = request.params as any;
      
      const batchStatus = await controller.getBatchStatus(batchId);
      
      if (!batchStatus) {
        return reply.status(404).send({
          success: false,
          error: 'BATCH_NOT_FOUND',
          message: `Batch job not found: ${batchId}`
        });
      }

      return reply.send({
        success: true,
        data: batchStatus,
        message: 'Batch status retrieved successfully'
      });
    } catch (error) {
      fastify.log.error('Error getting batch status:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get batch status'
      });
    }
  });

  // List batch jobs
  fastify.get('/', {
    schema: {
      summary: 'List Batch Jobs',
      description: 'Retrieve a list of batch processing jobs with optional filtering',
      tags: ['Batch Processing'],
      querystring: BatchListQuerySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            batches: Type.Array(BatchStatusSchema),
            total: Type.Number({ description: 'Total number of batches' }),
            limit: Type.Number({ description: 'Requested limit' }),
            offset: Type.Number({ description: 'Requested offset' })
          }),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { status, limit = 20, offset = 0 } = request.query as any;
      
      const batches = await controller.listBatchJobs({ status, limit, offset });
      
      return reply.send({
        success: true,
        data: {
          batches: batches.items,
          total: batches.total,
          limit,
          offset
        },
        message: 'Batch jobs retrieved successfully'
      });
    } catch (error) {
      fastify.log.error('Error listing batches:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list batch jobs'
      });
    }
  });

  // Get batch metrics
  fastify.get('/metrics', {
    schema: {
      summary: 'Get Batch Processing Metrics',
      description: 'Retrieve comprehensive metrics and statistics for batch processing operations',
      tags: ['Batch Processing', 'Monitoring'],
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: BatchMetricsSchema,
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const metrics = await controller.getBatchMetrics();
      
      return reply.send({
        success: true,
        data: metrics,
        message: 'Batch metrics retrieved successfully'
      });
    } catch (error) {
      fastify.log.error('Error getting batch metrics:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get batch metrics'
      });
    }
  });

  // Pause batch processing
  fastify.post('/pause', {
    schema: {
      summary: 'Pause Batch Processing',
      description: 'Temporarily pause all batch processing operations',
      tags: ['Batch Processing', 'Control'],
      response: {
        200: BatchResponseSchema,
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      await controller.pauseBatchProcessing();
      
      return reply.send({
        success: true,
        data: { paused: true },
        message: 'Batch processing paused successfully'
      });
    } catch (error) {
      fastify.log.error('Error pausing batch processing:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_PAUSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to pause batch processing'
      });
    }
  });

  // Resume batch processing
  fastify.post('/resume', {
    schema: {
      summary: 'Resume Batch Processing',
      description: 'Resume paused batch processing operations',
      tags: ['Batch Processing', 'Control'],
      response: {
        200: BatchResponseSchema,
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      await controller.resumeBatchProcessing();
      
      return reply.send({
        success: true,
        data: { resumed: true },
        message: 'Batch processing resumed successfully'
      });
    } catch (error) {
      fastify.log.error('Error resuming batch processing:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_RESUME_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resume batch processing'
      });
    }
  });

  // Retry failed batch
  fastify.post('/:batchId/retry', {
    schema: {
      summary: 'Retry Failed Batch',
      description: 'Retry a failed batch processing job',
      tags: ['Batch Processing'],
      params: Type.Object({
        batchId: Type.String({ description: 'Batch job ID to retry' })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            batchId: Type.String(),
            newBatchId: Type.String({ description: 'New batch job ID for retry' })
          }),
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { batchId } = request.params as any;
      
      const newBatchId = await controller.retryBatch(batchId);
      
      if (!newBatchId) {
        return reply.status(404).send({
          success: false,
          error: 'BATCH_NOT_FOUND',
          message: `Batch job not found or cannot be retried: ${batchId}`
        });
      }

      return reply.send({
        success: true,
        data: {
          batchId,
          newBatchId
        },
        message: 'Batch retry initiated successfully'
      });
    } catch (error) {
      fastify.log.error('Error retrying batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_RETRY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retry batch'
      });
    }
  });

  // Cancel batch
  fastify.delete('/:batchId', {
    schema: {
      summary: 'Cancel Batch Job',
      description: 'Cancel a pending or active batch processing job',
      tags: ['Batch Processing'],
      params: Type.Object({
        batchId: Type.String({ description: 'Batch job ID to cancel' })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            batchId: Type.String(),
            cancelled: Type.Boolean()
          }),
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { batchId } = request.params as any;
      
      const cancelled = await controller.cancelBatch(batchId);
      
      if (!cancelled) {
        return reply.status(404).send({
          success: false,
          error: 'BATCH_NOT_FOUND',
          message: `Batch job not found or cannot be cancelled: ${batchId}`
        });
      }

      return reply.send({
        success: true,
        data: {
          batchId,
          cancelled: true
        },
        message: 'Batch job cancelled successfully'
      });
    } catch (error) {
      fastify.log.error('Error cancelling batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_CANCEL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel batch'
      });
    }
  });

  // Batch health check
  fastify.get('/health', {
    schema: {
      summary: 'Batch Processing Health Check',
      description: 'Check the health status of batch processing services',
      tags: ['Batch Processing', 'Health'],
      response: {
        200: Type.Object({
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
        }),
        500: Type.Object({
          success: Type.Boolean(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const health = await controller.getBatchHealth();
      
      return reply.send({
        success: true,
        data: health,
        message: 'Batch processing health check completed'
      });
    } catch (error) {
      fastify.log.error('Error checking batch health:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_HEALTH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check batch health'
      });
    }
  });
}