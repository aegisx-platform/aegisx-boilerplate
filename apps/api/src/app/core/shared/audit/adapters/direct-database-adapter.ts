import { FastifyInstance } from 'fastify';
import { AuditAdapter, AuditLogData } from '../interfaces/audit-adapter.interface';
import { AuditLogService } from '../../../../domains/audit-log/services/audit-log-service';
import { AuditLogRepositoryImpl } from '../../../../domains/audit-log/repositories/audit-log-repository';
import { SecureAuditService } from '../../services/secure-audit.service';

/**
 * Direct Database Adapter
 * 
 * Processes audit logs by writing directly to the database.
 * This is the default adapter with immediate persistence.
 * 
 * Features:
 * - Immediate consistency
 * - No queue overhead  
 * - Optional audit integrity system (hash chains + digital signatures)
 * - Configurable security features
 * - Simple error handling
 */
export class DirectDatabaseAdapter implements AuditAdapter {
  private auditLogService: AuditLogService;
  private secureAuditService: SecureAuditService | null = null;
  private integrityEnabled: boolean;
  private processedCount = 0;
  private errorCount = 0;

  constructor(private fastify: FastifyInstance) {
    const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
    this.auditLogService = new AuditLogService(auditLogRepository);
    
    // Check if audit integrity is enabled
    this.integrityEnabled = (fastify.config as any).AUDIT_INTEGRITY_ENABLED === 'true';
    
    if (this.integrityEnabled) {
      this.secureAuditService = new SecureAuditService(fastify);
      this.fastify.log.info('DirectDatabaseAdapter: Audit integrity system enabled');
    } else {
      this.fastify.log.info('DirectDatabaseAdapter: Using basic audit logging (no integrity system)');
    }
  }

  /**
   * Initialize the adapter (required for integrity system)
   */
  async initialize(): Promise<void> {
    if (this.integrityEnabled && this.secureAuditService) {
      try {
        await this.secureAuditService.initialize();
        this.fastify.log.info('DirectDatabaseAdapter: Secure audit service initialized');
      } catch (error) {
        this.fastify.log.error('DirectDatabaseAdapter: Failed to initialize secure audit service', error);
        // Fallback to basic audit logging
        this.integrityEnabled = false;
        this.secureAuditService = null;
        this.fastify.log.warn('DirectDatabaseAdapter: Falling back to basic audit logging');
      }
    }
  }

  /**
   * Process audit log by writing directly to database
   * Uses either secure audit service (with integrity) or basic audit service
   */
  async process(auditData: AuditLogData): Promise<void> {
    try {
      if (this.integrityEnabled && this.secureAuditService) {
        try {
          // Use secure audit service with integrity features
          await this.secureAuditService.logSecureAudit(auditData);
          this.fastify.log.debug('DirectDatabaseAdapter: Processed audit log with integrity system');
        } catch (integrityError) {
          this.fastify.log.error('DirectDatabaseAdapter: Failed to process with integrity system, falling back to basic', integrityError);
          // Fallback to basic audit logging
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
          this.fastify.log.debug('DirectDatabaseAdapter: Processed audit log with fallback to basic system');
        }
      } else {
        // Use basic audit service 
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
        this.fastify.log.debug('DirectDatabaseAdapter: Processed audit log with basic system');
      }

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
    
    const stats = {
      type: this.getType(),
      healthy: isHealthy,
      processed_count: this.processedCount,
      error_count: this.errorCount,
      success_rate: this.processedCount > 0 ? 
        ((this.processedCount - this.errorCount) / this.processedCount * 100).toFixed(2) + '%' : 
        '0%',
      database_connected: isHealthy,
      integrity_enabled: this.integrityEnabled
    };

    // Add integrity system stats if enabled
    if (this.integrityEnabled && this.secureAuditService) {
      try {
        // TODO: Add getIntegrityStats method to SecureAuditService
        const integrityStats = {
          enabled: true,
          status: 'active'
        };
        return {
          ...stats,
          integrity_stats: integrityStats
        };
      } catch (error) {
        this.fastify.log.warn('DirectDatabaseAdapter: Failed to get integrity stats', error);
      }
    }

    return stats;
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.processedCount = 0;
    this.errorCount = 0;
  }
}