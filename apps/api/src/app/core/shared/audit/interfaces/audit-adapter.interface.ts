// Remove this import since we define AuditLogData here

/**
 * Audit Adapter Interface
 * 
 * Defines the contract for different audit logging backends.
 * Supports pluggable audit processing strategies:
 * - Direct database writes
 * - Queue-based processing (RabbitMQ, Redis)
 * - Hybrid approaches
 */
export interface AuditAdapter {
  /**
   * Process audit log data
   * @param auditData - The audit log data to process
   */
  process(auditData: AuditLogData): Promise<void>;

  /**
   * Check adapter health status
   * @returns Promise resolving to true if healthy, false otherwise
   */
  health(): Promise<boolean>;

  /**
   * Get adapter type identifier
   */
  getType(): string;

  /**
   * Initialize the adapter (if needed)
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources when shutting down
   */
  cleanup?(): Promise<void>;

  /**
   * Get adapter statistics/metrics
   */
  getStats?(): Promise<Record<string, any>>;
}

/**
 * Audit log data structure for adapter processing
 */
export interface AuditLogData {
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  status?: 'success' | 'failed' | 'error';
  error_message?: string | null;
}

/**
 * Configuration options for audit adapters
 */
export interface AuditAdapterConfig {
  type: 'direct' | 'rabbitmq' | 'redis' | 'hybrid';
  enabled: boolean;
  
  // Batch processing options
  batchSize?: number;
  batchTimeout?: number;
  
  // Queue options
  queueName?: string;
  exchangeName?: string;
  
  // Retry options
  maxRetries?: number;
  retryDelay?: number;
  
  // Hybrid mode options
  fallbackAdapter?: string;
  primaryAdapter?: string;
}