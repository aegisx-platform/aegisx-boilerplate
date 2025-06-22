import { FastifyInstance } from 'fastify';
import * as amqp from 'amqplib';
import { Knex } from 'knex';

/**
 * Simple RabbitMQ Audit Worker
 * 
 * Consumes audit log messages from RabbitMQ and saves them to the database.
 * 
 * Features:
 * - Simple queue consumption
 * - Message acknowledgment for reliability
 * - Error handling and retry mechanism
 * - Graceful shutdown
 * - Basic monitoring and metrics
 */
export class RabbitMQAuditWorker {
  private connection: any = null;
  private channel: any = null;
  private isRunning = false;
  private consumerTag: string | null = null;
  
  // Statistics
  private processedMessages = 0;
  private failedMessages = 0;
  private lastProcessedAt: Date | null = null;
  private startedAt: Date | null = null;

  // Configuration
  private readonly config: {
    url: string;
    queue: string;
    prefetchCount: number;
    maxRetries: number;
    retryDelay: number;
    connectionTimeout: number;
  };

  constructor(
    private readonly fastify: FastifyInstance,
    private readonly knex: Knex
  ) {
    this.config = {
      url: fastify.config.RABBITMQ_URL || 'amqp://localhost:5672',
      queue: fastify.config.AUDIT_RABBITMQ_QUEUE || 'audit_logs_simple',
      prefetchCount: parseInt(fastify.config.AUDIT_WORKER_PREFETCH || '10', 10),
      maxRetries: parseInt(fastify.config.AUDIT_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(fastify.config.AUDIT_RETRY_DELAY || '5000', 10),
      connectionTimeout: parseInt((fastify.config as any).RABBITMQ_CONNECTION_TIMEOUT || '5000', 10)
    };

    this.fastify.log.info('RabbitMQ Audit Worker initialized', {
      queue: this.config.queue,
      prefetchCount: this.config.prefetchCount
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.fastify.log.warn('RabbitMQ Audit Worker is already running');
      return;
    }

    try {
      await this.connect();
      await this.setupConsumer();
      
      this.isRunning = true;
      this.startedAt = new Date();
      
      this.fastify.log.info('✅ RabbitMQ Audit Worker started successfully', {
        consumerTag: this.consumerTag,
        startedAt: this.startedAt.toISOString()
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.fastify.log.error('Failed to start RabbitMQ Audit Worker', { error });
      throw error;
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.fastify.log.info('Stopping RabbitMQ Audit Worker...');
    this.isRunning = false;

    try {
      // Cancel consumer
      if (this.channel && this.consumerTag) {
        await this.channel.cancel(this.consumerTag);
        this.fastify.log.info('Consumer cancelled');
      }

      // Close connections
      await this.cleanup();

      this.fastify.log.info('✅ RabbitMQ Audit Worker stopped gracefully');
    } catch (error) {
      this.fastify.log.error('Error stopping RabbitMQ Audit Worker', { error });
    }
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    try {
      this.fastify.log.debug('Connecting to RabbitMQ...', { 
        url: this.config.url.replace(/\/\/.*@/, '//***@') 
      });

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
          this.fastify.log.error('RabbitMQ worker connection error', { error: err.message });
          if (this.isRunning) {
            this.scheduleReconnect();
          }
        });

        this.connection.on('close', () => {
          this.fastify.log.warn('RabbitMQ worker connection closed');
          if (this.isRunning) {
            this.scheduleReconnect();
          }
        });

        // Create channel
        this.channel = await this.connection.createChannel();

        if (this.channel) {
          // Set prefetch count for fair dispatch
          await this.channel.prefetch(this.config.prefetchCount);

          this.channel.on('error', (err: any) => {
            this.fastify.log.error('RabbitMQ worker channel error', { error: err.message });
          });
        }
      }

      this.fastify.log.info('✅ RabbitMQ worker connection established');

    } catch (error) {
      this.fastify.log.error('Failed to connect RabbitMQ worker', { error });
      throw error;
    }
  }

  /**
   * Setup message consumer
   */
  private async setupConsumer(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    try {
      // Assert queue (create if not exists)
      await this.channel.assertQueue(this.config.queue, {
        durable: true
      });

      // Start consuming messages
      const consumerInfo = await this.channel.consume(
        this.config.queue,
        this.handleMessage.bind(this),
        {
          noAck: false, // Manual acknowledgment for reliability
        }
      );

      this.consumerTag = consumerInfo?.consumerTag || null;

      this.fastify.log.info('✅ RabbitMQ consumer setup completed', {
        queue: this.config.queue,
        consumerTag: this.consumerTag,
        prefetchCount: this.config.prefetchCount
      });

    } catch (error) {
      this.fastify.log.error('Failed to setup RabbitMQ consumer', { error });
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    const startTime = Date.now();
    let messageId = 'unknown';

    try {
      // Parse message
      const messageContent = msg.content.toString();
      const auditLog = JSON.parse(messageContent);
      messageId = msg.properties.messageId || auditLog.id || 'unknown';

      this.fastify.log.debug('Processing audit message', {
        messageId,
        action: auditLog.action,
        resourceType: auditLog.resource_type
      });

      // Validate message structure
      if (!this.isValidAuditLog(auditLog)) {
        throw new Error('Invalid audit log message structure');
      }

      // Process message
      await this.processAuditLog(auditLog);

      // Acknowledge successful processing
      this.channel.ack(msg);
      this.processedMessages++;
      this.lastProcessedAt = new Date();

      const processingTime = Date.now() - startTime;
      this.fastify.log.debug('Audit message processed successfully', {
        messageId,
        processingTime: `${processingTime}ms`
      });

    } catch (error) {
      this.failedMessages++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.fastify.log.error('Failed to process audit message', {
        messageId,
        error: errorMessage
      });

      // Handle failed message
      await this.handleFailedMessage(msg, errorMessage);
    }
  }

  /**
   * Process audit log into database
   */
  private async processAuditLog(auditLog: any): Promise<void> {
    try {
      // Prepare data for database
      const dbData = {
        id: auditLog.id || undefined, // Let DB generate if not provided
        user_id: auditLog.user_id || null,
        action: auditLog.action,
        resource_type: auditLog.resource_type,
        resource_id: auditLog.resource_id || null,
        ip_address: auditLog.ip_address || null,
        user_agent: auditLog.user_agent || null,
        session_id: auditLog.session_id || null,
        old_values: auditLog.old_values ? JSON.stringify(auditLog.old_values) : null,
        new_values: auditLog.new_values ? JSON.stringify(auditLog.new_values) : null,
        metadata: auditLog.metadata ? JSON.stringify(auditLog.metadata) : null,
        status: auditLog.status || 'success',
        error_message: auditLog.error_message || null,
        created_at: auditLog.created_at ? new Date(auditLog.created_at) : new Date()
      };

      // Insert into database
      await this.knex('audit_logs').insert(dbData);

      this.fastify.log.debug('Audit log saved to database', {
        id: dbData.id,
        action: dbData.action,
        resourceType: dbData.resource_type
      });

    } catch (error) {
      this.fastify.log.error('Failed to save audit log to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        auditLogId: auditLog.id
      });
      throw error;
    }
  }

  /**
   * Handle failed message (reject with requeue based on retry count)
   */
  private async handleFailedMessage(msg: amqp.ConsumeMessage, error: string): Promise<void> {
    if (!this.channel) {
      return;
    }

    const retryCount = this.getRetryCount(msg);

    if (retryCount < this.config.maxRetries) {
      // Requeue for retry
      this.fastify.log.info('Requeuing failed message for retry', {
        messageId: msg.properties.messageId,
        retryCount: retryCount + 1,
        maxRetries: this.config.maxRetries
      });

      // Reject with requeue
      this.channel.nack(msg, false, true);

    } else {
      // Reject without requeue (message will be dropped or go to DLQ if configured)
      this.fastify.log.error('Message exceeded max retries, rejecting', {
        messageId: msg.properties.messageId,
        retryCount,
        maxRetries: this.config.maxRetries,
        error
      });

      // Reject without requeue
      this.channel.nack(msg, false, false);
    }
  }

  /**
   * Get retry count from message headers (simple approach)
   */
  private getRetryCount(msg: amqp.ConsumeMessage): number {
    // For now, we'll use message delivery count as retry indicator
    // In a more sophisticated setup, you'd track this in message headers
    return msg.fields.redelivered ? 1 : 0;
  }

  /**
   * Validate audit log message structure
   */
  private isValidAuditLog(auditLog: any): boolean {
    return (
      auditLog &&
      typeof auditLog === 'object' &&
      typeof auditLog.action === 'string' &&
      typeof auditLog.resource_type === 'string' &&
      auditLog.action.length > 0 &&
      auditLog.resource_type.length > 0
    );
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (!this.isRunning) {
      return;
    }

    this.cleanup();

    const delay = this.config.retryDelay;
    this.fastify.log.info(`Scheduling RabbitMQ worker reconnection in ${delay}ms`);

    setTimeout(async () => {
      if (this.isRunning) {
        try {
          await this.connect();
          await this.setupConsumer();
          this.fastify.log.info('✅ RabbitMQ worker reconnection successful');
        } catch (error) {
          this.fastify.log.error('RabbitMQ worker reconnection failed', { error });
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      this.fastify.log.info(`Received ${signal}, shutting down RabbitMQ worker gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
  }

  /**
   * Get worker status and statistics
   */
  getStatus(): {
    isRunning: boolean;
    startedAt: Date | null;
    lastProcessedAt: Date | null;
    processedMessages: number;
    failedMessages: number;
    successRate: string;
    config: any;
  } {
    const successRate = this.processedMessages > 0 
      ? ((this.processedMessages / (this.processedMessages + this.failedMessages)) * 100).toFixed(2) + '%'
      : '100%';

    return {
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      lastProcessedAt: this.lastProcessedAt,
      processedMessages: this.processedMessages,
      failedMessages: this.failedMessages,
      successRate,
      config: {
        queue: this.config.queue,
        prefetchCount: this.config.prefetchCount,
        maxRetries: this.config.maxRetries
      }
    };
  }

  /**
   * Check if worker is healthy
   */
  isHealthy(): boolean {
    return (
      this.isRunning &&
      this.connection !== null &&
      this.channel !== null &&
      !(this.connection as any)?.connection?.stream?.destroyed
    );
  }

  /**
   * Get queue status and statistics for monitoring
   */
  async getQueueStatus(): Promise<{
    queue_healthy: boolean;
    worker_running: boolean;
    queue_length?: number;
    processed_messages: number;
    failed_messages: number;
    success_rate: string;
    last_processed_at: Date | null;
    started_at: Date | null;
  }> {
    try {
      let queueLength = 0;
      
      if (this.channel && this.isHealthy()) {
        try {
          const queueInfo = await this.channel.checkQueue(this.config.queue);
          queueLength = queueInfo.messageCount;
        } catch (error) {
          this.fastify.log.debug('Could not get queue length', { error });
        }
      }

      const successRate = this.processedMessages > 0 
        ? ((this.processedMessages / (this.processedMessages + this.failedMessages)) * 100).toFixed(2) + '%'
        : '100%';

      return {
        queue_healthy: this.isHealthy(),
        worker_running: this.isRunning,
        queue_length: queueLength,
        processed_messages: this.processedMessages,
        failed_messages: this.failedMessages,
        success_rate: successRate,
        last_processed_at: this.lastProcessedAt,
        started_at: this.startedAt
      };
    } catch (error) {
      this.fastify.log.error('Failed to get queue status', { error });
      return {
        queue_healthy: false,
        worker_running: this.isRunning,
        processed_messages: this.processedMessages,
        failed_messages: this.failedMessages,
        success_rate: '0%',
        last_processed_at: this.lastProcessedAt,
        started_at: this.startedAt
      };
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {}); // Ignore errors
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close().catch(() => {}); // Ignore errors
        this.connection = null;
      }

      this.consumerTag = null;
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}