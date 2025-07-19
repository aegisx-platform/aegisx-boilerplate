import { Type } from '@sinclair/typebox';

/**
 * TypeBox Schema definitions for Authentication API
 * Provides compile-time type safety and runtime validation
 *
 * Types are exported from ../types.ts
 */

// Common response schemas
export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String()
});

export const MessageResponseSchema = Type.Object({
  message: Type.String()
});

// User object schema (without password)
export const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  username: Type.Union([Type.String(), Type.Null()]),
  email: Type.String({ format: 'email' }),
  status: Type.Union([
    Type.Literal('active'),
    Type.Literal('inactive'),
    Type.Literal('suspended')
  ]),
  email_verified_at: Type.Union([
    Type.String({ format: 'date-time' }),
    Type.Null()
  ]),
  last_login_at: Type.Union([
    Type.String({ format: 'date-time' }),
    Type.Null()
  ]),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Authentication response schemas
export const LoginResponseSchema = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  user: UserSchema,
  expires_in: Type.Number()
});

export const RefreshResponseSchema = Type.Object({
  access_token: Type.String(),
  expires_in: Type.Number()
});

// Request body schemas
export const RegisterRequestSchema = Type.Object({
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
  })
}, { additionalProperties: false });

export const LoginRequestSchema = Type.Object({
  identifier: Type.String({
    minLength: 1,
    description: 'Username or email address'
  }),
  password: Type.String({
    minLength: 1,
    description: 'User password'
  })
}, { additionalProperties: false });

export const RefreshTokenRequestSchema = Type.Object({
  refresh_token: Type.String({
    minLength: 1,
    description: 'Valid refresh token'
  })
}, { additionalProperties: false });

export const ChangePasswordRequestSchema = Type.Object({
  current_password: Type.String({
    minLength: 1,
    description: 'Current password'
  }),
  new_password: Type.String({
    minLength: 8,
    maxLength: 128,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]*$',
    description: 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
  })
}, { additionalProperties: false });

export const UpdateProfileRequestSchema = Type.Object({
  name: Type.Optional(Type.String({
    minLength: 2,
    maxLength: 100,
    description: 'User full name'
  }))
}, { additionalProperties: false });

export const LogoutRequestSchema = Type.Object({
  refresh_token: Type.Optional(Type.String({
    description: 'Refresh token to revoke (optional - if not provided, all tokens will be revoked)'
  }))
}, { additionalProperties: false });

// Complete route schemas for Fastify
export const AuthSchemas = {
  register: {
    description: 'Register a new user',
    tags: ['Authentication'],
    body: RegisterRequestSchema,
    response: {
      201: Type.Object({
        message: Type.String(),
        user: UserSchema
      }),
      409: ErrorResponseSchema,
      400: ErrorResponseSchema
    }
  },

  login: {
    description: 'Login with email and password',
    tags: ['Authentication'],
    body: LoginRequestSchema,
    response: {
      200: LoginResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      400: ErrorResponseSchema
    }
  },

  refresh: {
    description: 'Refresh access token using refresh token',
    tags: ['Authentication'],
    body: RefreshTokenRequestSchema,
    response: {
      200: RefreshResponseSchema,
      401: ErrorResponseSchema,
      400: ErrorResponseSchema
    }
  },

  logout: {
    description: 'Logout user and revoke refresh tokens',
    tags: ['Authentication'],
    body: LogoutRequestSchema,
    security: [{ bearerAuth: [] }],
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema
    }
  },

  getProfile: {
    description: 'Get current user profile',
    tags: ['User Profile'],
    security: [{ bearerAuth: [] }],
    response: {
      200: UserSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  updateProfile: {
    description: 'Update current user profile',
    tags: ['User Profile'],
    body: UpdateProfileRequestSchema,
    security: [{ bearerAuth: [] }],
    response: {
      200: UserSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      400: ErrorResponseSchema
    }
  },

  changePassword: {
    description: 'Change user password',
    tags: ['User Profile'],
    body: ChangePasswordRequestSchema,
    security: [{ bearerAuth: [] }],
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema,
      400: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  },

  verifyEmail: {
    description: 'Verify user email address',
    tags: ['User Profile'],
    security: [{ bearerAuth: [] }],
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema
    }
  }
} as const;
