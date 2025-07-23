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
  private cancellationFlags: Map<string, boolean> = new Map();
  private activeBatches: Map<string, { jobId: string; startTime: number; notificationIds: string[] }> = new Map();

  constructor(
    fastify: FastifyInstance,
    repository: NotificationRepository,
    config: BatchWorkerConfig
  ) {
    console.error('🚀 BatchWorkerService constructor called');
    console.error('🚀 config:', config);
    
    this.fastify = fastify;
    this.repository = repository;
    this.config = config;
    
    console.error('🚀 About to initialize batch queue');
    this.initializeBatchQueue();
  }

  private async initializeBatchQueue(): Promise<void> {
    console.error('🔧 initializeBatchQueue called');
    console.error('🔧 config.enabled:', this.config.enabled);
    
    if (!this.config.enabled) {
      console.error('🔧 Batch worker service disabled by config');
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
    console.error('🔥 startBatchProcessors called');
    console.error('🔥 batchQueue exists:', !!this.batchQueue);
    console.error('🔥 isProcessorStarted:', this.isProcessorStarted);
    console.error('🔥 config.enabled:', this.config.enabled);
    
    if (!this.batchQueue || this.isProcessorStarted) {
      console.error('🔥 Exiting early - processors already started or no queue');
      return;
    }

    console.error('🔥 Starting batch processors...');
    try {
      // Bulk notification processor
      this.batchQueue.process(
        'bulk-notification',
        this.config.workerConcurrency,
        async (job) => {
          console.error('🟢 Processing bulk notification job:', job.id);
          this.fastify.log.info('Processing bulk notification job', { jobId: job.id });
          
          const batchJob: BatchJob = job.data;
          console.error('🟢 Batch job data:', batchJob);
          
          const result = await this.processBulkNotifications(batchJob);
          console.error('🟢 Batch processing completed:', result);
          
          return result;
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

      console.error('🎉 Batch processors started successfully!');
      console.error('🎉 workerConcurrency:', this.config.workerConcurrency);
      console.error('🎉 processingInterval:', this.config.processingInterval);
      
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

    // Track active batch
    this.activeBatches.set(batchJob.id, {
      jobId: batchJob.id,
      startTime: Date.now(),
      notificationIds: [...batchJob.notifications]
    });

    const results = {
      processed: 0,
      failed: 0,
      cancelled: 0,
      errors: [] as string[],
    };

    // Process notifications with concurrency control
    const concurrency = batchJob.processingOptions.maxConcurrency || 5;
    const chunks = this.chunkArray(batchJob.notifications, concurrency);

    for (const chunk of chunks) {
      // Check for cancellation before processing chunk
      if (this.isBatchCancelled(batchJob.id)) {
        this.fastify.log.info('Batch processing cancelled by user', { batchId: batchJob.id });
        results.cancelled = batchJob.notifications.length - results.processed;
        break;
      }

      // Process chunk concurrently
      const chunkPromises = chunk.map(async (notificationId) => {
        try {
          // Check cancellation before each notification
          if (this.isBatchCancelled(batchJob.id)) {
            results.cancelled++;
            return;
          }

          await this.processNotification(notificationId);
          results.processed++;

          // Remove from active batch tracking
          const batchInfo = this.activeBatches.get(batchJob.id);
          if (batchInfo) {
            const index = batchInfo.notificationIds.indexOf(notificationId);
            if (index > -1) {
              batchInfo.notificationIds.splice(index, 1);
            }
          }

          // Add delay between items if configured
          if (batchJob.processingOptions.delayBetweenItems) {
            await this.delay(batchJob.processingOptions.delayBetweenItems);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${notificationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Retry failed items if configured and not cancelled
          if (batchJob.processingOptions.retryFailedItems && !this.isBatchCancelled(batchJob.id)) {
            await this.queueRetryNotification(notificationId, batchJob.channel);
          }
        }
      });

      await Promise.all(chunkPromises);
    }

    // Clean up active batch tracking
    this.activeBatches.delete(batchJob.id);
    this.cancellationFlags.delete(batchJob.id);

    // Update batch statistics
    await this.updateBatchStatistics(batchJob, results);

    this.fastify.log.info('Completed bulk notification batch', {
      batchId: batchJob.id,
      processed: results.processed,
      failed: results.failed,
      cancelled: results.cancelled,
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
      console.error('📧 Processing real notification:', notificationId);
      
      this.fastify.log.info('Processing notification in batch', {
        notificationId,
        processedBy: 'batch_worker',
      });

      // Get the actual notification record from database
      const notification = await this.repository.findById(notificationId);
      
      if (!notification) {
        console.error('❌ Notification not found:', notificationId);
        throw new Error(`Notification not found: ${notificationId}`);
      }

      console.error('📧 Found notification:', {
        id: notification.id,
        type: notification.type,
        channel: notification.channel,
        recipientEmail: notification.recipient.email
      });

      // Send the actual notification through the notification service
      if (this.fastify.notificationDatabase) {
        console.error('📧 Sending through notification service...');
        
        // Update status to processing
        await this.repository.updateStatus(notificationId, 'processing');
        
        // Process the notification by ID
        await this.fastify.notificationDatabase.processNotification(notificationId);
        
        console.error('✅ Notification sent successfully:', notificationId);
        
        this.fastify.log.info('Notification processed successfully', {
          notificationId,
          status: 'sent',
          channel: notification.channel,
          recipientEmail: notification.recipient.email
        });
      } else {
        console.error('❌ Notification service not available');
        throw new Error('Notification service not available');
      }

    } catch (error) {
      console.error('❌ Failed to process notification:', error);
      
      this.fastify.log.error('Failed to process notification', {
        notificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Update status to failed
      if (this.repository) {
        await this.repository.updateStatus(notificationId, 'failed', {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'BATCH_PROCESSING_ERROR',
          channel: 'email',
          retryable: true
        });
      }
      
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
    // Update database batch status
    try {
      const finalStatus = results.failed === 0 && results.cancelled === 0 ? 'completed' : 'failed';
      
      console.error('🔄 Updating batch status in database');
      console.error('🔄 batchId:', batchJob.id);
      console.error('🔄 finalStatus:', finalStatus);
      console.error('🔄 results:', results);
      
      await this.repository.updateBatchStatus(batchJob.id, finalStatus, {
        processed: results.processed,
        failed: results.failed,
        cancelled: results.cancelled,
        completedAt: new Date()
      });
      
      console.error('✅ Batch status updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update batch status:', error);
      this.fastify.log.error('Failed to update batch status in database', { 
        batchId: batchJob.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

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
    console.error('🟠🟠🟠 createBulkNotificationBatch called in BatchWorkerService 🟠🟠🟠');
    console.error('🟠 notificationCount:', notifications.length);
    console.error('🟠 options:', options);
    console.error('🟠 queueInitialized:', !!this.batchQueue);
    console.error('🟠 configEnabled:', this.config.enabled);
    console.error('🟠 config:', this.config);

    this.fastify.log.info('createBulkNotificationBatch called', { 
      notificationCount: notifications.length,
      options,
      queueInitialized: !!this.batchQueue,
      configEnabled: this.config.enabled
    });

    if (!this.batchQueue) {
      console.error('🔴 Batch queue not initialized!');
      this.fastify.log.error('Batch queue not initialized', { 
        configEnabled: this.config.enabled,
        config: this.config
      });
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

    console.error('🟣 Adding batch job to queue', batchJob.id);
    this.fastify.log.info('Adding batch job to queue', { batchId: batchJob.id });

    try {
      await this.batchQueue.add('bulk-notification', batchJob, {
        priority: this.getPriorityValue(batchJob.priority),
        attempts: this.config.maxRetryAttempts,
        backoff: { type: 'exponential', delay: 2000 },
      });

      console.error('🟢 Batch job added to queue successfully', batchJob.id);
      this.fastify.log.info('Batch job added to queue successfully', { batchId: batchJob.id });
    } catch (queueError) {
      console.error('🔴 Failed to add batch job to queue:', queueError);
      this.fastify.log.error('Failed to add batch job to queue', { 
        batchId: batchJob.id, 
        error: queueError instanceof Error ? queueError.message : 'Unknown error' 
      });
      throw queueError;
    }

    // Create batch record in database
    console.error('🟦 About to create batch record in database', batchJob.id);
    try {
      console.error('🟦 Calling repository.createBatchRecord');
      this.fastify.log.info('Creating batch record in database', { batchId: batchJob.id });
      
      const created = await this.repository.createBatchRecord(batchJob.id, {
        type: batchJob.type,
        notificationCount: notifications.length,
        channel: options.channel,
        priority: batchJob.priority,
        source: 'manual_api_call',
        processingOptions: batchJob.processingOptions
      });
      
      console.error('🟦 Repository.createBatchRecord returned:', created);
      
      if (created) {
        console.error('🟢 Batch record created successfully in database', batchJob.id);
        this.fastify.log.info('Batch record created successfully in database', { batchId: batchJob.id });
      } else {
        console.error('🔴 Failed to create batch record in database', batchJob.id);
        this.fastify.log.error('Failed to create batch record in database', { batchId: batchJob.id });
      }
    } catch (dbError) {
      console.error('🔴 Database error creating batch record:', dbError);
      this.fastify.log.error('Error creating batch record in database', { 
        batchId: batchJob.id, 
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      // Don't throw error, continue with batch creation
    }

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
      status: this.mapStatusToSchema(await job.getState()),
      progress: job.progressValue || 0,
      attempts: job.attemptsMade || 0,
      data: job.data || {
        type: 'bulk_notification',
        notifications: [],
        priority: 'normal'
      },
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

  // Map database/queue statuses to schema-compliant statuses
  private mapStatusToSchema(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'waiting',
      'created': 'waiting', 
      'queued': 'waiting',
      'processing': 'active',
      'active': 'active',
      'completed': 'completed',
      'finished': 'completed',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'paused',
      'paused': 'paused',
      'delayed': 'delayed'
    };
    
    return statusMap[status.toLowerCase()] || 'waiting';
  }

  async getAllBatches(filters?: { status?: string; limit?: number; offset?: number }): Promise<any> {
    try {
      this.fastify.log.info('Getting all batches with filters', { filters });
      
      // Get batch records from database
      const batches = await this.repository.listBatchRecords(filters);
      this.fastify.log.info('Retrieved batch records from database', { count: batches?.length || 0 });
      
      if (!batches || batches.length === 0) {
        return {
          items: [],
          total: 0
        };
      }
      
      // For each batch, try to get current status from queue if available
      const enrichedBatches = await Promise.all(batches.map(async (batch) => {
        try {
          const queueStatus = await this.getBatchStatus(batch.id);
          
          // Prefer database status over queue status for completed/failed batches
          const metadata = batch.metadata || {};
          const dbStatus = this.mapStatusToSchema(batch.status || 'pending');
          
          if (queueStatus && (dbStatus === 'waiting' || dbStatus === 'active')) {
            // Use queue data only for active/waiting jobs
            return {
              id: batch.id,
              status: this.mapStatusToSchema(queueStatus.status),
              progress: queueStatus.progress || 0,
              attempts: queueStatus.attempts || 0,
              data: queueStatus.data || {
                type: 'bulk_notification',
                notifications: [],
                priority: 'normal'
              },
              processedOn: queueStatus.processedOn,
              finishedOn: queueStatus.finishedOn,
              createdAt: batch.createdAt,
              startedAt: batch.startedAt,
              completedAt: batch.completedAt
            };
          } else {
            // Use database data for completed/failed batches or when queue job not found
            return {
              id: batch.id,
              status: dbStatus,
              progress: batch.status === 'completed' ? 100 : (batch.status === 'failed' ? 0 : 0),
              attempts: 0,
              data: {
                type: metadata.type || 'bulk_notification',
                notifications: metadata.notifications || [],
                priority: metadata.priority || 'normal',
                channel: metadata.channel
              },
              createdAt: batch.createdAt,
              startedAt: batch.startedAt,
              completedAt: batch.completedAt
            };
          }
        } catch (queueError) {
          this.fastify.log.warn('Failed to get queue status for batch, using database data', { 
            batchId: batch.id, 
            error: queueError instanceof Error ? queueError.message : 'Unknown error' 
          });
          
          // Fall back to database data if queue check fails
          const metadata = batch.metadata || {};
          
          return {
            id: batch.id,
            status: batch.status || 'created',
            progress: batch.status === 'completed' ? 100 : 0,
            attempts: 0,
            data: {
              type: metadata.type || 'bulk_notification',
              notifications: metadata.notifications || [],
              priority: metadata.priority || 'normal',
              channel: metadata.channel
            },
            createdAt: batch.createdAt,
            startedAt: batch.startedAt,
            completedAt: batch.completedAt
          };
        }
      }));

      this.fastify.log.info('Successfully enriched batch data', { count: enrichedBatches.length });

      return {
        items: enrichedBatches,
        total: enrichedBatches.length
      };
    } catch (error) {
      this.fastify.log.error('Error getting all batches', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Return empty result instead of throwing
      return { 
        items: [], 
        total: 0 
      };
    }
  }

  // Real batch cancellation methods
  async cancelBatch(batchId: string): Promise<boolean> {
    if (!this.batchQueue) {
      this.fastify.log.warn('Cannot cancel batch - queue not initialized', { batchId });
      return false;
    }

    try {
      // Get the job from queue
      const job = await this.batchQueue.getJob(batchId);
      if (!job) {
        this.fastify.log.warn('Batch job not found in queue', { batchId });
        return false;
      }

      const jobState = await job.getState();
      this.fastify.log.info('Attempting to cancel batch', { batchId, currentState: jobState });

      switch (jobState) {
        case 'waiting':
        case 'delayed':
          // Remove job from queue before it starts
          await job.remove();
          await this.updateBatchStatus(batchId, 'cancelled', { reason: 'Cancelled by user', previousState: jobState });
          this.fastify.log.info('Batch job removed from queue', { batchId });
          return true;

        case 'active':
          // Set cancellation flag for graceful shutdown
          this.cancellationFlags.set(batchId, true);
          
          // Try to discard the job
          await job.discard();
          
          // Stop processing notifications in this batch
          await this.stopProcessingNotifications(batchId);
          
          await this.updateBatchStatus(batchId, 'cancelled', { 
            reason: 'Cancelled during processing', 
            previousState: jobState,
            partiallyProcessed: true
          });
          
          this.fastify.log.info('Active batch job cancelled', { batchId });
          return true;

        case 'completed':
        case 'failed':
          this.fastify.log.warn('Cannot cancel batch - already completed', { batchId, state: jobState });
          return false;

        default:
          this.fastify.log.warn('Unknown batch state for cancellation', { batchId, state: jobState });
          return false;
      }
    } catch (error) {
      this.fastify.log.error('Error cancelling batch', { 
        batchId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  private async stopProcessingNotifications(batchId: string): Promise<void> {
    try {
      const batchInfo = this.activeBatches.get(batchId);
      if (!batchInfo) {
        this.fastify.log.warn('No active batch info found', { batchId });
        return;
      }

      this.fastify.log.info('Stopping notification processing for batch', { 
        batchId, 
        remainingNotifications: batchInfo.notificationIds.length 
      });

      // Cancel remaining notifications that haven't been processed
      const cancelPromises = batchInfo.notificationIds.map(async (notificationId) => {
        try {
          await this.repository.updateStatus(notificationId, 'cancelled', {
            cancelledBy: 'batch_cancellation',
            batchId,
            timestamp: new Date()
          });
        } catch (error) {
          this.fastify.log.error('Failed to cancel notification', { 
            notificationId, 
            batchId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      await Promise.allSettled(cancelPromises);

      // Clean up active batch tracking
      this.activeBatches.delete(batchId);
      this.cancellationFlags.delete(batchId);

      this.fastify.log.info('Finished stopping notification processing', { batchId });
    } catch (error) {
      this.fastify.log.error('Error stopping notification processing', { 
        batchId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async updateBatchStatus(batchId: string, status: string, metadata?: any): Promise<void> {
    try {
      // Update status in database
      await this.repository.updateBatchStatus(batchId, status as any, metadata);

      // Emit event for real-time updates
      if (this.fastify.eventBus) {
        await this.fastify.eventBus.publish('batch_status_changed', {
          batchId,
          status,
          metadata,
          timestamp: new Date()
        });
      }

      // Record audit log
      if (this.fastify.auditLog) {
        await this.fastify.auditLog.log({
          action: `batch_${status}`,
          resource: 'notification_batch',
          resourceId: batchId,
          metadata: {
            ...metadata,
            service: 'batch_worker'
          }
        });
      }

      this.fastify.log.info('Batch status updated', { batchId, status, metadata });
    } catch (error) {
      this.fastify.log.error('Failed to update batch status', { 
        batchId, 
        status, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private isBatchCancelled(batchId: string): boolean {
    return this.cancellationFlags.get(batchId) === true;
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
