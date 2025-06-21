import { FastifyInstance } from 'fastify';
import { AuditAdapter, AuditLogData } from '../interfaces/audit-adapter.interface';
import { AuditLogService } from '../../../../domains/audit-log/services/audit-log-service';
import { AuditLogRepositoryImpl } from '../../../../domains/audit-log/repositories/audit-log-repository';

/**
 * Direct Database Adapter
 * 
 * Processes audit logs by writing directly to the database.
 * This is the default adapter with immediate persistence.
 * 
 * Characteristics:
 * - Immediate consistency
 * - No queue overhead
 * - Blocking operation (though used with setImmediate)
 * - Simple error handling
 */
export class DirectDatabaseAdapter implements AuditAdapter {
  private auditLogService: AuditLogService;
  private processedCount = 0;
  private errorCount = 0;

  constructor(private fastify: FastifyInstance) {
    const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
    this.auditLogService = new AuditLogService(auditLogRepository);
  }

  /**
   * Process audit log by writing directly to database
   */
  async process(auditData: AuditLogData): Promise<void> {
    try {
      await this.auditLogService.logAction(
        auditData.action as any,
        auditData.resource_type,
        {
          user_id: auditData.user_id || undefined,
          ip_address: auditData.ip_address || undefined,
          user_agent: auditData.user_agent || undefined,
          session_id: auditData.session_id || undefined
        },
        {
          resourceId: auditData.resource_id || undefined,
          oldValues: auditData.old_values || undefined,
          newValues: auditData.new_values || undefined,
          metadata: auditData.metadata || undefined,
          status: auditData.status,
          errorMessage: auditData.error_message || undefined
        }
      );

      this.processedCount++;
    } catch (error) {
      this.errorCount++;
      this.fastify.log.error('DirectDatabaseAdapter: Failed to process audit log', {
        error,
        auditData: {
          action: auditData.action,
          resource_type: auditData.resource_type,
          user_id: auditData.user_id
        }
      });
      throw error;
    }
  }

  /**
   * Check database connectivity
   */
  async health(): Promise<boolean> {
    try {
      // Simple query to check database connectivity
      await this.fastify.knex.raw('SELECT 1');
      return true;
    } catch (error) {
      this.fastify.log.error('DirectDatabaseAdapter: Health check failed', error);
      return false;
    }
  }

  /**
   * Get adapter type
   */
  getType(): string {
    return 'direct';
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<Record<string, any>> {
    const isHealthy = await this.health();
    
    return {
      type: this.getType(),
      healthy: isHealthy,
      processed_count: this.processedCount,
      error_count: this.errorCount,
      success_rate: this.processedCount > 0 ? 
        ((this.processedCount - this.errorCount) / this.processedCount * 100).toFixed(2) + '%' : 
        '0%',
      database_connected: isHealthy
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.processedCount = 0;
    this.errorCount = 0;
  }
}