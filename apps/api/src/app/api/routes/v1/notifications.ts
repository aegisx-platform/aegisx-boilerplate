import { FastifyInstance } from 'fastify';
import { notificationRoutes } from '../../../domains/notification';
import { QueueNotificationService, KnexNotificationRepository, DatabaseNotificationController } from '../../../domains/notification';
import { setupRealTimeIntegration, setupEventBusIntegration } from '../../../domains/notification/integrations/notification-integrations';

export default async function notificationV1Routes(fastify: FastifyInstance) {
  // Ensure required plugins are loaded
  if (!fastify.knex) {
    throw new Error('Notification routes require knex plugin to be loaded first');
  }

  // Initialize notification queue service with Bull + RabbitMQ integration
  const repository = new KnexNotificationRepository(fastify.knex);
  
  // Create configuration from environment variables
  const queueConfig = {
    autoProcessEnabled: fastify.config.NOTIFICATION_AUTO_PROCESS_ENABLED === 'true',
    processInterval: fastify.config.NOTIFICATION_PROCESS_INTERVAL || '30s',
    queueBroker: (fastify.config.QUEUE_BROKER || 'redis') as 'redis' | 'rabbitmq',
    redisDb: parseInt(fastify.config.NOTIFICATION_REDIS_DB || '1'),
    processingConcurrency: 5,
    maxRetryAttempts: parseInt(fastify.config.NOTIFICATION_RETRY_ATTEMPTS || '3'),
  };

  const service = new QueueNotificationService(fastify, repository, queueConfig);
  
  // Register as fastify decorator
  fastify.decorate('notificationDatabase', service);

  // Initialize controller
  const controller = new DatabaseNotificationController(service);

  // Register notification routes with controller
  await fastify.register(async function(fastify) {
    await notificationRoutes(fastify, controller);
  }, { prefix: '/notifications' });

  // Setup integrations if available
  if (fastify.eventBus) {
    setupEventBusIntegration(fastify, service);
  }

  if (fastify.websocketManager) {
    setupRealTimeIntegration(fastify, service);
  }

  // Add graceful shutdown hook
  fastify.addHook('onClose', async () => {
    await service.shutdown();
  });

  fastify.log.info('✅ Notification routes registered successfully with Bull + RabbitMQ integration', {
    autoProcessEnabled: queueConfig.autoProcessEnabled,
    queueBroker: queueConfig.queueBroker,
    processInterval: queueConfig.processInterval,
  });
}