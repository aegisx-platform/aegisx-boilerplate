import { Type } from '@sinclair/typebox';
import {
  AuditLogQuerySchema,
  AuditLogListResponseSchema,
  AuditLogResponseSchema,
  AuditLogStatsResponseSchema,
  ErrorResponseSchema
} from './audit-log-schemas';

/**
 * Audit Log Route Schemas
 * 
 * Complete schema definitions for audit log endpoints
 */

// Common param schemas
export const AuditLogIdParamSchema = Type.Object({
  id: Type.String({ 
    format: 'uuid',
    description: 'Audit log ID'
  })
});

export const UserIdParamSchema = Type.Object({
  userId: Type.String({ 
    format: 'uuid',
    description: 'User ID'
  })
});

export const ResourceTypeParamSchema = Type.Object({
  resourceType: Type.String({
    description: 'Resource type (e.g., user, patient, appointment)'
  })
});

// Common query schemas
export const PaginationQuerySchema = Type.Object({
  limit: Type.Integer({ 
    minimum: 1, 
    maximum: 1000, 
    default: 50,
    description: 'Number of results to return'
  }),
  offset: Type.Integer({ 
    minimum: 0, 
    default: 0,
    description: 'Number of results to skip'
  })
});

// Cleanup request body schema
export const CleanupRequestSchema = Type.Object({
  olderThanDays: Type.Integer({
    minimum: 30,
    default: 365,
    description: 'Delete logs older than this many days (minimum 30)'
  })
});

// Cleanup response schema
export const CleanupResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    deleted_count: Type.Integer(),
    older_than_days: Type.Integer()
  })
});

// Complete route schemas
export const GetAuditLogsSchema = {
  description: 'Get audit logs with optional filtering and pagination',
  tags: ['Audit Logs'],
  querystring: AuditLogQuerySchema,
  response: {
    200: AuditLogListResponseSchema,
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};

export const GetAuditLogByIdSchema = {
  description: 'Get a specific audit log by ID',
  tags: ['Audit Logs'],
  params: AuditLogIdParamSchema,
  response: {
    200: AuditLogResponseSchema,
    404: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};

export const GetUserAuditLogsSchema = {
  description: 'Get audit logs for a specific user',
  tags: ['Audit Logs'],
  params: UserIdParamSchema,
  querystring: PaginationQuerySchema,
  response: {
    200: AuditLogListResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};

export const GetResourceAuditLogsSchema = {
  description: 'Get audit logs for a specific resource type',
  tags: ['Audit Logs'],
  params: ResourceTypeParamSchema,
  querystring: PaginationQuerySchema,
  response: {
    200: AuditLogListResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};

export const GetAuditLogStatsSchema = {
  description: 'Get audit log statistics and summary',
  tags: ['Audit Logs'],
  response: {
    200: AuditLogStatsResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};

export const CleanupAuditLogsSchema = {
  description: 'Cleanup old audit logs (admin only)',
  tags: ['Audit Logs'],
  body: CleanupRequestSchema,
  response: {
    200: CleanupResponseSchema,
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    500: ErrorResponseSchema
  },
  security: [{ bearerAuth: [] }]
};