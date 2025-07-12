import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { DatabaseBatchController } from '../controllers/batch-controller';
import {
  BatchCreateSchema,
  BatchCreateResponseSchema,
  BatchStatusResponseSchema,
  BatchListQuerySchema,
  BatchListResponseSchema,
  BatchMetricsResponseSchema,
  BatchOperationResponseSchema,
  BatchRetryResponseSchema,
  BatchCancelResponseSchema,
  BatchHealthResponseSchema,
  BatchParamsSchema,
  BatchErrorResponseSchema,
} from '../schemas/batch.schemas';

export async function batchRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
  controller: DatabaseBatchController
): Promise<void> {

  // Create bulk notification batch
  fastify.post('/bulk', {
    schema: {
      summary: 'Create Bulk Notification Batch',
      description: 'Create a batch job to process multiple notifications efficiently with configurable options',
      tags: ['Batch Processing'],
      body: BatchCreateSchema,
      response: {
        200: BatchCreateResponseSchema,
        400: BatchErrorResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.createBulkBatch.bind(controller));

  // Get batch status
  fastify.get('/:batchId/status', {
    schema: {
      summary: 'Get Batch Status',
      description: 'Retrieve the current status and progress of a batch processing job',
      tags: ['Batch Processing'],
      params: BatchParamsSchema,
      response: {
        200: BatchStatusResponseSchema,
        404: BatchErrorResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.getBatchStatus.bind(controller));

  // List batch jobs
  fastify.get('/', {
    schema: {
      summary: 'List Batch Jobs',
      description: 'Retrieve a list of batch processing jobs with optional filtering',
      tags: ['Batch Processing'],
      querystring: BatchListQuerySchema,
      response: {
        200: BatchListResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.listBatchJobs.bind(controller));

  // Get batch metrics
  fastify.get('/metrics', {
    schema: {
      summary: 'Get Batch Processing Metrics',
      description: 'Retrieve comprehensive metrics and statistics for batch processing operations',
      tags: ['Batch Processing', 'Monitoring'],
      response: {
        200: BatchMetricsResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.getBatchMetrics.bind(controller));

  // Pause batch processing
  fastify.post('/pause', {
    schema: {
      summary: 'Pause Batch Processing',
      description: 'Temporarily pause all batch processing operations',
      tags: ['Batch Processing', 'Control'],
      response: {
        200: BatchOperationResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.pauseBatchProcessing.bind(controller));

  // Resume batch processing
  fastify.post('/resume', {
    schema: {
      summary: 'Resume Batch Processing',
      description: 'Resume paused batch processing operations',
      tags: ['Batch Processing', 'Control'],
      response: {
        200: BatchOperationResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.resumeBatchProcessing.bind(controller));

  // Retry failed batch
  fastify.post('/:batchId/retry', {
    schema: {
      summary: 'Retry Failed Batch',
      description: 'Retry a failed batch processing job',
      tags: ['Batch Processing'],
      params: BatchParamsSchema,
      response: {
        200: BatchRetryResponseSchema,
        404: BatchErrorResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.retryBatch.bind(controller));

  // Cancel batch
  fastify.delete('/:batchId', {
    schema: {
      summary: 'Cancel Batch Job',
      description: 'Cancel a pending or active batch processing job',
      tags: ['Batch Processing'],
      params: BatchParamsSchema,
      response: {
        200: BatchCancelResponseSchema,
        404: BatchErrorResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.cancelBatch.bind(controller));

  // Batch health check
  fastify.get('/health', {
    schema: {
      summary: 'Batch Processing Health Check',
      description: 'Check the health status of batch processing services',
      tags: ['Batch Processing', 'Health'],
      response: {
        200: BatchHealthResponseSchema,
        500: BatchErrorResponseSchema
      }
    }
  }, controller.getBatchHealth.bind(controller));
}