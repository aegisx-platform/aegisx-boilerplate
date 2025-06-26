/**
 * Secrets Manager Plugin for Fastify
 * 
 * Integrates the Secrets Manager service into Fastify applications
 * with health checks, metrics, and admin endpoints
 */

import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Type, Static } from '@sinclair/typebox'
import {
  ISecretsManager,
  SecretsManagerPluginConfig
} from '../shared/types/secrets-manager.types'
import { SecretsManagerFactory } from '../shared/services/secrets-manager.factory'

// Request schemas
const GetSecretSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 255 }),
  namespace: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
})

const SetSecretSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 255 }),
  value: Type.String(),
  namespace: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  ttl: Type.Optional(Type.Number({ minimum: 1000 })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
})

const DeleteSecretSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 255 }),
  namespace: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
})

const ClearCacheSchema = Type.Object({
  tags: Type.Optional(Type.Array(Type.String()))
})

type GetSecretRequest = Static<typeof GetSecretSchema>
type SetSecretRequest = Static<typeof SetSecretSchema>
type DeleteSecretRequest = Static<typeof DeleteSecretSchema>
type ClearCacheRequest = Static<typeof ClearCacheSchema>

// Extend Fastify instance to include secrets manager
declare module 'fastify' {
  interface FastifyInstance {
    secretsManager: ISecretsManager
  }
}

async function secretsManagerPlugin(
  fastify: FastifyInstance,
  options: Partial<SecretsManagerPluginConfig> = {}
) {
  // Default configuration
  const config: SecretsManagerPluginConfig = {
    adapter: 'environment',
    enableHealthCheck: true,
    enableMetrics: true,
    enableAdminRoutes: false,
    adminRoutePrefix: '/admin/secrets',
    adapters: {
      environment: {
        prefix: fastify.config?.SECRETS_ENV_PREFIX || 'SECRET_',
        transformKeys: true,
        allowOverwrite: fastify.config?.NODE_ENV !== 'production'
      }
    },
    cache: {
      enabled: fastify.config?.SECRETS_CACHE_ENABLED === 'true',
      ttl: parseInt(fastify.config?.SECRETS_CACHE_TTL || '300000'),
      maxSize: parseInt(fastify.config?.SECRETS_CACHE_MAX_SIZE || '1000'),
      refreshThreshold: 0.8
    },
    security: {
      maskLogging: true,
      auditAccess: fastify.config?.SECRETS_AUDIT_ACCESS === 'true',
      requireNamespace: fastify.config?.SECRETS_REQUIRE_NAMESPACE === 'true'
    },
    ...options
  } as SecretsManagerPluginConfig

  // Create secrets manager
  const secretsManager = await SecretsManagerFactory.create(config, {
    knex: fastify.knex,
    encryptionKey: fastify.config?.SECRETS_ENCRYPTION_KEY
  })

  // Register secrets manager with Fastify
  fastify.decorate('secretsManager', secretsManager)

  // Register health check endpoint
  if (config.enableHealthCheck) {
    fastify.get('/health/secrets-manager', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await secretsManager.healthCheck()
        
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503
        
        return reply.code(statusCode).send(health)
      } catch (error) {
        fastify.log.error('Secrets manager health check failed:', error)
        return reply.code(503).send({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })
      }
    })
  }

  // Register metrics endpoint
  if (config.enableMetrics) {
    fastify.get('/metrics/secrets-manager', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await secretsManager.getStats()
        return reply.send(stats)
      } catch (error) {
        fastify.log.error('Failed to get secrets manager stats:', error)
        return reply.code(500).send({
          error: 'Failed to retrieve metrics',
          timestamp: new Date()
        })
      }
    })
  }

  // Register admin routes if enabled
  if (config.enableAdminRoutes) {
    const adminPrefix = config.adminRoutePrefix || '/admin/secrets'

    // Get secret (admin only)
    fastify.get(`${adminPrefix}/get`, {
      schema: {
        querystring: GetSecretSchema,
        response: {
          200: Type.Object({
            value: Type.Union([Type.String(), Type.Null()]),
            found: Type.Boolean(),
            cached: Type.Optional(Type.Boolean())
          }),
          404: Type.Object({
            error: Type.String(),
            code: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Querystring: GetSecretRequest }>, reply: FastifyReply) => {
      try {
        const { key, namespace } = request.query
        const value = await secretsManager.get(key, namespace)
        
        if (value === null) {
          return reply.code(404).send({
            error: 'Secret not found',
            code: 'SECRET_NOT_FOUND'
          })
        }
        
        return reply.send({
          value,
          found: true
        })
      } catch (error) {
        fastify.log.error('Failed to get secret:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })

    // Set secret (admin only)
    fastify.post(`${adminPrefix}/set`, {
      schema: {
        body: SetSecretSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: SetSecretRequest }>, reply: FastifyReply) => {
      try {
        const { key, value, namespace, ttl, metadata } = request.body
        
        await secretsManager.set(key, value, namespace, { ttl, metadata })
        
        return reply.send({
          success: true,
          message: 'Secret set successfully'
        })
      } catch (error) {
        fastify.log.error('Failed to set secret:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })

    // Delete secret (admin only)
    fastify.delete(`${adminPrefix}/delete`, {
      schema: {
        body: DeleteSecretSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            deleted: Type.Boolean(),
            message: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: DeleteSecretRequest }>, reply: FastifyReply) => {
      try {
        const { key, namespace } = request.body
        const deleted = await secretsManager.delete(key, namespace)
        
        return reply.send({
          success: true,
          deleted,
          message: deleted ? 'Secret deleted successfully' : 'Secret not found'
        })
      } catch (error) {
        fastify.log.error('Failed to delete secret:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })

    // List namespaces (admin only)
    fastify.get(`${adminPrefix}/namespaces`, {
      schema: {
        response: {
          200: Type.Object({
            namespaces: Type.Array(Type.String())
          })
        }
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const namespaces = await secretsManager.listNamespaces()
        return reply.send({ namespaces })
      } catch (error) {
        fastify.log.error('Failed to list namespaces:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })

    // Clear cache (admin only)
    fastify.post(`${adminPrefix}/cache/clear`, {
      schema: {
        body: Type.Optional(ClearCacheSchema),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body?: ClearCacheRequest }>, reply: FastifyReply) => {
      try {
        const tags = request.body?.tags
        await secretsManager.clearCache(tags)
        
        return reply.send({
          success: true,
          message: tags ? `Cache cleared for tags: ${tags.join(', ')}` : 'All cache cleared'
        })
      } catch (error) {
        fastify.log.error('Failed to clear cache:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })

    // Rotate secret (admin only)
    fastify.post(`${adminPrefix}/rotate`, {
      schema: {
        body: Type.Object({
          key: Type.String({ minLength: 1, maxLength: 255 }),
          newValue: Type.String(),
          namespace: Type.Optional(Type.String({ minLength: 1, maxLength: 100 }))
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: { key: string; newValue: string; namespace?: string } }>, reply: FastifyReply) => {
      try {
        const { key, newValue, namespace } = request.body
        await secretsManager.rotate(key, newValue, namespace)
        
        return reply.send({
          success: true,
          message: 'Secret rotated successfully'
        })
      } catch (error) {
        fastify.log.error('Failed to rotate secret:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'OPERATION_FAILED'
        })
      }
    })
  }

  // Helper methods for easier access
  fastify.decorate('getSecret', async (key: string, namespace?: string) => {
    return secretsManager.get(key, namespace)
  })

  fastify.decorate('setSecret', async (key: string, value: string, namespace?: string, options?: any) => {
    return secretsManager.set(key, value, namespace, options)
  })

  fastify.decorate('secretExists', async (key: string, namespace?: string) => {
    return secretsManager.exists(key, namespace)
  })

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await secretsManager.shutdown()
  })

  fastify.log.info('✅ Secrets Manager plugin loaded successfully')
}


export default fp(secretsManagerPlugin, {
  name: 'secrets-manager',
  dependencies: ['env-plugin']
})

// Extend Fastify instance type for helper methods
declare module 'fastify' {
  interface FastifyInstance {
    getSecret(key: string, namespace?: string): Promise<string | null>
    setSecret(key: string, value: string, namespace?: string, options?: any): Promise<void>
    secretExists(key: string, namespace?: string): Promise<boolean>
  }
}