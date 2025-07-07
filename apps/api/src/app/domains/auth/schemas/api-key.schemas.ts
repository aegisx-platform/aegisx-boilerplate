/**
 * API Key Validation Schemas
 * 
 * TypeBox schemas for API key endpoints validation and documentation
 */

import { Type, Static } from '@sinclair/typebox'

// API Key Permissions Schema
export const ApiKeyPermissionsSchema = Type.Object({
  resources: Type.Optional(Type.Array(Type.String({ 
    description: 'Allowed resources (e.g., users, files, reports)' 
  }))),
  actions: Type.Optional(Type.Array(Type.String({ 
    description: 'Allowed actions (e.g., read, write, delete)' 
  }))),
  scopes: Type.Optional(Type.Array(Type.String({ 
    description: 'Access scopes (e.g., own, department, all)' 
  }))),
  endpoints: Type.Optional(Type.Array(Type.String({ 
    description: 'Specific endpoint patterns allowed' 
  }))),
  rateLimit: Type.Optional(Type.Number({ 
    minimum: 1, 
    maximum: 10000,
    description: 'Custom rate limit per hour' 
  })),
  maxRequests: Type.Optional(Type.Number({ 
    minimum: 1,
    description: 'Total request limit for this key' 
  }))
})

// Create API Key Request Schema
export const CreateApiKeyRequestSchema = Type.Object({
  name: Type.String({ 
    minLength: 1, 
    maxLength: 255,
    description: 'Descriptive name for the API key' 
  }),
  description: Type.Optional(Type.String({ 
    maxLength: 1000,
    description: 'Optional description or purpose' 
  })),
  permissions: Type.Optional(ApiKeyPermissionsSchema),
  expiresAt: Type.Optional(Type.String({ 
    format: 'date-time',
    description: 'Optional expiration date' 
  })),
  rateLimit: Type.Optional(Type.Number({ 
    minimum: 1, 
    maximum: 10000, 
    default: 1000,
    description: 'Rate limit per hour' 
  })),
  ipWhitelist: Type.Optional(Type.Array(Type.String({ 
    pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F:]+)$',
    description: 'IP addresses allowed to use this key' 
  })))
})

// API Key Response Schema
export const ApiKeyResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  key: Type.String({ 
    description: 'The API key - store this securely, it will not be shown again!' 
  }),
  name: Type.String(),
  prefix: Type.String({ 
    description: 'Key prefix for identification' 
  }),
  createdAt: Type.String({ format: 'date-time' })
})

// API Key List Item Schema
export const ApiKeyListItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  prefix: Type.String(),
  permissions: ApiKeyPermissionsSchema,
  expiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  lastUsedAt: Type.Optional(Type.String({ format: 'date-time' })),
  usageCount: Type.Number(),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' })
})

// List API Keys Response Schema
export const ListApiKeysResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(ApiKeyListItemSchema),
  total: Type.Number()
})

// Get API Key Response Schema
export const GetApiKeyResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    ...ApiKeyListItemSchema.properties,
    usageStats: Type.Object({
      totalRequests: Type.Number(),
      successfulRequests: Type.Number(),
      failedRequests: Type.Number(),
      lastUsedAt: Type.Optional(Type.String({ format: 'date-time' })),
      lastUsedIp: Type.Optional(Type.String()),
      topEndpoints: Type.Array(Type.Object({
        endpoint: Type.String(),
        count: Type.Number()
      })),
      dailyUsage: Type.Array(Type.Object({
        date: Type.String({ format: 'date' }),
        count: Type.Number()
      }))
    })
  })
})

// Revoke API Key Request Schema
export const RevokeApiKeyRequestSchema = Type.Object({
  reason: Type.Optional(Type.String({ 
    maxLength: 500,
    description: 'Reason for revoking the key' 
  }))
})

// API Key Success Response Schema
export const ApiKeySuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
})

// API Key Error Response Schema
export const ApiKeyErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any())
  })
})

// TypeScript types derived from schemas
export type CreateApiKeyRequest = Static<typeof CreateApiKeyRequestSchema>
export type ApiKeyResponse = Static<typeof ApiKeyResponseSchema>
export type ApiKeyListItem = Static<typeof ApiKeyListItemSchema>
export type ListApiKeysResponse = Static<typeof ListApiKeysResponseSchema>
export type GetApiKeyResponse = Static<typeof GetApiKeyResponseSchema>
export type RevokeApiKeyRequest = Static<typeof RevokeApiKeyRequestSchema>
export type ApiKeySuccessResponse = Static<typeof ApiKeySuccessResponseSchema>
export type ApiKeyErrorResponse = Static<typeof ApiKeyErrorResponseSchema>