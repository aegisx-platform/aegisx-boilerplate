import { FastifyInstance } from 'fastify';
import { notificationRoutes } from '../../../domains/notification';
import { DatabaseNotificationService, KnexNotificationRepository, DatabaseNotificationController } from '../../../domains/notification';
import { setupRealTimeIntegration, setupEventBusIntegration } from '../../../domains/notification/integrations/notification-integrations';

export default async function notificationV1Routes(fastify: FastifyInstance) {
  // Ensure required plugins are loaded
  if (!fastify.knex) {
    throw new Error('Notification routes require knex plugin to be loaded first');
  }

  // Initialize notification database service
  const repository = new KnexNotificationRepository(fastify.knex);
  const service = new DatabaseNotificationService(fastify, repository);
  
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

  fastify.log.info('✅ Notification routes registered successfully with integrations');
}