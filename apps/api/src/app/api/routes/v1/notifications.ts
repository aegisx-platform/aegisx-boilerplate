import { FastifyInstance } from 'fastify';
import { notificationRoutes, batchRoutes } from '../../../domains/notification';
import { 
  QueueNotificationService, 
  KnexNotificationRepository, 
  DatabaseNotificationController,
  BatchWorkerService,
  DatabaseBatchController 
} from '../../../domains/notification';
import { setupRealTimeIntegration, setupEventBusIntegration } from '../../../domains/notification/integrations/notification-integrations';

export default async function notificationV1Routes(fastify: FastifyInstance) {
  // Ensure required plugins are loaded
  if (!fastify.knex) {
    throw new Error('Notification routes require knex plugin to be loaded first');
  }

  // Initialize notification queue service with Bull + RabbitMQ integration
  const repository = new KnexNotificationRepository(fastify.knex, fastify);
  
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

  // Initialize batch worker service
  const batchWorkerConfig = {
    enabled: fastify.config.BATCH_WORKER_ENABLED === 'true',
    workerConcurrency: parseInt(fastify.config.BATCH_WORKER_CONCURRENCY || '5'),
    batchSize: parseInt(fastify.config.BATCH_SIZE || '50'),
    processingInterval: fastify.config.BATCH_PROCESSING_INTERVAL || '60s',
    queueBroker: (fastify.config.BATCH_QUEUE_BROKER || fastify.config.QUEUE_BROKER || 'redis') as 'redis' | 'rabbitmq',
    maxRetryAttempts: parseInt(fastify.config.BATCH_MAX_RETRY_ATTEMPTS || '3'),
    redisDb: parseInt(fastify.config.BATCH_REDIS_DB || '2'),
    channelConcurrency: {
      email: parseInt(fastify.config.BATCH_EMAIL_CONCURRENCY || '10'),
      sms: parseInt(fastify.config.BATCH_SMS_CONCURRENCY || '5'),
      push: parseInt(fastify.config.BATCH_PUSH_CONCURRENCY || '15'),
      slack: parseInt(fastify.config.BATCH_SLACK_CONCURRENCY || '3'),
    },
  };

  const batchWorkerService = new BatchWorkerService(fastify, repository, batchWorkerConfig);

  // Initialize controllers
  const controller = new DatabaseNotificationController(service);
  const batchController = new DatabaseBatchController(batchWorkerService, fastify);

  // Register notification routes with controller
  await fastify.register(async function(fastify) {
    await notificationRoutes(fastify, controller);
  }, { prefix: '/notifications' });

  // Register batch routes with controller
  console.log('=== REGISTERING BATCH ROUTES ===');
  await fastify.register(async function(fastify) {
    console.log('=== INSIDE BATCH ROUTE REGISTRATION ===');
    await batchRoutes(fastify, {}, batchController);
    console.log('=== BATCH ROUTES REGISTERED ===');
  }, { prefix: '/notifications/batch' });

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
    await batchWorkerService.shutdown();
  });

  fastify.log.info('✅ Notification routes registered successfully with Bull + RabbitMQ integration', {
    autoProcessEnabled: queueConfig.autoProcessEnabled,
    queueBroker: queueConfig.queueBroker,
    processInterval: queueConfig.processInterval,
    batchEnabled: batchWorkerConfig.enabled,
    batchWorkerConcurrency: batchWorkerConfig.workerConcurrency,
  });
}