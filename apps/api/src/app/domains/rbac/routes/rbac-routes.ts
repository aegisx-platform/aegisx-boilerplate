import { FastifyInstance } from 'fastify';
import { RBACController } from '../controllers/rbac-controller';
import { RBACSchemas } from '../schemas/rbac-schemas';

/**
 * RBAC Routes
 * 
 * Handles all Role-Based Access Control endpoints with:
 * - Comprehensive schema validation using TypeBox
 * - Permission-based access control
 * - Proper error handling and logging
 * - OpenAPI documentation integration
 * 
 * Routes provided:
 * - Role management (CRUD)
 * - Permission management
 * - User-role assignments
 * - Permission checking
 */
export default async function rbacRoutes(fastify: FastifyInstance) {
  // Initialize controller
  const rbacController = new RBACController(fastify.rbac);

  // ========== Role Management ==========

  // Get all roles
  fastify.get('/roles', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: RBACSchemas.getAllRoles
  }, rbacController.getAllRoles.bind(rbacController));

  // Get role with permissions
  fastify.get('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: RBACSchemas.getRoleById
  }, rbacController.getRoleById.bind(rbacController));

  // Create new role
  fastify.post('/roles', {
    preHandler: [fastify.requirePermission('roles', 'create', 'all')],
    schema: RBACSchemas.createRole
  }, rbacController.createRole.bind(rbacController));

  // Update role
  fastify.put('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'update', 'all')],
    schema: RBACSchemas.updateRole
  }, rbacController.updateRole.bind(rbacController));

  // Delete role
  fastify.delete('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'delete', 'all')],
    schema: RBACSchemas.deleteRole
  }, rbacController.deleteRole.bind(rbacController));

  // ========== Permission Management ==========

  // Get all permissions
  fastify.get('/permissions', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: RBACSchemas.getAllPermissions
  }, rbacController.getAllPermissions.bind(rbacController));

  // Assign permissions to role
  fastify.post('/roles/:id/permissions', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: RBACSchemas.assignPermissionsToRole
  }, rbacController.assignPermissionsToRole.bind(rbacController));

  // ========== User Role Management ==========

  // Get user roles and permissions
  fastify.get('/users/:id/roles', {
    preHandler: [fastify.requirePermission('users', 'read', 'all')],
    schema: RBACSchemas.getUserRoles
  }, rbacController.getUserRoles.bind(rbacController));

  // Assign role to user
  fastify.post('/users/:id/roles', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: RBACSchemas.assignRoleToUser
  }, rbacController.assignRoleToUser.bind(rbacController));

  // Remove role from user
  fastify.delete('/users/:userId/roles/:roleId', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: RBACSchemas.removeRoleFromUser
  }, rbacController.removeRoleFromUser.bind(rbacController));

  // Get current user's permissions (for frontend to check what user can do)
  fastify.get('/me/permissions', {
    preHandler: [fastify.authenticate],
    schema: RBACSchemas.getCurrentUserPermissions
  }, rbacController.getCurrentUserPermissions.bind(rbacController));

  fastify.log.info('RBAC routes registered with comprehensive schemas and validation');
}