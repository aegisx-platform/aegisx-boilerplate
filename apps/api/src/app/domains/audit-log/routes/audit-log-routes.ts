import { FastifyInstance } from 'fastify';
import { AuditLogController } from '../controllers/audit-log-controller';
import { AuditLogService } from '../services/audit-log-service';
import { AuditLogRepositoryImpl } from '../repositories/audit-log-repository';
import {
  AuditLogQuerySchema,
  AuditLogListResponseSchema,
  AuditLogResponseSchema,
  AuditLogStatsResponseSchema,
  ErrorResponseSchema
} from '../schemas/audit-log-schemas';

const auditLogRoutes = async (fastify: FastifyInstance) => {
  // Initialize dependencies
  const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
  const auditLogService = new AuditLogService(auditLogRepository);
  const auditLogController = new AuditLogController(auditLogService);

  // Get audit logs with search/filter
  fastify.get<{ Querystring: any }>('/audit-logs', {
    schema: {
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
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getAuditLogs.bind(auditLogController)
  });

  // Get specific audit log by ID
  fastify.get<{ Params: { id: string } }>('/audit-logs/:id', {
    schema: {
      description: 'Get a specific audit log by ID',
      tags: ['Audit Logs'],
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            format: 'uuid',
            description: 'Audit log ID'
          }
        },
        required: ['id']
      },
      response: {
        200: AuditLogResponseSchema,
        404: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getAuditLogById.bind(auditLogController)
  });

  // Get audit logs for a specific user
  fastify.get<{ Params: { userId: string }, Querystring: any }>('/audit-logs/user/:userId', {
    schema: {
      description: 'Get audit logs for a specific user',
      tags: ['Audit Logs'],
      params: {
        type: 'object',
        properties: {
          userId: { 
            type: 'string', 
            format: 'uuid',
            description: 'User ID'
          }
        },
        required: ['userId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 1000, 
            default: 50,
            description: 'Number of results to return'
          },
          offset: { 
            type: 'integer', 
            minimum: 0, 
            default: 0,
            description: 'Number of results to skip'
          }
        }
      },
      response: {
        200: AuditLogListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getUserAuditLogs.bind(auditLogController)
  });

  // Get audit logs for a specific resource type
  fastify.get<{ Params: { resourceType: string }, Querystring: any }>('/audit-logs/resource/:resourceType', {
    schema: {
      description: 'Get audit logs for a specific resource type',
      tags: ['Audit Logs'],
      params: {
        type: 'object',
        properties: {
          resourceType: { 
            type: 'string',
            description: 'Resource type (e.g., user, patient, appointment)'
          }
        },
        required: ['resourceType']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 1000, 
            default: 50,
            description: 'Number of results to return'
          },
          offset: { 
            type: 'integer', 
            minimum: 0, 
            default: 0,
            description: 'Number of results to skip'
          }
        }
      },
      response: {
        200: AuditLogListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getResourceAuditLogs.bind(auditLogController)
  });

  // Get audit log statistics
  fastify.get('/audit-logs/stats', {
    schema: {
      description: 'Get audit log statistics and summary',
      tags: ['Audit Logs'],
      response: {
        200: AuditLogStatsResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditLogController.getAuditLogStats.bind(auditLogController)
  });

  // Cleanup old audit logs (admin only)
  fastify.post<{ Body: any }>('/audit-logs/cleanup', {
    schema: {
      description: 'Cleanup old audit logs (admin only)',
      tags: ['Audit Logs'],
      body: {
        type: 'object',
        properties: {
          olderThanDays: {
            type: 'integer',
            minimum: 30,
            default: 365,
            description: 'Delete logs older than this many days (minimum 30)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                deleted_count: { type: 'integer' },
                older_than_days: { type: 'integer' }
              }
            }
          }
        },
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditLogController.cleanupAuditLogs.bind(auditLogController)
  });
};

export default auditLogRoutes;