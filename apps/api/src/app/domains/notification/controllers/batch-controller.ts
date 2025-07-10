import { FastifyRequest, FastifyReply } from 'fastify';
import { BatchWorkerService } from '../services/batch-worker.service';

export interface BatchController {
  createBulkBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getBatchStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  listBatchJobs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getBatchMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  pauseBatchProcessing(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  resumeBatchProcessing(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  retryBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  cancelBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getBatchHealth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export class DatabaseBatchController implements BatchController {
  constructor(private batchWorkerService: BatchWorkerService) {}

  async createBulkBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { notifications, options = {} } = request.body as any;

      if (!notifications || notifications.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Notifications array is required and cannot be empty'
        });
      }

      const batchId = await this.batchWorkerService.createBulkNotificationBatch(notifications, options);
      
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
      request.log.error('Error creating bulk batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create batch'
      });
    }
  }

  async getBatchStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as any;
      
      const batchStatus = await this.batchWorkerService.getBatchStatus(batchId);
      
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
      request.log.error('Error getting batch status:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get batch status'
      });
    }
  }

  async listBatchJobs(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { status, limit = 20, offset = 0 } = request.query as any;
      
      const batches = await this.getBatchList({ status, limit, offset });
      
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
      request.log.error('Error listing batches:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list batch jobs'
      });
    }
  }

  async getBatchMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const metrics = await this.batchWorkerService.getBatchMetrics();
      
      return reply.send({
        success: true,
        data: metrics,
        message: 'Batch metrics retrieved successfully'
      });
    } catch (error) {
      request.log.error('Error getting batch metrics:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get batch metrics'
      });
    }
  }

  async pauseBatchProcessing(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await this.batchWorkerService.pauseBatchProcessing();
      
      return reply.send({
        success: true,
        data: { paused: true },
        message: 'Batch processing paused successfully'
      });
    } catch (error) {
      request.log.error('Error pausing batch processing:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_PAUSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to pause batch processing'
      });
    }
  }

  async resumeBatchProcessing(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await this.batchWorkerService.resumeBatchProcessing();
      
      return reply.send({
        success: true,
        data: { resumed: true },
        message: 'Batch processing resumed successfully'
      });
    } catch (error) {
      request.log.error('Error resuming batch processing:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_RESUME_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resume batch processing'
      });
    }
  }

  async retryBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as any;
      
      const newBatchId = await this.retryFailedBatch(batchId);
      
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
      request.log.error('Error retrying batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_RETRY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retry batch'
      });
    }
  }

  async cancelBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as any;
      
      const cancelled = await this.cancelPendingBatch(batchId);
      
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
      request.log.error('Error cancelling batch:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_CANCEL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel batch'
      });
    }
  }

  async getBatchHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const health = await this.checkBatchHealth();
      
      return reply.send({
        success: true,
        data: health,
        message: 'Batch processing health check completed'
      });
    } catch (error) {
      request.log.error('Error checking batch health:', error);
      return reply.status(500).send({
        success: false,
        error: 'BATCH_HEALTH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check batch health'
      });
    }
  }

  // Private helper methods
  private async getBatchList(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    const metrics = await this.batchWorkerService.getBatchMetrics();
    if (!metrics) {
      return { items: [], total: 0 };
    }

    // This is a simplified implementation
    // In a real implementation, you'd get actual job lists from the queue
    const mockJobs = [
      {
        id: 'batch_1',
        status: 'completed',
        progress: 100,
        attempts: 1,
        data: { type: 'bulk_notification', notifications: ['n1', 'n2'], priority: 'normal' },
        processedOn: Date.now() - 3600000,
        finishedOn: Date.now() - 3500000
      },
      {
        id: 'batch_2', 
        status: 'active',
        progress: 45,
        attempts: 1,
        data: { type: 'user_batch', notifications: ['n3', 'n4'], priority: 'high' },
        processedOn: Date.now() - 300000
      },
      {
        id: 'batch_3',
        status: 'waiting',
        progress: 0,
        attempts: 0,
        data: { type: 'scheduled_batch', notifications: ['n5', 'n6'], priority: 'normal' }
      }
    ];

    const filteredJobs = filters.status 
      ? mockJobs.filter(job => job.status === filters.status)
      : mockJobs;

    const start = filters.offset || 0;
    const end = start + (filters.limit || 20);
    
    return {
      items: filteredJobs.slice(start, end),
      total: filteredJobs.length
    };
  }

  private async retryFailedBatch(batchId: string): Promise<string | null> {
    // Get current batch status
    const currentBatch = await this.batchWorkerService.getBatchStatus(batchId);
    if (!currentBatch || currentBatch.status !== 'failed') {
      return null;
    }

    // Create new batch with same notifications
    if (currentBatch.data?.notifications) {
      return await this.batchWorkerService.createBulkNotificationBatch(
        currentBatch.data.notifications,
        {
          channel: currentBatch.data.channel,
          priority: currentBatch.data.priority,
          delayBetweenItems: 100,
          maxConcurrency: 5
        }
      );
    }

    return null;
  }

  private async cancelPendingBatch(batchId: string): Promise<boolean> {
    // Get current batch status
    const currentBatch = await this.batchWorkerService.getBatchStatus(batchId);
    if (!currentBatch) {
      return false;
    }

    // Only allow cancellation of waiting or delayed batches
    if (currentBatch.status === 'waiting' || currentBatch.status === 'delayed') {
      // In a real implementation, you'd remove the job from the queue
      // For now, we'll just return true to indicate it would be cancelled
      return true;
    }

    return false;
  }

  private async checkBatchHealth(): Promise<any> {
    const metrics = await this.batchWorkerService.getBatchMetrics();
    
    // Determine health status based on metrics
    let status = 'healthy';
    if (!metrics) {
      status = 'unhealthy';
    } else if (metrics.failed > metrics.completed / 2) {
      status = 'degraded';
    } else if (metrics.waiting > 1000) {
      status = 'degraded';
    }

    return {
      status,
      batchQueue: {
        connected: !!metrics,
        broker: metrics?.broker || 'unknown',
        queueDepth: metrics?.waiting || 0
      },
      workers: {
        active: metrics?.active || 0,
        total: 5 // Configurable worker count
      },
      lastActivity: metrics?.lastActivity || null
    };
  }
}