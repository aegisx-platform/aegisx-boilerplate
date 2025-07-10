import { FastifyInstance } from 'fastify';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationRecipient,
  NotificationContent,
  NotificationMetadata,
} from '../../../core/shared/types/notification.types';
import { DatabaseNotificationService } from './notification-database-service';
import { NotificationRepository } from '../repositories/notification-repository';
import { IQueueService } from '../../../core/shared/interfaces/queue.interface';
import { QueueFactory } from '../../../core/shared/factories/queue.factory';

export interface QueueNotificationConfig {
  autoProcessEnabled: boolean;
  processInterval: string; // e.g., '30s', '5m', '1h'
  queueBroker: 'redis' | 'rabbitmq';
  redisDb?: number;
  processingConcurrency?: number;
  maxRetryAttempts?: number;
}

export class QueueNotificationService extends DatabaseNotificationService {
  private queueService?: IQueueService;
  private config: QueueNotificationConfig;
  private isProcessorStarted = false;

  constructor(
    fastify: FastifyInstance,
    repository: NotificationRepository,
    config: QueueNotificationConfig
  ) {
    super(fastify, repository);
    this.config = config;
    this.initializeQueue();
  }

  private async initializeQueue(): Promise<void> {
    try {
      // Create queue service using factory
      this.queueService = await QueueFactory.create({
        name: 'notifications',
        broker: this.config.queueBroker,
        redis: this.config.queueBroker === 'redis' ? {
          redis: {
            host: this.fastify.config.REDIS_HOST,
            port: parseInt(this.fastify.config.REDIS_PORT),
            password: this.fastify.config.REDIS_PASSWORD,
            db: this.config.redisDb || 1,
          }
        } : undefined,
        rabbitmq: this.config.queueBroker === 'rabbitmq' ? {
          url: this.fastify.config.RABBITMQ_URL,
          exchange: {
            name: this.fastify.config.RABBITMQ_EXCHANGE,
            type: this.fastify.config.RABBITMQ_EXCHANGE_TYPE as 'direct' | 'topic' | 'fanout' | 'headers',
            durable: this.fastify.config.RABBITMQ_EXCHANGE_DURABLE === 'true',
          },
          prefetch: parseInt(this.fastify.config.RABBITMQ_PREFETCH),
        } : undefined,
      });

      this.fastify.log.info('Queue service initialized for notifications', {
        broker: this.config.queueBroker,
        autoProcessEnabled: this.config.autoProcessEnabled,
        processInterval: this.config.processInterval,
      });

      // Start automatic processing if enabled
      if (this.config.autoProcessEnabled) {
        await this.startAutomaticProcessing();
      }
    } catch (error) {
      this.fastify.log.error('Failed to initialize notification queue service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        broker: this.config.queueBroker,
      });
    }
  }

  private async startAutomaticProcessing(): Promise<void> {
    if (!this.queueService || this.isProcessorStarted) return;

    try {
      // Add automatic processing job
      await this.queueService.add(
        'auto-process-notifications',
        {},
        {
          repeat: { interval: this.config.processInterval },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      // Process the automatic job
      this.queueService.process(
        'auto-process-notifications',
        1, // Single concurrent processor
        async (job) => {
          await this.processQueuedNotifications();
        }
      );

      // Also handle individual notification processing jobs
      this.queueService.process(
        'process-notification',
        this.config.processingConcurrency || 5,
        async (job) => {
          const { notificationId } = job.data;
          return await this.processNotification(notificationId);
        }
      );

      this.isProcessorStarted = true;

      this.fastify.log.info('Automatic notification processing started', {
        interval: this.config.processInterval,
        concurrency: this.config.processingConcurrency || 5,
        broker: this.config.queueBroker,
      });
    } catch (error) {
      this.fastify.log.error('Failed to start automatic notification processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processQueuedNotifications(): Promise<void> {
    try {
      // Get all queued notifications (prioritized)
      const priorities: NotificationPriority[] = ['critical', 'urgent', 'high', 'normal', 'low'];
      
      for (const priority of priorities) {
        const notifications = await this.getQueuedNotifications(priority, 100);
        
        if (notifications.length > 0) {
          this.fastify.log.info('Processing queued notifications', {
            priority,
            count: notifications.length,
          });

          // Queue each notification for individual processing
          for (const notification of notifications) {
            if (this.queueService) {
              await this.queueService.add(
                'process-notification',
                { notificationId: notification.id },
                {
                  priority: this.getPriorityValue(notification.priority),
                  attempts: this.config.maxRetryAttempts || 3,
                  backoff: { type: 'exponential', delay: 2000 },
                  delay: this.getDelayForPriority(notification.priority),
                }
              );
            }
          }
        }
      }

      // Also process scheduled notifications that are due
      const scheduledNotifications = await this.getScheduledNotifications();
      if (scheduledNotifications.length > 0) {
        this.fastify.log.info('Processing scheduled notifications', {
          count: scheduledNotifications.length,
        });

        for (const notification of scheduledNotifications) {
          if (this.queueService) {
            await this.queueService.add(
              'process-notification',
              { notificationId: notification.id },
              {
                priority: this.getPriorityValue(notification.priority),
                attempts: this.config.maxRetryAttempts || 3,
                backoff: { type: 'exponential', delay: 2000 },
              }
            );
          }
        }
      }
    } catch (error) {
      this.fastify.log.error('Error during automatic notification processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Override createNotification to optionally queue immediately
  override async createNotification(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: NotificationContent,
    options: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      metadata?: NotificationMetadata;
      tags?: string[];
      maxAttempts?: number;
      processImmediately?: boolean;
    } = {}
  ): Promise<Notification> {
    // Create in database first
    const notification = await super.createNotification(type, channel, recipient, content, options);

    // If immediate processing is requested and no scheduled time
    if (options.processImmediately && !options.scheduledAt && this.queueService) {
      await this.queueService.add(
        'process-notification',
        { notificationId: notification.id },
        {
          priority: this.getPriorityValue(notification.priority),
          attempts: options.maxAttempts || 3,
          backoff: { type: 'exponential', delay: 2000 },
        }
      );

      this.fastify.log.info('Notification queued for immediate processing', {
        notificationId: notification.id,
        type,
        channel,
        priority: notification.priority,
      });
    }

    return notification;
  }

  // Helper methods for queue management
  async queueNotificationForProcessing(notificationId: string, options: {
    delay?: number;
    priority?: NotificationPriority;
    attempts?: number;
  } = {}): Promise<void> {
    if (!this.queueService) {
      throw new Error('Queue service not initialized');
    }

    await this.queueService.add(
      'process-notification',
      { notificationId },
      {
        delay: options.delay,
        priority: this.getPriorityValue(options.priority || 'normal'),
        attempts: options.attempts || 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    this.fastify.log.info('Notification manually queued for processing', {
      notificationId,
      delay: options.delay,
      priority: options.priority,
    });
  }

  async getQueueMetrics(): Promise<any> {
    if (!this.queueService) {
      return null;
    }

    return await this.queueService.getMetrics();
  }

  async pauseAutomaticProcessing(): Promise<void> {
    if (!this.queueService) return;

    await this.queueService.pause();
    this.fastify.log.info('Automatic notification processing paused');
  }

  async resumeAutomaticProcessing(): Promise<void> {
    if (!this.queueService) return;

    await this.queueService.resume();
    this.fastify.log.info('Automatic notification processing resumed');
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

  private getDelayForPriority(priority: NotificationPriority): number {
    const delayMap = {
      'critical': 0,        // Immediate
      'urgent': 100,        // 100ms delay
      'high': 1000,         // 1 second delay
      'normal': 5000,       // 5 seconds delay
      'low': 30000,         // 30 seconds delay
    };
    return delayMap[priority] || 5000;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.queueService) {
      await this.queueService.close();
      this.fastify.log.info('Queue notification service shut down gracefully');
    }
  }
}