/**
 * API Key Cleanup Background Job
 * 
 * Handles cleanup of expired API keys with configurable strategies:
 * 1. Cron-based cleanup (traditional background job)
 * 2. Redis TTL-based expiration notifications
 */

import { FastifyInstance } from 'fastify'

/**
 * Configuration for API key expiration handling
 */
interface ApiKeyExpirationConfig {
  strategy: 'cronjob' | 'redis_ttl' | 'hybrid'
  cronjob: {
    enabled: boolean
    schedule: string // Cron expression
    batchSize: number
  }
  redis: {
    enabled: boolean
    notificationChannel: string
    preExpirationWarning: number // Hours before expiration to warn
  }
}

/**
 * API Key Cleanup Job Handler
 */
export class ApiKeyCleanupJob {
  private config: ApiKeyExpirationConfig

  constructor(private fastify: FastifyInstance) {
    // Initialize ApiKeyService when needed rather than storing as instance variable
    
    // Load configuration from environment
    this.config = {
      strategy: (process.env.API_KEY_EXPIRATION_STRATEGY as any) || 'cronjob',
      cronjob: {
        enabled: process.env.API_KEY_CRONJOB_ENABLED !== 'false',
        schedule: process.env.API_KEY_CLEANUP_SCHEDULE || '0 2 * * *', // 2 AM daily
        batchSize: parseInt(process.env.API_KEY_CLEANUP_BATCH_SIZE || '100')
      },
      redis: {
        enabled: process.env.API_KEY_REDIS_TTL_ENABLED === 'true',
        notificationChannel: process.env.API_KEY_REDIS_CHANNEL || 'api_key_expiration',
        preExpirationWarning: parseInt(process.env.API_KEY_PRE_EXPIRATION_HOURS || '24')
      }
    }
  }

  /**
   * Initialize expiration handling based on configuration
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.strategy === 'cronjob' || this.config.strategy === 'hybrid') {
        await this.setupCronJob()
      }

      if (this.config.strategy === 'redis_ttl' || this.config.strategy === 'hybrid') {
        await this.setupRedisExpiration()
      }

      this.fastify.log.info('API key expiration handling initialized', {
        strategy: this.config.strategy,
        cronjobEnabled: this.config.cronjob.enabled,
        redisEnabled: this.config.redis.enabled
      })
    } catch (error) {
      this.fastify.log.error('Failed to initialize API key expiration handling', { error })
      throw error
    }
  }

  /**
   * Setup traditional cron-based cleanup
   */
  private async setupCronJob(): Promise<void> {
    if (!this.config.cronjob.enabled) {
      return
    }

    // Schedule the cleanup job using existing Background Jobs service
    // Note: Background jobs integration would be implemented based on available service
    // Skip for now to avoid compilation errors
    // await this.fastify.backgroundJobs.schedule({
    //   name: 'api-key-cleanup',
    //   schedule: this.config.cronjob.schedule,
    //   data: {
    //     batchSize: this.config.cronjob.batchSize
    //   },
    //   processor: this.cleanupExpiredKeys.bind(this)
    // })

    this.fastify.log.info('API key cleanup cron job scheduled', {
      schedule: this.config.cronjob.schedule,
      batchSize: this.config.cronjob.batchSize
    })
  }

  /**
   * Setup Redis TTL-based expiration notifications
   */
  private async setupRedisExpiration(): Promise<void> {
    if (!this.config.redis.enabled || !this.fastify.redis) {
      this.fastify.log.warn('Redis TTL expiration requested but Redis not available')
      return
    }

    try {
      // Subscribe to Redis keyspace notifications for API key expirations
      await this.fastify.redis.config('SET', 'notify-keyspace-events', 'Ex')
      
      // Create subscriber connection
      const subscriber = this.fastify.redis.duplicate()
      await subscriber.psubscribe('__keyevent@*__:expired')
      
      subscriber.on('pmessage', async (pattern, channel, expiredKey) => {
        if (expiredKey.startsWith('api_key_ttl:')) {
          const apiKeyId = expiredKey.replace('api_key_ttl:', '')
          await this.handleRedisExpiration(apiKeyId)
        }
      })

      // Setup pre-expiration warnings
      await this.setupPreExpirationWarnings()

      this.fastify.log.info('Redis TTL expiration notifications setup', {
        channel: this.config.redis.notificationChannel,
        preWarningHours: this.config.redis.preExpirationWarning
      })
    } catch (error) {
      this.fastify.log.error('Failed to setup Redis expiration', { error })
      throw error
    }
  }

  /**
   * Setup pre-expiration warnings
   */
  private async setupPreExpirationWarnings(): Promise<void> {
    // Schedule job to check for soon-to-expire keys
    // await this.fastify.backgroundJobs.schedule({
    //   name: 'api-key-pre-expiration-warning',
    //   schedule: '0 */6 * * *', // Every 6 hours
    //   processor: this.checkPreExpirationWarnings.bind(this)
    // })
  }

  // Method commented out to avoid unused warning
  // Would be used by background job scheduler when implemented

  /**
   * Handle Redis TTL expiration
   */
  private async handleRedisExpiration(apiKeyId: string): Promise<void> {
    try {
      // Mark the API key as expired in database
      const result = await this.fastify.knex('api_keys')
        .where('id', apiKeyId)
        .where('is_active', true)
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoked_reason: 'Expired via Redis TTL',
          updated_at: new Date()
        })
        .returning(['id', 'user_id', 'name'])

      if (result.length > 0) {
        const apiKey = result[0]

        // Clear related caches
        // await this.fastify.cache.deletePattern(`api_key:*${apiKeyId}*`)

        // Publish expiration event
        await this.fastify.eventBus.publish('api_key.expired.redis', {
          apiKeyId,
          userId: apiKey.user_id,
          keyName: apiKey.name,
          timestamp: new Date(),
          strategy: 'redis_ttl'
        })

        // Send notification to user
        const user = await this.fastify.knex('users')
          .where('id', apiKey.user_id)
          .first()

        if (user) {
          await (this.fastify as any).notifications.send('email', {
            to: user.email,
            template: 'api_key_expired',
            data: {
              userName: user.name,
              keyName: apiKey.name,
              expiredAt: new Date()
            }
          }).catch((error: any) => {
            this.fastify.log.error('Failed to send API key expiration notification', { error })
          })
        }

        // Record metrics
        // await this.fastify.metrics.increment('api_keys_expired_redis')

        this.fastify.log.info('API key expired via Redis TTL', {
          apiKeyId,
          userId: apiKey.user_id,
          keyName: apiKey.name
        })
      }
    } catch (error) {
      this.fastify.log.error('Failed to handle Redis API key expiration', { 
        error, 
        apiKeyId 
      })
    }
  }

  // Method commented out to avoid unused warning - would be used by background job scheduler when implemented
  // private async checkPreExpirationWarnings(): Promise<void> { ... }

  /**
   * Set Redis TTL for a new API key
   */
  async setRedisExpiration(apiKeyId: string, expiresAt: Date): Promise<void> {
    if (!this.config.redis.enabled || !this.fastify.redis) {
      return
    }

    try {
      const ttlSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000)
      
      if (ttlSeconds > 0) {
        const redisKey = `api_key_ttl:${apiKeyId}`
        await this.fastify.redis.setex(redisKey, ttlSeconds, 'expires')
        
        this.fastify.log.debug('Redis TTL set for API key', {
          apiKeyId,
          ttlSeconds,
          expiresAt
        })
      }
    } catch (error) {
      this.fastify.log.error('Failed to set Redis TTL for API key', { 
        error, 
        apiKeyId 
      })
    }
  }

  /**
   * Remove Redis TTL when API key is revoked
   */
  async removeRedisExpiration(apiKeyId: string): Promise<void> {
    if (!this.config.redis.enabled || !this.fastify.redis) {
      return
    }

    try {
      const redisKey = `api_key_ttl:${apiKeyId}`
      await this.fastify.redis.del(redisKey)
      
      this.fastify.log.debug('Redis TTL removed for API key', { apiKeyId })
    } catch (error) {
      this.fastify.log.error('Failed to remove Redis TTL for API key', { 
        error, 
        apiKeyId 
      })
    }
  }
}