import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RBACController } from '../controllers/rbac-controller';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignRoleSchema,
  AssignPermissionsSchema,
  RoleResponseSchema,
  RolesResponseSchema,
  RoleWithPermissionsResponseSchema,
  PermissionsResponseSchema,
  UserRolesResponseSchema,
  MessageResponseSchema,
  UserPermissionsResponseSchema
} from '../schemas/rbac-schemas';

export default async function rbacRoutes(fastify: FastifyInstance) {
  // Initialize controller
  const rbacController = new RBACController(fastify.rbac);

  // Get all roles
  fastify.get('/roles', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get all roles',
      response: {
        200: RolesResponseSchema
      }
    }
  }, rbacController.getAllRoles.bind(rbacController));

  // Get role with permissions
  fastify.get('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get role with permissions',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: RoleWithPermissionsResponseSchema,
        404: MessageResponseSchema
      }
    }
  }, rbacController.getRoleById.bind(rbacController));

  // Create new role
  fastify.post('/roles', {
    preHandler: [fastify.requirePermission('roles', 'create', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Create new role',
      body: CreateRoleSchema,
      response: {
        201: RoleResponseSchema,
        400: MessageResponseSchema
      }
    }
  }, rbacController.createRole.bind(rbacController));

  // Update role
  fastify.put('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'update', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Update role',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: UpdateRoleSchema,
      response: {
        200: RoleResponseSchema,
        404: MessageResponseSchema
      }
    }
  }, rbacController.updateRole.bind(rbacController));

  // Delete role
  fastify.delete('/roles/:id', {
    preHandler: [fastify.requirePermission('roles', 'delete', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Delete role',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: MessageResponseSchema,
        400: MessageResponseSchema
      }
    }
  }, rbacController.deleteRole.bind(rbacController));

  // Get all permissions
  fastify.get('/permissions', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get all permissions',
      response: {
        200: PermissionsResponseSchema
      }
    }
  }, rbacController.getAllPermissions.bind(rbacController));

  // Assign permissions to role
  fastify.post('/roles/:id/permissions', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Assign permissions to role',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: AssignPermissionsSchema,
      response: {
        200: MessageResponseSchema
      }
    }
  }, rbacController.assignPermissionsToRole.bind(rbacController));

  // Get user roles and permissions
  fastify.get('/users/:id/roles', {
    preHandler: [fastify.requirePermission('users', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get user roles and permissions',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: UserRolesResponseSchema
      }
    }
  }, rbacController.getUserRoles.bind(rbacController));

  // Assign role to user
  fastify.post('/users/:id/roles', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Assign role to user',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: AssignRoleSchema,
      response: {
        200: MessageResponseSchema
      }
    }
  }, rbacController.assignRoleToUser.bind(rbacController));

  // Remove role from user
  fastify.delete('/users/:userId/roles/:roleId', {
    preHandler: [fastify.requirePermission('roles', 'assign', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Remove role from user',
      params: Type.Object({
        userId: Type.String({ format: 'uuid' }),
        roleId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: MessageResponseSchema
      }
    }
  }, rbacController.removeRoleFromUser.bind(rbacController));

  // Get current user's permissions (for frontend to check what user can do)
  fastify.get('/me/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['RBAC'],
      summary: 'Get current user permissions',
      response: {
        200: UserPermissionsResponseSchema
      }
    }
  }, rbacController.getCurrentUserPermissions.bind(rbacController));
}