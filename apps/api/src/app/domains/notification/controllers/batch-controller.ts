import { FastifyRequest, FastifyReply } from 'fastify';
import { BatchWorkerService } from '../services/batch-worker.service';

export interface BatchController {
  createBulkBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  createBulkBatchWithObjects(request: FastifyRequest, reply: FastifyReply): Promise<void>;
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
  constructor(
    private batchWorkerService: BatchWorkerService,
    private fastify: any
  ) {}

  async createBulkBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    console.log('=== createBulkBatch CALLED ===');
    request.log.info('createBulkBatch method called');
    
    try {
      const { notifications, options = {} } = request.body as any;
      console.log('Request body:', { notificationCount: notifications?.length, options });

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

  async createBulkBatchWithObjects(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    console.error('🚨🚨🚨 createBulkBatchWithObjects CONTROLLER METHOD CALLED 🚨🚨🚨');
    console.error('Request method:', request.method);
    console.error('Request URL:', request.url);
    console.error('Current timestamp:', new Date().toISOString());
    
    request.log.error('🚨 createBulkBatchWithObjects method called - SHOULD BE VISIBLE IN LOGS');
    
    try {
      const { name, notifications, metadata = {} } = request.body as any;
      console.log('Request body:', { name, notificationCount: notifications?.length });

      if (!notifications || notifications.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Notifications array is required and cannot be empty'
        });
      }

      request.log.info('Creating bulk batch with notification objects', { 
        notificationCount: notifications.length,
        batchName: name 
      });

      // Create a batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.error('🔨 Creating real notifications for batch');
      
      // Create actual notifications in database first
      const notificationIds: string[] = [];
      
      for (let i = 0; i < notifications.length; i++) {
        const notificationData = notifications[i];
        console.error('🔨 Creating notification:', i + 1, 'of', notifications.length);
        
        try {
          // Create notification using the notification service
          const notificationService = this.fastify.notificationDatabase;
          if (!notificationService) {
            throw new Error('Notification service not available');
          }
          
          // Ensure content has required text property
          const contentWithText = {
            text: notificationData.content?.text || notificationData.content?.message || `${notificationData.type} notification`,
            html: notificationData.content?.html,
            template: notificationData.content?.template,
            templateData: notificationData.content?.templateData,
            attachments: notificationData.content?.attachments,
            actions: notificationData.content?.actions
          };

          // Create the notification
          const createdNotification = await notificationService.createNotification(
            notificationData.type,
            notificationData.channel,
            {
              id: notificationData.recipient.id,
              email: notificationData.recipient.email,
              phone: notificationData.recipient.phone
            },
            contentWithText,
            {
              priority: 'normal',
              scheduledAt: new Date(), // Send immediately
              metadata: {
                batchId: batchId,
                batchIndex: i,
                source: 'batch_creation'
              }
            }
          );
          
          notificationIds.push(createdNotification.id);
          console.error('✅ Created notification:', createdNotification.id);
          
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
          throw new Error(`Failed to create notification ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.error('🎉 All notifications created:', notificationIds);
      
      // Create the batch using the BatchWorkerService
      console.error('🟡 About to call this.batchWorkerService.createBulkNotificationBatch');
      console.error('🟡 notificationIds:', notificationIds);
      console.error('🟡 batchWorkerService exists:', !!this.batchWorkerService);
      
      const realBatchId = await this.batchWorkerService.createBulkNotificationBatch(
        notificationIds,
        {
          priority: 'normal',
          delayBetweenItems: 100,
          maxConcurrency: 5
        }
      );
      
      console.error('🟢 BatchWorkerService returned batchId:', realBatchId);
      
      const estimatedTime = notifications.length * 100;

      request.log.info('Bulk batch created successfully', { 
        batchId: realBatchId,
        notificationCount: notifications.length 
      });

      return reply.send({
        success: true,
        data: {
          batchId: realBatchId,
          notificationCount: notifications.length,
          estimatedProcessingTime: estimatedTime
        },
        message: 'Bulk notification batch created successfully'
      });
    } catch (error) {
      request.log.error('Error creating bulk batch with objects:', error);
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
      
      request.log.info('Listing batch jobs', { status, limit, offset });
      
      const batches = await this.getBatchList({ status, limit, offset });
      
      request.log.info('Got batch list result', { 
        itemCount: batches.items?.length || 0, 
        total: batches.total 
      });
      
      return reply.send({
        success: true,
        data: {
          batches: batches.items || [],
          total: batches.total || 0,
          limit: Number(limit),
          offset: Number(offset)
        },
        message: 'Batch jobs retrieved successfully'
      });
    } catch (error) {
      request.log.error('Error listing batches:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
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
    try {
      // Get real batch records from database
      const batches = await this.batchWorkerService.getAllBatches(filters);
      
      if (!batches) {
        return { items: [], total: 0 };
      }

      return {
        items: batches.items || [],
        total: batches.total || 0
      };
    } catch (error) {
      this.fastify.log.error('Error getting batch list', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { items: [], total: 0 };
    }
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
    try {
      // Use real cancellation method from BatchWorkerService
      const cancelled = await this.batchWorkerService.cancelBatch(batchId);
      
      if (cancelled) {
        this.fastify.log.info('Batch successfully cancelled', { batchId });
        return true;
      } else {
        this.fastify.log.warn('Batch cancellation failed or batch not found', { batchId });
        return false;
      }
    } catch (error) {
      this.fastify.log.error('Error during batch cancellation', { 
        batchId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
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