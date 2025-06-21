import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogService } from '../services/audit-log-service';
import { 
  AuditLogQuery, 
  AuditLogSearchParams,
  AuditLogError 
} from '../types/audit-log-types';

export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  async getAuditLogs(
    request: FastifyRequest<{ 
      Querystring: AuditLogQuery 
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const searchParams: AuditLogSearchParams = {
        user_id: request.query.user_id,
        action: request.query.action,
        resource_type: request.query.resource_type,
        resource_id: request.query.resource_id,
        status: request.query.status,
        start_date: request.query.start_date ? new Date(request.query.start_date) : undefined,
        end_date: request.query.end_date ? new Date(request.query.end_date) : undefined,
        ip_address: request.query.ip_address,
        limit: request.query.limit || 50,
        offset: request.query.offset || 0,
        sort_by: request.query.sort_by || 'created_at',
        sort_order: request.query.sort_order || 'desc'
      };

      const result = await this.auditLogService.searchAuditLogs(searchParams);

      reply.send({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.totalPages
        }
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }

  async getAuditLogById(
    request: FastifyRequest<{ 
      Params: { id: string } 
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auditLog = await this.auditLogService.getAuditLogById(request.params.id);

      if (!auditLog) {
        reply.status(404).send({
          success: false,
          error: 'AUDIT_LOG_NOT_FOUND',
          message: 'Audit log not found'
        });
        return;
      }

      reply.send({
        success: true,
        data: auditLog
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }

  async getUserAuditLogs(
    request: FastifyRequest<{ 
      Params: { userId: string };
      Querystring: { limit?: number; offset?: number }
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;
      const { limit = 50, offset = 0 } = request.query;

      const auditLogs = await this.auditLogService.getUserAuditLogs(userId, limit, offset);

      reply.send({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }

  async getResourceAuditLogs(
    request: FastifyRequest<{ 
      Params: { resourceType: string };
      Querystring: { limit?: number; offset?: number }
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { resourceType } = request.params;
      const { limit = 50, offset = 0 } = request.query;

      const auditLogs = await this.auditLogService.getResourceAuditLogs(resourceType, limit, offset);

      reply.send({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }

  async getAuditLogStats(
    request: FastifyRequest, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const stats = await this.auditLogService.getAuditLogStats();

      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }

  async cleanupAuditLogs(
    request: FastifyRequest<{ 
      Body: { olderThanDays?: number } 
    }>, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { olderThanDays = 365 } = request.body || {};

      const deletedCount = await this.auditLogService.cleanupOldLogs(olderThanDays);

      reply.send({
        success: true,
        message: `Successfully cleaned up ${deletedCount} old audit logs`,
        data: {
          deleted_count: deletedCount,
          older_than_days: olderThanDays
        }
      });
    } catch (error) {
      if (error instanceof AuditLogError) {
        reply.status(error.statusCode).send({
          success: false,
          error: error.code,
          message: error.message
        });
      } else {
        reply.status(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    }
  }
}