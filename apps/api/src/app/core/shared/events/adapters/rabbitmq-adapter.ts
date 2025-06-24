import { EventHandler, PublishOptions, HealthStatus, EventBusStats } from '../interfaces'
import { BaseEventBusAdapter } from './base-adapter'
import { EventFactory } from '../utils'
import amqp, { Message, ConfirmChannel } from 'amqplib'

export interface RabbitMQAdapterConfig {
  url?: string
  host?: string
  port?: number
  username?: string
  password?: string
  vhost?: string
  exchange?: string
  exchangeType?: string
  deadLetterExchange?: string
  prefetch?: number
}

export class RabbitMQEventBusAdapter extends BaseEventBusAdapter {
  private connection: amqp.Connection | null = null
  private channel: ConfirmChannel | null = null
  private config: RabbitMQAdapterConfig
  private queues = new Map<string, string>()

  constructor(config: RabbitMQAdapterConfig = {}) {
    super()
    this.config = {
      host: 'localhost',
      port: 5672,
      username: 'guest',
      password: 'guest',
      vhost: '/',
      exchange: 'events',
      exchangeType: 'topic',
      deadLetterExchange: 'events.dlx',
      prefetch: 10,
      ...config
    }
  }

  override getType(): string {
    return 'rabbitmq'
  }

  async initialize(): Promise<void> {
    try {
      // Create connection
      const connectionUrl = this.config.url || 
        `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}${this.config.vhost}`
      
      const connection = await amqp.connect(connectionUrl)
      this.connection = connection as any // Type assertion for amqplib types
      this.channel = await (connection as any).createConfirmChannel()

      // Setup error handlers
      this.connection?.on('error', (error) => {
        console.error('RabbitMQ connection error:', error)
        this.stats.errorCount++
      })

      this.connection?.on('close', () => {
        console.warn('RabbitMQ connection closed')
      })

      this.channel?.on('error', (error) => {
        console.error('RabbitMQ channel error:', error)
        this.stats.errorCount++
      })

      // Set prefetch count
      if (this.channel) {
        await this.channel.prefetch(this.config.prefetch!)

        // Create exchanges
        await this.channel.assertExchange(this.config.exchange!, this.config.exchangeType!, {
          durable: true
        })

        // Create dead letter exchange
        await this.channel.assertExchange(this.config.deadLetterExchange!, 'topic', {
          durable: true
        })
      }

      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize RabbitMQ adapter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false
    
    try {
      if (this.channel) {
        await this.channel.close()
        this.channel = null
      }
      if (this.connection) {
        await (this.connection as any).close()
        this.connection = null
      }
    } catch (error) {
      console.error('Error during RabbitMQ cleanup:', error)
    }
    
    this.handlers.clear()
    this.queues.clear()
  }

  async health(): Promise<HealthStatus> {
    try {
      if (!this.connection || !this.channel) {
        return {
          status: 'unhealthy',
          adapter: this.getType(),
          uptime: Date.now() - this.stats.startTime,
          lastCheck: new Date(),
          details: { error: 'No connection or channel' }
        }
      }

      // Check if connection is still open (simplified check)
      if (!this.connection || !this.channel) {
        return {
          status: 'unhealthy',
          adapter: this.getType(),
          uptime: Date.now() - this.stats.startTime,
          lastCheck: new Date(),
          details: { error: 'Connection destroyed' }
        }
      }

      return {
        status: 'healthy',
        adapter: this.getType(),
        uptime: Date.now() - this.stats.startTime,
        lastCheck: new Date(),
        details: {
          queues: this.queues.size,
          exchange: this.config.exchange
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        adapter: this.getType(),
        uptime: Date.now() - this.stats.startTime,
        lastCheck: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
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
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    const message = {
      eventId: EventFactory.generateEventId(),
      eventName,
      data,
      timestamp: new Date().toISOString(),
      source: 'rabbitmq-adapter',
      correlationId: EventFactory.generateCorrelationId(),
      options
    }

    const routingKey = this.getRoutingKey(eventName)
    const buffer = Buffer.from(JSON.stringify(message))

    const publishOptions: any = {
      persistent: options?.persistent ?? true,
      priority: options?.priority ?? 0,
      correlationId: message.correlationId,
      timestamp: Date.now()
    }

    // Set TTL if specified
    if (options?.ttl) {
      publishOptions.expiration = options.ttl.toString()
    }

    // Handle delayed publishing (using RabbitMQ delayed message plugin if available)
    if (options?.delay && options.delay > 0) {
      publishOptions.headers = {
        'x-delay': options.delay
      }
    }

    await this.channel.publish(
      this.config.exchange!,
      routingKey,
      buffer,
      publishOptions
    )
  }

  protected async doSubscribe(eventName: string, handler: EventHandler): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    const queueName = this.getQueueName(eventName)
    const routingKey = this.getRoutingKey(eventName)

    // Create queue if it doesn't exist
    if (!this.queues.has(eventName)) {
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': this.config.deadLetterExchange,
          'x-dead-letter-routing-key': `dlx.${routingKey}`
        }
      })

      // Bind queue to exchange
      await this.channel.bindQueue(queueName, this.config.exchange!, routingKey)

      // Start consuming
      await this.channel.consume(queueName, (msg) => {
        if (msg) {
          this.handleMessage(eventName, msg)
        }
      }, {
        noAck: false
      })

      this.queues.set(eventName, queueName)
    }
  }

  protected async doUnsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available')
    }

    // If no more handlers for this event, we could optionally delete the queue
    // For now, we'll leave the queue but stop consuming
    const queueName = this.queues.get(eventName)
    if (queueName && (!this.handlers.has(eventName) || this.handlers.get(eventName)!.size === 0)) {
      // Optionally cancel consumer or delete queue
      // await this.channel.deleteQueue(queueName)
      this.queues.delete(eventName)
    }
  }

  private async handleMessage(eventName: string, msg: Message): Promise<void> {
    try {
      const content = msg.content.toString()
      const parsed = JSON.parse(content)

      // Check TTL (message expiration is handled by RabbitMQ, but we can add extra checks)
      if (parsed.options?.ttl) {
        const messageAge = Date.now() - new Date(parsed.timestamp).getTime()
        if (messageAge > parsed.options.ttl) {
          console.warn(`Event ${eventName} expired (TTL: ${parsed.options.ttl}ms)`)
          this.channel!.nack(msg, false, false) // Don't requeue expired messages
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
      
      // Acknowledge message after successful processing
      this.channel!.ack(msg)
    } catch (error) {
      console.error(`Error handling RabbitMQ message for event ${eventName}:`, error)
      this.stats.errorCount++
      
      // Handle retry logic
      const retryCount = this.getRetryCount(msg)
      const maxRetries = this.getMaxRetries(msg)
      
      if (retryCount < maxRetries) {
        // Reject and requeue for retry
        this.channel!.nack(msg, false, true)
      } else {
        // Send to dead letter queue
        this.channel!.nack(msg, false, false)
      }
    }
  }

  private getQueueName(eventName: string): string {
    return `queue.${eventName}`
  }

  private getRoutingKey(eventName: string): string {
    return eventName.replace(/\./g, '.')
  }

  private getRetryCount(msg: Message): number {
    return (msg.properties.headers?.['x-retry-count'] as number) || 0
  }

  private getMaxRetries(msg: Message): number {
    return (msg.properties.headers?.['x-max-retries'] as number) || 3
  }
}