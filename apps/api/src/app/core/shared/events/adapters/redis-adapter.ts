import { EventHandler, PublishOptions, HealthStatus, EventBusStats } from '../interfaces'
import { BaseEventBusAdapter } from './base-adapter'
import { EventFactory } from '../utils'
import Redis from 'ioredis'

export interface RedisAdapterConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
}

export class RedisEventBusAdapter extends BaseEventBusAdapter {
  private redis: Redis | null = null
  private subscriber: Redis | null = null
  private config: RedisAdapterConfig

  constructor(config: RedisAdapterConfig = {}) {
    super()
    this.config = {
      keyPrefix: 'events:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      ...config
    }
  }

  override getType(): string {
    return 'redis'
  }

  async initialize(): Promise<void> {
    try {
      // Create Redis connections
      const redisConfig = this.config.url 
        ? { url: this.config.url }
        : {
            host: this.config.host || 'localhost',
            port: this.config.port || 6379,
            password: this.config.password,
            db: this.config.db || 0,
            keyPrefix: this.config.keyPrefix,
            retryDelayOnFailover: this.config.retryDelayOnFailover,
            maxRetriesPerRequest: this.config.maxRetriesPerRequest
          }

      this.redis = new Redis(redisConfig)
      this.subscriber = new Redis(redisConfig)

      // Setup error handlers
      this.redis.on('error', (error) => {
        console.error('Redis publisher error:', error)
        this.stats.errorCount++
      })

      this.subscriber.on('error', (error) => {
        console.error('Redis subscriber error:', error)
        this.stats.errorCount++
      })

      // Setup message handler
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message)
      })

      await this.redis.ping()
      await this.subscriber.ping()

      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize Redis adapter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false
    
    if (this.subscriber) {
      await this.subscriber.unsubscribe()
      await this.subscriber.quit()
      this.subscriber = null
    }
    
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
    
    this.handlers.clear()
  }

  async health(): Promise<HealthStatus> {
    try {
      if (!this.redis || !this.subscriber) {
        return {
          status: 'unhealthy',
          adapter: this.getType(),
          uptime: Date.now() - this.stats.startTime,
          lastCheck: new Date(),
          details: { error: 'Redis connections not initialized' }
        }
      }
      
      const publisherPing = await this.redis.ping()
      const subscriberPing = await this.subscriber.ping()
      
      if (publisherPing === 'PONG' && subscriberPing === 'PONG') {
        return {
          status: 'healthy',
          adapter: this.getType(),
          uptime: Date.now() - this.stats.startTime,
          lastCheck: new Date(),
          details: {
            publisherStatus: publisherPing,
            subscriberStatus: subscriberPing,
            subscribedChannels: this.handlers.size
          }
        }
      } else {
        return {
          status: 'unhealthy',
          adapter: this.getType(),
          uptime: Date.now() - this.stats.startTime,
          lastCheck: new Date(),
          details: {
            publisherStatus: publisherPing,
            subscriberStatus: subscriberPing,
            error: 'Redis ping failed'
          }
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        adapter: this.getType(),
        uptime: Date.now() - this.stats.startTime,
        lastCheck: new Date(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  override getStats(): EventBusStats {
    const baseStats = super.getStats()
    return {
      ...baseStats,
      memoryUsage: process.memoryUsage().heapUsed
    }
  }

  protected async doPublish(eventName: string, data: any, options?: PublishOptions): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis adapter not initialized')
    }
    
    const message = {
      eventId: EventFactory.generateEventId(),
      eventName,
      data,
      timestamp: new Date().toISOString(),
      source: 'redis-adapter',
      correlationId: EventFactory.generateCorrelationId(),
      options
    }

    const channel = this.getChannelName(eventName)
    
    if (options?.delay && options.delay > 0) {
      // Use Redis Streams for delayed messages (if available)
      // For simplicity, we'll use setTimeout as fallback
      setTimeout(async () => {
        if (this.redis) {
          await this.redis.publish(channel, JSON.stringify(message))
        }
      }, options.delay)
    } else {
      await this.redis.publish(channel, JSON.stringify(message))
    }
  }

  protected async doSubscribe(eventName: string, handler: EventHandler): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized')
    }
    
    const channel = this.getChannelName(eventName)
    
    // Subscribe to the channel if this is the first handler for this event
    if (!this.handlers.has(eventName) || this.handlers.get(eventName)!.size === 0) {
      await this.subscriber.subscribe(channel)
    }
  }

  protected async doUnsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized')
    }
    
    const channel = this.getChannelName(eventName)
    
    // Unsubscribe from the channel if no more handlers
    if (!this.handlers.has(eventName) || this.handlers.get(eventName)!.size === 0) {
      await this.subscriber.unsubscribe(channel)
    }
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const parsed = JSON.parse(message)
      const eventName = this.getEventNameFromChannel(channel)
      
      // Check TTL
      if (parsed.options?.ttl) {
        const messageAge = Date.now() - new Date(parsed.timestamp).getTime()
        if (messageAge > parsed.options.ttl) {
          console.warn(`Event ${eventName} expired (TTL: ${parsed.options.ttl}ms)`)
          return
        }
      }

      const metadata = {
        eventId: parsed.eventId,
        timestamp: new Date(parsed.timestamp),
        source: parsed.source,
        correlationId: parsed.correlationId
      }

      await this.executeHandlers(eventName, parsed.data, metadata)
    } catch (error) {
      console.error(`Error handling Redis message on channel ${channel}:`, error)
      this.stats.errorCount++
    }
  }

  private getChannelName(eventName: string): string {
    return `${this.config.keyPrefix || 'events:'}${eventName}`
  }

  private getEventNameFromChannel(channel: string): string {
    const prefix = this.config.keyPrefix || 'events:'
    return channel.startsWith(prefix) ? channel.slice(prefix.length) : channel
  }
}