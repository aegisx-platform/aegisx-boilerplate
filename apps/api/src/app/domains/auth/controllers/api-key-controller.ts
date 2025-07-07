/**
 * API Key Controller
 * 
 * HTTP request handlers for API key management
 * with full integration of existing services
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ApiKeyService } from '../services/api-key.service'
import { 
  CreateApiKeyRequest,
  RevokeApiKeyRequest 
} from '../schemas/api-key.schemas'

export class ApiKeyController {
  private apiKeyService: ApiKeyService

  constructor(private fastify: FastifyInstance) {
    this.apiKeyService = new ApiKeyService(
      fastify,
      fastify.knex,
      fastify.log
    )
  }

  /**
   * Create a new API key
   */
  async createApiKey(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id
      const body = request.body as CreateApiKeyRequest

      // Validate request
      if (!body.name || body.name.trim().length === 0) {
        throw this.fastify.httpErrors.badRequest('API key name is required')
      }

      // Check if user has permission to create API keys
      const hasPermission = Array.isArray((request.user as any).permissions) && 
        (request.user as any).permissions.includes('api_keys:create:own')
      if (!hasPermission) {
        throw this.fastify.httpErrors.forbidden('You do not have permission to create API keys')
      }

      // Create API key
      const result = await this.apiKeyService.createApiKey(userId, body)

      return reply.code(201).send({
        success: true,
        data: result,
        message: 'API key created successfully. Store it securely - it will not be shown again.'
      })
    } catch (error) {
      request.log.error('API key creation failed', { error })
      throw error
    }
  }

  /**
   * List user's API keys
   */
  async listApiKeys(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id
      
      // Get API keys with usage stats
      const apiKeys = await this.apiKeyService.getUserApiKeys(userId)

      // Log access using structured logging
      request.log.info('API keys listed', {
        userId,
        count: apiKeys.length,
        operation: 'api_key.list',
        businessEvent: 'api_key_access'
      })

      return reply.send({
        success: true,
        data: apiKeys,
        total: apiKeys.length
      })
    } catch (error) {
      request.log.error('Failed to list API keys', { error })
      throw error
    }
  }

  /**
   * Get API key details
   */
  async getApiKey(request: any, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id
      const apiKeyId = request.params.id

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(apiKeyId)) {
        throw this.fastify.httpErrors.badRequest('Invalid API key ID format')
      }

      const apiKeyDetails = await this.apiKeyService.getApiKeyDetails(userId, apiKeyId)

      // Log access
      request.log.info('API key details retrieved', {
        userId,
        apiKeyId,
        operation: 'api_key.get',
        businessEvent: 'api_key_detail_access'
      })

      return reply.send({
        success: true,
        data: apiKeyDetails
      })
    } catch (error) {
      if ((error as Error).message === 'API key not found') {
        throw this.fastify.httpErrors.notFound('API key not found')
      }
      request.log.error('Failed to get API key details', { error })
      throw error
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(request: any, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id
      const apiKeyId = request.params.id
      const { reason } = request.body as RevokeApiKeyRequest

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(apiKeyId)) {
        throw this.fastify.httpErrors.badRequest('Invalid API key ID format')
      }

      await this.apiKeyService.revokeApiKey(userId, apiKeyId, reason)

      return reply.send({
        success: true,
        message: 'API key revoked successfully'
      })
    } catch (error: any) {
      if ((error as Error).message === 'API key not found') {
        throw this.fastify.httpErrors.notFound('API key not found')
      }
      request.log.error('Failed to revoke API key', { error })
      throw error
    }
  }

  /**
   * Regenerate an API key (revoke and create new)
   */
  async regenerateApiKey(request: any, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id
      const oldApiKeyId = request.params.id

      // Get existing API key details
      const existingKey = await this.apiKeyService.getApiKeyDetails(userId, oldApiKeyId)

      // Revoke the old key
      await this.apiKeyService.revokeApiKey(userId, oldApiKeyId, 'Regenerated')

      // Create new key with same settings
      const newKey = await this.apiKeyService.createApiKey(userId, {
        name: existingKey.name + ' (Regenerated)',
        description: existingKey.description,
        permissions: existingKey.permissions,
        expiresAt: existingKey.expiresAt,
        rateLimit: existingKey.permissions?.rateLimit
      })

      // Log regeneration
      request.log.info('API key regenerated', {
        userId,
        oldApiKeyId,
        newApiKeyId: newKey.id,
        operation: 'api_key.regenerate',
        businessEvent: 'api_key_regeneration'
      })

      return reply.send({
        success: true,
        data: newKey,
        message: 'API key regenerated successfully. Store the new key securely - it will not be shown again.'
      })
    } catch (error: any) {
      if ((error as Error).message === 'API key not found') {
        throw this.fastify.httpErrors.notFound('API key not found')
      }
      request.log.error('Failed to regenerate API key', { error })
      throw error
    }
  }

  /**
   * Test API key (validate current request's API key)
   */
  async testApiKey(request: FastifyRequest, reply: FastifyReply) {
    try {
      // This endpoint is called with API key authentication
      if ((request as any).authMethod !== 'api_key') {
        throw this.fastify.httpErrors.badRequest('This endpoint requires API key authentication')
      }

      const apiKeyId = (request as any).apiKeyId

      // Get API key details
      const apiKey = await this.fastify.knex('api_keys')
        .where('id', apiKeyId)
        .first()

      return reply.send({
        success: true,
        message: 'API key is valid',
        data: {
          apiKeyId,
          name: apiKey.name,
          permissions: (request as any).permissions,
          rateLimit: apiKey.rate_limit,
          expiresAt: apiKey.expires_at,
          lastUsedAt: apiKey.last_used_at,
          usageCount: apiKey.usage_count
        }
      })
    } catch (error) {
      request.log.error('API key test failed', { error })
      throw error
    }
  }
}