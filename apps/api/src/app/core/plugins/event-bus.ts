import fp from 'fastify-plugin'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { 
  EventBus, 
  EventBusFactory, 
  EventBusConfig,
  EventHandler,
  PublishOptions,
  HealthStatus,
  EventBusStats
} from '../shared/events'
import { 
  LoggingMiddleware, 
  RetryMiddleware, 
  MetricsMiddleware,
  LoggingOptions,
  RetryOptions,
  MetricsOptions
} from '../shared/events/middleware'

declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EnhancedEventBus
  }
}

interface EnhancedEventBus extends EventBus {
  withLogging(options?: LoggingOptions): EnhancedEventBus
  withRetry(options?: RetryOptions): EnhancedEventBus
  withMetrics(options?: MetricsOptions): EnhancedEventBus
  getMiddlewareMetrics(): import('../shared/events/middleware').EventMetrics | null
}

interface EventBusPluginOptions extends FastifyPluginOptions {
  config?: EventBusConfig
  middleware?: {
    logging?: LoggingOptions
    retry?: RetryOptions
    metrics?: MetricsOptions
  }
}

class EventBusWrapper implements EnhancedEventBus {
  private eventBus: EventBus
  private loggingMiddleware: LoggingMiddleware | null = null
  private retryMiddleware: RetryMiddleware | null = null
  private metricsMiddleware: MetricsMiddleware | null = null
  private enhancedHandlers = new Map<string, Map<EventHandler, EventHandler>>()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  // EventBus interface methods
  async publish(eventName: string, data: any, options?: PublishOptions): Promise<void> {
    return this.eventBus.publish(eventName, data, options)
  }

  async subscribe(eventName: string, handler: EventHandler): Promise<void> {
    const enhancedHandler = this.wrapHandler(eventName, handler)
    
    // Store mapping for unsubscribe
    if (!this.enhancedHandlers.has(eventName)) {
      this.enhancedHandlers.set(eventName, new Map())
    }
    this.enhancedHandlers.get(eventName)!.set(handler, enhancedHandler)

    return this.eventBus.subscribe(eventName, enhancedHandler)
  }

  async unsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    if (handler && this.enhancedHandlers.has(eventName)) {
      const enhancedHandler = this.enhancedHandlers.get(eventName)!.get(handler)
      if (enhancedHandler) {
        await this.eventBus.unsubscribe(eventName, enhancedHandler)
        this.enhancedHandlers.get(eventName)!.delete(handler)
        return
      }
    }
    
    return this.eventBus.unsubscribe(eventName, handler)
  }

  async initialize(): Promise<void> {
    return this.eventBus.initialize()
  }

  async cleanup(): Promise<void> {
    this.enhancedHandlers.clear()
    return this.eventBus.cleanup()
  }

  async health(): Promise<HealthStatus> {
    return this.eventBus.health()
  }

  getType(): string {
    return this.eventBus.getType()
  }

  getStats(): EventBusStats {
    return this.eventBus.getStats()
  }

  // Enhancement methods
  withLogging(options?: LoggingOptions): EnhancedEventBus {
    this.loggingMiddleware = new LoggingMiddleware(options)
    return this
  }

  withRetry(options?: RetryOptions): EnhancedEventBus {
    this.retryMiddleware = new RetryMiddleware(options)
    return this
  }

  withMetrics(options?: MetricsOptions): EnhancedEventBus {
    this.metricsMiddleware = new MetricsMiddleware(options)
    return this
  }

  getMiddlewareMetrics(): import('../shared/events/middleware').EventMetrics | null {
    return this.metricsMiddleware?.getMetrics() || null
  }

  private wrapHandler(eventName: string, handler: EventHandler): EventHandler {
    let wrappedHandler = handler

    // Apply middleware in order: logging -> retry -> metrics -> handler
    if (this.loggingMiddleware) {
      wrappedHandler = this.loggingMiddleware.wrap(eventName, wrappedHandler)
    }

    if (this.retryMiddleware) {
      wrappedHandler = this.retryMiddleware.wrap(eventName, wrappedHandler)
    }

    if (this.metricsMiddleware) {
      wrappedHandler = this.metricsMiddleware.wrap(eventName, wrappedHandler)
    }

    return wrappedHandler
  }
}

async function eventBusPlugin(
  fastify: FastifyInstance,
  options: EventBusPluginOptions = {}
): Promise<void> {
  // Create event bus config from environment
  const config: EventBusConfig = {
    adapter: fastify.config.EVENT_BUS_ADAPTER as 'memory' | 'redis' | 'rabbitmq',
    enabled: fastify.config.EVENT_BUS_ENABLED === 'true',
    redis: {
      url: fastify.config.EVENT_BUS_REDIS_URL || undefined,
      host: fastify.config.EVENT_BUS_REDIS_HOST,
      port: parseInt(fastify.config.EVENT_BUS_REDIS_PORT),
      password: fastify.config.EVENT_BUS_REDIS_PASSWORD || undefined,
      db: parseInt(fastify.config.EVENT_BUS_REDIS_DB),
      keyPrefix: fastify.config.EVENT_BUS_REDIS_KEY_PREFIX,
      maxRetriesPerRequest: parseInt(fastify.config.EVENT_BUS_REDIS_MAX_RETRIES)
    },
    rabbitmq: {
      url: fastify.config.EVENT_BUS_RABBITMQ_URL || undefined,
      host: fastify.config.EVENT_BUS_RABBITMQ_HOST,
      port: parseInt(fastify.config.EVENT_BUS_RABBITMQ_PORT),
      username: fastify.config.EVENT_BUS_RABBITMQ_USERNAME,
      password: fastify.config.EVENT_BUS_RABBITMQ_PASSWORD,
      vhost: fastify.config.EVENT_BUS_RABBITMQ_VHOST,
      exchange: fastify.config.EVENT_BUS_RABBITMQ_EXCHANGE,
      exchangeType: fastify.config.EVENT_BUS_RABBITMQ_EXCHANGE_TYPE,
      deadLetterExchange: fastify.config.EVENT_BUS_RABBITMQ_DLX,
      prefetch: parseInt(fastify.config.EVENT_BUS_RABBITMQ_PREFETCH)
    }
  }

  // Override with options if provided
  const finalConfig = options.config ? { ...config, ...options.config } : config
  
  // Create event bus instance
  const eventBus = EventBusFactory.create(finalConfig)

  // Initialize the event bus
  await eventBus.initialize()

  // Create enhanced wrapper
  const enhancedEventBus = new EventBusWrapper(eventBus)

  // Apply middleware if configured
  if (options.middleware?.logging) {
    enhancedEventBus.withLogging(options.middleware.logging)
  }

  if (options.middleware?.retry) {
    enhancedEventBus.withRetry(options.middleware.retry)
  }

  if (options.middleware?.metrics) {
    enhancedEventBus.withMetrics(options.middleware.metrics)
  }

  // Register with Fastify
  fastify.decorate('eventBus', enhancedEventBus)

  // Health check route
  fastify.get('/api/v1/health/event-bus', async () => {
    const health = await enhancedEventBus.health()
    const stats = enhancedEventBus.getStats()
    const metrics = enhancedEventBus.getMiddlewareMetrics()

    return {
      health,
      stats,
      metrics: metrics ? {
        summary: {
          totalEvents: metrics.totalEvents,
          successRate: metrics.totalEvents > 0 
            ? ((metrics.successfulEvents / metrics.totalEvents) * 100).toFixed(2) + '%'
            : '100%',
          averageDuration: metrics.averageDuration.toFixed(2) + 'ms',
          errorCount: metrics.failedEvents
        },
        detailed: metrics
      } : null
    }
  })

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await enhancedEventBus.cleanup()
  })

  // Log successful initialization
  if (fastify.config.EVENT_BUS_ENABLED === 'true') {
    fastify.log.info(`✅ Event Bus enabled with ${enhancedEventBus.getType()} adapter`)
  } else {
    fastify.log.info(`ℹ️ Event Bus disabled (using ${enhancedEventBus.getType()} adapter - events will be dropped)`)
  }
}

export default fp(eventBusPlugin, {
  name: 'event-bus',
  dependencies: ['env-plugin']
})