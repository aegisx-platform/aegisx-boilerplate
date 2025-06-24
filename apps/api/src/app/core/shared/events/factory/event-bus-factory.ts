import { EventBus } from '../interfaces'
import { 
  MemoryEventBusAdapter, 
  RedisEventBusAdapter, 
  RabbitMQEventBusAdapter,
  RedisAdapterConfig,
  RabbitMQAdapterConfig
} from '../adapters'

export type EventBusAdapterType = 'memory' | 'redis' | 'rabbitmq'

export interface EventBusConfig {
  adapter: EventBusAdapterType
  redis?: RedisAdapterConfig
  rabbitmq?: RabbitMQAdapterConfig
}

export class EventBusFactory {
  private static instance: EventBus | null = null

  static create(config: EventBusConfig): EventBus {
    let adapter: EventBus

    switch (config.adapter) {
      case 'memory':
        adapter = new MemoryEventBusAdapter()
        break
      
      case 'redis':
        adapter = new RedisEventBusAdapter(config.redis)
        break
      
      case 'rabbitmq':
        adapter = new RabbitMQEventBusAdapter(config.rabbitmq)
        break
      
      default:
        throw new Error(`Unsupported event bus adapter: ${config.adapter}`)
    }

    return adapter
  }

  static createFromEnv(): EventBus {
    const adapterType = (process.env.EVENT_BUS_ADAPTER || 'memory') as EventBusAdapterType

    const config: EventBusConfig = {
      adapter: adapterType
    }

    // Redis configuration
    if (adapterType === 'redis') {
      config.redis = {
        url: process.env.EVENT_BUS_REDIS_URL,
        host: process.env.EVENT_BUS_REDIS_HOST,
        port: process.env.EVENT_BUS_REDIS_PORT ? parseInt(process.env.EVENT_BUS_REDIS_PORT) : undefined,
        password: process.env.EVENT_BUS_REDIS_PASSWORD,
        db: process.env.EVENT_BUS_REDIS_DB ? parseInt(process.env.EVENT_BUS_REDIS_DB) : undefined,
        keyPrefix: process.env.EVENT_BUS_REDIS_KEY_PREFIX || 'events:',
        maxRetriesPerRequest: process.env.EVENT_BUS_REDIS_MAX_RETRIES 
          ? parseInt(process.env.EVENT_BUS_REDIS_MAX_RETRIES) 
          : 3
      }
    }

    // RabbitMQ configuration
    if (adapterType === 'rabbitmq') {
      config.rabbitmq = {
        url: process.env.EVENT_BUS_RABBITMQ_URL,
        host: process.env.EVENT_BUS_RABBITMQ_HOST,
        port: process.env.EVENT_BUS_RABBITMQ_PORT ? parseInt(process.env.EVENT_BUS_RABBITMQ_PORT) : undefined,
        username: process.env.EVENT_BUS_RABBITMQ_USERNAME,
        password: process.env.EVENT_BUS_RABBITMQ_PASSWORD,
        vhost: process.env.EVENT_BUS_RABBITMQ_VHOST,
        exchange: process.env.EVENT_BUS_RABBITMQ_EXCHANGE || 'events',
        exchangeType: process.env.EVENT_BUS_RABBITMQ_EXCHANGE_TYPE || 'topic',
        deadLetterExchange: process.env.EVENT_BUS_RABBITMQ_DLX || 'events.dlx',
        prefetch: process.env.EVENT_BUS_RABBITMQ_PREFETCH 
          ? parseInt(process.env.EVENT_BUS_RABBITMQ_PREFETCH) 
          : 10
      }
    }

    return this.create(config)
  }

  static async createSingleton(config?: EventBusConfig): Promise<EventBus> {
    if (!this.instance) {
      this.instance = config ? this.create(config) : this.createFromEnv()
      await this.instance.initialize()
    }
    return this.instance
  }

  static async destroySingleton(): Promise<void> {
    if (this.instance) {
      await this.instance.cleanup()
      this.instance = null
    }
  }

  static getInstance(): EventBus | null {
    return this.instance
  }

  static async validateConfig(config: EventBusConfig): Promise<boolean> {
    try {
      const adapter = this.create(config)
      await adapter.initialize()
      const health = await adapter.health()
      await adapter.cleanup()
      
      return health.status === 'healthy'
    } catch (error) {
      console.error('Event bus configuration validation failed:', error)
      return false
    }
  }
}