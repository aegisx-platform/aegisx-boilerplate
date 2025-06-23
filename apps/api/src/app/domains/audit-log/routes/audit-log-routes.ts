import { FastifyInstance } from 'fastify';
import { AuditLogController } from '../controllers/audit-log-controller';
import { AuditLogService } from '../services/audit-log-service';
import { AuditLogRepositoryImpl } from '../repositories/audit-log-repository';
import {
  GetAuditLogsSchema,
  GetAuditLogByIdSchema,
  GetUserAuditLogsSchema,
  GetResourceAuditLogsSchema,
  GetAuditLogStatsSchema,
  CleanupAuditLogsSchema
} from '../schemas/audit-log-route-schemas';
const auditLogRoutes = async (fastify: FastifyInstance) => {
  // Initialize dependencies
  const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
  const auditLogService = new AuditLogService(auditLogRepository);
  const auditLogController = new AuditLogController(auditLogService);

  // Get audit logs with search/filter
  fastify.get<{ Querystring: any }>('/audit-logs', {
    schema: GetAuditLogsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getAuditLogs.bind(auditLogController)
  });

  // Get specific audit log by ID
  fastify.get<{ Params: { id: string } }>('/audit-logs/:id', {
    schema: GetAuditLogByIdSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getAuditLogById.bind(auditLogController)
  });

  // Get audit logs for a specific user
  fastify.get<{ Params: { userId: string }, Querystring: any }>('/audit-logs/user/:userId', {
    schema: GetUserAuditLogsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getUserAuditLogs.bind(auditLogController)
  });

  // Get audit logs for a specific resource type
  fastify.get<{ Params: { resourceType: string }, Querystring: any }>('/audit-logs/resource/:resourceType', {
    schema: GetResourceAuditLogsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin', 'audit_viewer'])],
    handler: auditLogController.getResourceAuditLogs.bind(auditLogController)
  });

  // Get audit log statistics
  fastify.get('/audit-logs/stats', {
    schema: GetAuditLogStatsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditLogController.getAuditLogStats.bind(auditLogController)
  });

  // Cleanup old audit logs (admin only)
  fastify.post<{ Body: any }>('/audit-logs/cleanup', {
    schema: CleanupAuditLogsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditLogController.cleanupAuditLogs.bind(auditLogController)
  });

};

export default auditLogRoutes;
