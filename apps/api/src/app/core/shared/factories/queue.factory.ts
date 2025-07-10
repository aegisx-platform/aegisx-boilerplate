/**
 * Queue Factory
 * 
 * Factory for creating queue service instances based on broker type
 * Supports Redis (Bull) and RabbitMQ implementations
 */

import { IQueueService } from '../interfaces/queue.interface'
import { BullQueueService, BullQueueConfig } from '../services/bull-queue.service'
import { RabbitMQQueueService, RabbitMQConfig } from '../services/rabbitmq-queue.service'

export type QueueBroker = 'redis' | 'rabbitmq'

export interface QueueConfig {
  broker: QueueBroker
  name: string
  redis?: BullQueueConfig
  rabbitmq?: RabbitMQConfig
}

export class QueueFactory {
  private static instances: Map<string, IQueueService> = new Map()
  
  /**
   * Create or get a queue service instance
   */
  static async create(config: QueueConfig): Promise<IQueueService> {
    const key = `${config.broker}:${config.name}`
    
    // Return existing instance if available
    if (this.instances.has(key)) {
      return this.instances.get(key)!
    }
    
    let queue: IQueueService
    
    switch (config.broker) {
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration is required for Redis broker')
        }
        queue = new BullQueueService(config.name, config.redis)
        break
        
      case 'rabbitmq':
        if (!config.rabbitmq) {
          throw new Error('RabbitMQ configuration is required for RabbitMQ broker')
        }
        queue = new RabbitMQQueueService(config.name, config.rabbitmq)
        // Initialize RabbitMQ connection
        await (queue as RabbitMQQueueService).initialize()
        break
        
      default:
        throw new Error(`Unknown queue broker: ${config.broker}`)
    }
    
    // Store instance
    this.instances.set(key, queue)
    
    return queue
  }
  
  /**
   * Create queue configuration from environment variables
   */
  static createConfigFromEnv(name: string): QueueConfig {
    const broker = (process.env.QUEUE_BROKER || 'redis') as QueueBroker
    
    const config: QueueConfig = {
      broker,
      name
    }
    
    if (broker === 'redis') {
      config.redis = {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB || '0'),
          maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
          enableReadyCheck: process.env.REDIS_READY_CHECK !== 'false',
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000')
        },
        prefix: process.env.QUEUE_PREFIX || 'bull',
        defaultJobOptions: {
          attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3'),
          backoff: {
            type: (process.env.QUEUE_BACKOFF_TYPE || 'exponential') as any,
            delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000')
          },
          removeOnComplete: process.env.QUEUE_REMOVE_ON_COMPLETE === 'true',
          removeOnFail: process.env.QUEUE_REMOVE_ON_FAIL === 'true'
        },
        metrics: {
          collectionInterval: parseInt(process.env.QUEUE_METRICS_INTERVAL || '60000')
        }
      }
    } else if (broker === 'rabbitmq') {
      config.rabbitmq = {
        url: process.env.RABBITMQ_URL,
        connection: process.env.RABBITMQ_URL ? undefined : {
          protocol: process.env.RABBITMQ_PROTOCOL || 'amqp',
          hostname: process.env.RABBITMQ_HOST || 'localhost',
          port: parseInt(process.env.RABBITMQ_PORT || '5672'),
          username: process.env.RABBITMQ_USER || 'guest',
          password: process.env.RABBITMQ_PASS || 'guest',
          vhost: process.env.RABBITMQ_VHOST || '/'
        },
        exchange: {
          name: process.env.RABBITMQ_EXCHANGE || `${name}.exchange`,
          type: (process.env.RABBITMQ_EXCHANGE_TYPE || 'direct') as any,
          durable: process.env.RABBITMQ_EXCHANGE_DURABLE !== 'false'
        },
        queue: {
          durable: process.env.RABBITMQ_QUEUE_DURABLE !== 'false',
          exclusive: process.env.RABBITMQ_QUEUE_EXCLUSIVE === 'true',
          autoDelete: process.env.RABBITMQ_QUEUE_AUTO_DELETE === 'true'
        },
        prefetch: parseInt(process.env.RABBITMQ_PREFETCH || '10'),
        reconnectInterval: parseInt(process.env.RABBITMQ_RECONNECT_INTERVAL || '5000'),
        defaultJobOptions: {
          attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3'),
          backoff: {
            type: (process.env.QUEUE_BACKOFF_TYPE || 'exponential') as any,
            delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000')
          }
        }
      }
    }
    
    return config
  }
  
  /**
   * Get all queue instances
   */
  static getAllQueues(): Map<string, IQueueService> {
    return new Map(this.instances)
  }
  
  /**
   * Get a specific queue instance
   */
  static getQueue(broker: QueueBroker, name: string): IQueueService | undefined {
    const key = `${broker}:${name}`
    return this.instances.get(key)
  }
  
  /**
   * Remove a queue instance
   */
  static async removeQueue(broker: QueueBroker, name: string): Promise<boolean> {
    const key = `${broker}:${name}`
    const queue = this.instances.get(key)
    
    if (queue) {
      await queue.close()
      this.instances.delete(key)
      return true
    }
    
    return false
  }
  
  /**
   * Close all queue instances
   */
  static async closeAll(): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const queue of this.instances.values()) {
      promises.push(queue.close())
    }
    
    await Promise.all(promises)
    this.instances.clear()
  }
  
  /**
   * Get metrics for all queues
   */
  static async getAllMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {}
    
    for (const [key, queue] of this.instances) {
      try {
        metrics[key] = await queue.getMetrics()
      } catch (error) {
        metrics[key] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
    
    return metrics
  }
}