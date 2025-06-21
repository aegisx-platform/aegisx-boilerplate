import { Type } from '@sinclair/typebox';
import { UserSchema } from '../../auth/schemas/auth-schemas';

/**
 * TypeBox Schema definitions for User Management API
 * Provides compile-time type safety and runtime validation
 */

// Common response schemas
export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number()
});

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
  success: Type.Boolean()
});

// User object schema for management (extended from auth)
const UserDetailSchema = Type.Intersect([
  UserSchema,
  Type.Object({
    last_login_at: Type.Union([
      Type.String({ format: 'date-time' }),
      Type.Null()
    ])
  })
]);

// Action response schemas for user management
export const UserActionResponseSchema = Type.Object({
  message: Type.String(),
  success: Type.Boolean()
});

export const UserActionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'User ID' })
});

// Response schemas
export const UserListResponseSchema = Type.Object({
  users: Type.Array(UserDetailSchema),
  pagination: Type.Object({
    page: Type.Number({ minimum: 1 }),
    limit: Type.Number({ minimum: 1, maximum: 100 }),
    total: Type.Number({ minimum: 0 }),
    pages: Type.Number({ minimum: 0 }),
    has_next: Type.Boolean(),
    has_prev: Type.Boolean()
  })
});

export const UserDetailResponseSchema = UserDetailSchema;

export const UserStatsResponseSchema = Type.Object({
  total_users: Type.Number({ minimum: 0 }),
  active_users: Type.Number({ minimum: 0 }),
  inactive_users: Type.Number({ minimum: 0 }),
  suspended_users: Type.Number({ minimum: 0 }),
  verified_users: Type.Number({ minimum: 0 }),
  unverified_users: Type.Number({ minimum: 0 }),
  recent_registrations: Type.Number({ minimum: 0 })
});

// Request schemas
export const CreateUserRequestSchema = Type.Object({
  name: Type.String({
    minLength: 2,
    maxLength: 100,
    description: 'User full name'
  }),
  username: Type.Optional(Type.String({
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_-]+$',
    description: 'Username (3-50 characters, alphanumeric, underscore, hyphen only)'
  })),
  email: Type.String({
    format: 'email',
    description: 'User email address'
  }),
  password: Type.String({
    minLength: 8,
    maxLength: 128,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]*$',
    description: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  }),
  status: Type.Optional(Type.Union([
    Type.Literal('active'),
    Type.Literal('inactive'),
    Type.Literal('suspended')
  ], { default: 'active' })),
  email_verified: Type.Optional(Type.Boolean({ default: false }))
}, { additionalProperties: false });

export const UpdateUserRequestSchema = Type.Object({
  name: Type.Optional(Type.String({
    minLength: 2,
    maxLength: 100,
    description: 'User full name'
  })),
  username: Type.Optional(Type.Union([
    Type.String({
      minLength: 3,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9_-]+$'
    }),
    Type.Null()
  ])),
  email: Type.Optional(Type.String({
    format: 'email',
    description: 'User email address'
  })),
  status: Type.Optional(Type.Union([
    Type.Literal('active'),
    Type.Literal('inactive'),
    Type.Literal('suspended')
  ]))
}, { additionalProperties: false });

export const UserSearchRequestSchema = Type.Object({
  q: Type.Optional(Type.String({
    minLength: 1,
    maxLength: 100,
    description: 'Search query'
  })),
  status: Type.Optional(Type.Union([
    Type.Literal('active'),
    Type.Literal('inactive'),
    Type.Literal('suspended')
  ])),
  email_verified: Type.Optional(Type.Boolean()),
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  sort_by: Type.Optional(Type.Union([
    Type.Literal('created_at'),
    Type.Literal('updated_at'),
    Type.Literal('name'),
    Type.Literal('email')
  ], { default: 'created_at' })),
  sort_order: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ], { default: 'desc' }))
}, { additionalProperties: false });

export const BulkUserActionRequestSchema = Type.Object({
  action: Type.Union([
    Type.Literal('activate'),
    Type.Literal('deactivate'),
    Type.Literal('suspend'),
    Type.Literal('delete'),
    Type.Literal('verify_email')
  ]),
  user_ids: Type.Array(Type.String({ format: 'uuid' }), {
    minItems: 1,
    maxItems: 100,
    description: 'Array of user IDs to perform action on'
  })
}, { additionalProperties: false });

export const BulkActionResponseSchema = Type.Object({
  success: Type.Boolean(),
  processed: Type.Number({ minimum: 0 }),
  failed: Type.Number({ minimum: 0 }),
  errors: Type.Array(Type.String())
});

// Route schemas for OpenAPI documentation
export const UserManagementSchemas = {
  // Error responses
  errorResponse: {
    description: 'Error response',
    type: 'object',
    properties: ErrorResponseSchema.properties
  },

  // Success responses
  messageResponse: {
    description: 'Success message',
    type: 'object',
    properties: MessageResponseSchema.properties
  },

  // User action schemas
  userActionParams: {
    summary: 'User action parameters',
    params: UserActionParamsSchema,
    response: {
      200: UserActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  },

  activateUser: {
    summary: 'Activate user account',
    description: 'Change user status to active',
    params: UserActionParamsSchema,
    response: {
      200: UserActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  deactivateUser: {
    summary: 'Deactivate user account',
    description: 'Change user status to inactive',
    params: UserActionParamsSchema,
    response: {
      200: UserActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  suspendUser: {
    summary: 'Suspend user account',
    description: 'Change user status to suspended',
    params: UserActionParamsSchema,
    response: {
      200: UserActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  verifyUserEmail: {
    summary: 'Verify user email address',
    description: 'Mark user email as verified',
    params: UserActionParamsSchema,
    response: {
      200: UserActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // User list endpoint
  listUsers: {
    summary: 'List users with pagination and filtering',
    description: 'Retrieve a paginated list of users with optional filtering and sorting',
    querystring: UserSearchRequestSchema,
    response: {
      200: UserListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // Get user by ID
  getUser: {
    summary: 'Get user details by ID',
    description: 'Retrieve detailed information about a specific user',
    params: Type.Object({
      id: Type.String({ format: 'uuid', description: 'User ID' })
    }),
    response: {
      200: UserDetailResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // Create user
  createUser: {
    summary: 'Create a new user',
    description: 'Create a new user account with admin privileges',
    body: CreateUserRequestSchema,
    response: {
      201: UserDetailResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // Update user
  updateUser: {
    summary: 'Update user information',
    description: 'Update user details and status',
    params: Type.Object({
      id: Type.String({ format: 'uuid', description: 'User ID' })
    }),
    body: UpdateUserRequestSchema,
    response: {
      200: UserDetailResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // Delete user
  deleteUser: {
    summary: 'Delete a user',
    description: 'Permanently delete a user account',
    params: Type.Object({
      id: Type.String({ format: 'uuid', description: 'User ID' })
    }),
    response: {
      200: MessageResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // User statistics
  getUserStats: {
    summary: 'Get user statistics',
    description: 'Retrieve comprehensive user statistics and metrics',
    response: {
      200: UserStatsResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  },

  // Bulk actions
  bulkAction: {
    summary: 'Perform bulk actions on users',
    description: 'Execute bulk operations on multiple users simultaneously',
    body: BulkUserActionRequestSchema,
    response: {
      200: BulkActionResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema
    },
    tags: ['User Management'],
    security: [{ bearerAuth: [] }]
  }
};