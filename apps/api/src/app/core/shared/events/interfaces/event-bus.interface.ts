export interface PublishOptions {
  delay?: number           // Delayed delivery (ms)
  ttl?: number            // Time to live (ms)
  priority?: number       // Message priority (0-255)
  persistent?: boolean    // Persist message (RabbitMQ)
  retryAttempts?: number  // Retry attempts
  deadLetterQueue?: string // Dead letter queue name
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  adapter: string
  uptime: number
  lastCheck: Date
  details?: Record<string, any>
}

export interface EventBusStats {
  adapter: string
  publishedCount: number
  consumedCount: number
  errorCount: number
  activeSubscriptions: number
  uptime: number
  memoryUsage?: number
}

export type EventHandler = (data: any, metadata: EventMetadata) => Promise<void> | void

export interface EventMetadata {
  eventId: string
  timestamp: Date
  source: string
  correlationId?: string
  causationId?: string
  version?: number
  retryCount?: number
}

export interface EventBus {
  // Core operations
  publish(eventName: string, data: any, options?: PublishOptions): Promise<void>
  subscribe(eventName: string, handler: EventHandler): Promise<void>
  unsubscribe(eventName: string, handler?: EventHandler): Promise<void>
  
  // Management operations
  initialize(): Promise<void>
  cleanup(): Promise<void>
  health(): Promise<HealthStatus>
  
  // Monitoring operations
  getType(): string
  getStats(): EventBusStats
}