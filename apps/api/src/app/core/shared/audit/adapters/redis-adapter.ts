import { FastifyInstance } from 'fastify';
import { AuditAdapter, AuditLogData } from '../interfaces/audit-adapter.interface';

/**
 * Redis Audit Adapter
 * 
 * High-performance audit logging using Redis Pub/Sub pattern.
 * Publishes audit events immediately and subscribers process them in real-time.
 * 
 * Features:
 * - Real-time processing (no polling delays)
 * - High throughput with minimal latency
 * - Multiple subscriber support
 * - Automatic retry and persistence fallback
 * - Optional audit integrity system support
 * - Monitoring and statistics
 * 
 * Architecture:
 * API → Redis PUBLISH → SUBSCRIBE → Worker → Database (with optional integrity)
 */
export class RedisAdapter implements AuditAdapter {
  private channelName: string;
  private integrityEnabled: boolean;
  
  // Statistics
  private publishedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;

  constructor(private readonly fastify: FastifyInstance) {
    this.channelName = (fastify.config as any).AUDIT_REDIS_CHANNEL || 'audit_events';
    this.integrityEnabled = (fastify.config as any).AUDIT_INTEGRITY_ENABLED === 'true';
    
    this.fastify.log.info('Redis Adapter initialized', {
      channel: this.channelName,
      integrity_enabled: this.integrityEnabled
    });
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    try {
      // Test Redis connection
      await this.fastify.redis.ping();
      this.fastify.log.info('✅ Redis Adapter initialized successfully');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Initialization failed';
      this.fastify.log.error('Redis Adapter initialization failed', { error: this.lastError });
      throw error;
    }
  }

  /**
   * Process audit log by publishing to Redis channel
   */
  async process(auditData: AuditLogData): Promise<void> {
    try {
      // Prepare message for publication
      const message = {
        ...auditData,
        timestamp: new Date().toISOString(),
        source: 'aegisx-api',
        message_id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrity_enabled: this.integrityEnabled,
        retry_count: 0
      };

      // Publish to Redis channel
      const subscribers = await this.fastify.redis.publish(
        this.channelName,
        JSON.stringify(message)
      );

      this.publishedCount++;
      this.lastError = null;

      this.fastify.log.debug('Audit event published to Redis channel', {
        channel: this.channelName,
        message_id: message.message_id,
        action: auditData.action,
        resource_type: auditData.resource_type,
        subscribers: subscribers,
        integrity_enabled: this.integrityEnabled
      });

      // If no subscribers, log warning but don't fail
      if (subscribers === 0) {
        this.fastify.log.warn('No subscribers listening to audit channel', {
          channel: this.channelName,
          message_id: message.message_id
        });
      }

    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      this.fastify.log.error('Failed to publish audit event to Redis', {
        error: this.lastError,
        channel: this.channelName,
        action: auditData.action,
        resource_type: auditData.resource_type
      });
      
      throw error;
    }
  }

  /**
   * Check Redis connectivity and channel health
   */
  async health(): Promise<boolean> {
    try {
      // Test Redis connection
      const response = await this.fastify.redis.ping();
      return response === 'PONG';
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Health check failed';
      this.fastify.log.error('Redis health check failed', { error: this.lastError });
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
   * Get adapter statistics and monitoring info
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const isHealthy = await this.health();
      
      // Get Redis info
      let redisInfo = {};
      try {
        const info = await this.fastify.redis.info('clients');
        const lines = info.split('\r\n');
        for (const line of lines) {
          if (line.includes('connected_clients')) {
            const [key, value] = line.split(':');
            redisInfo = { ...redisInfo, [key]: parseInt(value) };
          }
        }
      } catch (error) {
        this.fastify.log.debug('Could not get Redis client info', { error });
      }

      const successRate = this.publishedCount > 0 
        ? ((this.publishedCount - this.errorCount) / this.publishedCount * 100).toFixed(2) + '%'
        : '100%';

      return {
        type: this.getType(),
        healthy: isHealthy,
        channel_name: this.channelName,
        published_count: this.publishedCount,
        error_count: this.errorCount,
        success_rate: successRate,
        last_error: this.lastError,
        integrity_enabled: this.integrityEnabled,
        redis_info: redisInfo
      };
    } catch (error) {
      return {
        type: this.getType(),
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        published_count: this.publishedCount,
        error_count: this.errorCount + 1,
        success_rate: '0%'
      };
    }
  }

  /**
   * Get current subscriber count for monitoring
   */
  async getSubscriberCount(): Promise<number> {
    try {
      // Use PUBSUB NUMSUB to get subscriber count for our channel
      const result = await this.fastify.redis.call('PUBSUB', 'NUMSUB', this.channelName);
      if (Array.isArray(result) && result.length >= 2) {
        return parseInt(result[1] as string) || 0;
      }
      return 0;
    } catch (error) {
      this.fastify.log.debug('Could not get subscriber count', { error });
      return 0;
    }
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.publishedCount = 0;
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Test channel connectivity by publishing a test message
   */
  async testChannel(): Promise<{
    success: boolean;
    subscribers: number;
    error?: string;
  }> {
    try {
      const testMessage = {
        type: 'test',
        timestamp: new Date().toISOString(),
        message_id: `test_${Date.now()}`
      };

      const subscribers = await this.fastify.redis.publish(
        `${this.channelName}_test`,
        JSON.stringify(testMessage)
      );

      return {
        success: true,
        subscribers
      };
    } catch (error) {
      return {
        success: false,
        subscribers: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}