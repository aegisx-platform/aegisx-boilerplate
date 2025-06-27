import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { NotificationService } from '../shared/services/notification.service';
import {
  NotificationConfig,
  NotificationType,
  NotificationChannel,
  NotificationRecipient,
  NotificationPriority,
  NotificationTemplate,
} from '../shared/types/notification.types';

declare module 'fastify' {
  interface FastifyInstance {
    notifications: NotificationService;
  }
}

export interface NotificationPluginOptions {
  config?: Partial<NotificationConfig>;
  enableRoutes?: boolean;
  enableWebhooks?: boolean;
  enableHealthcareNotifications?: boolean;
}

export default fp<NotificationPluginOptions>(
  async function notificationPlugin(
    fastify: FastifyInstance,
    options: NotificationPluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: NotificationPluginOptions = {
      config: {
        enabledChannels: ['email', 'sms', 'push', 'slack'],
        defaultChannel: 'email',
        retryAttempts: 3,
        retryDelay: 5000,
        queueEnabled: true,
        queueMaxSize: 10000,
      },
      enableRoutes: true,
      enableWebhooks: false,
      enableHealthcareNotifications: true,
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create notification service
    const notificationService = new NotificationService(fastify, pluginOptions.config);

    // Register the notification service with Fastify
    fastify.decorate('notifications', notificationService);

    // Set up event listeners
    notificationService.on('notification-queued', (event) => {
      fastify.log.info('Notification queued:', {
        notificationId: event.notificationId,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('notification-sent', (event) => {
      fastify.log.info('Notification sent:', {
        notificationId: event.notificationId,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('notification-delivered', (event) => {
      fastify.log.info('Notification delivered:', {
        notificationId: event.notificationId,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('notification-failed', (event) => {
      fastify.log.error('Notification failed:', {
        notificationId: event.notificationId,
        error: event.data,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('batch-created', (event) => {
      fastify.log.info('Notification batch created:', {
        batchId: event.data,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('queue-paused', (event) => {
      fastify.log.warn('Notification queue paused:', {
        priority: event.data,
        timestamp: event.timestamp,
      });
    });

    notificationService.on('queue-resumed', (event) => {
      fastify.log.info('Notification queue resumed:', {
        priority: event.data,
        timestamp: event.timestamp,
      });
    });

    // Add management routes if enabled
    if (pluginOptions.enableRoutes) {
      // Send single notification
      fastify.post('/notifications/send', async (request, reply) => {
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
          } = request.body as {
            type: NotificationType;
            channel: NotificationChannel;
            recipient: NotificationRecipient;
            content: any;
            priority?: NotificationPriority;
            scheduledAt?: string;
            metadata?: any;
            tags?: string[];
          };

          if (!type || !channel || !recipient || !content) {
            return reply.status(400).send({
              error: 'Invalid notification request',
              message: 'type, channel, recipient, and content are required',
            });
          }

          const notificationId = await notificationService.sendNotificationAsync(
            type,
            channel,
            recipient,
            content,
            {
              priority,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
              metadata,
              tags,
            }
          );

          return reply.status(201).send({
            message: 'Notification queued successfully',
            notificationId,
          });
        } catch (error) {
          fastify.log.error('Failed to send notification:', error);
          return reply.status(500).send({
            error: 'Failed to send notification',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Send batch notifications
      fastify.post('/notifications/batch', async (request, reply) => {
        try {
          const { notifications } = request.body as { notifications: any[] };

          if (!notifications || !Array.isArray(notifications)) {
            return reply.status(400).send({
              error: 'Invalid batch request',
              message: 'notifications array is required',
            });
          }

          const batchId = await notificationService.sendBatch(notifications);

          return reply.status(201).send({
            message: 'Notification batch queued successfully',
            batchId,
            count: notifications.length,
          });
        } catch (error) {
          fastify.log.error('Failed to send notification batch:', error);
          return reply.status(500).send({
            error: 'Failed to send notification batch',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get notification status
      fastify.get('/notifications/:id', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          const notification = notificationService.getNotification(id);

          if (!notification) {
            return reply.status(404).send({
              error: 'Notification not found',
              message: `Notification with ID '${id}' not found`,
            });
          }

          return reply.send({
            notification: {
              id: notification.id,
              type: notification.type,
              channel: notification.channel,
              status: notification.status,
              priority: notification.priority,
              attempts: notification.attempts,
              sentAt: notification.sentAt,
              deliveredAt: notification.deliveredAt,
              failedAt: notification.failedAt,
              errors: notification.errors,
            },
          });
        } catch (error) {
          fastify.log.error('Failed to get notification:', error);
          return reply.status(500).send({
            error: 'Failed to get notification',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Cancel notification
      fastify.delete('/notifications/:id', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          const cancelled = notificationService.cancelNotification(id);

          if (!cancelled) {
            return reply.status(400).send({
              error: 'Cannot cancel notification',
              message: 'Notification not found or already processed',
            });
          }

          return reply.send({
            message: 'Notification cancelled successfully',
            notificationId: id,
          });
        } catch (error) {
          fastify.log.error('Failed to cancel notification:', error);
          return reply.status(500).send({
            error: 'Failed to cancel notification',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get notification statistics
      fastify.get('/notifications/stats', async (request, reply) => {
        try {
          const statistics = notificationService.getStatistics();
          return reply.send({ statistics });
        } catch (error) {
          fastify.log.error('Failed to get notification statistics:', error);
          return reply.status(500).send({
            error: 'Failed to get notification statistics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get queue status
      fastify.get('/notifications/queues', async (request, reply) => {
        try {
          const queues = notificationService.getQueues();
          return reply.send({ queues });
        } catch (error) {
          fastify.log.error('Failed to get queue status:', error);
          return reply.status(500).send({
            error: 'Failed to get queue status',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Pause/resume queues
      fastify.patch('/notifications/queues/:priority/pause', async (request, reply) => {
        try {
          const { priority } = request.params as { priority: NotificationPriority };
          notificationService.pauseQueue(priority);
          return reply.send({ message: `Queue '${priority}' paused` });
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to pause queue',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.patch('/notifications/queues/:priority/resume', async (request, reply) => {
        try {
          const { priority } = request.params as { priority: NotificationPriority };
          notificationService.resumeQueue(priority);
          return reply.send({ message: `Queue '${priority}' resumed` });
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to resume queue',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Template management
      fastify.post('/notifications/templates', async (request, reply) => {
        try {
          const template = request.body as Omit<NotificationTemplate, 'id' | 'metadata'>;

          if (!template.name || !template.type || !template.content) {
            return reply.status(400).send({
              error: 'Invalid template',
              message: 'name, type, and content are required',
            });
          }

          const templateId = notificationService.createTemplate(template);

          return reply.status(201).send({
            message: 'Template created successfully',
            templateId,
          });
        } catch (error) {
          fastify.log.error('Failed to create template:', error);
          return reply.status(500).send({
            error: 'Failed to create template',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.get('/notifications/templates', async (request, reply) => {
        try {
          const templates = notificationService.listTemplates();
          return reply.send({ templates });
        } catch (error) {
          fastify.log.error('Failed to list templates:', error);
          return reply.status(500).send({
            error: 'Failed to list templates',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.get('/notifications/templates/:id', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          const template = notificationService.getTemplate(id);

          if (!template) {
            return reply.status(404).send({
              error: 'Template not found',
              message: `Template with ID '${id}' not found`,
            });
          }

          return reply.send({ template });
        } catch (error) {
          fastify.log.error('Failed to get template:', error);
          return reply.status(500).send({
            error: 'Failed to get template',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Healthcare-specific endpoints
      if (pluginOptions.enableHealthcareNotifications) {
        fastify.post('/notifications/healthcare/appointment-reminder', async (request, reply) => {
          try {
            const {
              patientId,
              providerId,
              appointmentId,
              recipient,
              appointmentDate,
              department,
            } = request.body as {
              patientId: string;
              providerId: string;
              appointmentId: string;
              recipient: NotificationRecipient;
              appointmentDate: string;
              department: string;
            };

            const notificationId = await notificationService.sendNotificationAsync(
              'appointment-reminder',
              'email',
              recipient,
              {
                templateData: {
                  patientId,
                  providerId,
                  appointmentId,
                  appointmentDate: new Date(appointmentDate),
                  department,
                },
              },
              {
                priority: 'high',
                metadata: {
                  healthcare: {
                    patientId,
                    providerId,
                    appointmentId,
                    department,
                    urgency: 'medium',
                    hipaaCompliant: true,
                  },
                },
                tags: ['healthcare', 'appointment', 'reminder'],
              }
            );

            return reply.status(201).send({
              message: 'Appointment reminder queued successfully',
              notificationId,
            });
          } catch (error) {
            fastify.log.error('Failed to send appointment reminder:', error);
            return reply.status(500).send({
              error: 'Failed to send appointment reminder',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

        fastify.post('/notifications/healthcare/lab-results', async (request, reply) => {
          try {
            const {
              patientId,
              providerId,
              labOrderId,
              recipient,
              resultType,
              urgent = false,
            } = request.body as {
              patientId: string;
              providerId: string;
              labOrderId: string;
              recipient: NotificationRecipient;
              resultType: string;
              urgent?: boolean;
            };

            const notificationId = await notificationService.sendNotificationAsync(
              'lab-results',
              'email',
              recipient,
              {
                templateData: {
                  patientId,
                  providerId,
                  labOrderId,
                  resultType,
                  urgent,
                },
              },
              {
                priority: urgent ? 'urgent' : 'high',
                metadata: {
                  healthcare: {
                    patientId,
                    providerId,
                    urgency: urgent ? 'high' : 'medium',
                    hipaaCompliant: true,
                    encryption: { enabled: true },
                  },
                },
                tags: ['healthcare', 'lab-results', urgent ? 'urgent' : 'normal'],
              }
            );

            return reply.status(201).send({
              message: 'Lab results notification queued successfully',
              notificationId,
            });
          } catch (error) {
            fastify.log.error('Failed to send lab results notification:', error);
            return reply.status(500).send({
              error: 'Failed to send lab results notification',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

        fastify.post('/notifications/healthcare/emergency', async (request, reply) => {
          try {
            const {
              patientId,
              facilityId,
              emergencyType,
              recipients,
              description,
            } = request.body as {
              patientId: string;
              facilityId: string;
              emergencyType: string;
              recipients: NotificationRecipient[];
              description: string;
            };

            const notifications = recipients.map(recipient => ({
              type: 'emergency' as NotificationType,
              channel: 'email' as NotificationChannel,
              recipient,
              content: {
                templateData: {
                  patientId,
                  facilityId,
                  emergencyType,
                  description,
                  timestamp: new Date(),
                },
              },
              options: {
                priority: 'critical' as NotificationPriority,
                metadata: {
                  healthcare: {
                    patientId,
                    facilityId,
                    urgency: 'critical',
                    hipaaCompliant: true,
                  },
                },
                tags: ['healthcare', 'emergency', 'critical'],
              },
            }));

            const batchId = await notificationService.sendBatch(notifications);

            return reply.status(201).send({
              message: 'Emergency notifications queued successfully',
              batchId,
              recipientCount: recipients.length,
            });
          } catch (error) {
            fastify.log.error('Failed to send emergency notifications:', error);
            return reply.status(500).send({
              error: 'Failed to send emergency notifications',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });
      }

      // Configuration management
      fastify.get('/notifications/config', async (request, reply) => {
        try {
          const config = notificationService.getConfig();
          // Remove sensitive information
          const safeConfig = {
            ...config,
            providers: Object.keys(config.providers),
          };
          return reply.send({ config: safeConfig });
        } catch (error) {
          fastify.log.error('Failed to get notification config:', error);
          return reply.status(500).send({
            error: 'Failed to get notification config',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    }

    // Add utility methods to Fastify instance
    fastify.decorate('sendNotification', async function(
      type: NotificationType,
      channel: NotificationChannel,
      recipient: NotificationRecipient,
      content: any,
      options: any = {}
    ) {
      return notificationService.sendNotificationAsync(type, channel, recipient, content, options);
    });

    fastify.decorate('sendEmailNotification', async function(
      type: NotificationType,
      recipient: NotificationRecipient,
      content: any,
      options: any = {}
    ) {
      return notificationService.sendNotificationAsync(type, 'email', recipient, content, options);
    });

    fastify.decorate('sendSmsNotification', async function(
      type: NotificationType,
      recipient: NotificationRecipient,
      content: any,
      options: any = {}
    ) {
      return notificationService.sendNotificationAsync(type, 'sms', recipient, content, options);
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      notificationService.shutdown();
    });

    fastify.log.info('✅ Notification plugin registered successfully', {
      enabledChannels: pluginOptions.config?.enabledChannels,
      enableRoutes: pluginOptions.enableRoutes,
      enableWebhooks: pluginOptions.enableWebhooks,
      enableHealthcareNotifications: pluginOptions.enableHealthcareNotifications,
      queueEnabled: pluginOptions.config?.queueEnabled,
    });
  },
  {
    name: 'notification-plugin',
    dependencies: ['env-plugin', 'template-engine-plugin'],
  }
);

// Extend FastifyInstance interface for notification methods
declare module 'fastify' {
  interface FastifyInstance {
    sendNotification: (
      type: NotificationType,
      channel: NotificationChannel,
      recipient: NotificationRecipient,
      content: any,
      options?: any
    ) => Promise<string>;
    sendEmailNotification: (
      type: NotificationType,
      recipient: NotificationRecipient,
      content: any,
      options?: any
    ) => Promise<string>;
    sendSmsNotification: (
      type: NotificationType,
      recipient: NotificationRecipient,
      content: any,
      options?: any
    ) => Promise<string>;
  }
}