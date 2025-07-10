/**
 * Notification Domain - Module Entry Point
 * 
 * Exports all notification domain components for easy importing
 */

// Controllers
export { DatabaseNotificationController } from './controllers/notification-controller';

// Services
export { DatabaseNotificationService } from './services/notification-database-service';
export { QueueNotificationService } from './services/queue-notification-service';

// Repositories
export { KnexNotificationRepository } from './repositories/notification-repository';

// Routes
export { notificationRoutes } from './routes/notification-routes';

// Schemas
export * from './schemas/notification.schemas';

// Types
export * from './types/notification-domain.types';

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    notificationDatabase: DatabaseNotificationService;
  }
}

// Import statement for the type declaration
import { DatabaseNotificationService } from './services/notification-database-service';

export * from './repositories/notification-repository';
export * from './services/notification-database-service';
export * from './services/queue-notification-service';
export * from './controllers/notification-controller';
export * from './routes/notification-routes';