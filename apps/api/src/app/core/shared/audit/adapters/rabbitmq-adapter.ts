import { FastifyInstance } from 'fastify';
import * as amqp from 'amqplib';
import { AuditAdapter, AuditLogData } from '../interfaces/audit-adapter.interface';

/**
 * Simple RabbitMQ Audit Adapter
 * 
 * Simple, reliable audit logging using RabbitMQ message queues.
 * 
 * Features:
 * - Direct queue publishing (no complex exchanges)
 * - Optional audit integrity system (hash chains + digital signatures)
 * - Automatic fallback to alternative adapter
 * - Simple connection management
 * - Basic error handling and retry
 * 
 * Architecture:
 * API → RabbitMQ Queue → Worker → Database (with optional integrity processing)
 */
export class RabbitMQAdapter implements AuditAdapter {
  private connection: any = null;
  private channel: any = null;
  private isConnecting = false;
  private integrityEnabled: boolean;
  
  // Statistics
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  
  // Configuration
  private readonly config: {
    url: string;
    queue: string;
    maxRetries: number;
    connectionTimeout: number;
  };

  constructor(
    private readonly fastify: FastifyInstance,
    private readonly fallbackAdapter?: AuditAdapter
  ) {
    this.integrityEnabled = (fastify.config as any).AUDIT_INTEGRITY_ENABLED === 'true';
    
    this.config = {
      url: fastify.config.RABBITMQ_URL || 'amqp://localhost:5672',
      queue: fastify.config.AUDIT_RABBITMQ_QUEUE || 'audit_logs_simple',
      maxRetries: parseInt(fastify.config.AUDIT_MAX_RETRIES || '3', 10),
      connectionTimeout: parseInt((fastify.config as any).RABBITMQ_CONNECTION_TIMEOUT || '5000', 10)
    };

    this.fastify.log.info('RabbitMQ Adapter initialized', {
      queue: this.config.queue,
      fallback: this.fallbackAdapter?.getType() || 'none',
      integrity_enabled: this.integrityEnabled
    });
  }

  /**
   * Initialize RabbitMQ connection
   */
  async initialize(): Promise<void> {
    if (this.connection && this.channel) {
      return; // Already connected
    }

    try {
      await this.connect();
      this.fastify.log.info('✅ RabbitMQ Adapter initialized successfully');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.fastify.log.warn('Failed to initialize RabbitMQ Adapter, will use fallback', { 
        error: this.lastError 
      });
      // Don't throw - let fallback handle it
    }
  }

  /**
   * Establish connection to RabbitMQ
   */
  private async connect(): Promise<void> {
    if (this.isConnecting) {
      return; // Prevent concurrent connections
    }

    this.isConnecting = true;

    try {
      this.fastify.log.debug('Connecting to RabbitMQ...', { 
        url: this.config.url.replace(/\/\/.*@/, '//***@') 
      });
      
      // Clean up existing connections
      await this.cleanup();
      
      // Connect with timeout
      const connectionResult = await Promise.race([
        amqp.connect(this.config.url),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`)), this.config.connectionTimeout);
        })
      ]);
      this.connection = connectionResult;

      // Setup error handlers
      if (this.connection) {
        this.connection.on('error', (err: any) => {
          this.fastify.log.error('RabbitMQ connection error', { error: err.message });
          this.lastError = err.message;
          this.cleanup();
        });

        this.connection.on('close', () => {
          this.fastify.log.warn('RabbitMQ connection closed');
          this.cleanup();
        });

        // Create channel
        this.channel = await this.connection.createChannel();
        
        if (this.channel) {
          this.channel.on('error', (err: any) => {
            this.fastify.log.error('RabbitMQ channel error', { error: err.message });
            this.lastError = err.message;
          });

          // Assert queue (create if not exists)
          await this.channel.assertQueue(this.config.queue, {
            durable: true
          });
        }
      }

      this.fastify.log.info('✅ RabbitMQ connection established');
      this.lastError = null;

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      this.fastify.log.debug('Failed to connect to RabbitMQ', { 
        error: this.lastError
      });
      this.cleanup();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Send audit log to queue
   */
  async process(auditData: AuditLogData): Promise<void> {
    try {
      // Try to connect if not connected
      if (!this.channel || !this.connection) {
        await this.initialize();
      }

      // If still no connection, use fallback
      if (!this.channel) {
        throw new Error('No RabbitMQ connection available');
      }

      // Prepare message
      const message = {
        ...auditData,
        timestamp: new Date().toISOString(),
        source: 'aegisx-api',
        integrity_enabled: this.integrityEnabled // Pass integrity flag to worker
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      // Send to queue
      const sent = this.channel.sendToQueue(
        this.config.queue,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentType: 'application/json'
        }
      );

      if (sent) {
        this.processedCount++;
        this.fastify.log.debug('Audit log sent to RabbitMQ', {
          queue: this.config.queue,
          action: auditData.action,
          integrity_enabled: this.integrityEnabled
        });
      } else {
        throw new Error('Failed to send message to queue');
      }

    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      this.fastify.log.warn('RabbitMQ publish failed, using fallback', {
        error: this.lastError,
        action: auditData.action
      });

      // Use fallback adapter
      if (this.fallbackAdapter) {
        try {
          await this.fallbackAdapter.process(auditData);
        } catch (fallbackError) {
          this.fastify.log.error('Both RabbitMQ and fallback failed', {
            rabbitError: this.lastError,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown'
          });
          throw error;
        }
      } else {
        // No fallback, just log and continue
        this.fastify.log.error('No fallback adapter configured, audit log lost', {
          error: this.lastError,
          action: auditData.action
        });
      }
    }
  }

  /**
   * Check adapter health
   */
  async health(): Promise<boolean> {
    try {
      if (!this.connection || !this.channel) {
        return false;
      }

      // Check if queue exists
      await this.channel.checkQueue(this.config.queue);
      
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Health check failed';
      
      // If we have fallback, report its health instead
      if (this.fallbackAdapter) {
        return await this.fallbackAdapter.health();
      }
      return false;
    }
  }

  /**
   * Get adapter statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const healthy = await this.health();
      let queueLength = 0;

      if (this.channel && healthy) {
        try {
          const queueInfo = await this.channel.checkQueue(this.config.queue);
          queueLength = queueInfo.messageCount;
        } catch (error) {
          this.fastify.log.debug('Could not get queue stats', { error });
        }
      }

      const successRate = this.processedCount > 0 
        ? ((this.processedCount / (this.processedCount + this.errorCount)) * 100).toFixed(2) + '%'
        : '100%';

      return {
        healthy,
        processed_count: this.processedCount,
        error_count: this.errorCount,
        success_rate: successRate,
        queue_length: queueLength,
        last_error: this.lastError,
        queue_name: this.config.queue
      };
    } catch (error) {
      return {
        healthy: false,
        processed_count: this.processedCount,
        error_count: this.errorCount + 1,
        success_rate: '0%',
        queue_length: 0,
        last_error: error instanceof Error ? error.message : 'Unknown error',
        queue_name: this.config.queue
      };
    }
  }

  /**
   * Get adapter type
   */
  getType(): string {
    return 'rabbitmq';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {}); // Ignore errors
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close().catch(() => {}); // Ignore errors
        this.connection = null;
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}