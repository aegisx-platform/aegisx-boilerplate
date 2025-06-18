import { Type } from '@sinclair/typebox';

// Role Schemas
export const RoleSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  display_name: Type.String(),
  description: Type.Optional(Type.String()),
  is_system: Type.Boolean(),
  is_active: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

export const CreateRoleSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  display_name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  is_active: Type.Optional(Type.Boolean())
});

export const UpdateRoleSchema = Type.Object({
  display_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  is_active: Type.Optional(Type.Boolean())
});

// Permission Schemas
export const PermissionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  resource: Type.String(),
  action: Type.String(),
  scope: Type.String(),
  display_name: Type.String(),
  description: Type.Optional(Type.String()),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// User Role Schemas
export const UserRoleSchema = Type.Object({
  user_id: Type.String({ format: 'uuid' }),
  roles: Type.Array(Type.Object({
    ...RoleSchema.properties,
    permissions: Type.Array(PermissionSchema)
  }))
});

export const AssignRoleSchema = Type.Object({
  role_id: Type.String({ format: 'uuid' }),
  expires_at: Type.Optional(Type.String({ format: 'date-time' }))
});

export const AssignPermissionsSchema = Type.Object({
  permission_ids: Type.Array(Type.String({ format: 'uuid' }))
});

// Response Schemas
export const RoleResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: RoleSchema
});

export const RolesResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(RoleSchema)
});

export const RoleWithPermissionsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    ...RoleSchema.properties,
    permissions: Type.Array(PermissionSchema)
  })
});

export const PermissionsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(PermissionSchema)
});

export const UserRolesResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: UserRoleSchema
});

export const MessageResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

export const ErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  required_permission: Type.Optional(Type.Object({
    resource: Type.String(),
    action: Type.String(),
    scope: Type.Optional(Type.String())
  }))
});

export const UserPermissionsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    roles: Type.Array(Type.Object({
      ...RoleSchema.properties,
      permissions: Type.Array(PermissionSchema)
    })),
    permissions: Type.Array(PermissionSchema)
  })
});