/**
 * API Key Routes
 * 
 * Route definitions for API key management endpoints
 */

import { FastifyInstance } from 'fastify'
import { ApiKeyController } from '../controllers/api-key-controller'
import {
  CreateApiKeyRequestSchema,
  ApiKeyResponseSchema,
  ListApiKeysResponseSchema,
  GetApiKeyResponseSchema,
  RevokeApiKeyRequestSchema,
  ApiKeySuccessResponseSchema,
  ApiKeyErrorResponseSchema
} from '../schemas/api-key.schemas'

export async function apiKeyRoutes(fastify: FastifyInstance) {
  const controller = new ApiKeyController(fastify)

  // Create API key
  fastify.post('/api-keys', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Create a new API key',
      description: 'Create a new API key for authentication. The key is shown only once.',
      body: CreateApiKeyRequestSchema,
      response: {
        201: {
          description: 'API key created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: ApiKeyResponseSchema,
            message: { type: 'string' }
          }
        },
        400: ApiKeyErrorResponseSchema,
        401: ApiKeyErrorResponseSchema,
        403: ApiKeyErrorResponseSchema
      }
    }
  }, controller.createApiKey.bind(controller))

  // List API keys
  fastify.get('/api-keys', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'List all API keys',
      description: 'Get a list of all active API keys for the authenticated user',
      response: {
        200: ListApiKeysResponseSchema,
        401: ApiKeyErrorResponseSchema
      }
    }
  }, controller.listApiKeys.bind(controller))

  // Get API key details
  fastify.get('/api-keys/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Get API key details',
      description: 'Get detailed information about a specific API key including usage statistics',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: GetApiKeyResponseSchema,
        401: ApiKeyErrorResponseSchema,
        404: ApiKeyErrorResponseSchema
      }
    }
  }, controller.getApiKey.bind(controller))

  // Revoke API key
  fastify.delete('/api-keys/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Revoke an API key',
      description: 'Permanently revoke an API key. This action cannot be undone.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: RevokeApiKeyRequestSchema,
      response: {
        200: ApiKeySuccessResponseSchema,
        401: ApiKeyErrorResponseSchema,
        404: ApiKeyErrorResponseSchema
      }
    }
  }, controller.revokeApiKey.bind(controller))

  // Regenerate API key
  fastify.post('/api-keys/:id/regenerate', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Regenerate an API key',
      description: 'Revoke the existing API key and create a new one with the same settings',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          description: 'API key regenerated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: ApiKeyResponseSchema,
            message: { type: 'string' }
          }
        },
        401: ApiKeyErrorResponseSchema,
        404: ApiKeyErrorResponseSchema
      }
    }
  }, controller.regenerateApiKey.bind(controller))

  // Test API key endpoint
  fastify.get('/api-keys/test/validate', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Test API key',
      description: 'Test if the provided API key is valid. Must be called with X-API-Key header.',
      headers: {
        type: 'object',
        properties: {
          'x-api-key': { type: 'string', description: 'API key to validate' }
        }
      },
      response: {
        200: {
          description: 'API key validation result',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                apiKeyId: { type: 'string' },
                name: { type: 'string' },
                permissions: { type: 'object' },
                rateLimit: { type: 'number' },
                expiresAt: { type: 'string', format: 'date-time', nullable: true },
                lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                usageCount: { type: 'number' }
              }
            }
          }
        },
        400: ApiKeyErrorResponseSchema,
        401: ApiKeyErrorResponseSchema
      }
    }
  }, controller.testApiKey.bind(controller))
}