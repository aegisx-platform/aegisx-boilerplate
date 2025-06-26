/**
 * HTTP Client Factory
 * Creates pre-configured HTTP clients for different use cases
 */

import { HttpClientService } from './http-client.service'
import { HttpClientConfig, IHttpClient } from '../types/http-client.types'
import { RetryStrategies, RetryConditions } from '../utils/retry'

export class HttpClientFactory {
  private static defaultConfig: HttpClientConfig = {
    timeout: 30000,
    retry: RetryStrategies.STANDARD,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 10000
    },
    cache: {
      enabled: false,
      defaultTtl: 300000 // 5 minutes
    },
    logging: {
      requests: true,
      responses: true,
      errors: true,
      performance: true
    }
  }

  /**
   * Create a standard HTTP client with default configuration
   */
  static create(config: Partial<HttpClientConfig> = {}): IHttpClient {
    const mergedConfig = {
      ...this.defaultConfig,
      ...config,
      retry: { ...this.defaultConfig.retry, ...config.retry },
      circuitBreaker: { ...this.defaultConfig.circuitBreaker, ...config.circuitBreaker },
      cache: { ...this.defaultConfig.cache, ...config.cache },
      logging: { ...this.defaultConfig.logging, ...config.logging }
    }

    return new HttpClientService(mergedConfig)
  }

  /**
   * Create HTTP client for external API integration
   */
  static createForExternalAPI(config: {
    baseURL: string
    apiKey?: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 15000,
      auth: config.apiKey ? {
        type: 'api-key',
        apiKey: config.apiKey
      } : undefined,
      retry: RetryStrategies.AGGRESSIVE,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        monitoringPeriod: 5000
      },
      cache: {
        enabled: true,
        defaultTtl: 600000 // 10 minutes
      }
    })
  }

  /**
   * Create HTTP client for microservice communication
   */
  static createForMicroservice(config: {
    baseURL: string
    serviceName: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'X-Service-Name': config.serviceName,
        'X-Client': 'AegisX-HttpClient'
      },
      retry: {
        ...RetryStrategies.STANDARD,
        retryCondition: RetryConditions.NETWORK_AND_STATUS([502, 503, 504])
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 45000,
        monitoringPeriod: 8000
      }
    })
  }

  /**
   * Create HTTP client for real-time operations (fast fail)
   */
  static createForRealTime(config: {
    baseURL: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 3000,
      retry: RetryStrategies.QUICK,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 15000,
        monitoringPeriod: 3000
      },
      cache: {
        enabled: false
      }
    })
  }

  /**
   * Create HTTP client for background/batch operations
   */
  static createForBackground(config: {
    baseURL: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 120000, // 2 minutes
      retry: {
        attempts: 5,
        delay: 2000,
        backoff: 'exponential',
        jitter: true,
        retryCondition: RetryConditions.ALWAYS
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 300000, // 5 minutes
        monitoringPeriod: 30000
      }
    })
  }

  /**
   * Create HTTP client for payment/financial operations
   */
  static createForPayment(config: {
    baseURL: string
    apiKey: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      auth: {
        type: 'api-key',
        apiKey: config.apiKey
      },
      retry: {
        attempts: 2, // Conservative retry for financial operations
        delay: 1000,
        backoff: 'fixed',
        jitter: false,
        retryCondition: RetryConditions.NETWORK_ONLY // Only retry network errors
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 120000, // 2 minutes
        monitoringPeriod: 10000
      },
      cache: {
        enabled: false, // Never cache payment operations
        defaultTtl: 0
      },
      logging: {
        requests: true,
        responses: false, // Don't log payment responses
        errors: true,
        performance: true
      }
    })
  }

  /**
   * Create HTTP client for healthcare/HIPAA operations
   */
  static createForHealthcare(config: {
    baseURL: string
    bearerToken?: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 20000,
      auth: config.bearerToken ? {
        type: 'bearer',
        token: config.bearerToken
      } : undefined,
      headers: {
        'X-HIPAA-Compliant': 'true',
        'X-Healthcare-Client': 'AegisX'
      },
      retry: RetryStrategies.STANDARD,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 4,
        successThreshold: 3,
        timeout: 60000,
        monitoringPeriod: 10000
      },
      cache: {
        enabled: true,
        defaultTtl: 300000 // 5 minutes for non-sensitive data
      }
    })
  }

  /**
   * Create HTTP client for development/testing
   */
  static createForDevelopment(config: {
    baseURL: string
    timeout?: number
  }): IHttpClient {
    return this.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      retry: RetryStrategies.CONSERVATIVE,
      circuitBreaker: {
        enabled: false, // Disable circuit breaker in development
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringPeriod: 10000
      },
      cache: {
        enabled: false,
        defaultTtl: 300000
      },
      logging: {
        requests: true,
        responses: true,
        errors: true,
        performance: true
      }
    })
  }

  /**
   * Create HTTP client with custom retry strategy
   */
  static createWithRetryStrategy(
    config: Partial<HttpClientConfig>,
    retryStrategy: keyof typeof RetryStrategies
  ): IHttpClient {
    return this.create({
      ...config,
      retry: RetryStrategies[retryStrategy]
    })
  }

  /**
   * Create HTTP client with authentication
   */
  static createWithAuth(
    config: Partial<HttpClientConfig>,
    auth: {
      type: 'bearer' | 'api-key' | 'basic'
      token?: string
      apiKey?: string
      username?: string
      password?: string
    }
  ): IHttpClient {
    return this.create({
      ...config,
      auth
    })
  }

  /**
   * Update default configuration for all future clients
   */
  static setDefaultConfig(config: Partial<HttpClientConfig>): void {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...config,
      retry: config.retry ? { ...this.defaultConfig.retry, ...config.retry } : this.defaultConfig.retry,
      circuitBreaker: config.circuitBreaker ? { ...this.defaultConfig.circuitBreaker, ...config.circuitBreaker } : this.defaultConfig.circuitBreaker,
      cache: config.cache ? { ...this.defaultConfig.cache, ...config.cache } : this.defaultConfig.cache,
      logging: config.logging ? { ...this.defaultConfig.logging, ...config.logging } : this.defaultConfig.logging
    }
  }

  /**
   * Get current default configuration
   */
  static getDefaultConfig(): HttpClientConfig {
    return { ...this.defaultConfig }
  }
}

/**
 * Pre-configured HTTP client instances for common use cases
 */
export const HttpClients = {
  /**
   * Standard HTTP client for general purpose
   */
  standard: HttpClientFactory.create(),

  /**
   * Fast HTTP client for real-time operations
   */
  realTime: HttpClientFactory.createForRealTime({ baseURL: '' }),

  /**
   * Robust HTTP client for background operations
   */
  background: HttpClientFactory.createForBackground({ baseURL: '' })
}

/**
 * Environment-specific HTTP client configurations
 */
export const EnvironmentConfigs = {
  development: {
    timeout: 10000,
    retry: RetryStrategies.CONSERVATIVE,
    circuitBreaker: { 
      enabled: false,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 10000
    },
    logging: { requests: true, responses: true, errors: true, performance: true }
  },

  testing: {
    timeout: 5000,
    retry: RetryStrategies.NONE,
    circuitBreaker: { 
      enabled: false,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 10000
    },
    cache: { enabled: false, defaultTtl: 300000 },
    logging: { requests: false, responses: false, errors: true, performance: false }
  },

  staging: {
    timeout: 20000,
    retry: RetryStrategies.STANDARD,
    circuitBreaker: { 
      enabled: true,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 10000
    },
    logging: { requests: true, responses: true, errors: true, performance: true }
  },

  production: {
    timeout: 30000,
    retry: RetryStrategies.AGGRESSIVE,
    circuitBreaker: { 
      enabled: true,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 10000
    },
    cache: { enabled: true, defaultTtl: 300000 },
    logging: { requests: false, responses: false, errors: true, performance: true }
  }
}