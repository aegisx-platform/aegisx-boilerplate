import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import {
  NotificationConfig,
  Notification,
  NotificationRecipient,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
  NotificationEvents,
  NotificationStatistics,
  NotificationQueue,
  NotificationTemplate,
  NotificationError,
  NotificationEventData,
} from '../types/notification.types';

export class NotificationService extends EventEmitter {
  private fastify: FastifyInstance;
  private config: NotificationConfig;
  private notifications: Map<string, Notification> = new Map();
  private queues: Map<string, NotificationQueue> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private statistics: NotificationStatistics;
  private processing = false;
  private processingInterval?: NodeJS.Timeout;
  private rateLimitCounts: Map<string, { count: number; window: Date }> = new Map();

  constructor(fastify: FastifyInstance, config?: Partial<NotificationConfig>) {
    super();
    this.fastify = fastify;
    this.config = this.buildConfig(config);
    this.statistics = this.initializeStatistics();
    this.initializeQueues();
    this.startProcessing();
  }

  private buildConfig(config?: Partial<NotificationConfig>): NotificationConfig {
    return {
      enabledChannels: config?.enabledChannels ?? ['email', 'sms', 'push'],
      defaultChannel: config?.defaultChannel ?? 'email',
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 5000,
      queueEnabled: config?.queueEnabled ?? true,
      queueMaxSize: config?.queueMaxSize ?? 10000,
      rateLimiting: {
        enabled: true,
        maxPerMinute: 100,
        maxPerHour: 1000,
        maxPerDay: 10000,
        burst: 20,
        ...config?.rateLimiting,
      },
      templates: {
        useTemplateEngine: true,
        defaultTemplates: {
          welcome: 'welcome-email',
          verification: 'email-verification',
          'password-reset': 'password-reset',
          'security-alert': 'security-alert',
          'appointment-reminder': 'appointment-reminder',
          'appointment-confirmation': 'appointment-confirmation',
          'lab-results': 'lab-results-notification',
          'prescription-ready': 'prescription-ready',
          'billing-statement': 'billing-statement',
          'system-maintenance': 'system-maintenance',
          'feature-announcement': 'feature-announcement',
          'compliance-alert': 'compliance-alert',
          emergency: 'emergency-notification',
          custom: 'custom-template',
        },
        customTemplates: {},
        ...config?.templates,
      },
      providers: {
        email: {
          provider: 'smtp',
          smtp: {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || '',
            },
          },
          from: {
            email: process.env.FROM_EMAIL || 'noreply@aegisx.com',
            name: process.env.FROM_NAME || 'AegisX System',
          },
          ...config?.providers?.email,
        },
        sms: {
          provider: 'twilio',
          twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID || '',
            authToken: process.env.TWILIO_AUTH_TOKEN || '',
            from: process.env.TWILIO_FROM || '',
          },
          ...config?.providers?.sms,
        },
        push: {
          provider: 'fcm',
          fcm: {
            serverKey: process.env.FCM_SERVER_KEY || '',
            projectId: process.env.FCM_PROJECT_ID || '',
          },
          ...config?.providers?.push,
        },
        webhook: {
          defaultTimeout: 30000,
          retryAttempts: 3,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AegisX-Notifications/1.0',
          },
          ...config?.providers?.webhook,
        },
        slack: {
          botToken: process.env.SLACK_BOT_TOKEN || '',
          defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#general',
          ...config?.providers?.slack,
        },
        ...config?.providers,
      },
    };
  }

  private initializeStatistics(): NotificationStatistics {
    const channelStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      averageDeliveryTime: 0,
      errorRate: 0,
    };

    const typeStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      mostUsedChannel: 'email' as NotificationChannel,
    };

    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byChannel: {
        email: { ...channelStats },
        sms: { ...channelStats },
        push: { ...channelStats },
        webhook: { ...channelStats },
        slack: { ...channelStats },
        'in-app': { ...channelStats },
      },
      byType: {
        welcome: { ...typeStats },
        verification: { ...typeStats },
        'password-reset': { ...typeStats },
        'security-alert': { ...typeStats },
        'appointment-reminder': { ...typeStats },
        'appointment-confirmation': { ...typeStats },
        'lab-results': { ...typeStats },
        'prescription-ready': { ...typeStats },
        'billing-statement': { ...typeStats },
        'system-maintenance': { ...typeStats },
        'feature-announcement': { ...typeStats },
        'compliance-alert': { ...typeStats },
        emergency: { ...typeStats },
        custom: { ...typeStats },
      },
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
        critical: 0,
      },
      recentTrends: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        weekly: new Array(4).fill(0),
      },
      performance: {
        averageDeliveryTime: 0,
        deliveryRate: 0,
        errorRate: 0,
      },
    };
  }

  private initializeQueues(): void {
    if (!this.config.queueEnabled) return;

    const priorities: NotificationPriority[] = ['critical', 'urgent', 'high', 'normal', 'low'];
    
    priorities.forEach(priority => {
      const queue: NotificationQueue = {
        id: `queue_${priority}`,
        name: `${priority} Priority Queue`,
        priority,
        maxSize: Math.floor(this.config.queueMaxSize / priorities.length),
        currentSize: 0,
        processing: false,
        paused: false,
        metrics: {
          totalProcessed: 0,
          totalFailed: 0,
          averageProcessingTime: 0,
          currentThroughput: 0,
          errorRate: 0,
        },
      };
      
      this.queues.set(priority, queue);
    });

    this.fastify.log.info('Notification queues initialized', {
      queues: Array.from(this.queues.keys()),
      totalMaxSize: this.config.queueMaxSize,
    });
  }

  private startProcessing(): void {
    if (!this.config.queueEnabled || this.processing) return;

    this.processing = true;
    this.processingInterval = setInterval(async () => {
      await this.processQueues();
    }, 1000); // Process every second

    this.fastify.log.info('Notification processing started');
  }

  private async processQueues(): Promise<void> {
    if (!this.processing) return;

    const priorities: NotificationPriority[] = ['critical', 'urgent', 'high', 'normal', 'low'];
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (!queue || queue.paused || queue.processing) continue;

      await this.processQueue(queue);
    }
  }

  private async processQueue(queue: NotificationQueue): Promise<void> {
    if (queue.currentSize === 0) return;

    queue.processing = true;
    const startTime = Date.now();

    try {
      // Find notifications for this queue
      const queueNotifications = Array.from(this.notifications.values())
        .filter(n => n.priority === queue.priority && n.status === 'queued')
        .sort((a, b) => (a.scheduledAt || a.sentAt || new Date()).getTime() - (b.scheduledAt || b.sentAt || new Date()).getTime())
        .slice(0, 10); // Process up to 10 at a time

      for (const notification of queueNotifications) {
        await this.processNotification(notification);
        queue.metrics.totalProcessed++;
      }

      queue.lastProcessed = new Date();
      queue.metrics.averageProcessingTime = 
        (queue.metrics.averageProcessingTime + (Date.now() - startTime)) / 2;

    } catch (error) {
      this.fastify.log.error(`Error processing queue ${queue.name}:`, error);
      queue.metrics.totalFailed++;
    } finally {
      queue.processing = false;
    }
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(notification)) {
        this.fastify.log.warn('Rate limit exceeded for notification', {
          notificationId: notification.id,
          channel: notification.channel,
        });
        return;
      }

      notification.status = 'processing';
      this.updateNotification(notification);

      // Process based on channel
      const success = await this.sendNotification(notification);

      if (success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        this.updateStatistics(notification, 'sent');
        this.emit('notification-sent', this.createEventData('notification-sent', notification.id));
      } else {
        throw new Error('Notification sending failed');
      }

    } catch (error) {
      await this.handleNotificationError(notification, error);
    }
  }

  private async sendNotification(notification: Notification): Promise<boolean> {
    const { channel } = notification;

    try {
      switch (channel) {
        case 'email':
          return await this.sendEmail(notification);
        case 'sms':
          return await this.sendSms(notification);
        case 'push':
          return await this.sendPush(notification);
        case 'slack':
          return await this.sendSlack(notification);
        case 'webhook':
          return await this.sendWebhook(notification);
        case 'in-app':
          return await this.sendInApp(notification);
        default:
          throw new Error(`Unsupported notification channel: ${channel}`);
      }
    } catch (error) {
      this.fastify.log.error(`Error sending ${channel} notification:`, error);
      return false;
    }
  }

  private async sendEmail(notification: Notification): Promise<boolean> {
    // Template rendering
    let content = notification.content;
    if (this.config.templates.useTemplateEngine && this.fastify.templateEngine) {
      try {
        const templateName = content.template || 
          this.config.templates.defaultTemplates[notification.type];
        
        if (templateName && content.templateData) {
          const rendered = await this.fastify.templateEngine.render(
            templateName, 
            content.templateData
          );
          content = {
            ...content,
            html: (rendered as any).html || (rendered as any).content,
            text: (rendered as any).text || (rendered as any).content, // Could strip HTML for text version
          };
        }
      } catch (error) {
        this.fastify.log.warn('Template rendering failed, using raw content:', error);
      }
    }

    // Email sending logic would go here
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.fastify.log.info('Email notification sent', {
      to: notification.recipient.email,
      subject: notification.subject,
      notificationId: notification.id,
    });

    return true;
  }

  private async sendSms(notification: Notification): Promise<boolean> {
    // SMS sending logic would go here
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.fastify.log.info('SMS notification sent', {
      to: notification.recipient.phone,
      notificationId: notification.id,
    });

    return true;
  }

  private async sendPush(notification: Notification): Promise<boolean> {
    // Push notification logic would go here
    await new Promise(resolve => setTimeout(resolve, 30));
    
    this.fastify.log.info('Push notification sent', {
      deviceToken: notification.recipient.deviceToken,
      notificationId: notification.id,
    });

    return true;
  }

  private async sendSlack(notification: Notification): Promise<boolean> {
    // Slack notification logic would go here
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.fastify.log.info('Slack notification sent', {
      channel: notification.recipient.slackChannel,
      notificationId: notification.id,
    });

    return true;
  }

  private async sendWebhook(notification: Notification): Promise<boolean> {
    // Webhook notification logic would go here
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.fastify.log.info('Webhook notification sent', {
      url: notification.recipient.webhookUrl,
      notificationId: notification.id,
    });

    return true;
  }

  private async sendInApp(notification: Notification): Promise<boolean> {
    // In-app notification logic would go here
    // This could store in database or real-time system
    
    this.fastify.log.info('In-app notification sent', {
      userId: notification.recipient.id,
      notificationId: notification.id,
    });

    return true;
  }

  private checkRateLimit(notification: Notification): boolean {
    if (!this.config.rateLimiting.enabled) return true;

    const key = `${notification.channel}_${notification.recipient.id || 'anonymous'}`;
    const now = new Date();
    const limit = this.rateLimitCounts.get(key);

    if (!limit || now.getTime() - limit.window.getTime() > 60000) {
      // Reset window
      this.rateLimitCounts.set(key, { count: 1, window: now });
      return true;
    }

    if (limit.count >= this.config.rateLimiting.maxPerMinute) {
      return false;
    }

    limit.count++;
    return true;
  }

  private async handleNotificationError(notification: Notification, error: any): Promise<void> {
    const errorDetails: NotificationError = {
      timestamp: new Date(),
      error: error.message || 'Unknown error',
      code: error.code,
      retryable: this.isRetryableError(error),
      channel: notification.channel,
    };

    notification.errors.push(errorDetails);
    notification.attempts++;

    if (notification.attempts >= notification.maxAttempts || !errorDetails.retryable) {
      notification.status = 'failed';
      notification.failedAt = new Date();
      this.updateStatistics(notification, 'failed');
      this.emit('notification-failed', this.createEventData('notification-failed', notification.id, error));
    } else {
      // Schedule retry
      notification.status = 'queued';
      if (this.fastify.retryService) {
        setTimeout(async () => {
          await this.processNotification(notification);
        }, this.config.retryDelay * Math.pow(2, notification.attempts - 1)); // Exponential backoff
      }
    }

    this.updateNotification(notification);
  }

  private isRetryableError(error: any): boolean {
    // Define which errors are retryable
    if (error.code === 'NETWORK_ERROR') return true;
    if (error.code === 'RATE_LIMITED') return true;
    if (error.code === 'TEMPORARY_FAILURE') return true;
    if (error.message?.includes('timeout')) return true;
    
    return false;
  }

  // Public API methods
  async sendNotificationAsync(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: any,
    options: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      metadata?: any;
      tags?: string[];
    } = {}
  ): Promise<string> {
    if (!this.config.enabledChannels.includes(channel)) {
      throw new Error(`Channel ${channel} is not enabled`);
    }

    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      channel,
      recipient,
      content,
      metadata: options.metadata || {},
      status: 'queued',
      priority: options.priority || 'normal',
      scheduledAt: options.scheduledAt,
      attempts: 0,
      maxAttempts: this.config.retryAttempts,
      errors: [],
      tags: options.tags || [],
    };

    // Add to statistics
    this.statistics.total++;
    this.statistics.pending++;
    this.statistics.byPriority[notification.priority]++;

    // Store notification
    this.notifications.set(notification.id, notification);

    // Update queue size
    const queue = this.queues.get(notification.priority);
    if (queue) {
      queue.currentSize++;
    }

    this.emit('notification-queued', this.createEventData('notification-queued', notification.id));

    this.fastify.log.info('Notification queued', {
      notificationId: notification.id,
      type,
      channel,
      priority: notification.priority,
    });

    return notification.id;
  }

  async sendBatch(notifications: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    recipient: NotificationRecipient;
    content: any;
    options?: any;
  }>): Promise<string> {
    const batchId = this.generateBatchId();
    const notificationIds: string[] = [];

    for (const notif of notifications) {
      try {
        const id = await this.sendNotificationAsync(
          notif.type,
          notif.channel,
          notif.recipient,
          notif.content,
          notif.options
        );
        notificationIds.push(id);
      } catch (error) {
        this.fastify.log.error('Failed to queue notification in batch:', error);
      }
    }

    // const batch: NotificationBatch = {
    //   id: batchId,
    //   notifications: notificationIds,
    //   status: 'pending',
    //   createdAt: new Date(),
    //   totalCount: notifications.length,
    //   successCount: notificationIds.length,
    //   failureCount: notifications.length - notificationIds.length,
    //   errors: [],
    // };

    this.emit('batch-created', this.createEventData('batch-created', batchId));

    return batchId;
  }

  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  getNotificationStatus(id: string): NotificationStatus | undefined {
    return this.notifications.get(id)?.status;
  }

  getStatistics(): NotificationStatistics {
    return { ...this.statistics };
  }

  getQueues(): NotificationQueue[] {
    return Array.from(this.queues.values());
  }

  pauseQueue(priority: NotificationPriority): void {
    const queue = this.queues.get(priority);
    if (queue) {
      queue.paused = true;
      this.emit('queue-paused', this.createEventData('queue-paused', priority));
    }
  }

  resumeQueue(priority: NotificationPriority): void {
    const queue = this.queues.get(priority);
    if (queue) {
      queue.paused = false;
      this.emit('queue-resumed', this.createEventData('queue-resumed', priority));
    }
  }

  cancelNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification || notification.status !== 'queued') {
      return false;
    }

    notification.status = 'cancelled';
    this.updateNotification(notification);
    this.emit('notification-cancelled', this.createEventData('notification-cancelled', id));
    
    return true;
  }

  // Template management
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'metadata'>): string {
    const id = this.generateTemplateId();
    const fullTemplate: NotificationTemplate = {
      ...template,
      id,
      metadata: {
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    };

    this.templates.set(id, fullTemplate);
    return id;
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  // Configuration management
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.fastify.log.info('Notification service configuration updated');
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Utility methods
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
  }

  private updateStatistics(notification: Notification, action: 'sent' | 'delivered' | 'failed'): void {
    this.statistics[action]++;
    this.statistics.byChannel[notification.channel][action]++;
    this.statistics.byType[notification.type][action]++;

    if (action === 'sent') {
      this.statistics.pending--;
    }

    // Update performance metrics
    if (action === 'delivered' && notification.sentAt && notification.deliveredAt) {
      const deliveryTime = notification.deliveredAt.getTime() - notification.sentAt.getTime();
      this.statistics.performance.averageDeliveryTime = 
        (this.statistics.performance.averageDeliveryTime + deliveryTime) / 2;
    }

    this.statistics.performance.deliveryRate = 
      this.statistics.delivered / (this.statistics.sent || 1);
    this.statistics.performance.errorRate = 
      this.statistics.failed / (this.statistics.total || 1);
  }

  private createEventData(type: NotificationEvents, id?: string, data?: any): NotificationEventData {
    return {
      type,
      timestamp: new Date(),
      notificationId: id,
      data,
    };
  }

  shutdown(): void {
    this.processing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.removeAllListeners();
    this.fastify.log.info('Notification service shutdown');
  }
}