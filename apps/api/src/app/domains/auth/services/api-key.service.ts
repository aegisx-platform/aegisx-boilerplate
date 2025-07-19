/**
 * API Key Service
 * 
 * Manages API key creation, validation, and revocation
 * with full integration of existing infrastructure services
 */

import { FastifyInstance, FastifyBaseLogger } from 'fastify'
import { Knex } from 'knex'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcrypt'
import { 
  ApiKeyValidation,
  ApiKeyUsageStats,
  ApiKeyEnvironment
} from '../types/api-key.types'
import {
  CreateApiKeyRequest,
  ApiKeyResponse,
  ApiKeyListItem
} from '../schemas/api-key.schemas'
import { ApiKeyCleanupJob } from '../jobs/api-key-cleanup.job'

export class ApiKeyService {
  private readonly BCRYPT_ROUNDS = 12
  private readonly API_KEY_LENGTH = 32
  private readonly PREFIX_MAP = {
    [ApiKeyEnvironment.LIVE]: 'sk_live_',
    [ApiKeyEnvironment.TEST]: 'sk_test_',
    [ApiKeyEnvironment.SANDBOX]: 'sk_sandbox_'
  }
  private cleanupJob?: ApiKeyCleanupJob

  constructor(
    private fastify: FastifyInstance,
    private db: Knex,
    private logger: FastifyBaseLogger
  ) {
    // Initialize cleanup job if available
    try {
      this.cleanupJob = new ApiKeyCleanupJob(fastify)
    } catch (error) {
      this.logger.warn('Could not initialize API key cleanup job', { error })
    }
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(userId: string, request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    try {
      // Generate secure API key
      const environment = process.env.NODE_ENV === 'production' ? ApiKeyEnvironment.LIVE : ApiKeyEnvironment.TEST
      const apiKey = this.generateApiKey(environment)
      const keyHash = await this.hashApiKey(apiKey)
      
      // Start transaction
      const result = await this.db.transaction(async (trx) => {
        // Insert API key
        const [apiKeyRecord] = await trx('api_keys').insert({
          user_id: userId,
          key_hash: keyHash,
          key_prefix: this.extractPrefix(apiKey),
          name: request.name,
          description: request.description,
          permissions: JSON.stringify(request.permissions || {}),
          expires_at: request.expiresAt,
          rate_limit: request.rateLimit || 1000,
          ip_whitelist: JSON.stringify(request.ipWhitelist || [])
        }).returning('*')

        // Publish event using existing Event Bus
        await this.fastify.eventBus.publish('api_key.created', {
          userId,
          apiKeyId: apiKeyRecord.id,
          name: request.name,
          permissions: request.permissions,
          timestamp: new Date()
        })

        // Audit log using existing Audit Service
        // await this.fastify.auditLog?.log({
        //   action: 'api_key.create',
        //   resource: 'api_keys',
        //   resourceId: apiKeyRecord.id,
        //   userId,
        //   details: {
        //     name: request.name,
        //     permissions: request.permissions,
        //     expiresAt: request.expiresAt,
        //     hasIpWhitelist: (request.ipWhitelist?.length || 0) > 0
        //   },
        //   metadata: {
        //     ip: this.fastify.requestContext?.get('ip'),
        //     userAgent: this.fastify.requestContext?.get('userAgent')
        //   }
        // })

        return apiKeyRecord
      })

      // Set Redis TTL for expiration if configured
      if (request.expiresAt && this.cleanupJob) {
        const expiresAt = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt
        await this.cleanupJob.setRedisExpiration(result.id, expiresAt)
      }

      // Structured logging using existing logger
      this.logger.info('API key created', {
        userId,
        apiKeyId: result.id,
        operation: 'api_key.create',
        businessEvent: 'api_key_creation',
        metadata: {
          keyName: request.name,
          hasExpiry: !!request.expiresAt,
          hasIpWhitelist: (request.ipWhitelist?.length || 0) > 0
        }
      })

      // Record metrics using existing Metrics Service
      // await this.fastify.metrics.recordEvent('api_key_created', {
      //   userId,
      //   hasPermissions: !!request.permissions,
      //   hasExpiry: !!request.expiresAt,
      //   environment
      // })

      return {
        id: result.id,
        key: apiKey, // Only shown once!
        name: result.name,
        prefix: this.extractPrefix(apiKey),
        createdAt: result.created_at
      }
    } catch (error) {
      // Error tracking using existing Error Tracker
      // await this.fastify.errorTracker.track(error as Error, {
      //   context: 'api_key_creation',
      //   userId,
      //   requestData: {
      //     name: request.name,
      //     hasPermissions: !!request.permissions
      //   }
      // })
      throw error
    }
  }

  /**
   * Validate an API key
   */
  async validateApiKey(apiKey: string, ip?: string): Promise<ApiKeyValidation> {
    try {
      // Check cache first using existing Cache Manager
      // const cacheKey = `api_key:${this.getCacheKey(apiKey)}`
      // const cached = await this.fastify.cache.get<ApiKeyValidation>(cacheKey)
      // if (cached) {
      //   // Increment cache hit metric
      //   await this.fastify.metrics.increment('api_key_cache_hit')
      //   return cached
      // }

      // Hash the provided key
      const keyHash = await this.hashApiKey(apiKey)

      // Query database with user data
      const apiKeyRecord = await this.db('api_keys as ak')
        .join('users as u', 'ak.user_id', 'u.id')
        .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
        .leftJoin('roles as r', 'ur.role_id', 'r.id')
        .where('ak.key_hash', keyHash)
        .where('ak.is_active', true)
        .whereRaw('(ak.expires_at IS NULL OR ak.expires_at > NOW())')
        .select(
          'ak.*',
          'u.email',
          'u.username',
          'u.name',
          'u.is_active as user_active',
          this.db.raw('ARRAY_AGG(DISTINCT r.name) as roles')
        )
        .groupBy('ak.id', 'u.id', 'u.email', 'u.username', 'u.name', 'u.is_active')
        .first()

      if (!apiKeyRecord || !apiKeyRecord.user_active) {
        // Audit failed attempt
        // await this.fastify.auditLog?.log({
        //   action: 'api_key.validate_failed',
        //   resource: 'api_keys',
        //   details: { 
        //     reason: 'invalid_or_inactive',
        //     ip,
        //     keyPrefix: this.extractPrefix(apiKey)
        //   }
        // })
        
        // await this.fastify.metrics.increment('api_key_validation_failed')
        
        return { 
          valid: false, 
          reason: 'Invalid or inactive API key' 
        }
      }

      // Parse JSON fields safely
      const permissions = this.parsePermissions(apiKeyRecord.permissions)
      const ipWhitelist = this.parseIpWhitelist(apiKeyRecord.ip_whitelist)

      // Check IP whitelist if configured
      if (ipWhitelist.length > 0 && ip) {
        if (!ipWhitelist.includes(ip)) {
          // await this.fastify.auditLog?.log({
          //   action: 'api_key.validate_failed',
          //   resource: 'api_keys',
          //   resourceId: apiKeyRecord.id,
          //   details: { 
          //     reason: 'ip_not_whitelisted', 
          //     ip,
          //     allowedIps: ipWhitelist 
          //   }
          // })
          
          return { 
            valid: false, 
            reason: 'IP address not whitelisted' 
          }
        }
      }

      // Update usage statistics
      await this.db('api_keys')
        .where('id', apiKeyRecord.id)
        .update({
          last_used_at: new Date(),
          last_used_ip: ip,
          usage_count: this.db.raw('usage_count + 1'),
          updated_at: new Date()
        })

      // Publish usage event
      await this.fastify.eventBus.publish('api_key.used', {
        apiKeyId: apiKeyRecord.id,
        userId: apiKeyRecord.user_id,
        ip,
        timestamp: new Date()
      })

      // Get user permissions from RBAC
      const userPermissions = await this.getUserPermissions(apiKeyRecord.user_id)

      const validation: ApiKeyValidation = {
        valid: true,
        userId: apiKeyRecord.user_id,
        apiKeyId: apiKeyRecord.id,
        permissions,
        rateLimit: apiKeyRecord.rate_limit,
        user: {
          id: apiKeyRecord.user_id,
          email: apiKeyRecord.email,
          username: apiKeyRecord.username,
          name: apiKeyRecord.name,
          roles: apiKeyRecord.roles || [],
          permissions: userPermissions,
          is_active: apiKeyRecord.user_active
        }
      }

      // Cache the validation result
      // await this.fastify.cache.set(cacheKey, validation, 300) // 5 minutes

      // Record successful validation
      // await this.fastify.metrics.increment('api_key_validation_success')

      return validation
    } catch (error) {
      // await this.fastify.errorTracker.track(error as Error, {
      //   context: 'api_key_validation',
      //   keyPrefix: this.extractPrefix(apiKey)
      // })
      
      return { 
        valid: false, 
        reason: 'Validation error occurred' 
      }
    }
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyListItem[]> {
    try {
      const apiKeys = await this.db('api_keys')
        .where('user_id', userId)
        .where('is_active', true)
        .orderBy('created_at', 'desc')
        .select('*')

      return apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        description: key.description,
        prefix: key.key_prefix,
        permissions: this.parsePermissions(key.permissions),
        expiresAt: key.expires_at,
        lastUsedAt: key.last_used_at,
        usageCount: key.usage_count,
        isActive: key.is_active,
        createdAt: key.created_at
      }))
    } catch (error) {
      // await this.fastify.errorTracker.track(error as Error, {
      //   context: 'api_key_list',
      //   userId
      // })
      throw error
    }
  }

  /**
   * Get detailed API key information including usage stats
   */
  async getApiKeyDetails(userId: string, apiKeyId: string): Promise<ApiKeyListItem & { usageStats: ApiKeyUsageStats }> {
    try {
      const apiKey = await this.db('api_keys')
        .where('id', apiKeyId)
        .where('user_id', userId)
        .first()

      if (!apiKey) {
        throw new Error('API key not found')
      }

      // Get usage statistics from cache or calculate
      // const statsKey = `api_key_stats:${apiKeyId}`
      // let usageStats = await this.fastify.cache.get<ApiKeyUsageStats>(statsKey)
      
      // if (!usageStats) {
        // Calculate usage stats from audit logs
        const usageStats = await this.calculateUsageStats(apiKeyId)
        // await this.fastify.cache.set(statsKey, usageStats, 3600) // 1 hour
      // }

      return {
        id: apiKey.id,
        name: apiKey.name,
        description: apiKey.description,
        prefix: apiKey.key_prefix,
        permissions: this.parsePermissions(apiKey.permissions),
        expiresAt: apiKey.expires_at,
        lastUsedAt: apiKey.last_used_at,
        usageCount: apiKey.usage_count,
        isActive: apiKey.is_active,
        createdAt: apiKey.created_at,
        usageStats
      }
    } catch (error) {
      // await this.fastify.errorTracker.track(error as Error, {
      //   context: 'api_key_details',
      //   userId,
      //   apiKeyId
      // })
      throw error
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(userId: string, apiKeyId: string, reason?: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      const [apiKey] = await trx('api_keys')
        .where('id', apiKeyId)
        .where('user_id', userId)
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoked_by: userId,
          revoked_reason: reason || 'User revoked',
          updated_at: new Date()
        })
        .returning('*')

      if (!apiKey) {
        throw new Error('API key not found')
      }

      // Clear cache using pattern
      // await this.fastify.cache.deletePattern(`api_key:*`)
      // await this.fastify.cache.deletePattern(`api_key_stats:${apiKeyId}`)

      // Remove Redis TTL if configured
      if (this.cleanupJob) {
        await this.cleanupJob.removeRedisExpiration(apiKeyId)
      }

      // Publish revocation event
      await this.fastify.eventBus.publish('api_key.revoked', {
        apiKeyId,
        userId,
        reason,
        timestamp: new Date()
      })

      // Audit log
      // await this.fastify.auditLog?.log({
      //   action: 'api_key.revoke',
      //   resource: 'api_keys',
      //   resourceId: apiKeyId,
      //   userId,
      //   details: { 
      //     reason,
      //     keyName: apiKey.name 
      //   }
      // })

      // Structured logging
      this.logger.info('API key revoked', {
        userId,
        apiKeyId,
        operation: 'api_key.revoke',
        businessEvent: 'api_key_revocation',
        metadata: {
          reason,
          keyName: apiKey.name
        }
      })

      // Record metric
      // await this.fastify.metrics.recordEvent('api_key_revoked', {
      //   userId,
      //   reason: reason || 'user_revoked'
      // })
    })
  }

  /**
   * Clean up expired API keys (for background job)
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const deleted = await this.db('api_keys')
        .where('expires_at', '<', new Date())
        .where('is_active', true)
        .update({
          is_active: false,
          revoked_at: new Date(),
          revoked_reason: 'Expired',
          updated_at: new Date()
        })
        .returning('id')

      if (deleted.length > 0) {
        // Clear related caches
        // await this.fastify.cache.deletePattern('api_key:*')

        // Publish cleanup event
        await this.fastify.eventBus.publish('api_key.cleanup', {
          deletedCount: deleted.length,
          deletedIds: deleted.map(d => d.id),
          timestamp: new Date()
        })

        // Log cleanup
        this.logger.info('API key cleanup completed', {
          deletedCount: deleted.length,
          operation: 'api_key.cleanup',
          businessEvent: 'api_key_cleanup'
        })

        // Record metrics
        // await this.fastify.metrics.gauge('api_keys_expired', deleted.length)
      }

      return deleted.length
    } catch (error) {
      // await this.fastify.errorTracker.track(error as Error, {
      //   context: 'api_key_cleanup'
      // })
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private generateApiKey(environment: ApiKeyEnvironment = ApiKeyEnvironment.LIVE): string {
    const prefix = this.PREFIX_MAP[environment]
    const key = randomBytes(this.API_KEY_LENGTH).toString('hex')
    return `${prefix}${key}`
  }

  private async hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, this.BCRYPT_ROUNDS)
  }

  private extractPrefix(apiKey: string): string {
    const match = apiKey.match(/^(sk_[a-z]+_)/)
    return match ? match[1] + apiKey.substring(match[1].length, match[1].length + 4) + '...' : 'unknown'
  }

  // private getCacheKey(apiKey: string): string {
  //   // Use a hash of the API key for cache key to avoid storing sensitive data
  //   return createHash('sha256').update(apiKey).digest('hex').substring(0, 16)
  // }

  private async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Get user permissions from RBAC
      const permissionRows = await this.db('permissions as p')
        .join('role_permissions as rp', 'p.id', 'rp.permission_id')
        .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
        .where('ur.user_id', userId)
        .where('ur.is_active', true)
        .whereRaw('(ur.expires_at IS NULL OR ur.expires_at > NOW())')
        .select('p.resource', 'p.action', 'p.scope')
        .distinct()

      // Format permissions as resource:action:scope
      const permissions = permissionRows.map(p => `${p.resource}:${p.action}:${p.scope}`)
      
      return permissions
    } catch (error) {
      this.logger.error('Failed to get user permissions', { userId, error })
      return []
    }
  }

  private async calculateUsageStats(apiKeyId: string): Promise<ApiKeyUsageStats> {
    // This would query audit logs or a separate analytics table
    // For now, return mock data
    return {
      apiKeyId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      topEndpoints: [],
      dailyUsage: []
    }
  }

  /**
   * Safely parse permissions field from database
   */
  private parsePermissions(permissions: any): any {
    if (!permissions) return {}
    if (typeof permissions === 'object') return permissions
    if (typeof permissions === 'string') {
      try {
        return JSON.parse(permissions)
      } catch (error) {
        this.logger.warn('Failed to parse permissions JSON', { permissions, error })
        return {}
      }
    }
    return {}
  }

  /**
   * Safely parse IP whitelist field from database
   */
  private parseIpWhitelist(ipWhitelist: any): string[] {
    if (!ipWhitelist) return []
    if (Array.isArray(ipWhitelist)) return ipWhitelist
    if (typeof ipWhitelist === 'string') {
      try {
        const parsed = JSON.parse(ipWhitelist)
        return Array.isArray(parsed) ? parsed : []
      } catch (error) {
        this.logger.warn('Failed to parse IP whitelist JSON', { ipWhitelist, error })
        return []
      }
    }
    return []
  }
}