import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';

// Schemas
const RoleSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  display_name: Type.String(),
  description: Type.Optional(Type.String()),
  is_system: Type.Boolean(),
  is_active: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

const PermissionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  resource: Type.String(),
  action: Type.String(),
  scope: Type.String(),
  display_name: Type.String(),
  description: Type.Optional(Type.String()),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

const UserRoleSchema = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  roles: Type.Array(Type.Object({
    ...RoleSchema.properties,
    permissions: Type.Array(PermissionSchema)
  }))
});

const CreateRoleSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  display_name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  is_active: Type.Optional(Type.Boolean())
});

const UpdateRoleSchema = Type.Object({
  display_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  is_active: Type.Optional(Type.Boolean())
});

const AssignRoleSchema = Type.Object({
  role_id: Type.String({ format: 'uuid' }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' }))
});

const AssignPermissionsSchema = Type.Object({
  permission_ids: Type.Array(Type.String({ format: 'uuid' }))
});

type CreateRole = Static<typeof CreateRoleSchema>;
type UpdateRole = Static<typeof UpdateRoleSchema>;
type AssignRole = Static<typeof AssignRoleSchema>;
type AssignPermissions = Static<typeof AssignPermissionsSchema>;

export default async function rbacRoutes(fastify: FastifyInstance) {
  // Get all roles
  fastify.get('/roles', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get all roles',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(RoleSchema)
        })
      }
    }
  }, async (request, reply) => {
    const roles = await fastify.rbac.getAllRoles();
    return { success: true, data: roles };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            ...RoleSchema.properties,
            permissions: Type.Array(PermissionSchema)
          })
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const role = await fastify.rbac.getRoleWithPermissions(id);
    
    if (!role) {
      return reply.code(404).send({
        success: false,
        message: 'Role not found'
      });
    }

    return { success: true, data: role };
  });

  // Create new role
  fastify.post('/roles', {
    preHandler: [fastify.requirePermission('roles', 'create', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Create new role',
      body: CreateRoleSchema,
      response: {
        201: Type.Object({
          success: Type.Boolean(),
          data: RoleSchema
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const roleData = request.body as CreateRole;
    
    try {
      const role = await fastify.rbac.createRole({
        ...roleData,
        is_system: false,
        is_active: roleData.is_active ?? true
      });
      
      return reply.code(201).send({
        success: true,
        data: role
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return reply.code(400).send({
          success: false,
          message: 'Role name already exists'
        });
      }
      throw error;
    }
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          data: RoleSchema
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as UpdateRole;
    
    const role = await fastify.rbac.updateRole(id, updateData);
    
    if (!role) {
      return reply.code(404).send({
        success: false,
        message: 'Role not found'
      });
    }

    return { success: true, data: role };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const deleted = await fastify.rbac.deleteRole(id);
    
    if (!deleted) {
      return reply.code(400).send({
        success: false,
        message: 'Cannot delete system role or role not found'
      });
    }

    return {
      success: true,
      message: 'Role deleted successfully'
    };
  });

  // Get all permissions
  fastify.get('/permissions', {
    preHandler: [fastify.requirePermission('roles', 'read', 'all')],
    schema: {
      tags: ['RBAC'],
      summary: 'Get all permissions',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(PermissionSchema)
        })
      }
    }
  }, async (request, reply) => {
    const permissions = await fastify.rbac.getAllPermissions();
    return { success: true, data: permissions };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { permission_ids } = request.body as AssignPermissions;
    
    await fastify.rbac.assignPermissionsToRole(id, permission_ids);
    
    return {
      success: true,
      message: 'Permissions assigned successfully'
    };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          data: UserRoleSchema
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userRoles = await fastify.rbac.getUserRoles(id);
    return { success: true, data: userRoles };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role_id, expires_at } = request.body as AssignRole;
    const userContext = fastify.rbac.getUserContext(request);
    
    await fastify.rbac.assignRoleToUser(
      id, 
      role_id, 
      userContext?.userId,
      expires_at ? new Date(expires_at) : undefined
    );
    
    return {
      success: true,
      message: 'Role assigned successfully'
    };
  });

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
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { userId, roleId } = request.params as { userId: string; roleId: string };
    
    await fastify.rbac.removeRoleFromUser(userId, roleId);
    
    return {
      success: true,
      message: 'Role removed successfully'
    };
  });

  // Get current user's permissions (for frontend to check what user can do)
  fastify.get('/me/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['RBAC'],
      summary: 'Get current user permissions',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            roles: Type.Array(Type.Object({
              ...RoleSchema.properties,
              permissions: Type.Array(PermissionSchema)
            })),
            permissions: Type.Array(PermissionSchema)
          })
        })
      }
    }
  }, async (request, reply) => {
    const userContext = fastify.rbac.getUserContext(request);
    if (!userContext) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const [userRoles, permissions] = await Promise.all([
      fastify.rbac.getUserRoles(userContext.userId),
      fastify.rbac.getUserPermissions(userContext.userId)
    ]);

    return {
      success: true,
      data: {
        roles: userRoles.roles,
        permissions
      }
    };
  });
}