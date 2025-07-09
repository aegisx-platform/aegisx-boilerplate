import { FastifyInstance } from 'fastify';
import { DatabaseNotificationService } from '../services/notification-database-service';

/**
 * Setup WebSocket real-time integration for notifications
 * 
 * Subscribes to notification events and pushes them to WebSocket connections
 */
export function setupRealTimeIntegration(fastify: FastifyInstance, service: DatabaseNotificationService): void {
  // Subscribe to notification events and push to WebSocket
  if (fastify.eventBus) {
    fastify.eventBus.subscribe('notification.created', async (event: any) => {
      // Send real-time notification to user's WebSocket connections
      if (event.recipientId) {
        fastify.websocketManager.sendToUser(event.recipientId, {
          type: 'notification_created',
          data: {
            notificationId: event.notificationId,
            type: event.type,
            channel: event.channel,
            priority: event.priority,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Broadcast to system notifications channel
      fastify.websocketManager.broadcast('system:notifications', {
        type: 'notification_created',
        data: event,
      });
    });

    fastify.eventBus.subscribe('notification.status_updated', async (event: any) => {
      // Get notification details
      const notification = await service.getNotification(event.notificationId);
      if (!notification) return;

      // Send real-time status update to user
      if (notification.recipient.id) {
        fastify.websocketManager.sendToUser(notification.recipient.id, {
          type: 'notification_status_updated',
          data: {
            notificationId: event.notificationId,
            status: event.status,
            timestamp: event.timestamp,
          },
        });
      }

      // Broadcast to monitoring channel
      fastify.websocketManager.broadcast('system:notifications', {
        type: 'notification_status_updated',
        data: event,
      });
    });
  }

  fastify.log.info('✅ Real-time WebSocket integration setup complete');
}

/**
 * Setup Event Bus integration for notifications
 * 
 * Listens for system events that should trigger automatic notifications
 */
export function setupEventBusIntegration(fastify: FastifyInstance, service: DatabaseNotificationService): void {
  // Listen for system events that should trigger notifications
  
  // User registration completed
  fastify.eventBus.subscribe('user.registered', async (event: any) => {
    try {
      await service.createNotification(
        'welcome',
        'email',
        {
          id: event.userId,
          email: event.email,
        },
        {
          template: 'welcome-email',
          templateData: {
            name: event.name || 'User',
            email: event.email,
          },
        },
        {
          priority: 'normal',
          tags: ['welcome', 'user-onboarding'],
          metadata: {
            source: 'user-registration',
            userId: event.userId,
          },
        }
      );

      fastify.log.info('Welcome notification created for new user', {
        userId: event.userId,
        email: event.email,
      });
    } catch (error) {
      fastify.log.error('Failed to create welcome notification:', error);
    }
  });

  // Password reset requested
  fastify.eventBus.subscribe('user.password_reset_requested', async (event: any) => {
    try {
      await service.createNotification(
        'password-reset',
        'email',
        {
          id: event.userId,
          email: event.email,
        },
        {
          template: 'password-reset',
          templateData: {
            name: event.name || 'User',
            resetToken: event.resetToken,
            resetUrl: event.resetUrl,
            expiresAt: event.expiresAt,
          },
        },
        {
          priority: 'high',
          tags: ['security', 'password-reset'],
          metadata: {
            source: 'password-reset',
            userId: event.userId,
          },
        }
      );

      fastify.log.info('Password reset notification created', {
        userId: event.userId,
        email: event.email,
      });
    } catch (error) {
      fastify.log.error('Failed to create password reset notification:', error);
    }
  });

  // Security alert
  fastify.eventBus.subscribe('security.suspicious_activity', async (event: any) => {
    try {
      await service.createNotification(
        'security-alert',
        'email',
        {
          id: event.userId,
          email: event.email,
        },
        {
          template: 'security-alert',
          templateData: {
            name: event.name || 'User',
            activity: event.activity,
            location: event.location,
            timestamp: event.timestamp,
            ipAddress: event.ipAddress,
          },
        },
        {
          priority: 'urgent',
          tags: ['security', 'alert'],
          metadata: {
            source: 'security-monitor',
            userId: event.userId,
            activityType: event.activity,
          },
        }
      );

      fastify.log.warn('Security alert notification created', {
        userId: event.userId,
        activity: event.activity,
        location: event.location,
      });
    } catch (error) {
      fastify.log.error('Failed to create security alert notification:', error);
    }
  });

  // System maintenance notifications
  fastify.eventBus.subscribe('system.maintenance_scheduled', async (event: any) => {
    try {
      // Get all active users (this would need to be implemented)
      const recipients = event.recipients || [];

      if (recipients.length === 0) {
        fastify.log.warn('No recipients for maintenance notification');
        return;
      }

      const batch = await service.createBatch(`Maintenance Notification - ${event.maintenanceDate}`);

      const notifications = await Promise.all(
        recipients.map((recipient: any) =>
          service.createNotification(
            'system-maintenance',
            'email',
            recipient,
            {
              template: 'system-maintenance',
              templateData: {
                name: recipient.name || 'User',
                maintenanceDate: event.maintenanceDate,
                maintenanceTime: event.maintenanceTime,
                duration: event.duration,
                affectedServices: event.affectedServices,
                contactInfo: event.contactInfo,
              },
            },
            {
              priority: 'high',
              scheduledAt: event.notifyAt ? new Date(event.notifyAt) : undefined,
              tags: ['system', 'maintenance'],
              metadata: {
                source: 'system-maintenance',
                maintenanceId: event.maintenanceId,
              },
            }
          )
        )
      );

      await service.addNotificationsToBatch(
        batch.id,
        notifications.map(n => n.id)
      );

      fastify.log.info('System maintenance notifications created', {
        batchId: batch.id,
        recipientCount: recipients.length,
        maintenanceDate: event.maintenanceDate,
      });
    } catch (error) {
      fastify.log.error('Failed to create maintenance notifications:', error);
    }
  });

  fastify.log.info('✅ Event bus integration setup complete');
}