import { Type } from '@sinclair/typebox';

/**
 * Additional Auth Route Schemas
 * 
 * Schemas for auth routes that are defined inline in routes file
 */

export const CheckTokenSchema = {
  summary: 'Check token freshness and RBAC changes',
  description: 'Returns whether the current token should be refreshed due to role/permission changes',
  tags: ['Authentication'],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      should_refresh: Type.Boolean(),
      reason: Type.String(),
      expires_in: Type.Number({ description: 'Seconds until token expires' }),
      roles_changed: Type.Boolean(),
      permissions_changed: Type.Boolean()
    }),
    401: Type.Object({
      success: Type.Boolean({ default: false }),
      error: Type.String()
    }),
    500: Type.Object({
      success: Type.Boolean({ default: false }),
      error: Type.String()
    })
  }
};