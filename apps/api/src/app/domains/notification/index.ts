/**
 * Notification Domain - Module Entry Point
 * 
 * Exports all notification domain components for easy importing
 */

// Controllers
export { DatabaseNotificationController } from './controllers/notification-controller';
export { DatabaseBatchController } from './controllers/batch-controller';

// Services
export { DatabaseNotificationService } from './services/notification-database-service';
export { QueueNotificationService } from './services/queue-notification-service';
export { BatchWorkerService } from './services/batch-worker.service';

// Repositories
export { KnexNotificationRepository } from './repositories/notification-repository';

// Routes
export { notificationRoutes } from './routes/notification-routes';
export { batchRoutes } from './routes/batch.routes';

// Schemas
export * from './schemas/notification.schemas';
export * from './schemas/batch.schemas';

// Types
export * from './types/notification-domain.types';
export * from './types/batch.types';

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    notificationDatabase: DatabaseNotificationService;
    dynamicEmailService?: import('./services/dynamic-email-service').DynamicEmailService;
  }
}

// Import statement for the type declaration
import { DatabaseNotificationService } from './services/notification-database-service';

export * from './repositories/notification-repository';
export * from './services/notification-database-service';
export * from './services/queue-notification-service';
export * from './controllers/notification-controller';
export * from './routes/notification-routes';