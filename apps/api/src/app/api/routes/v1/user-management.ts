import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { userManagementRoutes } from '../../../domains/user-management/routes/user-management-routes';

/**
 * User Management API Routes V1
 * 
 * Provides REST API endpoints for user management operations.
 * All routes are prefixed with /users and require authentication.
 */
const userManagementApiRoutes = async (fastify: FastifyInstance) => {
  // Register user management routes under /users prefix
  await fastify.register(userManagementRoutes, { prefix: '/users' });

  fastify.log.info('✅ User management API v1 routes loaded');
};

export default fp(userManagementApiRoutes, {
  name: 'user-management-api-v1-routes',
  dependencies: ['knex-plugin']
});