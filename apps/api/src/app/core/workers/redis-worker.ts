import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { DirectDatabaseAdapter } from '../shared/audit/adapters/direct-database-adapter';
import { AuditLogData } from '../shared/audit/interfaces/audit-adapter.interface';

/**
 * Redis Audit Worker
 * 
 * Real-time audit event processor using Redis Pub/Sub pattern.
 * Subscribes to audit events and processes them immediately with integrity system.
 * 
 * Features:
 * - Real-time event processing (no polling)
 * - Separate Redis connection for subscription
 * - Automatic reconnection and error handling
 * - Optional audit integrity system support
 * - Graceful shutdown and monitoring
 * - Fallback to direct database writes
 * 
 * Architecture:
 * Redis SUBSCRIBE → Message Handler → Direct Adapter → Database (with integrity)
 */
export class RedisWorker {
  private subscriber: Redis | null = null;
  private directAdapter: DirectDatabaseAdapter;
  private channelName: string;
  private isRunning = false;
  private isConnected = false;
  private integrityEnabled: boolean;
  
  // Statistics
  private processedMessages = 0;
  private failedMessages = 0;
  private lastProcessedAt: Date | null = null;
  private startedAt: Date | null = null;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds

  constructor(private readonly fastify: FastifyInstance) {
    this.channelName = (fastify.config as any).AUDIT_REDIS_CHANNEL || 'audit_events';
    this.integrityEnabled = (fastify.config as any).AUDIT_INTEGRITY_ENABLED === 'true';
    
    // Use direct adapter for actual database writes with integrity system
    this.directAdapter = new DirectDatabaseAdapter(fastify);
    
    this.fastify.log.info('Redis Worker initialized', {
      channel: this.channelName,
      integrity_enabled: this.integrityEnabled
    });
  }

  /**
   * Initialize the worker and direct adapter
   */
  async initialize(): Promise<void> {
    try {
      // Initialize direct adapter (this handles crypto service initialization)
      await this.directAdapter.initialize();
      this.fastify.log.info('RedisWorker: Direct adapter initialized successfully');
    } catch (error) {
      this.fastify.log.error('RedisWorker: Failed to initialize direct adapter', {
        error: error,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Start the subscriber worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.fastify.log.warn('Redis Worker is already running');
      return;
    }

    try {
      await this.connect();
      await this.setupSubscription();
      
      this.isRunning = true;
      this.startedAt = new Date();
      
      this.fastify.log.info('✅ Redis Worker started successfully', {
        channel: this.channelName,
        connected: this.isConnected,
        integrity_enabled: this.integrityEnabled,
        started_at: this.startedAt.toISOString()
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.fastify.log.error('Failed to start Redis Worker', { error });
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

    this.fastify.log.info('Stopping Redis Worker...');
    this.isRunning = false;

    try {
      // Unsubscribe and disconnect
      if (this.subscriber && this.isConnected) {
        await this.subscriber.unsubscribe(this.channelName);
        await this.subscriber.disconnect();
        this.fastify.log.info('Unsubscribed from Redis channel');
      }

      this.isConnected = false;
      this.subscriber = null;

      this.fastify.log.info('✅ Redis Worker stopped gracefully');
    } catch (error) {
      this.fastify.log.error('Error stopping Redis Worker', { error });
    }
  }

  /**
   * Connect to Redis for subscription
   */
  private async connect(): Promise<void> {
    try {
      this.connectionAttempts++;
      
      // Create separate Redis connection for subscription
      this.subscriber = new Redis({
        host: this.fastify.config.REDIS_HOST || 'localhost',
        port: parseInt(this.fastify.config.REDIS_PORT || '6379'),
        password: this.fastify.config.REDIS_PASSWORD || undefined,
        db: parseInt(this.fastify.config.REDIS_DB || '0'),
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Pub/Sub specific settings
        enableOfflineQueue: false,
        commandTimeout: 5000
      });

      // Setup connection event handlers
      this.subscriber.on('connect', () => {
        this.fastify.log.info('Redis subscriber connected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.subscriber.on('ready', () => {
        this.fastify.log.info('Redis subscriber ready');
      });

      this.subscriber.on('error', (error) => {
        this.fastify.log.error('Redis subscriber error', { error });
        this.isConnected = false;
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });

      this.subscriber.on('close', () => {
        this.fastify.log.warn('Redis subscriber connection closed');
        this.isConnected = false;
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });

      this.subscriber.on('reconnecting', () => {
        this.fastify.log.info('Redis subscriber reconnecting...');
      });

      // Connect to Redis
      await this.subscriber.connect();
      
      this.fastify.log.info('✅ Redis subscriber connection established');

    } catch (error) {
      this.fastify.log.error('Failed to connect Redis subscriber', { 
        error,
        attempt: this.connectionAttempts 
      });
      throw error;
    }
  }

  /**
   * Setup channel subscription
   */
  private async setupSubscription(): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized');
    }

    try {
      // Subscribe to audit events channel
      await this.subscriber.subscribe(this.channelName);
      
      // Setup message handler
      this.subscriber.on('message', this.handleMessage.bind(this));
      
      this.fastify.log.info('✅ Subscribed to audit events channel', {
        channel: this.channelName
      });

    } catch (error) {
      this.fastify.log.error('Failed to setup Redis subscription', { error });
      throw error;
    }
  }

  /**
   * Handle incoming audit event messages
   */
  private async handleMessage(channel: string, message: string): Promise<void> {
    if (channel !== this.channelName) {
      return; // Ignore messages from other channels
    }

    const startTime = Date.now();
    let messageId = 'unknown';

    try {
      // Parse the audit event message
      const auditEvent = JSON.parse(message);
      messageId = auditEvent.message_id || 'unknown';

      this.fastify.log.debug('Processing audit event from Redis channel', {
        channel,
        message_id: messageId,
        action: auditEvent.action,
        resource_type: auditEvent.resource_type
      });

      // Validate message structure
      if (!this.isValidAuditEvent(auditEvent)) {
        throw new Error('Invalid audit event message structure');
      }

      // Convert to AuditLogData format
      const auditData: AuditLogData = {
        user_id: auditEvent.user_id || null,
        action: auditEvent.action,
        resource_type: auditEvent.resource_type,
        resource_id: auditEvent.resource_id || null,
        ip_address: auditEvent.ip_address || null,
        user_agent: auditEvent.user_agent || null,
        session_id: auditEvent.session_id || null,
        old_values: auditEvent.old_values || null,
        new_values: auditEvent.new_values || null,
        metadata: auditEvent.metadata || null,
        status: auditEvent.status || 'success',
        error_message: auditEvent.error_message || null
      };

      // Process through direct adapter (with integrity system)
      await this.directAdapter.process(auditData);

      // Update statistics
      this.processedMessages++;
      this.lastProcessedAt = new Date();

      const processingTime = Date.now() - startTime;
      this.fastify.log.debug('Audit event processed successfully', {
        message_id: messageId,
        processing_time_ms: processingTime,
        total_processed: this.processedMessages
      });

    } catch (error) {
      this.failedMessages++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.fastify.log.error('Failed to process audit event from Redis channel', {
        channel,
        message_id: messageId,
        error: errorMessage,
        message_preview: message.substring(0, 200) + '...',
        total_failed: this.failedMessages
      });

      // For Pub/Sub, we can't retry the message, so we just log the failure
      // In a production system, you might want to publish failed messages to a dead letter queue
    }
  }

  /**
   * Validate audit event message structure
   */
  private isValidAuditEvent(event: any): boolean {
    return (
      event &&
      typeof event === 'object' &&
      typeof event.action === 'string' &&
      typeof event.resource_type === 'string' &&
      event.action.length > 0 &&
      event.resource_type.length > 0
    );
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.isRunning || this.connectionAttempts >= this.maxReconnectAttempts) {
      if (this.connectionAttempts >= this.maxReconnectAttempts) {
        this.fastify.log.error('Max reconnection attempts reached, stopping worker');
        this.stop();
      }
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, Math.min(this.connectionAttempts, 5)); // Exponential backoff
    this.fastify.log.info(`Scheduling Redis reconnection in ${delay}ms (attempt ${this.connectionAttempts})`);

    setTimeout(async () => {
      if (this.isRunning && !this.isConnected) {
        try {
          await this.connect();
          await this.setupSubscription();
          this.fastify.log.info('✅ Redis Worker reconnected successfully');
        } catch (error) {
          this.fastify.log.error('Redis reconnection failed', { error });
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
      this.fastify.log.info(`Received ${signal}, shutting down Redis Pub/Sub worker gracefully...`);
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
    isConnected: boolean;
    startedAt: Date | null;
    lastProcessedAt: Date | null;
    processedMessages: number;
    failedMessages: number;
    successRate: string;
    connectionAttempts: number;
    channel: string;
  } {
    const successRate = this.processedMessages > 0 
      ? ((this.processedMessages - this.failedMessages) / this.processedMessages * 100).toFixed(2) + '%'
      : '100%';

    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected,
      startedAt: this.startedAt,
      lastProcessedAt: this.lastProcessedAt,
      processedMessages: this.processedMessages,
      failedMessages: this.failedMessages,
      successRate,
      connectionAttempts: this.connectionAttempts,
      channel: this.channelName
    };
  }

  /**
   * Check if worker is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.isConnected && !!this.subscriber;
  }

  /**
   * Get detailed statistics for monitoring
   */
  async getDetailedStats(): Promise<Record<string, any>> {
    try {
      const status = this.getStatus();
      const adapterStats = await this.directAdapter.getStats();

      return {
        worker_status: status,
        adapter_stats: adapterStats,
        worker_healthy: this.isHealthy(),
        uptime_ms: this.startedAt ? Date.now() - this.startedAt.getTime() : 0
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        worker_healthy: false
      };
    }
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.processedMessages = 0;
    this.failedMessages = 0;
    this.lastProcessedAt = null;
    this.connectionAttempts = 0;
  }
}