import { FastifyInstance } from 'fastify';
import { AuditLogService } from '../../domains/audit-log/services/audit-log-service';
import { AuditLogRepositoryImpl } from '../../domains/audit-log/repositories/audit-log-repository';
import { RedisQueueAdapter } from '../shared/audit/adapters/redis-queue-adapter';
import { AuditLogData } from '../shared/audit/interfaces/audit-adapter.interface';

/**
 * Audit Queue Worker
 *
 * Background worker that processes audit logs from Redis queue.
 * Runs continuously and processes queued audit logs in batches.
 */
export class AuditQueueWorker {
  private auditLogService: AuditLogService;
  private redisAdapter: RedisQueueAdapter;
  private isRunning = false;
  private processInterval: NodeJS.Timeout | null = null;
  private processIntervalMs: number;
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    private fastify: FastifyInstance,
    intervalMs = 5000 // Process every 5 seconds
  ) {
    this.processIntervalMs = intervalMs;

    // Initialize audit log service
    const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
    this.auditLogService = new AuditLogService(auditLogRepository);

    // Initialize Redis adapter for queue processing
    this.redisAdapter = new RedisQueueAdapter(fastify, {
      type: 'redis',
      enabled: true,
      queueName: fastify.config.AUDIT_QUEUE_NAME,
      batchSize: parseInt(fastify.config.AUDIT_BATCH_SIZE, 10),
      maxRetries: parseInt(fastify.config.AUDIT_MAX_RETRIES, 10)
    });
  }

  /**
   * Start the background worker
   */
  start(): void {
    if (this.isRunning) {
      this.fastify.log.warn('AuditQueueWorker: Already running');
      return;
    }

    this.isRunning = true;
    this.fastify.log.info(`AuditQueueWorker: Starting with ${this.processIntervalMs}ms interval`);

    this.processInterval = setInterval(async () => {
      await this.processQueue();
    }, this.processIntervalMs);

    // Process immediately on start
    setImmediate(() => this.processQueue());
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    this.fastify.log.info('AuditQueueWorker: Stopped');
  }

  /**
   * Process items from the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const queueLength = await this.redisAdapter.getQueueLength();

      if (queueLength === null || queueLength === 0) {
        // No items to process
        return;
      }

      this.fastify.log.debug(`AuditQueueWorker: Processing queue (${queueLength} items)`);

      const processedInBatch = await this.redisAdapter.processQueue(
        this.processAuditItem.bind(this)
      );

      if (processedInBatch > 0) {
        this.processedCount += processedInBatch;
        this.fastify.log.info(`AuditQueueWorker: Processed ${processedInBatch} items (total: ${this.processedCount})`);
      }
    } catch (error) {
      this.errorCount++;
      this.fastify.log.error('AuditQueueWorker: Queue processing error', error);
    }
  }

  /**
   * Process individual audit item
   */
  private async processAuditItem(auditData: AuditLogData): Promise<void> {
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

      this.fastify.log.debug('AuditQueueWorker: Processed audit item', {
        action: auditData.action,
        resource_type: auditData.resource_type,
        user_id: auditData.user_id
      });
    } catch (error) {
      this.fastify.log.error('AuditQueueWorker: Failed to process audit item', {
        error,
        auditData: {
          action: auditData.action,
          resource_type: auditData.resource_type,
          user_id: auditData.user_id
        }
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Get worker statistics
   */
  getStats(): Record<string, any> {
    return {
      worker_running: this.isRunning,
      process_interval_ms: this.processIntervalMs,
      processed_count: this.processedCount,
      error_count: this.errorCount,
      success_rate: this.processedCount > 0 ?
        ((this.processedCount - this.errorCount) / this.processedCount * 100).toFixed(2) + '%' :
        '0%'
    };
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<Record<string, any>> {
    try {
      const queueLength = await this.redisAdapter.getQueueLength();
      const isHealthy = await this.redisAdapter.health();
      const adapterStats = await this.redisAdapter.getStats();

      return {
        queue_healthy: isHealthy,
        queue_length: queueLength,
        adapter_stats: adapterStats,
        worker_stats: this.getStats()
      };
    } catch (error: any) {
      this.fastify.log.error('AuditQueueWorker: Failed to get queue status', error);
      return {
        queue_healthy: false,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Check if worker is running
   */
  isWorkerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.processedCount = 0;
    this.errorCount = 0;
  }
}
