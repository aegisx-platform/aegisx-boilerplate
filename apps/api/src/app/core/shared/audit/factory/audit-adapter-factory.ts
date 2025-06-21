import { FastifyInstance } from 'fastify';
import { AuditAdapter, AuditAdapterConfig } from '../interfaces/audit-adapter.interface';
import { DirectDatabaseAdapter } from '../adapters/direct-database-adapter';
import { RedisQueueAdapter } from '../adapters/redis-queue-adapter';

/**
 * Audit Adapter Factory
 * 
 * Creates appropriate audit adapter instances based on configuration.
 * Supports multiple adapter types and provides a central point for
 * adapter creation and configuration.
 */
export class AuditAdapterFactory {
  /**
   * Create audit adapter based on configuration
   */
  static create(
    fastify: FastifyInstance,
    config: AuditAdapterConfig
  ): AuditAdapter {
    switch (config.type) {
      case 'direct':
        return new DirectDatabaseAdapter(fastify);
        
      case 'redis':
        return new RedisQueueAdapter(fastify, config);
        
      case 'rabbitmq':
        // TODO: Implement RabbitMQAdapter
        throw new Error('RabbitMQ adapter not yet implemented');
        
      case 'hybrid':
        // TODO: Implement HybridAdapter
        throw new Error('Hybrid adapter not yet implemented');
        
      default:
        fastify.log.warn(`Unknown audit adapter type: ${config.type}, falling back to direct`);
        return new DirectDatabaseAdapter(fastify);
    }
  }

  /**
   * Create adapter from environment configuration
   */
  static createFromEnv(fastify: FastifyInstance): AuditAdapter {
    const config: AuditAdapterConfig = {
      type: (fastify.config.AUDIT_ADAPTER as any) || 'direct',
      enabled: fastify.config.AUDIT_ENABLED === 'true',
      batchSize: parseInt(fastify.config.AUDIT_BATCH_SIZE || '100', 10),
      batchTimeout: parseInt(fastify.config.AUDIT_BATCH_TIMEOUT || '5000', 10),
      queueName: fastify.config.AUDIT_QUEUE_NAME || 'audit_logs_queue',
      exchangeName: fastify.config.AUDIT_EXCHANGE_NAME || 'audit_exchange',
      maxRetries: parseInt(fastify.config.AUDIT_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(fastify.config.AUDIT_RETRY_DELAY || '1000', 10)
    };

    return this.create(fastify, config);
  }

  /**
   * Get available adapter types
   */
  static getAvailableTypes(): string[] {
    return ['direct', 'redis', 'rabbitmq', 'hybrid'];
  }

  /**
   * Validate adapter configuration
   */
  static validateConfig(config: AuditAdapterConfig): string[] {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Adapter type is required');
    }

    if (!this.getAvailableTypes().includes(config.type)) {
      errors.push(`Invalid adapter type: ${config.type}`);
    }

    if (config.batchSize && (config.batchSize < 1 || config.batchSize > 1000)) {
      errors.push('Batch size must be between 1 and 1000');
    }

    if (config.batchTimeout && (config.batchTimeout < 100 || config.batchTimeout > 60000)) {
      errors.push('Batch timeout must be between 100ms and 60 seconds');
    }

    if (config.maxRetries && (config.maxRetries < 0 || config.maxRetries > 10)) {
      errors.push('Max retries must be between 0 and 10');
    }

    return errors;
  }

  /**
   * Create multiple adapters for testing/comparison
   */
  static createMultiple(
    fastify: FastifyInstance,
    configs: AuditAdapterConfig[]
  ): AuditAdapter[] {
    return configs.map(config => {
      const errors = this.validateConfig(config);
      if (errors.length > 0) {
        throw new Error(`Invalid adapter config: ${errors.join(', ')}`);
      }
      return this.create(fastify, config);
    });
  }
}