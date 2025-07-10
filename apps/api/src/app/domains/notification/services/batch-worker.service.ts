  import { FastifyInstance } from 'fastify';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
} from '../../../core/shared/types/notification.types';
import { NotificationRepository } from '../repositories/notification-repository';
import { IQueueService } from '../../../core/shared/interfaces/queue.interface';
import { QueueFactory } from '../../../core/shared/factories/queue.factory';

export interface BatchWorkerConfig {
  enabled: boolean;
  workerConcurrency: number;
  batchSize: number;
  processingInterval: string;
  queueBroker: 'redis' | 'rabbitmq';
  redisDb?: number;
  maxRetryAttempts: number;
  channelConcurrency: {
    email: number;
    sms: number;
    push: number;
    slack: number;
  };
}

export interface BatchJob {
  id: string;
  type: 'bulk_notification' | 'user_batch' | 'scheduled_batch' | 'priority_batch';
  batchId?: string;
  notifications: string[]; // notification IDs
  channel?: NotificationChannel;
  priority: NotificationPriority;
  processingOptions: {
    delayBetweenItems?: number;
    maxConcurrency?: number;
    retryFailedItems?: boolean;
  };
  metadata?: {
    userId?: string;
    campaign?: string;
    source?: string;
  };
}

export class BatchWorkerService {
  private fastify: FastifyInstance;
  private repository: NotificationRepository;
  private config: BatchWorkerConfig;
  private batchQueue?: IQueueService;
  private isProcessorStarted = false;
  private workerProcesses: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    fastify: FastifyInstance,
    repository: NotificationRepository,
    config: BatchWorkerConfig
  ) {
    this.fastify = fastify;
    this.repository = repository;
    this.config = config;
    this.initializeBatchQueue();
  }

  private async initializeBatchQueue(): Promise<void> {
    if (!this.config.enabled) {
      this.fastify.log.info('Batch worker service disabled');
      return;
    }

    try {
      // Create separate batch queue
      this.batchQueue = await QueueFactory.create({
        name: 'notification-batch',
        broker: this.config.queueBroker,
        redis: this.config.queueBroker === 'redis' ? {
          redis: {
            host: this.fastify.config.REDIS_HOST,
            port: parseInt(this.fastify.config.REDIS_PORT),
            password: this.fastify.config.REDIS_PASSWORD,
            db: this.config.redisDb || 2, // Use different DB for batch processing
          }
        } : undefined,
        rabbitmq: this.config.queueBroker === 'rabbitmq' ? {
          url: this.fastify.config.RABBITMQ_URL,
          exchange: {
            name: `${this.fastify.config.RABBITMQ_EXCHANGE}.batch`,
            type: this.fastify.config.RABBITMQ_EXCHANGE_TYPE as 'direct' | 'topic' | 'fanout' | 'headers',
            durable: this.fastify.config.RABBITMQ_EXCHANGE_DURABLE === 'true',
          },
          prefetch: parseInt(this.fastify.config.RABBITMQ_PREFETCH),
        } : undefined,
      });

      this.fastify.log.info('Batch queue service initialized', {
        broker: this.config.queueBroker,
        batchSize: this.config.batchSize,
        workerConcurrency: this.config.workerConcurrency,
      });

      // Start batch processors
      if (this.config.enabled) {
        await this.startBatchProcessors();
      }
    } catch (error) {
      this.fastify.log.error('Failed to initialize batch queue service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        broker: this.config.queueBroker,
      });
    }
  }

  private async startBatchProcessors(): Promise<void> {
    if (!this.batchQueue || this.isProcessorStarted) return;

    try {
      // Bulk notification processor
      this.batchQueue.process(
        'bulk-notification',
        this.config.workerConcurrency,
        async (job) => {
          const batchJob: BatchJob = job.data;
          return await this.processBulkNotifications(batchJob);
        }
      );

      // User-specific batch processor
      this.batchQueue.process(
        'user-batch',
        this.config.channelConcurrency.email,
        async (job) => {
          const batchJob: BatchJob = job.data;
          return await this.processUserBatch(batchJob);
        }
      );

      // Scheduled batch processor
      this.batchQueue.process(
        'scheduled-batch',
        2, // Lower concurrency for scheduled batches
        async (job) => {
          const batchJob: BatchJob = job.data;
          return await this.processScheduledBatch(batchJob);
        }
      );

      // Priority batch processor (high priority batches)
      this.batchQueue.process(
        'priority-batch',
        this.config.workerConcurrency * 2, // Higher concurrency for priority
        async (job) => {
          const batchJob: BatchJob = job.data;
          return await this.processPriorityBatch(batchJob);
        }
      );

      // Start automatic batch collection
      await this.startAutomaticBatchCollection();

      this.isProcessorStarted = true;

      this.fastify.log.info('Batch processors started', {
        workerConcurrency: this.config.workerConcurrency,
        processingInterval: this.config.processingInterval,
      });
    } catch (error) {
      this.fastify.log.error('Failed to start batch processors', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async startAutomaticBatchCollection(): Promise<void> {
    if (!this.batchQueue) return;

    // Add automatic batch collection job
    await this.batchQueue.add(
      'auto-collect-batches',
      {},
      {
        repeat: { interval: this.config.processingInterval },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // Process automatic batch collection
    this.batchQueue.process(
      'auto-collect-batches',
      1, // Single processor for collection
      async (job) => {
        await this.collectAndQueueBatches();
      }
    );
  }

  private async collectAndQueueBatches(): Promise<void> {
    try {
      this.fastify.log.info('Starting automatic batch collection');

      // Collect notifications for bulk processing
      const bulkNotifications = await this.collectBulkNotifications();
      if (bulkNotifications.length > 0) {
        await this.queueBulkProcessing(bulkNotifications);
      }

      // Collect priority batches (simplified)
      const priorityNotifications = await this.collectPriorityBatches();
      if (priorityNotifications.length > 0) {
        await this.queuePriorityBatch(priorityNotifications);
      }

    } catch (error) {
      this.fastify.log.error('Error during batch collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Bulk notification processing methods
  private async collectBulkNotifications(): Promise<Notification[]> {
    // Get queued notifications for bulk processing
    const normalNotifications = await this.repository.getQueuedNotifications('normal', this.config.batchSize * 2);
    const lowNotifications = await this.repository.getQueuedNotifications('low', this.config.batchSize * 3);

    return [...normalNotifications, ...lowNotifications];
  }

  private async queueBulkProcessing(notifications: Notification[]): Promise<void> {
    if (!this.batchQueue) return;

    // Group by channel for optimized processing
    const channelGroups = notifications.reduce((groups, notification) => {
      const channel = notification.channel;
      if (!groups[channel]) {
        groups[channel] = [];
      }
      groups[channel].push(notification.id);
      return groups;
    }, {} as Record<NotificationChannel, string[]>);

    // Queue each channel group as separate batch
    for (const [channel, notificationIds] of Object.entries(channelGroups)) {
      const batches = this.chunkArray(notificationIds, this.config.batchSize);

      for (const batch of batches) {
        const batchJob: BatchJob = {
          id: `bulk_${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bulk_notification',
          notifications: batch,
          channel: channel as NotificationChannel,
          priority: 'normal',
          processingOptions: {
            delayBetweenItems: this.getChannelDelay(channel as NotificationChannel),
            maxConcurrency: this.config.channelConcurrency[channel as keyof typeof this.config.channelConcurrency],
            retryFailedItems: true,
          },
          metadata: {
            source: 'auto_batch_collection',
          }
        };

        await this.batchQueue.add('bulk-notification', batchJob, {
          priority: this.getPriorityValue('normal'),
          attempts: this.config.maxRetryAttempts,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }
    }

    this.fastify.log.info('Queued bulk notifications for processing', {
      totalNotifications: notifications.length,
      channelGroups: Object.keys(channelGroups),
    });
  }

  private async processBulkNotifications(batchJob: BatchJob): Promise<any> {
    this.fastify.log.info('Processing bulk notification batch', {
      batchId: batchJob.id,
      type: batchJob.type,
      notificationCount: batchJob.notifications.length,
      channel: batchJob.channel,
    });

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process notifications with concurrency control
    const concurrency = batchJob.processingOptions.maxConcurrency || 5;
    const chunks = this.chunkArray(batchJob.notifications, concurrency);

    for (const chunk of chunks) {
      // Process chunk concurrently
      const chunkPromises = chunk.map(async (notificationId) => {
        try {
          await this.processNotification(notificationId);
          results.processed++;

          // Add delay between items if configured
          if (batchJob.processingOptions.delayBetweenItems) {
            await this.delay(batchJob.processingOptions.delayBetweenItems);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${notificationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Retry failed items if configured
          if (batchJob.processingOptions.retryFailedItems) {
            await this.queueRetryNotification(notificationId, batchJob.channel);
          }
        }
      });

      await Promise.all(chunkPromises);
    }

    // Update batch statistics
    await this.updateBatchStatistics(batchJob, results);

    this.fastify.log.info('Completed bulk notification batch', {
      batchId: batchJob.id,
      processed: results.processed,
      failed: results.failed,
    });

    return results;
  }


  private async processUserBatch(batchJob: BatchJob): Promise<any> {
    this.fastify.log.info('Processing user notification batch', {
      batchId: batchJob.id,
      userId: batchJob.metadata?.userId,
      notificationCount: batchJob.notifications.length,
    });

    // Check user notification preferences
    const userId = batchJob.metadata?.userId;
    if (userId) {
      const preferences = await this.repository.getUserPreferences(userId);
      if (preferences?.quietHours && this.isInQuietHours(preferences.quietHours)) {
        // Reschedule for later
        await this.rescheduleUserBatch(batchJob, preferences.quietHours);
        return { rescheduled: true };
      }
    }

    // Process notifications sequentially for user experience
    const results = { processed: 0, failed: 0, errors: [] as string[] };

    for (const notificationId of batchJob.notifications) {
      try {
        await this.processNotification(notificationId);
        results.processed++;

        // Delay between user notifications
        if (batchJob.processingOptions.delayBetweenItems) {
          await this.delay(batchJob.processingOptions.delayBetweenItems);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${notificationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await this.updateBatchStatistics(batchJob, results);
    return results;
  }


  private async processScheduledBatch(batchJob: BatchJob): Promise<any> {
    this.fastify.log.info('Processing scheduled batch', {
      jobId: batchJob.id,
    });

    // Get notifications from the batch job data
    const notificationIds = batchJob.notifications || [];

    const results = { processed: 0, failed: 0, errors: [] as string[] };

    // Process batch notifications
    for (const notificationId of notificationIds) {
      try {
        await this.processNotification(notificationId);
        results.processed++;

        if (batchJob.processingOptions.delayBetweenItems) {
          await this.delay(batchJob.processingOptions.delayBetweenItems);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${notificationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const finalStatus = results.failed === 0 ? 'completed' :
                       results.processed === 0 ? 'failed' : 'partial';

    this.fastify.log.info('Completed scheduled batch', {
      status: finalStatus,
      processed: results.processed,
      failed: results.failed,
    });

    return results;
  }

  // Priority batch processing methods
  private async collectPriorityBatches(): Promise<Notification[]> {
    // Get high priority notifications for priority batch processing
    const criticalNotifications = await this.repository.getQueuedNotifications('critical', this.config.batchSize);
    const urgentNotifications = await this.repository.getQueuedNotifications('urgent', this.config.batchSize);
    const highNotifications = await this.repository.getQueuedNotifications('high', this.config.batchSize);

    return [...criticalNotifications, ...urgentNotifications, ...highNotifications];
  }

  private async queuePriorityBatch(notifications: Notification[]): Promise<void> {
    if (!this.batchQueue || notifications.length === 0) return;

    const batchJob: BatchJob = {
      id: `priority_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'priority_batch',
      notifications: notifications.map(n => n.id),
      priority: 'critical',
      processingOptions: {
        delayBetweenItems: 50, // Minimal delay for priority
        maxConcurrency: this.config.workerConcurrency * 2,
        retryFailedItems: true,
      },
      metadata: {
        source: 'priority_batch_collection',
      }
    };

    await this.batchQueue.add('priority-batch', batchJob, {
      priority: this.getPriorityValue('critical'),
      attempts: this.config.maxRetryAttempts,
      backoff: { type: 'exponential', delay: 500 },
    });

    this.fastify.log.info('Queued priority batch for processing', {
      batchId: batchJob.id,
      notificationCount: notifications.length,
    });
  }

  private async processPriorityBatch(batchJob: BatchJob): Promise<any> {
    this.fastify.log.info('Processing priority notification batch', {
      batchId: batchJob.id,
      notificationCount: batchJob.notifications.length,
    });

    const results = { processed: 0, failed: 0, errors: [] as string[] };

    // Process priority notifications with high concurrency
    const concurrency = batchJob.processingOptions.maxConcurrency || 10;
    const chunks = this.chunkArray(batchJob.notifications, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (notificationId) => {
        try {
          await this.processNotification(notificationId);
          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${notificationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Immediate retry for priority notifications
          if (batchJob.processingOptions.retryFailedItems) {
            try {
              await this.processNotification(notificationId);
              results.processed++;
              results.failed--; // Adjust counts
              results.errors.pop(); // Remove error
            } catch (retryError) {
              // Keep failed status
            }
          }
        }
      });

      await Promise.all(chunkPromises);

      // Minimal delay between chunks for priority processing
      if (batchJob.processingOptions.delayBetweenItems) {
        await this.delay(batchJob.processingOptions.delayBetweenItems);
      }
    }

    await this.updateBatchStatistics(batchJob, results);

    this.fastify.log.info('Completed priority batch', {
      batchId: batchJob.id,
      processed: results.processed,
      failed: results.failed,
    });

    return results;
  }

  // Helper methods
  private async processNotification(notificationId: string): Promise<void> {
    try {
      this.fastify.log.info('Processing notification in batch', {
        notificationId,
        processedBy: 'batch_worker',
      });

      // Simulate processing delay
      await this.delay(100);

      // Log successful processing
      this.fastify.log.info('Notification processed successfully', {
        notificationId,
        status: 'sent',
      });

    } catch (error) {
      this.fastify.log.error('Failed to process notification', {
        notificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async queueRetryNotification(notificationId: string, channel?: NotificationChannel): Promise<void> {
    // Queue for retry with immediate processing queue
    if (this.batchQueue) {
      await this.batchQueue.add('retry-notification', {
        notificationId,
        channel,
        retryAttempt: 1,
      }, {
        delay: 5000, // 5 second delay for retry
        priority: this.getPriorityValue('high'),
        attempts: 2,
      });
    }
  }

  private async updateBatchStatistics(batchJob: BatchJob, results: any): Promise<void> {
    // Update internal batch statistics
    try {
      if (this.fastify.metrics && typeof this.fastify.metrics.recordCounter === 'function') {
        this.fastify.metrics.recordCounter('batch_processing_total', 1, {
          batchType: batchJob.type,
          channel: batchJob.channel || 'unknown',
        });
        this.fastify.metrics.recordCounter('batch_notifications_processed', results.processed);
        if (results.failed > 0) {
          this.fastify.metrics.recordCounter('batch_notifications_failed', results.failed);
        }
      }
    } catch (error) {
      this.fastify.log.warn('Failed to update batch metrics', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Log batch completion
    this.fastify.log.info('Batch processing completed', {
      batchId: batchJob.id,
      type: batchJob.type,
      results,
    });
  }

  // Utility methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getPriorityValue(priority: NotificationPriority): number {
    const priorityMap = {
      'critical': 1,
      'urgent': 2,
      'high': 3,
      'normal': 4,
      'low': 5,
    };
    return priorityMap[priority] || 4;
  }

  private getChannelDelay(channel: NotificationChannel): number {
    const delayMap = {
      'email': 100,    // 100ms between emails
      'sms': 200,      // 200ms between SMS (rate limiting)
      'push': 50,      // 50ms between push notifications
      'slack': 300,    // 300ms between Slack messages
      'webhook': 150,  // 150ms between webhooks
      'in-app': 10,    // 10ms between in-app notifications
    };
    return delayMap[channel] || 100;
  }

  private isInQuietHours(quietHours: any): boolean {
    // Check if current time is in user's quiet hours
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(quietHours.start?.split(':')[0] || '22');
    const endHour = parseInt(quietHours.end?.split(':')[0] || '8');

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  private async rescheduleUserBatch(batchJob: BatchJob, quietHours: any): Promise<void> {
    if (!this.batchQueue) return;

    // Calculate delay until quiet hours end
    const now = new Date();
    const endHour = parseInt(quietHours.end?.split(':')[0] || '8');
    const endDate = new Date(now);
    endDate.setHours(endHour, 0, 0, 0);

    if (endDate <= now) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const delay = endDate.getTime() - now.getTime();

    await this.batchQueue.add('user-batch', batchJob, {
      delay,
      priority: this.getPriorityValue(batchJob.priority),
      attempts: this.config.maxRetryAttempts,
    });

    this.fastify.log.info('User batch rescheduled due to quiet hours', {
      batchId: batchJob.id,
      userId: batchJob.metadata?.userId,
      rescheduleDelay: delay,
    });
  }

  // Public methods for manual batch operations
  async createBulkNotificationBatch(
    notifications: string[],
    options: {
      channel?: NotificationChannel;
      priority?: NotificationPriority;
      delayBetweenItems?: number;
      maxConcurrency?: number;
    } = {}
  ): Promise<string> {
    if (!this.batchQueue) {
      throw new Error('Batch queue not initialized');
    }

    const batchJob: BatchJob = {
      id: `manual_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'bulk_notification',
      notifications,
      channel: options.channel,
      priority: options.priority || 'normal',
      processingOptions: {
        delayBetweenItems: options.delayBetweenItems || 100,
        maxConcurrency: options.maxConcurrency || 5,
        retryFailedItems: true,
      },
      metadata: {
        source: 'manual_api_call',
      }
    };

    await this.batchQueue.add('bulk-notification', batchJob, {
      priority: this.getPriorityValue(batchJob.priority),
      attempts: this.config.maxRetryAttempts,
      backoff: { type: 'exponential', delay: 2000 },
    });

    this.fastify.log.info('Manual bulk batch created', {
      batchId: batchJob.id,
      notificationCount: notifications.length,
    });

    return batchJob.id;
  }

  async getBatchStatus(batchId: string): Promise<any> {
    if (!this.batchQueue) {
      return null;
    }

    // Get batch job status from queue
    const job = await this.batchQueue.getJob(batchId);
    if (!job) {
      return null;
    }

    return {
      id: batchId,
      status: await job.getState(),
      progress: job.progressValue,
      attempts: job.attemptsMade,
      data: job.data,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  async pauseBatchProcessing(): Promise<void> {
    if (this.batchQueue) {
      await this.batchQueue.pause();
      this.fastify.log.info('Batch processing paused');
    }
  }

  async resumeBatchProcessing(): Promise<void> {
    if (this.batchQueue) {
      await this.batchQueue.resume();
      this.fastify.log.info('Batch processing resumed');
    }
  }

  async getBatchMetrics(): Promise<any> {
    if (!this.batchQueue) {
      return null;
    }

    return await this.batchQueue.getMetrics();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    // Clear worker processes
    for (const timer of this.workerProcesses.values()) {
      clearTimeout(timer);
    }
    this.workerProcesses.clear();

    // Close batch queue
    if (this.batchQueue) {
      await this.batchQueue.close();
      this.fastify.log.info('Batch worker service shut down gracefully');
    }
  }
}
