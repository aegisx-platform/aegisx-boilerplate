import { Type } from '@sinclair/typebox';

/**
 * RBAC Admin Schemas
 * 
 * Schemas for RBAC admin endpoints (cache management, etc.)
 */

// Common error response
export const AdminErrorResponseSchema = Type.Object({
  success: Type.Boolean({ default: false }),
  error: Type.String()
});

// Cache invalidation schemas
export const InvalidateUserCacheSchema = {
  summary: 'Invalidate specific user RBAC cache',
  description: 'Force refresh of user roles and permissions cache. Use after role assignments.',
  tags: ['RBAC Admin'],
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    userId: Type.String({ format: 'uuid' })
  }),
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      message: Type.String(),
      userId: Type.String()
    }),
    401: AdminErrorResponseSchema,
    403: AdminErrorResponseSchema,
    500: AdminErrorResponseSchema
  }
};

export const InvalidateAllCacheSchema = {
  summary: 'Invalidate all RBAC cache',
  description: 'Clear all cached roles and permissions. Use after system-wide changes.',
  tags: ['RBAC Admin'],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      message: Type.String()
    }),
    401: AdminErrorResponseSchema,
    403: AdminErrorResponseSchema,
    500: AdminErrorResponseSchema
  }
};

export const GetCacheStatsSchema = {
  summary: 'Get RBAC cache statistics',
  description: 'View cache performance metrics and usage statistics',
  tags: ['RBAC Admin'],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      data: Type.Object({
        pattern: Type.String(),
        count: Type.Number(),
        memoryUsage: Type.String(),
        timestamp: Type.String({ format: 'date-time' })
      })
    }),
    401: AdminErrorResponseSchema,
    403: AdminErrorResponseSchema,
    500: AdminErrorResponseSchema
  }
};