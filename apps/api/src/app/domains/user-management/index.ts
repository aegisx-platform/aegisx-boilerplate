import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

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
 * Routes provided:
 * - GET /user-management/users        - List users with filtering (admin)
 * - POST /user-management/users       - Create new user (admin)
 * - GET /user-management/users/:id    - Get user details (admin)
 * - PUT /user-management/users/:id    - Update user (admin)
 * - DELETE /user-management/users/:id - Delete/deactivate user (admin)
 * - POST /user-management/users/:id/reset-password - Reset user password (admin)
 * - PUT /user-management/users/:id/status - Update user status (admin)
 * - PUT /user-management/users/:id/roles - Update user roles (admin)
 * 
 * This module is designed to be used by administrators for managing users.
 */
async function userManagementDomain(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.knex) {
    throw new Error('User management module requires knex plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('User management module requires jwt authenticate decorator to be available');
  }

  if (!fastify.rbac) {
    throw new Error('User management module requires rbac plugin to be loaded first');
  }

  // User management module only provides services and controllers
  // Routes are registered at API layer for proper versioning

  fastify.log.info('✅ User Management domain registered successfully (routes handled by API layer)');
}

export default fp(userManagementDomain, {
  name: 'user-management-domain',
  dependencies: ['knex-plugin', 'jwt-plugin', 'rbac']
});

// Export types and schemas for external use
export * from './types/user-management-types';
export * from './schemas/user-management-schemas';
export { UserManagementService } from './services/user-management-service';
export { UserManagementController } from './controllers/user-management-controller';