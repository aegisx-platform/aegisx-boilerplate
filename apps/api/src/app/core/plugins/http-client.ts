/**
 * HTTP Client Fastify Plugin
 * Registers HTTP client service and provides global access
 */

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { HttpClientFactory, EnvironmentConfigs } from '../shared/services/http-client.factory'
import { HttpClientService } from '../shared/services/http-client.service'
import { IHttpClient, HttpClientConfig } from '../shared/types/http-client.types'

// Declare module to extend Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    httpClient: IHttpClient
    createHttpClient: typeof HttpClientFactory.create
    httpClientFactory: typeof HttpClientFactory
  }
}

interface HttpClientPluginOptions {
  /**
   * Default HTTP client configuration
   */
  config?: Partial<HttpClientConfig>

  /**
   * Pre-configured clients for different use cases
   */
  clients?: {
    [name: string]: {
      config: Partial<HttpClientConfig>
      factory?: keyof typeof HttpClientFactory | ((config: any) => IHttpClient)
    }
  }

  /**
   * Environment-specific configuration
   */
  environment?: 'development' | 'testing' | 'staging' | 'production'

  /**
   * Enable health check endpoint for HTTP clients
   */
  enableHealthCheck?: boolean

  /**
   * Enable metrics endpoint for HTTP client statistics
   */
  enableMetrics?: boolean

  /**
   * Global request/response interceptors
   */
  interceptors?: {
    request?: Array<(config: any) => any>
    response?: Array<(response: any) => any>
    error?: Array<(error: any) => void>
  }
}

const httpClientPlugin: FastifyPluginAsync<HttpClientPluginOptions> = async (
  fastify,
  options
) => {
  const {
    config = {},
    clients = {},
    environment = process.env.NODE_ENV as any || 'development',
    enableHealthCheck = true,
    enableMetrics = true,
    interceptors = {}
  } = options

  // Apply environment-specific configuration
  const envConfig = EnvironmentConfigs[environment as keyof typeof EnvironmentConfigs] || EnvironmentConfigs.development
  const mergedConfig = { ...envConfig, ...config }

  // Set default configuration for factory
  HttpClientFactory.setDefaultConfig(mergedConfig)

  // Create default HTTP client
  const defaultClient = HttpClientFactory.create(mergedConfig)

  // Add global interceptors
  if (interceptors.request) {
    interceptors.request.forEach(interceptor => {
      defaultClient.addRequestInterceptor(interceptor)
    })
  }

  if (interceptors.response) {
    interceptors.response.forEach(interceptor => {
      defaultClient.addResponseInterceptor(interceptor)
    })
  }

  if (interceptors.error) {
    interceptors.error.forEach(interceptor => {
      defaultClient.addErrorInterceptor(interceptor)
    })
  }

  // Decorate Fastify instance
  fastify.decorate('httpClient', defaultClient)
  fastify.decorate('createHttpClient', HttpClientFactory.create)
  fastify.decorate('httpClientFactory', HttpClientFactory)

  // Create named clients
  const namedClients: { [name: string]: IHttpClient } = {}
  
  for (const [name, clientConfig] of Object.entries(clients)) {
    let client: IHttpClient

    if (typeof clientConfig.factory === 'string') {
      // Use predefined factory method
      const factoryMethod = HttpClientFactory[clientConfig.factory as keyof typeof HttpClientFactory] as any
      if (typeof factoryMethod === 'function') {
        client = factoryMethod(clientConfig.config)
      } else {
        client = HttpClientFactory.create(clientConfig.config)
      }
    } else if (typeof clientConfig.factory === 'function') {
      // Use custom factory function
      client = clientConfig.factory(clientConfig.config)
    } else {
      // Use default factory
      client = HttpClientFactory.create(clientConfig.config)
    }

    namedClients[name] = client
    
    // Decorate with named client
    fastify.decorate(`${name}HttpClient`, client)
  }

  // Add health check endpoint
  if (enableHealthCheck) {
    fastify.get('/health/http-clients', async (request, reply) => {
      const healthStatus: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        clients: {}
      }

      // Check default client
      const defaultStats = defaultClient.getStats()
      healthStatus.clients.default = {
        healthy: defaultStats.totalFailures === 0 || 
                 (defaultStats.totalRequests > 0 && defaultStats.totalFailures / defaultStats.totalRequests < 0.1),
        stats: defaultStats,
        circuitBreakers: defaultStats.circuitBreakerStats
      }

      // Check named clients
      for (const [name, client] of Object.entries(namedClients)) {
        const stats = client.getStats()
        healthStatus.clients[name] = {
          healthy: stats.totalFailures === 0 || 
                   (stats.totalRequests > 0 && stats.totalFailures / stats.totalRequests < 0.1),
          stats,
          circuitBreakers: stats.circuitBreakerStats
        }
      }

      // Determine overall health
      const allHealthy = Object.values(healthStatus.clients).every((client: any) => client.healthy)
      healthStatus.status = allHealthy ? 'healthy' : 'unhealthy'

      reply.code(allHealthy ? 200 : 503).send(healthStatus)
    })
  }

  // Add metrics endpoint
  if (enableMetrics) {
    fastify.get('/metrics/http-clients', async (request, reply) => {
      const metrics: any = {
        timestamp: new Date().toISOString(),
        clients: {}
      }

      // Default client metrics
      metrics.clients.default = defaultClient.getStats()

      // Named client metrics
      for (const [name, client] of Object.entries(namedClients)) {
        metrics.clients[name] = client.getStats()
      }

      // Aggregate metrics
      metrics.aggregate = {
        totalRequests: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.totalRequests, 0),
        totalSuccesses: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.totalSuccesses, 0),
        totalFailures: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.totalFailures, 0),
        totalRetries: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.totalRetries, 0),
        averageResponseTime: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.averageResponseTime, 0) / Object.keys(metrics.clients).length,
        averageCacheHitRate: Object.values(metrics.clients).reduce((sum: number, client: any) => sum + client.cacheHitRate, 0) / Object.keys(metrics.clients).length
      }

      reply.send(metrics)
    })
  }

  // Add circuit breaker control endpoints
  fastify.post('/admin/http-clients/circuit-breaker/reset', async (request, reply) => {
    const { client, url } = request.body as { client?: string; url?: string }

    if (client && namedClients[client]) {
      namedClients[client].resetCircuitBreaker(url)
    } else {
      defaultClient.resetCircuitBreaker(url)
    }

    reply.send({ message: 'Circuit breaker reset successfully' })
  })

  // Add cache control endpoints
  fastify.delete('/admin/http-clients/cache', async (request, reply) => {
    const { client, tags } = request.body as { client?: string; tags?: string[] }

    if (client && namedClients[client]) {
      await namedClients[client].clearCache(tags)
    } else {
      await defaultClient.clearCache(tags)
    }

    reply.send({ message: 'Cache cleared successfully' })
  })

  // Log successful registration
  fastify.log.info({
    plugin: 'http-client',
    environment,
    defaultConfig: mergedConfig,
    namedClients: Object.keys(clients),
    healthCheck: enableHealthCheck,
    metrics: enableMetrics
  }, 'HTTP Client plugin registered successfully')
}

export default fp(httpClientPlugin, {
  name: 'http-client',
  dependencies: []
})

// Export commonly used factory methods for convenience
export {
  HttpClientFactory,
  HttpClientService,
  EnvironmentConfigs
}

// Export types
export * from '../shared/types/http-client.types'
export * from '../shared/utils/circuit-breaker'
export * from '../shared/utils/retry'