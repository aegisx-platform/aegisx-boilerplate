import { FastifyRequest, FastifyReply } from 'fastify';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipient,
  NotificationContent,
} from '../../../core/shared/types/notification.types';
import { NotificationDatabaseService } from '../services/notification-database-service';
import { NotificationFilters } from '../repositories/notification-repository';
import {
  CreateNotificationRequest,
  ListNotificationsQuery,
  UpdateStatusRequest,
} from '../schemas/notification.schemas';

export interface NotificationController {
  // Core notification operations
  createNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  listNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  updateNotificationStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  cancelNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  deleteNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Queue operations
  getQueuedNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  processQueuedNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getScheduledNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Template operations
  createTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  listTemplates(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  updateTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  deleteTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // User preferences
  getUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  setUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  updateUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Batch operations
  createBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  addNotificationsToBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  processBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getBatch(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getBatchNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Analytics
  getNotificationStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getDeliveryMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getChannelStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Healthcare specific
  createHealthcareNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  sendAppointmentReminder(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  sendLabResultsNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  sendEmergencyNotification(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  // Error tracking
  getNotificationErrors(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  
  // Error management
  listAllErrors(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getErrorStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  exportErrors(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export class DatabaseNotificationController implements NotificationController {
  constructor(private notificationService: NotificationDatabaseService) {}

  // Core notification operations
  async createNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        type,
        channel,
        recipient,
        content,
        priority = 'normal',
        scheduledAt,
        metadata,
        tags,
        maxAttempts,
      } = request.body as CreateNotificationRequest;

      if (!type || !channel || !recipient || !content) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'type, channel, recipient, and content are required',
        });
      }

      // Log the request body for debugging
      request.log.debug('Creating notification with data:', {
        type,
        channel,
        recipient,
        content,
        metadata,
        tags,
      });

      const notification = await this.notificationService.createNotification(
        type,
        channel,
        recipient,
        content,
        {
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          metadata: metadata ? { source: 'api', ...metadata } : { source: 'api' },
          tags,
          maxAttempts,
        }
      );

      reply.status(201).send({
        success: true,
        message: 'Notification created successfully',
        data: {
          notificationId: notification.id,
          status: notification.status,
          priority: notification.priority,
          createdAt: notification.sentAt || new Date(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      request.log.error('Failed to create notification:', {
        error: errorMessage,
        stack: errorStack,
        body: request.body,
      });
      
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create notification',
        details: errorMessage,
      });
    }
  }

  async getNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const notification = await this.notificationService.getNotification(id);

      if (!notification) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Notification with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        data: {
          notification: {
            id: notification.id,
            type: notification.type,
            channel: notification.channel,
            status: notification.status,
            priority: notification.priority,
            recipient: {
              id: notification.recipient.id,
              email: notification.recipient.email,
              phone: notification.recipient.phone,
            },
            subject: notification.subject,
            attempts: notification.attempts,
            maxAttempts: notification.maxAttempts,
            scheduledAt: notification.scheduledAt,
            sentAt: notification.sentAt,
            deliveredAt: notification.deliveredAt,
            failedAt: notification.failedAt,
            tags: notification.tags,
            errors: notification.errors,
            metadata: notification.metadata,
          },
        },
      });
    } catch (error) {
      request.log.error('Failed to get notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve notification',
      });
    }
  }

  async listNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        status,
        priority,
        channel,
        type,
        recipientId,
        recipientEmail,
        dateFrom,
        dateTo,
        tags,
        limit = 20,
        offset = 0,
      } = request.query as ListNotificationsQuery;

      const filters: NotificationFilters = {
        status: status as any,
        priority: priority as any,
        channel: channel as any,
        type: type as any,
        recipientId,
        recipientEmail,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        tags: tags ? tags.split(',') : undefined,
        limit: Math.min(limit, 100), // Cap at 100
        offset,
      };

      const [notifications, totalCount] = await Promise.all([
        this.notificationService.findNotifications(filters),
        this.notificationService.getNotificationCounts(filters),
      ]);

      const finalLimit = filters.limit || 20;
      const finalOffset = filters.offset || 0;
      const totalPages = Math.ceil(totalCount / finalLimit);
      const currentPage = Math.floor(finalOffset / finalLimit) + 1;

      reply.send({
        success: true,
        data: notifications.map(n => ({
          id: n.id,
          type: n.type,
          channel: n.channel,
          status: n.status,
          priority: n.priority,
          recipientEmail: n.recipient.email,
          subject: n.subject,
          attempts: n.attempts,
          scheduledAt: n.scheduledAt,
          sentAt: n.sentAt,
          deliveredAt: n.deliveredAt,
          failedAt: n.failedAt,
          tags: n.tags,
        })),
        pagination: {
          total: totalCount,
          page: currentPage,
          limit: finalLimit,
          totalPages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      request.log.error('Failed to list notifications:', {
        error: errorMessage,
        stack: errorStack,
        query: request.query,
      });
      
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve notifications',
        details: errorMessage,
      });
    }
  }

  async updateNotificationStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const { status, metadata } = request.body as UpdateStatusRequest;

      if (!status) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'status is required',
        });
      }

      const updated = await this.notificationService.updateNotificationStatus(
        id,
        status as any,
        metadata
      );

      if (!updated) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Notification with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        message: 'Notification status updated successfully',
        data: { notificationId: id, status },
      });
    } catch (error) {
      request.log.error('Failed to update notification status:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update notification status',
      });
    }
  }

  async cancelNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const updated = await this.notificationService.updateNotificationStatus(id, 'cancelled');

      if (!updated) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Notification with ID '${id}' not found or cannot be cancelled`,
        });
      }

      reply.send({
        success: true,
        message: 'Notification cancelled successfully',
        data: { notificationId: id },
      });
    } catch (error) {
      request.log.error('Failed to cancel notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel notification',
      });
    }
  }

  async deleteNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const deleted = await this.notificationService.deleteNotification(id);

      if (!deleted) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Notification with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        message: 'Notification deleted successfully',
        data: { notificationId: id },
      });
    } catch (error) {
      request.log.error('Failed to delete notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete notification',
      });
    }
  }

  // Queue operations
  async getQueuedNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { priority, limit = 50 } = request.query as {
        priority?: string;
        limit?: number;
      };

      const notifications = await this.notificationService.getQueuedNotifications(
        priority as any,
        Math.min(limit, 100)
      );

      reply.send({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            channel: n.channel,
            priority: n.priority,
            recipientEmail: n.recipient.email,
            scheduledAt: n.scheduledAt,
            attempts: n.attempts,
            maxAttempts: n.maxAttempts,
          })),
          count: notifications.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to get queued notifications:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve queued notifications',
      });
    }
  }

  async processQueuedNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { priority, limit = 10 } = request.body as {
        priority?: string;
        limit?: number;
      };

      const notifications = await this.notificationService.getQueuedNotifications(
        priority as any,
        Math.min(limit, 50)
      );

      const results = await Promise.allSettled(
        notifications.map(n => this.notificationService.processNotification(n.id))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - successful;

      reply.send({
        success: true,
        message: 'Queue processing completed',
        data: {
          processed: results.length,
          successful,
          failed,
        },
      });
    } catch (error) {
      request.log.error('Failed to process queued notifications:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process queued notifications',
      });
    }
  }

  async getScheduledNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { beforeDate } = request.query as { beforeDate?: string };

      const before = beforeDate ? new Date(beforeDate) : new Date();
      const notifications = await this.notificationService.getScheduledNotifications(before);

      reply.send({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            channel: n.channel,
            priority: n.priority,
            recipientEmail: n.recipient.email,
            scheduledAt: n.scheduledAt,
            attempts: n.attempts,
          })),
          count: notifications.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to get scheduled notifications:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve scheduled notifications',
      });
    }
  }

  // Template operations
  async createTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const template = request.body as any;

      if (!template.name || !template.type || !template.subject || !template.content) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'name, type, subject, and content are required',
        });
      }

      const created = await this.notificationService.createTemplate(template);

      reply.status(201).send({
        success: true,
        message: 'Template created successfully',
        data: { templateId: created.id, name: created.name },
      });
    } catch (error) {
      request.log.error('Failed to create template:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create template',
      });
    }
  }

  async getTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const template = await this.notificationService.getTemplate(id);

      if (!template) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Template with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        data: { template },
      });
    } catch (error) {
      request.log.error('Failed to get template:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve template',
      });
    }
  }

  async listTemplates(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { type } = request.query as { type?: string };

      const templates = type
        ? await this.notificationService.getTemplatesByType(type as any)
        : await this.notificationService.listTemplates();

      reply.send({
        success: true,
        data: {
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            type: t.type,
            subject: t.subject,
            channels: t.channels,
            variables: t.variables,
            active: t.active,
            content: t.content,
            metadata: t.metadata,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })),
          count: templates.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to list templates:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve templates',
      });
    }
  }

  async updateTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };
      const updates = request.body as any;

      const updated = await this.notificationService.updateTemplate(id, updates);

      if (!updated) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Template with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        message: 'Template updated successfully',
        data: { templateId: id, name: updated.name },
      });
    } catch (error) {
      request.log.error('Failed to update template:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update template',
      });
    }
  }

  async deleteTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const deleted = await this.notificationService.deleteTemplate(id);

      if (!deleted) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Template with ID '${id}' not found`,
        });
      }

      reply.send({
        success: true,
        message: 'Template deleted successfully',
        data: { templateId: id },
      });
    } catch (error) {
      request.log.error('Failed to delete template:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete template',
      });
    }
  }

  // User preferences
  async getUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as { userId: string };

      const preferences = await this.notificationService.getUserPreferences(userId);

      if (!preferences) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Preferences for user '${userId}' not found`,
        });
      }

      reply.send({
        success: true,
        data: { preferences },
      });
    } catch (error) {
      request.log.error('Failed to get user preferences:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user preferences',
      });
    }
  }

  async setUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as { userId: string };
      const preferences = request.body as any;

      const saved = await this.notificationService.setUserPreferences({
        ...preferences,
        userId,
      });

      reply.status(201).send({
        success: true,
        message: 'User preferences set successfully',
        data: { preferences: saved },
      });
    } catch (error) {
      request.log.error('Failed to set user preferences:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to set user preferences',
      });
    }
  }

  async updateUserPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as { userId: string };
      const updates = request.body as any;

      const updated = await this.notificationService.updateUserPreferences(userId, updates);

      if (!updated) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Preferences for user '${userId}' not found`,
        });
      }

      reply.send({
        success: true,
        message: 'User preferences updated successfully',
        data: { preferences: updated },
      });
    } catch (error) {
      request.log.error('Failed to update user preferences:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user preferences',
      });
    }
  }

  // Batch operations
  async createBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { name } = request.body as { name?: string };

      const batch = await this.notificationService.createBatch(name);

      reply.status(201).send({
        success: true,
        message: 'Notification batch created successfully',
        data: { batchId: batch.id, name: batch.name },
      });
    } catch (error) {
      request.log.error('Failed to create batch:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create notification batch',
      });
    }
  }

  async addNotificationsToBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as { batchId: string };
      const { notificationIds } = request.body as { notificationIds: string[] };

      if (!notificationIds || !Array.isArray(notificationIds)) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'notificationIds array is required',
        });
      }

      await this.notificationService.addNotificationsToBatch(batchId, notificationIds);

      reply.send({
        success: true,
        message: 'Notifications added to batch successfully',
        data: { batchId, count: notificationIds.length },
      });
    } catch (error) {
      request.log.error('Failed to add notifications to batch:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to add notifications to batch',
      });
    }
  }

  async processBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as { batchId: string };

      // Process batch asynchronously
      this.notificationService.processBatch(batchId).catch(error => {
        request.log.error('Batch processing failed:', error);
      });

      reply.send({
        success: true,
        message: 'Batch processing started',
        data: { batchId },
      });
    } catch (error) {
      request.log.error('Failed to start batch processing:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to start batch processing',
      });
    }
  }

  async getBatch(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as { batchId: string };

      const batch = await this.notificationService.getBatch(batchId);

      if (!batch) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Batch with ID '${batchId}' not found`,
        });
      }

      reply.send({
        success: true,
        data: { batch },
      });
    } catch (error) {
      request.log.error('Failed to get batch:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve batch',
      });
    }
  }

  async getBatchNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { batchId } = request.params as { batchId: string };

      const notifications = await this.notificationService.getBatchNotifications(batchId);

      reply.send({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            channel: n.channel,
            status: n.status,
            priority: n.priority,
            recipientEmail: n.recipient.email,
            attempts: n.attempts,
            sentAt: n.sentAt,
            deliveredAt: n.deliveredAt,
            failedAt: n.failedAt,
          })),
          count: notifications.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to get batch notifications:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve batch notifications',
      });
    }
  }

  // Analytics
  async getNotificationStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { dateFrom, dateTo } = request.query as {
        dateFrom?: string;
        dateTo?: string;
      };

      const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = dateTo ? new Date(dateTo) : new Date();

      const [totalCount, deliveryMetrics, channelStats] = await Promise.all([
        this.notificationService.getNotificationCounts({ dateFrom: from, dateTo: to }),
        this.notificationService.getDeliveryMetrics(from, to),
        this.notificationService.getChannelStatistics(from, to),
      ]);

      reply.send({
        success: true,
        data: {
          period: { from, to },
          totalCount,
          deliveryMetrics,
          channelStats,
        },
      });
    } catch (error) {
      request.log.error('Failed to get notification stats:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve notification statistics',
      });
    }
  }

  async getDeliveryMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { dateFrom, dateTo } = request.query as {
        dateFrom?: string;
        dateTo?: string;
      };

      const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = dateTo ? new Date(dateTo) : new Date();

      const metrics = await this.notificationService.getDeliveryMetrics(from, to);

      reply.send({
        success: true,
        data: {
          period: { from, to },
          metrics,
        },
      });
    } catch (error) {
      request.log.error('Failed to get delivery metrics:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve delivery metrics',
      });
    }
  }

  async getChannelStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { dateFrom, dateTo } = request.query as {
        dateFrom?: string;
        dateTo?: string;
      };

      const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = dateTo ? new Date(dateTo) : new Date();

      const stats = await this.notificationService.getChannelStatistics(from, to);

      reply.send({
        success: true,
        data: {
          period: { from, to },
          channelStats: stats,
        },
      });
    } catch (error) {
      request.log.error('Failed to get channel statistics:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve channel statistics',
      });
    }
  }

  // Healthcare specific
  async createHealthcareNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        type,
        channel,
        recipient,
        content,
        healthcare,
        priority = 'normal',
        scheduledAt,
        tags,
      } = request.body as {
        type: NotificationType;
        channel: NotificationChannel;
        recipient: NotificationRecipient;
        content: NotificationContent;
        healthcare: any;
        priority?: NotificationPriority;
        scheduledAt?: string;
        tags?: string[];
      };

      if (!type || !channel || !recipient || !content || !healthcare) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'type, channel, recipient, content, and healthcare metadata are required',
        });
      }

      const notification = await this.notificationService.createHealthcareNotification(
        type,
        channel,
        recipient,
        content,
        healthcare,
        {
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          tags,
        }
      );

      reply.status(201).send({
        success: true,
        message: 'Healthcare notification created successfully',
        data: {
          notificationId: notification.id,
          status: notification.status,
          priority: notification.priority,
          hipaaCompliant: notification.metadata.healthcare?.hipaaCompliant,
        },
      });
    } catch (error) {
      request.log.error('Failed to create healthcare notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create healthcare notification',
      });
    }
  }

  async sendAppointmentReminder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        patientId,
        providerId,
        appointmentId,
        recipient,
        appointmentDate,
        appointmentTime,
        department,
        doctorName,
      } = request.body as any;

      const notification = await this.notificationService.createHealthcareNotification(
        'appointment-reminder',
        'email',
        recipient,
        {
          template: 'appointment-reminder',
          templateData: {
            patientName: recipient.name || 'Patient',
            doctorName,
            department,
            appointmentDate,
            appointmentTime,
          },
        },
        {
          patientId,
          providerId,
          appointmentId,
          department,
          urgency: 'medium',
          hipaaCompliant: true,
        },
        {
          priority: 'high',
          tags: ['healthcare', 'appointment', 'reminder'],
        }
      );

      reply.status(201).send({
        success: true,
        message: 'Appointment reminder created successfully',
        data: { notificationId: notification.id },
      });
    } catch (error) {
      request.log.error('Failed to send appointment reminder:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send appointment reminder',
      });
    }
  }

  async sendLabResultsNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        patientId,
        providerId,
        recipient,
        testType,
        urgent = false,
      } = request.body as any;

      const notification = await this.notificationService.createHealthcareNotification(
        'lab-results',
        'email',
        recipient,
        {
          template: 'lab-results-notification',
          templateData: {
            patientName: recipient.name || 'Patient',
            testType,
            urgent,
          },
        },
        {
          patientId,
          providerId,
          urgency: urgent ? 'high' : 'medium',
          hipaaCompliant: true,
          encryptionEnabled: true,
        },
        {
          priority: urgent ? 'urgent' : 'high',
          tags: ['healthcare', 'lab-results', urgent ? 'urgent' : 'normal'],
        }
      );

      reply.status(201).send({
        success: true,
        message: 'Lab results notification created successfully',
        data: { notificationId: notification.id },
      });
    } catch (error) {
      request.log.error('Failed to send lab results notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send lab results notification',
      });
    }
  }

  async sendEmergencyNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const {
        patientId,
        facilityId,
        emergencyType,
        recipients,
        description,
        location,
      } = request.body as any;

      if (!recipients || !Array.isArray(recipients)) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'recipients array is required',
        });
      }

      const batch = await this.notificationService.createBatch(`Emergency: ${emergencyType}`);

      const notificationPromises = recipients.map((recipient: any) =>
        this.notificationService.createHealthcareNotification(
          'emergency',
          'email',
          recipient,
          {
            template: 'emergency-notification',
            templateData: {
              emergencyType,
              patientId,
              location,
              timestamp: new Date().toISOString(),
              description,
            },
          },
          {
            patientId,
            facilityId,
            urgency: 'critical',
            hipaaCompliant: true,
          },
          {
            priority: 'critical',
            tags: ['healthcare', 'emergency', 'critical'],
          }
        )
      );

      const notifications = await Promise.all(notificationPromises);
      await this.notificationService.addNotificationsToBatch(
        batch.id,
        notifications.map(n => n.id)
      );

      reply.status(201).send({
        success: true,
        message: 'Emergency notifications created successfully',
        data: {
          batchId: batch.id,
          notificationCount: notifications.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to send emergency notification:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send emergency notification',
      });
    }
  }

  // Error tracking
  async getNotificationErrors(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as { id: string };

      const errors = await this.notificationService.getNotificationErrors(id);

      reply.send({
        success: true,
        data: {
          notificationId: id,
          errors,
          count: errors.length,
        },
      });
    } catch (error) {
      request.log.error('Failed to get notification errors:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve notification errors',
      });
    }
  }

  // Error management - List all errors with filtering
  async listAllErrors(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      console.log('📋 Controller listAllErrors called');
      const query = request.query as {
        channel?: string;
        type?: string;
        retryable?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: string;
        offset?: string;
      };

      const filters = {
        channel: query.channel,
        type: query.type,
        retryable: query.retryable !== undefined ? query.retryable === 'true' : undefined,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      };

      const result = await this.notificationService.getAllErrors(filters);

      reply.send({
        success: true,
        data: {
          errors: result.errors,
          count: result.total,
        },
      });
    } catch (error) {
      request.log.error('Failed to list all errors:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve error list',
      });
    }
  }

  // Error statistics
  async getErrorStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as {
        days?: string;
        groupBy?: string;
      };

      const days = query.days ? parseInt(query.days) : 7;
      const groupBy = query.groupBy || 'date';

      const statistics = await this.notificationService.getErrorStatistics(days, groupBy);

      reply.send({
        success: true,
        data: {
          statistics,
          period: `${days} days`,
          groupBy,
        },
      });
    } catch (error) {
      request.log.error('Failed to get error statistics:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve error statistics',
      });
    }
  }

  // Error export
  async exportErrors(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as {
        format?: string;
        channel?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const filters = {
        channel: query.channel,
        type: query.type,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      };

      const format = query.format || 'json';
      const exportData = await this.notificationService.exportErrors(filters, format);

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="notification_errors_${new Date().toISOString().split('T')[0]}.csv"`);
      } else {
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="notification_errors_${new Date().toISOString().split('T')[0]}.json"`);
      }

      reply.send(exportData);
    } catch (error) {
      request.log.error('Failed to export errors:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export errors',
      });
    }
  }

}