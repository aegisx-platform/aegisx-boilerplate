import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { DatabaseNotificationService } from '../../domains/notification/services/notification-database-service';
import { QueueNotificationService } from '../../domains/notification/services/queue-notification-service';
import { KnexNotificationRepository } from '../../domains/notification/repositories/notification-repository';
import { 
  setupRealTimeIntegration, 
  setupEventBusIntegration, 
  setupDynamicEmailIntegration,
  setupConfigurationIntegration 
} from '../../domains/notification/integrations/notification-integrations';

declare module 'fastify' {
  interface FastifyInstance {
    notificationDatabase: DatabaseNotificationService;
    queueNotificationService?: QueueNotificationService;
  }
}

export interface NotificationDatabasePluginOptions {
  enableQueueProcessing?: boolean;
  enableWebSocketIntegration?: boolean;
  enableEventBusIntegration?: boolean;
  enableDynamicEmailIntegration?: boolean;
  enableConfigurationIntegration?: boolean;
  queueConfig?: {
    autoProcessEnabled?: boolean;
    processInterval?: string;
    queueBroker?: 'redis' | 'rabbitmq';
    redisDb?: number;
    processingConcurrency?: number;
    maxRetryAttempts?: number;
  };
}

export default fp<NotificationDatabasePluginOptions>(
  async function notificationDatabasePlugin(
    fastify: FastifyInstance,
    options: NotificationDatabasePluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: NotificationDatabasePluginOptions = {
      enableQueueProcessing: process.env.NOTIFICATION_QUEUE_ENABLED === 'true',
      enableWebSocketIntegration: true,
      enableEventBusIntegration: true,
      enableDynamicEmailIntegration: true,
      enableConfigurationIntegration: true,
      queueConfig: {
        autoProcessEnabled: process.env.NOTIFICATION_AUTO_PROCESS_ENABLED === 'true',
        processInterval: process.env.NOTIFICATION_PROCESS_INTERVAL || '30s',
        queueBroker: (process.env.QUEUE_BROKER as 'redis' | 'rabbitmq') || 'redis',
        redisDb: parseInt(process.env.NOTIFICATION_REDIS_DB || '1'),
        processingConcurrency: parseInt(process.env.NOTIFICATION_PROCESSING_CONCURRENCY || '5'),
        maxRetryAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS || '3'),
      },
    };

    const pluginOptions = { ...defaultOptions, ...options };

    try {
      // ตรวจสอบ dependencies
      if (!fastify.knex) {
        throw new Error('Database connection (knex) is required for notification database');
      }

      // สร้าง repository
      const notificationRepository = new KnexNotificationRepository(fastify.knex);

      // สร้าง notification service
      let notificationService: DatabaseNotificationService;

      if (pluginOptions.enableQueueProcessing && pluginOptions.queueConfig) {
        // สร้าง queue notification service
        notificationService = new QueueNotificationService(
          fastify,
          notificationRepository,
          {
            autoProcessEnabled: pluginOptions.queueConfig.autoProcessEnabled || false,
            processInterval: pluginOptions.queueConfig.processInterval || '30s',
            queueBroker: pluginOptions.queueConfig.queueBroker || 'redis',
            redisDb: pluginOptions.queueConfig.redisDb || 1,
            processingConcurrency: pluginOptions.queueConfig.processingConcurrency || 5,
            maxRetryAttempts: pluginOptions.queueConfig.maxRetryAttempts || 3,
          }
        );

        // Register queue service with fastify
        fastify.decorate('queueNotificationService', notificationService as QueueNotificationService);

        fastify.log.info('Queue Notification Service initialized', {
          broker: pluginOptions.queueConfig.queueBroker,
          autoProcess: pluginOptions.queueConfig.autoProcessEnabled,
          interval: pluginOptions.queueConfig.processInterval,
        });
      } else {
        // สร้าง basic database notification service
        notificationService = new DatabaseNotificationService(
          fastify,
          notificationRepository
        );

        fastify.log.info('Database Notification Service initialized (basic mode)');
      }

      // Register notification service with fastify
      fastify.decorate('notificationDatabase', notificationService);

      // === Setup Integrations ===

      // Dynamic Email Integration (ต้องทำก่อน event bus integration)
      if (pluginOptions.enableDynamicEmailIntegration) {
        // Setup dynamic email service integration
        const dynamicEmailService = setupDynamicEmailIntegration(fastify, notificationService);
        
        if (dynamicEmailService) {
          fastify.log.info('✅ Dynamic Email Service integration enabled');
        } else {
          fastify.log.warn('Dynamic Email Service integration failed, falling back to static email service');
        }
      }

      // WebSocket Integration
      if (pluginOptions.enableWebSocketIntegration && fastify.websocketManager) {
        setupRealTimeIntegration(fastify, notificationService);
        fastify.log.info('✅ WebSocket integration enabled for notifications');
      } else if (pluginOptions.enableWebSocketIntegration) {
        fastify.log.warn('WebSocket integration requested but websocketManager not available');
      }

      // Event Bus Integration
      if (pluginOptions.enableEventBusIntegration && fastify.eventBus) {
        setupEventBusIntegration(fastify, notificationService);
        fastify.log.info('✅ Event Bus integration enabled for notifications');
      } else if (pluginOptions.enableEventBusIntegration) {
        fastify.log.warn('Event Bus integration requested but eventBus not available');
      }

      // Configuration Integration
      if (pluginOptions.enableConfigurationIntegration && fastify.eventBus) {
        setupConfigurationIntegration(fastify);
        fastify.log.info('✅ Configuration hot reload integration enabled for notifications');
      } else if (pluginOptions.enableConfigurationIntegration) {
        fastify.log.warn('Configuration integration requested but eventBus not available');
      }

      // === API Routes ===

      // Health check endpoint
      fastify.get('/health/notification-database', async (request, reply) => {
        try {
          const health = {
            databaseService: 'healthy',
            queueService: pluginOptions.enableQueueProcessing ? 'unknown' : 'disabled',
            emailService: 'unknown',
            integrations: {
              websocket: pluginOptions.enableWebSocketIntegration ? 'enabled' : 'disabled',
              eventBus: pluginOptions.enableEventBusIntegration ? 'enabled' : 'disabled',
              dynamicEmail: pluginOptions.enableDynamicEmailIntegration ? 'enabled' : 'disabled',
              configuration: pluginOptions.enableConfigurationIntegration ? 'enabled' : 'disabled',
            },
          };

          // Test database connection
          try {
            await fastify.knex.raw('SELECT 1');
            health.databaseService = 'healthy';
          } catch (error) {
            health.databaseService = 'unhealthy';
          }

          // Test queue service (if enabled)
          if (pluginOptions.enableQueueProcessing && fastify.queueNotificationService) {
            try {
              const metrics = await fastify.queueNotificationService.getQueueMetrics();
              health.queueService = metrics ? 'healthy' : 'unhealthy';
            } catch (error) {
              health.queueService = 'unhealthy';
            }
          }

          // Test email service
          const emailStatus = notificationService.getEmailServiceStatus();
          if (emailStatus.hasDynamicService || emailStatus.hasStaticService) {
            health.emailService = 'healthy';
          } else {
            health.emailService = 'unhealthy';
          }

          const allHealthy = health.databaseService === 'healthy' && 
                           health.emailService === 'healthy' && 
                           (health.queueService === 'healthy' || health.queueService === 'disabled');

          reply.code(allHealthy ? 200 : 503).send({
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: health,
          });

        } catch (error) {
          fastify.log.error('Notification database health check failed:', error);
          reply.code(503).send({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Email service status endpoint
      fastify.get('/api/v1/notification/email/status', async (request, reply) => {
        try {
          const emailStatus = notificationService.getEmailServiceStatus();
          
          let connectionStatus = null;
          if (emailStatus.hasDynamicService && (fastify as any).dynamicEmailService) {
            connectionStatus = await (fastify as any).dynamicEmailService.verifyConnection();
          }

          reply.send({
            success: true,
            data: {
              ...emailStatus,
              connectionVerified: connectionStatus,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          fastify.log.error('Failed to get email service status:', error);
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to get email service status',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Refresh email service endpoint
      fastify.post('/api/v1/notification/email/refresh', async (request, reply) => {
        try {
          // Refresh dynamic email service
          notificationService.refreshDynamicEmailService();

          // Get updated status
          const emailStatus = notificationService.getEmailServiceStatus();

          fastify.log.info('Email service refreshed successfully', {
            userId: (request.user as any)?.id,
            hasDynamicService: emailStatus.hasDynamicService,
          });

          reply.send({
            success: true,
            message: 'Email service refreshed successfully',
            data: emailStatus,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          fastify.log.error('Failed to refresh email service:', error);
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to refresh email service',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Graceful shutdown
      fastify.addHook('onClose', async () => {
        if (pluginOptions.enableQueueProcessing && fastify.queueNotificationService) {
          await fastify.queueNotificationService.shutdown();
        }
        fastify.log.info('Notification database plugin shutdown completed');
      });

      fastify.log.info('✅ Notification Database plugin registered successfully', {
        enableQueueProcessing: pluginOptions.enableQueueProcessing,
        enableWebSocketIntegration: pluginOptions.enableWebSocketIntegration,
        enableEventBusIntegration: pluginOptions.enableEventBusIntegration,
        enableDynamicEmailIntegration: pluginOptions.enableDynamicEmailIntegration,
        enableConfigurationIntegration: pluginOptions.enableConfigurationIntegration,
        queueBroker: pluginOptions.queueConfig?.queueBroker,
      });

    } catch (error) {
      fastify.log.error('Failed to register Notification Database plugin:', error);
      throw error;
    }
  },
  {
    name: 'notification-database-plugin',
    dependencies: ['env-plugin', 'knex-plugin', 'config-management-plugin'],
  }
);