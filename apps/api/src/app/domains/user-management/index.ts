import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { userManagementRoutes } from './routes/user-management-routes';

/**
 * User Management Domain Module
 * 
 * Provides comprehensive user management capabilities including:
 * - User CRUD operations
 * - User status management
 * - Bulk operations
 * - User statistics
 * - Advanced search and filtering
 * 
 * This module is designed to be used by administrators for managing users.
 */
async function userManagementDomain(fastify: FastifyInstance) {
  // Register user management routes
  await fastify.register(userManagementRoutes, { prefix: '/user-management' });

  fastify.log.info('✅ User Management domain registered successfully');
}

export default fp(userManagementDomain, {
  name: 'user-management-domain',
  dependencies: ['knex-plugin']
});

// Export types and schemas for external use
export * from './types/user-management-types';
export * from './schemas/user-management-schemas';
export { UserManagementService } from './services/user-management-service';
export { UserManagementController } from './controllers/user-management-controller';