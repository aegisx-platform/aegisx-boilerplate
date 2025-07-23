import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { DatabaseNotificationController } from '../controllers/notification-controller';
import {
  CreateNotificationSchema,
  CreateNotificationResponseSchema,
  GetNotificationResponseSchema,
  ListNotificationsQuerySchema,
  ListNotificationsResponseSchema,
  UpdateStatusSchema,
  ErrorResponseSchema,
} from '../schemas/notification.schemas';

export async function notificationRoutes(
  fastify: FastifyInstance,
  controller: DatabaseNotificationController
): Promise<void> {
  
  // Core notification operations
  fastify.post('/', {
    schema: {
      tags: ['Notifications'],
      summary: 'Create a new notification',
      description: 'Create and queue a new notification for delivery',
      body: CreateNotificationSchema,
      response: {
        201: CreateNotificationResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, controller.createNotification.bind(controller));

  fastify.get('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification by ID',
      params: Type.Object({
        id: Type.String()
      }),
      response: {
        200: GetNotificationResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, controller.getNotification.bind(controller));

  fastify.get('', {
    schema: {
      tags: ['Notifications'],
      summary: 'List notifications with filters',
      querystring: ListNotificationsQuerySchema,
      response: {
        200: ListNotificationsResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, controller.listNotifications.bind(controller));

  fastify.patch('/:id/status', {
    schema: {
      tags: ['Notifications'],
      summary: 'Update notification status',
      params: Type.Object({
        id: Type.String()
      }),
      body: UpdateStatusSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            notificationId: Type.String(),
            status: Type.String()
          })
        }),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, controller.updateNotificationStatus.bind(controller));

  fastify.patch('/:id/cancel', {
    schema: {
      tags: ['Notifications'],
      summary: 'Cancel a queued notification',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.cancelNotification.bind(controller));

  fastify.delete('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Delete a notification',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.deleteNotification.bind(controller));

  // Queue operations
  fastify.get('/queue/pending', {
    schema: {
      tags: ['Queue Management'],
      summary: 'Get queued notifications',
      querystring: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent', 'critical'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, controller.getQueuedNotifications.bind(controller));

  fastify.post('/queue/process', {
    schema: {
      tags: ['Queue Management'],
      summary: 'Process queued notifications',
      body: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent', 'critical'] },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      }
    }
  }, controller.processQueuedNotifications.bind(controller));

  fastify.get('/queue/scheduled', {
    schema: {
      tags: ['Queue Management'],
      summary: 'Get scheduled notifications',
      querystring: {
        type: 'object',
        properties: {
          beforeDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.getScheduledNotifications.bind(controller));

  // Template operations
  fastify.post('/templates', {
    schema: {
      tags: ['Templates'],
      summary: 'Create a notification template',
      body: {
        type: 'object',
        required: ['name', 'type', 'subject', 'content'],
        properties: {
          name: { type: 'string', description: 'Unique template name' },
          type: { type: 'string', description: 'Notification type this template is for' },
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['email', 'sms', 'push', 'webhook', 'slack', 'in-app'] },
            default: ['email']
          },
          subject: { type: 'string' },
          content: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string' },
              html: { type: 'string' }
            }
          },
          variables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'object'] },
                required: { type: 'boolean' },
                description: { type: 'string' },
                defaultValue: {}
              }
            }
          }
        }
      }
    }
  }, controller.createTemplate.bind(controller));

  fastify.get('/templates/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Get template by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.getTemplate.bind(controller));

  fastify.get('/templates', {
    schema: {
      tags: ['Templates'],
      summary: 'List notification templates',
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by notification type' }
        }
      }
    }
  }, controller.listTemplates.bind(controller));

  fastify.patch('/templates/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Update a template',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.updateTemplate.bind(controller));

  fastify.delete('/templates/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Delete a template',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.deleteTemplate.bind(controller));

  // User preferences
  fastify.get('/preferences/:userId', {
    schema: {
      tags: ['User Preferences'],
      summary: 'Get user notification preferences',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, controller.getUserPreferences.bind(controller));

  fastify.post('/preferences/:userId', {
    schema: {
      tags: ['User Preferences'],
      summary: 'Set user notification preferences',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        required: ['channels', 'frequency'],
        properties: {
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['email', 'sms', 'push', 'webhook', 'slack', 'in-app'] }
          },
          quietHours: {
            type: 'object',
            properties: {
              start: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
              end: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
              timezone: { type: 'string', default: 'Asia/Bangkok' }
            }
          },
          frequency: {
            type: 'object',
            required: ['immediate', 'digest', 'digestInterval'],
            properties: {
              immediate: { type: 'boolean' },
              digest: { type: 'boolean' },
              digestInterval: { type: 'string', enum: ['hourly', 'daily', 'weekly'] }
            }
          },
          typePreferences: { type: 'object' }
        }
      }
    }
  }, controller.setUserPreferences.bind(controller));

  fastify.patch('/preferences/:userId', {
    schema: {
      tags: ['User Preferences'],
      summary: 'Update user notification preferences',
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, controller.updateUserPreferences.bind(controller));

  // Note: Batch operations have been moved to separate batch routes
  // See batch.routes.ts for batch processing endpoints

  // Analytics
  fastify.get('/analytics/stats', {
    schema: {
      tags: ['Analytics'],
      summary: 'Get notification statistics',
      querystring: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.getNotificationStats.bind(controller));

  fastify.get('/analytics/delivery-metrics', {
    schema: {
      tags: ['Analytics'],
      summary: 'Get delivery metrics',
      querystring: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.getDeliveryMetrics.bind(controller));

  fastify.get('/analytics/channel-stats', {
    schema: {
      tags: ['Analytics'],
      summary: 'Get channel statistics',
      querystring: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.getChannelStatistics.bind(controller));

  // Healthcare specific endpoints
  fastify.post('/healthcare', {
    schema: {
      tags: ['Healthcare Notifications'],
      summary: 'Create a healthcare notification',
      body: {
        type: 'object',
        required: ['type', 'channel', 'recipient', 'content', 'healthcare'],
        properties: {
          type: { type: 'string' },
          channel: { type: 'string', enum: ['email', 'sms', 'push', 'webhook', 'slack', 'in-app'] },
          recipient: { type: 'object' },
          content: { type: 'object' },
          healthcare: {
            type: 'object',
            properties: {
              patientId: { type: 'string' },
              providerId: { type: 'string' },
              appointmentId: { type: 'string' },
              facilityId: { type: 'string' },
              department: { type: 'string' },
              urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              hipaaCompliant: { type: 'boolean', default: true },
              encryptionEnabled: { type: 'boolean', default: false }
            }
          },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent', 'critical'], default: 'normal' },
          scheduledAt: { type: 'string', format: 'date-time' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, controller.createHealthcareNotification.bind(controller));

  fastify.post('/healthcare/appointment-reminder', {
    schema: {
      tags: ['Healthcare Notifications'],
      summary: 'Send appointment reminder',
      body: {
        type: 'object',
        required: ['patientId', 'providerId', 'appointmentId', 'recipient', 'appointmentDate', 'appointmentTime', 'department', 'doctorName'],
        properties: {
          patientId: { type: 'string' },
          providerId: { type: 'string' },
          appointmentId: { type: 'string' },
          recipient: { type: 'object' },
          appointmentDate: { type: 'string' },
          appointmentTime: { type: 'string' },
          department: { type: 'string' },
          doctorName: { type: 'string' }
        }
      }
    }
  }, controller.sendAppointmentReminder.bind(controller));

  fastify.post('/healthcare/lab-results', {
    schema: {
      tags: ['Healthcare Notifications'],
      summary: 'Send lab results notification',
      body: {
        type: 'object',
        required: ['patientId', 'providerId', 'recipient', 'testType'],
        properties: {
          patientId: { type: 'string' },
          providerId: { type: 'string' },
          recipient: { type: 'object' },
          testType: { type: 'string' },
          urgent: { type: 'boolean', default: false }
        }
      }
    }
  }, controller.sendLabResultsNotification.bind(controller));

  fastify.post('/healthcare/emergency', {
    schema: {
      tags: ['Healthcare Notifications'],
      summary: 'Send emergency notification',
      body: {
        type: 'object',
        required: ['patientId', 'facilityId', 'emergencyType', 'recipients', 'location'],
        properties: {
          patientId: { type: 'string' },
          facilityId: { type: 'string' },
          emergencyType: { type: 'string' },
          recipients: {
            type: 'array',
            items: { type: 'object' }
          },
          description: { type: 'string' },
          location: { type: 'string' }
        }
      }
    }
  }, controller.sendEmergencyNotification.bind(controller));

  // Error tracking
  fastify.get('/:id/errors', {
    schema: {
      tags: ['Error Tracking'],
      summary: 'Get notification errors',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.getNotificationErrors.bind(controller));

  // Error management routes
  fastify.get('/errors', {
    schema: {
      tags: ['Error Management'],
      summary: 'List all notification errors with filtering',
      querystring: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['email', 'sms', 'push', 'slack', 'webhook', 'in-app'] },
          type: { type: 'string' },
          retryable: { type: 'string', enum: ['true', 'false'] },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, controller.listAllErrors.bind(controller));

  fastify.get('/errors/statistics', {
    schema: {
      tags: ['Error Management'],
      summary: 'Get error statistics and analytics',
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 7 },
          groupBy: { type: 'string', enum: ['date', 'channel', 'type', 'retryable'], default: 'date' }
        }
      }
    }
  }, controller.getErrorStatistics.bind(controller));

  fastify.get('/errors/export', {
    schema: {
      tags: ['Error Management'],
      summary: 'Export error data as CSV or JSON',
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          channel: { type: 'string', enum: ['email', 'sms', 'push', 'slack', 'webhook', 'in-app'] },
          type: { type: 'string' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, controller.exportErrors.bind(controller));
}