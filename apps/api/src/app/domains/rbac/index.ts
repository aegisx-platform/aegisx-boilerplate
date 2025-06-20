import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * RBAC Module Plugin
 *
 * This plugin encapsulates all Role-Based Access Control functionality including:
 * - Role management (create, read, update, delete)
 * - Permission management
 * - User role assignments
 * - Permission checking and enforcement
 * - Scope-based access control (own, department, all)
 *
 * Routes provided:
 * - GET /rbac/roles                     - Get all roles (admin)
 * - POST /rbac/roles                    - Create new role (admin)
 * - GET /rbac/roles/:id                 - Get role with permissions (admin)
 * - PUT /rbac/roles/:id                 - Update role (admin)
 * - DELETE /rbac/roles/:id              - Delete role (admin)
 * - GET /rbac/permissions               - Get all permissions (admin)
 * - POST /rbac/roles/:id/permissions    - Assign permissions to role (admin)
 * - GET /rbac/users/:id/roles           - Get user roles (admin)
 * - POST /rbac/users/:id/roles          - Assign role to user (admin)
 * - DELETE /rbac/users/:userId/roles/:roleId - Remove role from user (admin)
 * - GET /rbac/me/permissions            - Get current user permissions (protected)
 *
 * Dependencies:
 * - rbac plugin (for RBAC service and middleware)
 * - jwt plugin (for authentication)
 */
export default fp(async function rbacModule(fastify: FastifyInstance) {
  // Ensure required dependencies are loaded
  await fastify.after();

  // Verify required dependencies
  if (!fastify.rbac) {
    throw new Error('RBAC module requires rbac plugin to be loaded first');
  }

  if (!fastify.authenticate) {
    throw new Error('RBAC module requires jwt authenticate decorator to be available');
  }

  // RBAC module only provides services and controllers  
  // Routes are registered at API layer for proper versioning
  
  fastify.log.info('✅ RBAC module registered successfully (routes handled by API layer)');

}, {
  name: 'rbac-module',
  dependencies: ['rbac', 'jwt-plugin']
});
