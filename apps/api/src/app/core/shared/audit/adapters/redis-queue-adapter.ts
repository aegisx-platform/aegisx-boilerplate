import { FastifyInstance } from 'fastify';
import { AuditAdapter, AuditLogData, AuditAdapterConfig } from '../interfaces/audit-adapter.interface';

/**
 * Redis Queue Adapter
 * 
 * Processes audit logs by queuing them in Redis for background processing.
 * Uses Redis List (LPUSH/RPOP) for simple FIFO queue implementation.
 * 
 * Characteristics:
 * - Asynchronous processing
 * - Non-blocking for main request
 * - Persistent queue (survives restarts)
 * - Requires background worker to process queue
 */
export class RedisQueueAdapter implements AuditAdapter {
  private queueName: string;
  private batchSize: number;
  private processedCount = 0;
  private errorCount = 0;
  private queuedCount = 0;

  constructor(
    private fastify: FastifyInstance,
    private config: AuditAdapterConfig
  ) {
    this.queueName = config.queueName || 'audit_logs_queue';
    this.batchSize = config.batchSize || 100;
  }

  /**
   * Process audit log by adding to Redis queue
   */
  async process(auditData: AuditLogData): Promise<void> {
    try {
      const queueItem = {
        ...auditData,
        queued_at: new Date().toISOString(),
        attempt: 1
      };

      // Add to Redis list (LPUSH for FIFO when using RPOP)
      await this.fastify.redis.lpush(
        this.queueName,
        JSON.stringify(queueItem)
      );

      this.queuedCount++;
      this.processedCount++;

      this.fastify.log.debug('RedisQueueAdapter: Audit log queued', {
        queue: this.queueName,
        action: auditData.action,
        resource_type: auditData.resource_type
      });
    } catch (error) {
      this.errorCount++;
      this.fastify.log.error('RedisQueueAdapter: Failed to queue audit log', {
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
   * Check Redis connectivity and queue status
   */
  async health(): Promise<boolean> {
    try {
      const isRedisHealthy = await this.fastify.isCacheHealthy();
      if (!isRedisHealthy) {
        return false;
      }

      // Check if we can read queue length
      const queueLength = await this.getQueueLength();
      return queueLength !== null;
    } catch (error) {
      this.fastify.log.error('RedisQueueAdapter: Health check failed', error);
      return false;
    }
  }

  /**
   * Get adapter type
   */
  getType(): string {
    return 'redis';
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number | null> {
    try {
      return await this.fastify.redis.llen(this.queueName);
    } catch (error) {
      this.fastify.log.error('RedisQueueAdapter: Failed to get queue length', error);
      return null;
    }
  }

  /**
   * Process items from queue (for background worker)
   */
  async processQueue(processor: (item: AuditLogData) => Promise<void>): Promise<number> {
    let processedCount = 0;

    try {
      // Process items in batches
      for (let i = 0; i < this.batchSize; i++) {
        const item = await this.fastify.redis.rpop(this.queueName);
        if (!item) break;

        try {
          const auditData = JSON.parse(item);
          await processor(auditData);
          processedCount++;
        } catch (error) {
          this.fastify.log.error('RedisQueueAdapter: Failed to process queue item', {
            error,
            item
          });
          
          // Put failed item back in queue or dead letter queue
          await this.handleFailedItem(item);
        }
      }

      if (processedCount > 0) {
        this.fastify.log.info(`RedisQueueAdapter: Processed ${processedCount} audit logs from queue`);
      }

      return processedCount;
    } catch (error) {
      this.fastify.log.error('RedisQueueAdapter: Queue processing failed', error);
      return 0;
    }
  }

  /**
   * Handle failed queue items
   */
  private async handleFailedItem(item: string): Promise<void> {
    try {
      const auditData = JSON.parse(item);
      const attempt = (auditData.attempt || 1) + 1;
      const maxRetries = this.config.maxRetries || 3;

      if (attempt <= maxRetries) {
        // Retry: put back in queue with incremented attempt
        auditData.attempt = attempt;
        auditData.retry_at = new Date().toISOString();
        
        await this.fastify.redis.lpush(
          this.queueName,
          JSON.stringify(auditData)
        );
      } else {
        // Move to dead letter queue
        const deadLetterQueue = `${this.queueName}_failed`;
        auditData.failed_at = new Date().toISOString();
        
        await this.fastify.redis.lpush(
          deadLetterQueue,
          JSON.stringify(auditData)
        );
      }
    } catch (error) {
      this.fastify.log.error('RedisQueueAdapter: Failed to handle failed item', error);
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<Record<string, any>> {
    const isHealthy = await this.health();
    const queueLength = await this.getQueueLength();
    const deadLetterLength = await this.getDeadLetterQueueLength();
    
    return {
      type: this.getType(),
      healthy: isHealthy,
      queue_name: this.queueName,
      queue_length: queueLength,
      dead_letter_length: deadLetterLength,
      queued_count: this.queuedCount,
      processed_count: this.processedCount,
      error_count: this.errorCount,
      success_rate: this.processedCount > 0 ? 
        ((this.processedCount - this.errorCount) / this.processedCount * 100).toFixed(2) + '%' : 
        '0%',
      redis_connected: await this.fastify.isCacheHealthy()
    };
  }

  /**
   * Get dead letter queue length
   */
  private async getDeadLetterQueueLength(): Promise<number | null> {
    try {
      const deadLetterQueue = `${this.queueName}_failed`;
      return await this.fastify.redis.llen(deadLetterQueue);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear queue (useful for testing/maintenance)
   */
  async clearQueue(): Promise<void> {
    try {
      await this.fastify.redis.del(this.queueName);
      await this.fastify.redis.del(`${this.queueName}_failed`);
      this.fastify.log.info('RedisQueueAdapter: Queue cleared');
    } catch (error) {
      this.fastify.log.error('RedisQueueAdapter: Failed to clear queue', error);
      throw error;
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.processedCount = 0;
    this.errorCount = 0;
    this.queuedCount = 0;
  }
}