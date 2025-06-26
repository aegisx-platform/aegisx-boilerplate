/**
 * Enterprise-grade HTTP Client Service
 * Provides robust HTTP communication with retry, circuit breaker, caching, and monitoring
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import {
  IHttpClient,
  HttpClientConfig,
  RequestOptions,
  ApiResponse,
  RequestMetadata,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  HttpClientStats,
  HttpClientError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  CircuitBreakerOpenError,
  CacheOptions
} from '../types/http-client.types'
import { CircuitBreakerManager } from '../utils/circuit-breaker'
import { createRetryManager } from '../utils/retry'

export class HttpClientService implements IHttpClient {
  private readonly axios: AxiosInstance
  private readonly circuitBreakerManager: CircuitBreakerManager
  private readonly cache = new Map<string, { data: any; expires: number; tags: string[] }>()
  private readonly stats: HttpClientStats = {
    totalRequests: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalRetries: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    circuitBreakerStats: {},
    errorsByType: {},
    requestsByEndpoint: {}
  }
  private readonly responseTimes: number[] = []
  private readonly requestInterceptors: RequestInterceptor[] = []
  private readonly responseInterceptors: ResponseInterceptor[] = []
  private readonly errorInterceptors: ErrorInterceptor[] = []

  constructor(private config: HttpClientConfig = {}) {
    this.axios = this.createAxiosInstance()
    this.circuitBreakerManager = new CircuitBreakerManager(
      config.circuitBreaker || {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringPeriod: 10000
      }
    )

    this.setupAxiosInterceptors()
  }

  private createAxiosInstance(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AegisX-HttpClient/1.0',
        ...this.config.headers
      }
    }

    if (this.config.auth) {
      switch (this.config.auth.type) {
        case 'bearer':
          axiosConfig.headers!['Authorization'] = `Bearer ${this.config.auth.token}`
          break
        case 'api-key':
          axiosConfig.headers!['X-API-Key'] = this.config.auth.apiKey
          break
        case 'basic':
          const credentials = Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64')
          axiosConfig.headers!['Authorization'] = `Basic ${credentials}`
          break
      }
    }

    return axios.create(axiosConfig)
  }

  private setupAxiosInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        const metadata: RequestMetadata = {
          requestId: uuidv4(),
          correlationId: config.headers['x-correlation-id'] as string,
          startTime: Date.now(),
          url: config.url || '',
          method: config.method?.toUpperCase() || 'GET',
          retryAttempts: 0,
          cached: false,
          circuitBreakerState: 'closed'
        }

        ;(config as any).metadata = metadata

        if (this.config.logging?.requests) {
          console.log(`[HTTP] ${metadata.method} ${metadata.url}`, {
            requestId: metadata.requestId,
            correlationId: metadata.correlationId,
            headers: config.headers,
            data: config.data
          })
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        const metadata = (response.config as any).metadata as RequestMetadata
        metadata.endTime = Date.now()
        metadata.duration = metadata.endTime - metadata.startTime

        this.updateStats('success', metadata.duration)
        this.recordResponseTime(metadata.duration)

        if (this.config.logging?.responses) {
          console.log(`[HTTP] ${response.status} ${metadata.method} ${metadata.url}`, {
            requestId: metadata.requestId,
            duration: metadata.duration,
            status: response.status,
            cached: metadata.cached
          })
        }

        return response
      },
      (error) => {
        const metadata = error.config?.metadata as RequestMetadata
        if (metadata) {
          metadata.endTime = Date.now()
          metadata.duration = metadata.endTime - metadata.startTime
          this.recordResponseTime(metadata.duration)
        }

        this.updateStats('failure', metadata?.duration || 0)

        if (this.config.logging?.errors) {
          console.error(`[HTTP] Error ${metadata?.method} ${metadata?.url}`, {
            requestId: metadata?.requestId,
            error: error.message,
            status: error.response?.status,
            duration: metadata?.duration
          })
        }

        return Promise.reject(this.transformAxiosError(error))
      }
    )
  }

  private transformAxiosError(error: any): HttpClientError {
    const config = error.config
    const response = error.response
    const metadata = config?.metadata as RequestMetadata

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new TimeoutError(config?.timeout || 30000, config)
    }

    if (!response) {
      return new NetworkError(error.message, config)
    }

    const { status, statusText, data } = response

    switch (status) {
      case 401:
        return new AuthenticationError(data?.message || 'Authentication failed', config)
      case 403:
        return new AuthorizationError(data?.message || 'Access forbidden', config)
      case 404:
        return new NotFoundError(data?.message || 'Resource not found', config)
      case 429:
        const retryAfter = response.headers['retry-after']
        return new RateLimitError(
          data?.message || 'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) * 1000 : undefined,
          config
        )
      default:
        if (status >= 500) {
          return new ServerError(
            data?.message || 'Internal server error',
            status,
            statusText,
            data,
            config
          )
        }
        return new HttpClientError(
          data?.message || error.message,
          status,
          statusText,
          data,
          config,
          metadata?.duration,
          metadata?.retryAttempts
        )
    }
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    this.stats.totalRequests++

    // Check cache first
    if (method === 'GET' && (options.cache || this.config.cache?.enabled)) {
      const cached = this.getCachedResponse<T>(url, typeof options.cache === 'object' ? options.cache : undefined)
      if (cached) {
        this.stats.cacheHitRate = (this.stats.cacheHitRate * (this.stats.totalRequests - 1) + 1) / this.stats.totalRequests
        return cached
      }
    }

    // Create retry manager
    const retryConfig = {
      attempts: this.config.retry?.attempts || 0,
      delay: this.config.retry?.delay || 1000,
      backoff: this.config.retry?.backoff || 'exponential',
      jitter: this.config.retry?.jitter,
      retryCondition: this.config.retry?.retryCondition,
      onRetry: this.config.retry?.onRetry
    }
    const retryManager = createRetryManager(retryConfig)

    // Circuit breaker key
    const circuitBreakerKey = this.getCircuitBreakerKey(url)

    try {
      const response = await this.executeWithCircuitBreaker(
        circuitBreakerKey,
        () => retryManager.execute(() => this.executeRequest<T>(method, url, data, options))
      )

      // Cache response if applicable
      if (method === 'GET' && (options.cache || this.config.cache?.enabled)) {
        this.setCachedResponse(url, response, typeof options.cache === 'object' ? options.cache : undefined)
      }

      return response
    } catch (error) {
      this.updateErrorStats(error)
      throw error
    }
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const axiosConfig: AxiosRequestConfig = {
      method: method as any,
      url,
      data,
      timeout: options.timeout || this.config.timeout,
      headers: {
        ...this.axios.defaults.headers.common,
        ...options.headers
      },
      params: options.params
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      await interceptor(axiosConfig as any)
    }

    const response: AxiosResponse<T> = await this.axios.request(axiosConfig)
    const metadata = (response.config as any).metadata as RequestMetadata

    const apiResponse: ApiResponse<T> = {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      duration: metadata.duration || 0,
      cached: false,
      retryAttempts: metadata.retryAttempts,
      circuitBreakerState: metadata.circuitBreakerState as any
    }

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      await interceptor(apiResponse)
    }

    return apiResponse
  }

  private async executeWithCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.circuitBreaker?.enabled) {
      return fn()
    }

    try {
      return await this.circuitBreakerManager.execute(key, fn)
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        this.updateErrorStats(error)
        throw error
      }
      throw error
    }
  }

  private getCircuitBreakerKey(url: string): string {
    try {
      const urlObj = new URL(url, this.config.baseURL)
      return `${urlObj.hostname}:${urlObj.port || 80}`
    } catch {
      return url
    }
  }

  private getCachedResponse<T>(url: string, cacheOptions?: CacheOptions): ApiResponse<T> | null {
    const key = cacheOptions?.key || url
    const cached = this.cache.get(key)

    if (!cached || Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }

    return {
      ...cached.data,
      cached: true
    }
  }

  private setCachedResponse(url: string, response: ApiResponse<any>, cacheOptions?: CacheOptions): void {
    const key = cacheOptions?.key || url
    const ttl = cacheOptions?.ttl || this.config.cache?.defaultTtl || 300000 // 5 minutes default
    const tags = cacheOptions?.tags || []

    this.cache.set(key, {
      data: response,
      expires: Date.now() + ttl,
      tags
    })
  }

  private updateStats(type: 'success' | 'failure', duration: number): void {
    if (type === 'success') {
      this.stats.totalSuccesses++
    } else {
      this.stats.totalFailures++
    }
  }

  private updateErrorStats(error: any): void {
    const errorType = error.constructor.name
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1

    // Apply error interceptors
    for (const interceptor of this.errorInterceptors) {
      interceptor(error)
    }
  }

  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration)
    
    // Keep only recent response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.splice(0, 500)
    }

    // Update average response time
    this.stats.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  // Public API methods
  async get<T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, options)
  }

  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, options)
  }

  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, options)
  }

  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, options)
  }

  async delete<T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, options)
  }

  async head(url: string, options?: RequestOptions): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('HEAD', url, undefined, options)
  }

  async options(url: string, options?: RequestOptions): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('OPTIONS', url, undefined, options)
  }

  // Fluent API methods
  withAuth(token: string, type: 'bearer' | 'api-key' = 'bearer'): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.auth = { type, token }
    return new HttpClientService(newConfig)
  }

  withRetry(config: Partial<import('../types/http-client.types').RetryConfig>): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.retry = { 
      attempts: config.attempts ?? this.config.retry?.attempts ?? 3,
      delay: config.delay ?? this.config.retry?.delay ?? 1000,
      backoff: config.backoff ?? this.config.retry?.backoff ?? 'exponential',
      jitter: config.jitter ?? this.config.retry?.jitter,
      retryCondition: config.retryCondition ?? this.config.retry?.retryCondition,
      onRetry: config.onRetry ?? this.config.retry?.onRetry
    }
    return new HttpClientService(newConfig)
  }

  withTimeout(timeout: number): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.timeout = timeout
    return new HttpClientService(newConfig)
  }

  withHeaders(headers: Record<string, string>): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.headers = { ...this.config.headers, ...headers }
    return new HttpClientService(newConfig)
  }

  withCircuitBreaker(config?: Partial<import('../types/http-client.types').CircuitBreakerConfig>): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.circuitBreaker = {
      enabled: config?.enabled ?? this.config.circuitBreaker?.enabled ?? true,
      failureThreshold: config?.failureThreshold ?? this.config.circuitBreaker?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? this.config.circuitBreaker?.successThreshold ?? 3,
      timeout: config?.timeout ?? this.config.circuitBreaker?.timeout ?? 60000,
      monitoringPeriod: config?.monitoringPeriod ?? this.config.circuitBreaker?.monitoringPeriod ?? 10000
    }
    return new HttpClientService(newConfig)
  }

  withCache(options?: CacheOptions): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.cache = { enabled: true, defaultTtl: options?.ttl || 300000 }
    return new HttpClientService(newConfig)
  }

  withBaseURL(baseURL: string): IHttpClient {
    const newConfig = { ...this.config }
    newConfig.baseURL = baseURL
    return new HttpClientService(newConfig)
  }

  // Interceptor methods
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  // Utility methods
  getStats(): HttpClientStats {
    return {
      ...this.stats,
      circuitBreakerStats: this.circuitBreakerManager.getStats()
    }
  }

  async clearCache(tags?: string[]): Promise<void> {
    if (!tags) {
      this.cache.clear()
      return
    }

    for (const [key, value] of this.cache.entries()) {
      const hasMatchingTag = tags.some(tag => value.tags.includes(tag))
      if (hasMatchingTag) {
        this.cache.delete(key)
      }
    }
  }

  resetCircuitBreaker(url?: string): void {
    if (url) {
      const key = this.getCircuitBreakerKey(url)
      this.circuitBreakerManager.reset(key)
    } else {
      this.circuitBreakerManager.reset()
    }
  }

  isHealthy(url?: string): boolean {
    if (!url) {
      return this.circuitBreakerManager.getHealthyEndpoints().length > 0
    }
    
    const key = this.getCircuitBreakerKey(url)
    const healthyEndpoints = this.circuitBreakerManager.getHealthyEndpoints()
    return healthyEndpoints.includes(key)
  }

  clone(config?: Partial<HttpClientConfig>): IHttpClient {
    return new HttpClientService({ ...this.config, ...config })
  }

  configure(config: Partial<HttpClientConfig>): void {
    Object.assign(this.config, config)
  }
}