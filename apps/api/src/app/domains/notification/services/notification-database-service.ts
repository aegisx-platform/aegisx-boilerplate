import { FastifyInstance } from 'fastify';
import {
  Notification,
  NotificationTemplate,
  NotificationPreferences,
  NotificationBatch,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationRecipient,
  NotificationContent,
  NotificationMetadata,
} from '../../../core/shared/types/notification.types';
import { NotificationRepository, NotificationFilters } from '../repositories/notification-repository';
import { EmailService, defaultEmailConfig } from './email-service';
import { DynamicEmailService } from './dynamic-email-service';

export interface NotificationDatabaseService {
  // Core notification operations
  createNotification(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: NotificationContent,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      metadata?: NotificationMetadata;
      tags?: string[];
      maxAttempts?: number;
    }
  ): Promise<Notification>;

  getNotification(id: string): Promise<Notification | null>;
  findNotifications(filters: NotificationFilters): Promise<Notification[]>;
  updateNotificationStatus(id: string, status: NotificationStatus, metadata?: any): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;

  // Queue operations
  getQueuedNotifications(priority?: NotificationPriority, limit?: number): Promise<Notification[]>;
  getScheduledNotifications(beforeDate?: Date): Promise<Notification[]>;
  processNotification(id: string): Promise<boolean>;

  // Template operations
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'metadata'>): Promise<NotificationTemplate>;
  getTemplate(id: string): Promise<NotificationTemplate | null>;
  getTemplateByName(name: string): Promise<NotificationTemplate | null>;
  getTemplatesByType(type: NotificationType): Promise<NotificationTemplate[]>;
  updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null>;
  deleteTemplate(id: string): Promise<boolean>;
  listTemplates(): Promise<NotificationTemplate[]>;

  // User preferences
  getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
  setUserPreferences(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferences>;
  updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | null>;

  // Batch operations
  createBatch(name?: string): Promise<NotificationBatch>;
  addNotificationsToBatch(batchId: string, notificationIds: string[]): Promise<void>;
  processBatch(batchId: string): Promise<void>;
  getBatch(id: string): Promise<NotificationBatch | null>;
  getBatchNotifications(batchId: string): Promise<Notification[]>;

  // Analytics and statistics
  getNotificationCounts(filters?: NotificationFilters): Promise<number>;
  getDeliveryMetrics(dateFrom: Date, dateTo: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
  }>;
  getChannelStatistics(dateFrom: Date, dateTo: Date): Promise<Array<{
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }>>;

  // Healthcare specific
  createHealthcareNotification(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: NotificationContent,
    healthcareMetadata: {
      patientId?: string;
      providerId?: string;
      appointmentId?: string;
      facilityId?: string;
      department?: string;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      hipaaCompliant?: boolean;
      encryptionEnabled?: boolean;
    },
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      tags?: string[];
    }
  ): Promise<Notification>;

  // Error tracking
  recordNotificationError(
    notificationId: string,
    channel: NotificationChannel,
    error: {
      message: string;
      code?: string;
      retryable?: boolean;
    }
  ): Promise<void>;
  getNotificationErrors(notificationId: string): Promise<Array<{
    id: number;
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
    occurredAt: Date;
  }>>;

  // Error management
  getAllErrors(filters: {
    channel?: string;
    type?: string;
    retryable?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ errors: any[]; total: number }>;
  getErrorStatistics(days: number, groupBy: string): Promise<any>;
  exportErrors(filters: {
    channel?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }, format: string): Promise<string>;
}

export class DatabaseNotificationService implements NotificationDatabaseService {
  private emailService: EmailService;
  private dynamicEmailService?: DynamicEmailService;

  constructor(
    protected fastify: FastifyInstance,
    protected repository: NotificationRepository
  ) {
    this.emailService = new EmailService(fastify, defaultEmailConfig);
    // Try to get dynamic email service if available
    this.initializeDynamicEmailService();
  }

  private initializeDynamicEmailService(): void {
    try {
      this.dynamicEmailService = (this.fastify as any).dynamicEmailService;
      if (this.dynamicEmailService) {
        this.fastify.log.info('Dynamic email service initialized in notification service');
      } else {
        this.fastify.log.info('Dynamic email service not available, using static email service');
      }
    } catch (error) {
      this.fastify.log.warn('Failed to initialize dynamic email service:', error);
    }
  }

  /**
   * Refresh dynamic email service (used when configuration is updated)
   */
  public refreshDynamicEmailService(): void {
    this.initializeDynamicEmailService();
  }

  /**
   * Get current email service status
   */
  public getEmailServiceStatus(): {
    hasDynamicService: boolean;
    hasStaticService: boolean;
    dynamicServiceStatus?: any;
  } {
    return {
      hasDynamicService: !!this.dynamicEmailService,
      hasStaticService: !!this.emailService,
      dynamicServiceStatus: this.dynamicEmailService?.getServiceStatus(),
    };
  }

  // Core notification operations
  async createNotification(
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
    } = {}
  ): Promise<Notification> {
    // Clean and sanitize metadata to prevent JSON errors
    const sanitizedMetadata = this.sanitizeMetadata(options.metadata || { source: 'api' });
    
    const notification: Omit<Notification, 'errors'> = {
      id: this.generateNotificationId(),
      type,
      channel,
      recipient,
      content,
      metadata: sanitizedMetadata,
      status: 'queued',
      priority: options.priority || 'normal',
      scheduledAt: options.scheduledAt,
      sentAt: undefined,
      deliveredAt: undefined,
      failedAt: undefined,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      tags: options.tags || [],
      subject: content.text?.substring(0, 255) || `${type} notification`, // Auto-generate subject from content if not provided
    };

    let created: Notification;
    try {
      created = await this.repository.create(notification);
    } catch (error) {
      this.fastify.log.error('Failed to create notification in repository:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    // Log creation
    this.fastify.log.info('Notification created in database', {
      notificationId: created.id,
      type,
      channel,
      priority: created.priority,
      recipientId: recipient.id,
    });

    // Emit event for real-time integration
    if (this.fastify.eventBus) {
      await this.fastify.eventBus.publish('notification.created', {
        notificationId: created.id,
        type,
        channel,
        recipientId: recipient.id,
        priority: created.priority,
      });
    }

    return created;
  }

  async getNotification(id: string): Promise<Notification | null> {
    const notification = await this.repository.findById(id);
    
    if (notification) {
      // Load errors separately
      const errors = await this.repository.getErrors(id);
      notification.errors = errors.map(error => ({
        timestamp: error.occurredAt,
        error: error.errorMessage,
        code: error.errorCode,
        retryable: error.retryable,
        channel: error.channel,
      }));
    }

    return notification;
  }

  async findNotifications(filters: NotificationFilters): Promise<Notification[]> {
    return this.repository.findMany(filters);
  }

  async updateNotificationStatus(id: string, status: NotificationStatus, metadata?: any): Promise<boolean> {
    const updated = await this.repository.updateStatus(id, status, metadata);

    if (updated) {
      this.fastify.log.info('Notification status updated', {
        notificationId: id,
        status,
      });

      // Emit event for real-time updates
      if (this.fastify.eventBus) {
        await this.fastify.eventBus.publish('notification.status_updated', {
          notificationId: id,
          status,
          timestamp: new Date(),
        });
      }

      // Record statistics
      await this.recordStatistic(status, id);
    }

    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const deleted = await this.repository.delete(id);

    if (deleted) {
      this.fastify.log.info('Notification deleted', { notificationId: id });
    }

    return deleted;
  }

  // Queue operations
  async getQueuedNotifications(priority?: NotificationPriority, limit = 100): Promise<Notification[]> {
    return this.repository.getQueuedNotifications(priority, limit);
  }

  async getScheduledNotifications(beforeDate = new Date()): Promise<Notification[]> {
    return this.repository.getScheduledNotifications(beforeDate);
  }

  async processNotification(id: string): Promise<boolean> {
    const notification = await this.getNotification(id);
    if (!notification) return false;

    try {
      // Update status to processing
      await this.updateNotificationStatus(id, 'processing');

      // Simulate processing (in real implementation, this would call the actual notification service)
      await this.simulateNotificationSending(notification);

      // Update status to sent
      await this.repository.update(id, { 
        status: 'sent',
        sentAt: new Date(),
        attempts: notification.attempts + 1,
      });

      // For development/testing: simulate delivery confirmation
      // In production, this should be triggered by email service webhooks
      setTimeout(async () => {
        try {
          await this.repository.update(id, { 
            status: 'delivered',
            deliveredAt: new Date(),
          });
          
          this.fastify.log.info('Notification marked as delivered', {
            notificationId: id,
            channel: notification.channel,
          });

          // Emit delivery event
          if (this.fastify.eventBus) {
            await this.fastify.eventBus.publish('notification.delivered', {
              notificationId: id,
              channel: notification.channel,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          this.fastify.log.error('Failed to update delivery status', {
            notificationId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }, 2000 + Math.random() * 3000); // Simulate 2-5 second delivery delay

      this.fastify.log.info('Notification processed successfully', {
        notificationId: id,
        channel: notification.channel,
      });

      return true;
    } catch (error) {
      // Record error
      await this.recordNotificationError(id, notification.channel, {
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      });

      // Update notification with error status
      const newAttempts = notification.attempts + 1;
      if (newAttempts >= notification.maxAttempts) {
        await this.repository.update(id, {
          status: 'failed',
          failedAt: new Date(),
          attempts: newAttempts,
        });
      } else {
        await this.repository.update(id, {
          status: 'queued', // Retry
          attempts: newAttempts,
        });
      }

      this.fastify.log.error('Notification processing failed', {
        notificationId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: newAttempts,
      });

      return false;
    }
  }

  // Template operations
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'metadata'>): Promise<NotificationTemplate> {
    const created = await this.repository.createTemplate(template);

    this.fastify.log.info('Notification template created', {
      templateId: created.id,
      name: created.name,
      type: created.type,
    });

    return created;
  }

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.repository.findTemplateById(id);
  }

  async getTemplateByName(name: string): Promise<NotificationTemplate | null> {
    return this.repository.findTemplateByName(name);
  }

  async getTemplatesByType(type: NotificationType): Promise<NotificationTemplate[]> {
    return this.repository.findTemplatesByType(type);
  }

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
    const updated = await this.repository.updateTemplate(id, updates);

    if (updated) {
      this.fastify.log.info('Notification template updated', {
        templateId: id,
        name: updated.name,
      });
    }

    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = await this.repository.deleteTemplate(id);

    if (deleted) {
      this.fastify.log.info('Notification template deleted', { templateId: id });
    }

    return deleted;
  }

  async listTemplates(): Promise<NotificationTemplate[]> {
    return this.repository.listActiveTemplates();
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    return this.repository.getUserPreferences(userId);
  }

  async setUserPreferences(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferences> {
    const saved = await this.repository.setUserPreferences(preferences);

    this.fastify.log.info('User notification preferences set', {
      userId: preferences.userId,
      channels: preferences.channels,
    });

    return saved;
  }

  async updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | null> {
    const updated = await this.repository.updateUserPreferences(userId, updates);

    if (updated) {
      this.fastify.log.info('User notification preferences updated', {
        userId,
        channels: updated.channels,
      });
    }

    return updated;
  }

  // Batch operations
  async createBatch(name?: string): Promise<NotificationBatch> {
    const batch: Omit<NotificationBatch, 'createdAt' | 'startedAt' | 'completedAt'> = {
      id: this.generateBatchId(),
      name: name || `Batch ${new Date().toISOString()}`,
      notifications: [],
      status: 'pending',
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const created = await this.repository.createBatch(batch);

    this.fastify.log.info('Notification batch created', {
      batchId: created.id,
      name: created.name,
    });

    return created;
  }

  async addNotificationsToBatch(batchId: string, notificationIds: string[]): Promise<void> {
    for (const notificationId of notificationIds) {
      await this.repository.addNotificationToBatch(batchId, notificationId);
    }

    // Update batch count
    const batch = await this.repository.getBatch(batchId);
    if (batch) {
      await this.repository.updateBatchStatus(batchId, 'pending', {
        totalCount: batch.totalCount + notificationIds.length,
      });
    }

    this.fastify.log.info('Notifications added to batch', {
      batchId,
      count: notificationIds.length,
    });
  }

  async processBatch(batchId: string): Promise<void> {
    const batch = await this.repository.getBatch(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    await this.repository.updateBatchStatus(batchId, 'processing');

    const notifications = await this.repository.getBatchNotifications(batchId);
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    this.fastify.log.info('Processing notification batch', {
      batchId,
      notificationCount: notifications.length,
    });

    for (const notification of notifications) {
      try {
        const success = await this.processNotification(notification.id);
        if (success) {
          successCount++;
        } else {
          failureCount++;
          errors.push(`Failed to process notification ${notification.id}`);
        }
      } catch (error) {
        failureCount++;
        errors.push(`Error processing notification ${notification.id}: ${error}`);
      }
    }

    await this.repository.updateBatchStatus(batchId, 'completed', {
      successCount,
      failureCount,
      errors,
    });

    this.fastify.log.info('Notification batch processing completed', {
      batchId,
      totalCount: notifications.length,
      successCount,
      failureCount,
    });
  }

  async getBatch(id: string): Promise<NotificationBatch | null> {
    return this.repository.getBatch(id);
  }

  async getBatchNotifications(batchId: string): Promise<Notification[]> {
    return this.repository.getBatchNotifications(batchId);
  }

  // Analytics and statistics
  async getNotificationCounts(filters: NotificationFilters = {}): Promise<number> {
    return this.repository.getNotificationCounts(filters);
  }

  async getDeliveryMetrics(dateFrom: Date, dateTo: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
  }> {
    return this.repository.getDeliveryMetrics(dateFrom, dateTo);
  }

  async getChannelStatistics(dateFrom: Date, dateTo: Date): Promise<Array<{
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }>> {
    return this.repository.getChannelStats(dateFrom, dateTo);
  }

  // Healthcare specific
  async createHealthcareNotification(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: NotificationContent,
    healthcareMetadata: {
      patientId?: string;
      providerId?: string;
      appointmentId?: string;
      facilityId?: string;
      department?: string;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      hipaaCompliant?: boolean;
      encryptionEnabled?: boolean;
    },
    options: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      tags?: string[];
    } = {}
  ): Promise<Notification> {
    const metadata: NotificationMetadata = {
      source: 'healthcare',
      healthcare: {
        ...healthcareMetadata,
        hipaaCompliant: healthcareMetadata.hipaaCompliant ?? true,
        encryption: healthcareMetadata.encryptionEnabled ? {
          enabled: true,
          algorithm: 'AES-256-GCM',
        } : undefined,
      },
    };

    return this.createNotification(type, channel, recipient, content, {
      ...options,
      metadata,
      tags: [...(options.tags || []), 'healthcare'],
    });
  }

  // Error tracking
  async recordNotificationError(
    notificationId: string,
    channel: NotificationChannel,
    error: {
      message: string;
      code?: string;
      retryable?: boolean;
    }
  ): Promise<void> {
    await this.repository.addError(notificationId, {
      channel,
      errorMessage: error.message,
      errorCode: error.code,
      retryable: error.retryable ?? true,
    });

    this.fastify.log.error('Notification error recorded', {
      notificationId,
      channel,
      error: error.message,
      code: error.code,
      retryable: error.retryable,
    });
  }

  async getNotificationErrors(notificationId: string): Promise<Array<{
    id: number;
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
    occurredAt: Date;
  }>> {
    return this.repository.getErrors(notificationId);
  }

  // Error management methods
  async getAllErrors(filters: {
    channel?: string;
    type?: string;
    retryable?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ errors: any[]; total: number }> {
    try {
      console.log('🔧 Service getAllErrors called with filters:', filters);
      
      // Use repository to get filtered errors with notification details
      const result = await this.repository.getAllErrorsWithDetails(filters);
      
      console.log('🔧 Repository returned result:', { 
        errorsCount: result.errors.length, 
        total: result.total,
        firstError: result.errors[0]
      });
      
      this.fastify.log.info('Retrieved all errors with filters', {
        filtersApplied: filters,
        resultCount: result.errors.length,
        totalCount: result.total
      });

      return result;
    } catch (error) {
      console.error('🔴 Service getAllErrors error:', error);
      this.fastify.log.error('Failed to get all errors', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filters 
      });
      throw error;
    }
  }

  async getErrorStatistics(days: number = 7, groupBy: string = 'date'): Promise<any> {
    try {
      const statistics = await this.repository.getErrorStatistics(days, groupBy);
      
      this.fastify.log.info('Retrieved error statistics', {
        days,
        groupBy,
        statisticsCount: statistics.length
      });

      return statistics;
    } catch (error) {
      this.fastify.log.error('Failed to get error statistics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        days,
        groupBy 
      });
      throw error;
    }
  }

  async exportErrors(filters: {
    channel?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }, format: string = 'json'): Promise<string> {
    try {
      // Get all errors matching filters (no limit for export)
      const { errors } = await this.repository.getAllErrorsWithDetails({
        ...filters,
        limit: undefined,
        offset: undefined
      });

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = ['ID', 'Notification ID', 'Channel', 'Type', 'Error Message', 'Error Code', 'Retryable', 'Occurred At', 'Recipient Email'];
        const csvRows = errors.map(error => [
          error.id,
          error.notificationId,
          error.channel,
          error.type || '',
          `"${error.errorMessage.replace(/"/g, '""')}"`, // Escape quotes
          error.errorCode || '',
          error.retryable ? 'Yes' : 'No',
          error.occurredAt.toISOString(),
          error.recipientEmail || ''
        ]);

        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        this.fastify.log.info('Exported errors as CSV', {
          filters,
          errorCount: errors.length
        });

        return csvContent;
      } else {
        // Return as JSON
        const jsonData = {
          exportedAt: new Date().toISOString(),
          filters,
          errorCount: errors.length,
          errors
        };

        this.fastify.log.info('Exported errors as JSON', {
          filters,
          errorCount: errors.length
        });

        return JSON.stringify(jsonData, null, 2);
      }
    } catch (error) {
      this.fastify.log.error('Failed to export errors', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
        format 
      });
      throw error;
    }
  }

  // Private helper methods
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async simulateNotificationSending(notification: Notification): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          // Use dynamic email service if available, otherwise fallback to static email service
          if (this.dynamicEmailService) {
            this.fastify.log.info('Sending email via dynamic email service', {
              notificationId: notification.id,
              to: notification.recipient.email,
            });
            await this.dynamicEmailService.sendEmail(notification);
          } else {
            this.fastify.log.info('Sending email via static email service', {
              notificationId: notification.id,
              to: notification.recipient.email,
            });
            await this.emailService.sendEmail(notification);
          }
          break;
        case 'sms':
          await this.simulateSMSSending(notification);
          break;
        case 'push':
          await this.simulatePushNotification(notification);
          break;
        case 'slack':
          await this.simulateSlackNotification(notification);
          break;
        default:
          // Generic simulation for other channels
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          
          this.fastify.log.info('Simulated notification sending', {
            notificationId: notification.id,
            channel: notification.channel,
            type: notification.type,
            recipient: notification.recipient.email,
          });
      }
    } catch (error) {
      this.fastify.log.error('Failed to send notification', {
        notificationId: notification.id,
        channel: notification.channel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async simulateSMSSending(notification: Notification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    this.fastify.log.info('📱 Mock SMS Sent:', {
      to: notification.recipient.phone,
      message: notification.content.text,
      type: notification.type,
    });
  }

  private async simulatePushNotification(notification: Notification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    this.fastify.log.info('🔔 Mock Push Notification Sent:', {
      deviceToken: notification.recipient.deviceToken,
      title: notification.subject,
      body: notification.content.text,
      type: notification.type,
    });
  }

  private async simulateSlackNotification(notification: Notification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 800));
    
    this.fastify.log.info('💬 Mock Slack Message Sent:', {
      channel: notification.recipient.slackChannel,
      user: notification.recipient.slackUserId,
      message: notification.content.text,
      type: notification.type,
    });
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return metadata;
    }

    try {
      // Deep clone to avoid circular references
      const sanitized = JSON.parse(JSON.stringify(metadata));
      return sanitized;
    } catch (error) {
      // If JSON stringify fails, create a safe version
      const safe: any = {};
      for (const [key, value] of Object.entries(metadata)) {
        try {
          if (value === null || value === undefined) {
            safe[key] = value;
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            safe[key] = value;
          } else if (Array.isArray(value)) {
            safe[key] = value.filter(item => 
              typeof item === 'string' || 
              typeof item === 'number' || 
              typeof item === 'boolean'
            );
          } else if (typeof value === 'object') {
            // For objects, try to stringify and if fails, convert to string
            try {
              JSON.stringify(value);
              safe[key] = value;
            } catch {
              safe[key] = '[Object]';
            }
          } else {
            safe[key] = String(value);
          }
        } catch {
          safe[key] = '[Unknown]';
        }
      }
      return safe;
    }
  }

  private async recordStatistic(status: NotificationStatus, notificationId: string): Promise<void> {
    try {
      const notification = await this.repository.findById(notificationId);
      if (!notification) return;

      await this.repository.recordStatistic({
        metricName: status,
        channel: notification.channel,
        type: notification.type,
        priority: notification.priority,
        count: 1,
        date: new Date(),
      });
    } catch (error) {
      this.fastify.log.error('Failed to record notification statistic', {
        notificationId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}