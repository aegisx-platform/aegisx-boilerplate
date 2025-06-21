import { 
  AuditLogRepository, 
  AuditLogEntity, 
  CreateAuditLogData, 
  AuditLogSearchParams,
  AuditLogStats,
  AuditAction,
  AuditContext,
  AuditableChange,
  AuditLogError
} from '../types/audit-log-types';

export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async createAuditLog(data: CreateAuditLogData): Promise<AuditLogEntity> {
    try {
      return await this.auditLogRepository.create(data);
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to create audit log: ${error.message}`,
        'CREATE_AUDIT_LOG_FAILED',
        500
      );
    }
  }

  async logAction(
    action: AuditAction,
    resourceType: string,
    context: AuditContext = {},
    options: {
      resourceId?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      metadata?: Record<string, any>;
      status?: 'success' | 'failed' | 'error';
      errorMessage?: string;
    } = {}
  ): Promise<AuditLogEntity> {
    const auditData: CreateAuditLogData = {
      action,
      resource_type: resourceType,
      resource_id: options.resourceId || null,
      user_id: context.user_id || null,
      ip_address: context.ip_address || null,
      user_agent: context.user_agent || null,
      session_id: context.session_id || null,
      old_values: options.oldValues || null,
      new_values: options.newValues || null,
      metadata: options.metadata || null,
      status: options.status || 'success',
      error_message: options.errorMessage || null
    };

    return this.createAuditLog(auditData);
  }

  async logCreate(
    resourceType: string,
    resourceId: string,
    newValues: Record<string, any>,
    context: AuditContext = {},
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    return this.logAction('CREATE', resourceType, context, {
      resourceId,
      newValues,
      metadata,
      status: 'success'
    });
  }

  async logUpdate(
    resourceType: string,
    resourceId: string,
    changes: AuditableChange[],
    context: AuditContext = {},
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    changes.forEach(change => {
      oldValues[change.field] = change.old_value;
      newValues[change.field] = change.new_value;
    });

    return this.logAction('UPDATE', resourceType, context, {
      resourceId,
      oldValues,
      newValues,
      metadata,
      status: 'success'
    });
  }

  async logDelete(
    resourceType: string,
    resourceId: string,
    oldValues: Record<string, any>,
    context: AuditContext = {},
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    return this.logAction('DELETE', resourceType, context, {
      resourceId,
      oldValues,
      metadata,
      status: 'success'
    });
  }

  async logLogin(
    userId: string,
    context: AuditContext = {},
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    return this.logAction('LOGIN', 'user', context, {
      resourceId: userId,
      metadata: {
        ...metadata,
        login_time: new Date().toISOString()
      },
      status: 'success'
    });
  }

  async logLogout(
    userId: string,
    context: AuditContext = {},
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    return this.logAction('LOGOUT', 'user', context, {
      resourceId: userId,
      metadata: {
        ...metadata,
        logout_time: new Date().toISOString()
      },
      status: 'success'
    });
  }

  async logAccessDenied(
    resourceType: string,
    resourceId: string | null,
    context: AuditContext = {},
    reason?: string
  ): Promise<AuditLogEntity> {
    return this.logAction('ACCESS_DENIED', resourceType, context, {
      resourceId: resourceId || undefined,
      metadata: {
        reason: reason || 'Access denied',
        attempted_at: new Date().toISOString()
      },
      status: 'failed'
    });
  }

  async logError(
    action: AuditAction,
    resourceType: string,
    error: Error,
    context: AuditContext = {},
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntity> {
    return this.logAction(action, resourceType, context, {
      resourceId,
      metadata: {
        ...metadata,
        error_name: error.name,
        error_stack: error.stack
      },
      status: 'error',
      errorMessage: error.message
    });
  }

  async getAuditLogById(id: string): Promise<AuditLogEntity | null> {
    try {
      return await this.auditLogRepository.findById(id);
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to get audit log: ${error.message}`,
        'GET_AUDIT_LOG_FAILED',
        500
      );
    }
  }

  async searchAuditLogs(params: AuditLogSearchParams): Promise<{
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const result = await this.auditLogRepository.search(params);
      const totalPages = Math.ceil(result.total / result.limit);

      return {
        ...result,
        totalPages
      };
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to search audit logs: ${error.message}`,
        'SEARCH_AUDIT_LOGS_FAILED',
        500
      );
    }
  }

  async getUserAuditLogs(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntity[]> {
    try {
      return await this.auditLogRepository.findByUserId(userId, limit, offset);
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to get user audit logs: ${error.message}`,
        'GET_USER_AUDIT_LOGS_FAILED',
        500
      );
    }
  }

  async getResourceAuditLogs(
    resourceType: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntity[]> {
    try {
      return await this.auditLogRepository.findByResourceType(resourceType, limit, offset);
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to get resource audit logs: ${error.message}`,
        'GET_RESOURCE_AUDIT_LOGS_FAILED',
        500
      );
    }
  }

  async getAuditLogStats(): Promise<AuditLogStats> {
    try {
      return await this.auditLogRepository.getStats();
    } catch (error: any) {
      throw new AuditLogError(
        `Failed to get audit log stats: ${error.message}`,
        'GET_AUDIT_LOG_STATS_FAILED',
        500
      );
    }
  }

  async cleanupOldLogs(olderThanDays: number = 365): Promise<number> {
    try {
      if (olderThanDays < 30) {
        throw new AuditLogError(
          'Cannot cleanup logs newer than 30 days',
          'INVALID_CLEANUP_PERIOD',
          400
        );
      }

      return await this.auditLogRepository.cleanup(olderThanDays);
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error;
      }
      throw new AuditLogError(
        `Failed to cleanup audit logs: ${(error as any).message}`,
        'CLEANUP_AUDIT_LOGS_FAILED',
        500
      );
    }
  }

  extractContextFromRequest(request: any): AuditContext {
    return {
      user_id: request.user?.id || null,
      ip_address: request.ip || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || null,
      user_agent: request.headers['user-agent'] || null,
      session_id: request.headers['x-session-id'] || null,
      request_id: request.headers['x-request-id'] || null
    };
  }

  createAuditableChanges(oldData: Record<string, any>, newData: Record<string, any>): AuditableChange[] {
    const changes: AuditableChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          old_value: oldValue,
          new_value: newValue
        });
      }
    });

    return changes;
  }
}