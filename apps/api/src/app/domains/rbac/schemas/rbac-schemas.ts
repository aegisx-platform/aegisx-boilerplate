import { Type } from '@sinclair/typebox';

/**
 * TypeBox Schema definitions for RBAC API
 * Provides compile-time type safety and runtime validation
 *
 * These schemas define the structure for:
 * - Role management (CRUD operations)
 * - Permission management
 * - User-role assignments
 * - Permission checking
 */

// ========== Base Entity Schemas ==========
export const RoleSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Role unique identifier' }),
  name: Type.String({ description: 'Role system name (e.g., "admin", "manager")' }),
  display_name: Type.String({ description: 'Human-readable role name' }),
  description: Type.Optional(Type.String({ description: 'Role description' })),
  is_system: Type.Boolean({ description: 'Whether this is a system role (cannot be deleted)' }),
  is_active: Type.Boolean({ description: 'Whether this role is active' }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  user_count: Type.Optional(Type.Number({ description: 'Number of users assigned to this role' }))
});

export const CreateRoleSchema = Type.Object({
  name: Type.String({
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z][a-z0-9_]*$',
    description: 'Role system name (lowercase, alphanumeric + underscore)'
  }),
  display_name: Type.String({
    minLength: 2,
    maxLength: 100,
    description: 'Human-readable role name'
  }),
  description: Type.Optional(Type.String({
    maxLength: 500,
    description: 'Role description (optional)'
  })),
  is_active: Type.Optional(Type.Boolean({
    default: true,
    description: 'Whether this role is active (default: true)'
  }))
}, { additionalProperties: false });

export const UpdateRoleSchema = Type.Object({
  display_name: Type.Optional(Type.String({
    minLength: 2,
    maxLength: 100,
    description: 'Human-readable role name'
  })),
  description: Type.Optional(Type.String({
    maxLength: 500,
    description: 'Role description'
  })),
  is_active: Type.Optional(Type.Boolean({
    description: 'Whether this role is active'
  }))
}, { additionalProperties: false });

export const PermissionSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Permission unique identifier' }),
  resource: Type.String({ description: 'Resource name (e.g., "users", "roles")' }),
  action: Type.String({ description: 'Action name (e.g., "read", "create", "update", "delete")' }),
  scope: Type.String({ description: 'Scope (e.g., "own", "department", "all")' }),
  display_name: Type.String({ description: 'Human-readable permission name' }),
  description: Type.Optional(Type.String({ description: 'Permission description' })),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// ========== Request Schemas ==========

export const AssignRoleSchema = Type.Object({
  role_id: Type.String({
    format: 'uuid',
    description: 'UUID of the role to assign'
  }),
  expires_at: Type.Optional(Type.String({
    format: 'date-time',
    description: 'Optional expiration date for the role assignment'
  }))
}, { additionalProperties: false });

export const AssignPermissionsSchema = Type.Object({
  permission_ids: Type.Array(Type.String({ format: 'uuid' }), {
    minItems: 1,
    description: 'Array of permission UUIDs to assign (at least one required)'
  })
}, { additionalProperties: false });

// ========== Complex Schemas ==========

export const RoleWithPermissionsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  display_name: Type.String(),
  description: Type.Optional(Type.String()),
  is_system: Type.Boolean(),
  is_active: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  permissions: Type.Array(PermissionSchema)
});

export const UserRoleAssignmentSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  user_id: Type.String({ format: 'uuid' }),
  role_id: Type.String({ format: 'uuid' }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' })),
  created_at: Type.String({ format: 'date-time' }),
  role: RoleWithPermissionsSchema
});

// ========== Response Schemas ==========

// Common response schemas
export const MessageResponseSchema = Type.Object({
  message: Type.String()
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Optional(Type.Number()),
  required_permission: Type.Optional(Type.Object({
    resource: Type.String(),
    action: Type.String(),
    scope: Type.String()
  }))
});

// Role response schemas
export const RoleResponseSchema = Type.Object({
  message: Type.String(),
  role: RoleSchema
});

export const RolesResponseSchema = Type.Object({
  roles: Type.Array(RoleSchema),
  total: Type.Number()
});

export const RoleWithPermissionsResponseSchema = Type.Object({
  role: RoleWithPermissionsSchema
});

// Permission response schemas
export const PermissionsResponseSchema = Type.Object({
  permissions: Type.Array(PermissionSchema),
  total: Type.Number()
});

// User role response schemas
export const UserRolesResponseSchema = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  roles: Type.Array(UserRoleAssignmentSchema),
  total_roles: Type.Number()
});

export const UserPermissionsResponseSchema = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  permissions: Type.Array(Type.Object({
    resource: Type.String(),
    action: Type.String(),
    scope: Type.String(),
    permission_id: Type.String({ format: 'uuid' }),
    role_name: Type.String(),
    role_id: Type.String({ format: 'uuid' })
  })),
  total_permissions: Type.Number()
});

// ========== Complete Route Schemas ==========

export const RBACSchemas = {
  // Role management
  createRole: {
    description: 'Create a new role',
    tags: ['RBAC - Roles'],
    body: CreateRoleSchema,
    response: {
      201: RoleResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema
    }
  },

  getAllRoles: {
    description: 'Get all roles',
    tags: ['RBAC - Roles'],
    response: {
      200: RolesResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema
    }
  },

  getRoleById: {
    description: 'Get role with permissions by ID',
    tags: ['RBAC - Roles'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    response: {
      200: RoleWithPermissionsResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  updateRole: {
    description: 'Update role information',
    tags: ['RBAC - Roles'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    body: UpdateRoleSchema,
    response: {
      200: RoleResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  deleteRole: {
    description: 'Delete a role',
    tags: ['RBAC - Roles'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    response: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  // Permission management
  getAllPermissions: {
    description: 'Get all available permissions',
    tags: ['RBAC - Permissions'],
    response: {
      200: PermissionsResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema
    }
  },

  assignPermissionsToRole: {
    description: 'Assign permissions to a role',
    tags: ['RBAC - Permissions'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    body: AssignPermissionsSchema,
    response: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  // User role management
  getUserRoles: {
    description: 'Get user roles and permissions',
    tags: ['RBAC - User Management'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    response: {
      200: UserRolesResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  assignRoleToUser: {
    description: 'Assign a role to a user',
    tags: ['RBAC - User Management'],
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    body: AssignRoleSchema,
    response: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  removeRoleFromUser: {
    description: 'Remove a role from a user',
    tags: ['RBAC - User Management'],
    params: Type.Object({
      userId: Type.String({ format: 'uuid' }),
      roleId: Type.String({ format: 'uuid' })
    }),
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  getCurrentUserPermissions: {
    description: 'Get current authenticated user permissions',
    tags: ['RBAC - User Management'],
    security: [{ bearerAuth: [] }],
    response: {
      200: UserPermissionsResponseSchema,
      401: ErrorResponseSchema
    }
  }
} as const;
