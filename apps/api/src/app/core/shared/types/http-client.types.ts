/**
 * HTTP Client Service Types
 * Comprehensive types for enterprise-grade HTTP client
 */

export interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  circuitBreaker?: boolean
  cache?: boolean | CacheOptions
  headers?: Record<string, string>
  params?: Record<string, any>
  transformRequest?: (data: any) => any
  transformResponse?: (data: any) => any
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  key?: string // Custom cache key
  tags?: string[] // Cache tags for invalidation
}

export interface RetryConfig {
  attempts: number
  delay?: number // Base delay in milliseconds
  backoff?: 'linear' | 'exponential' | 'fixed'
  jitter?: boolean // Add randomness to delay
  retryCondition?: (error: any) => boolean
  onRetry?: (error: any, attemptNumber: number) => void
}

export interface CircuitBreakerConfig {
  enabled: boolean
  failureThreshold: number // Number of failures before opening circuit
  successThreshold: number // Number of successes to close circuit
  timeout: number // Time in milliseconds before attempting to close circuit
  monitoringPeriod: number // Time window for monitoring failures
}

export interface HttpClientConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  retry?: RetryConfig
  circuitBreaker?: CircuitBreakerConfig
  cache?: {
    enabled: boolean
    defaultTtl: number
  }
  logging?: {
    requests: boolean
    responses: boolean
    errors: boolean
    performance: boolean
  }
  auth?: {
    type: 'bearer' | 'api-key' | 'basic'
    token?: string
    apiKey?: string
    username?: string
    password?: string
  }
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  duration: number // Request duration in milliseconds
  cached?: boolean
  retryAttempts?: number
  circuitBreakerState?: 'closed' | 'open' | 'half-open'
}

export interface RequestMetadata {
  requestId: string
  correlationId?: string
  startTime: number
  endTime?: number
  duration?: number
  url: string
  method: string
  retryAttempts: number
  cached: boolean
  circuitBreakerState: string
}

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>
}

export interface ResponseInterceptor {
  (response: ApiResponse): ApiResponse | Promise<ApiResponse>
}

export interface ErrorInterceptor {
  (error: HttpClientError): void | Promise<void>
}

export interface RequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  data?: any
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
  metadata?: RequestMetadata
}

export class HttpClientError extends Error {
  public readonly status?: number
  public readonly statusText?: string
  public readonly response?: any
  public readonly config?: RequestConfig
  public readonly duration?: number
  public readonly retryAttempts?: number

  constructor(
    message: string,
    status?: number,
    statusText?: string,
    response?: any,
    config?: RequestConfig,
    duration?: number,
    retryAttempts?: number
  ) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.statusText = statusText
    this.response = response
    this.config = config
    this.duration = duration
    this.retryAttempts = retryAttempts
  }
}

export class NetworkError extends HttpClientError {
  constructor(message: string, config?: RequestConfig) {
    super(message, undefined, 'Network Error', undefined, config)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends HttpClientError {
  constructor(timeout: number, config?: RequestConfig) {
    super(`Request timeout after ${timeout}ms`, 408, 'Request Timeout', undefined, config)
    this.name = 'TimeoutError'
  }
}

export class AuthenticationError extends HttpClientError {
  constructor(message: string = 'Authentication failed', config?: RequestConfig) {
    super(message, 401, 'Unauthorized', undefined, config)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends HttpClientError {
  constructor(message: string = 'Access forbidden', config?: RequestConfig) {
    super(message, 403, 'Forbidden', undefined, config)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends HttpClientError {
  constructor(message: string = 'Resource not found', config?: RequestConfig) {
    super(message, 404, 'Not Found', undefined, config)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends HttpClientError {
  public readonly retryAfter?: number

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, config?: RequestConfig) {
    super(message, 429, 'Too Many Requests', undefined, config)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServerError extends HttpClientError {
  constructor(message: string, status: number, statusText: string, response?: any, config?: RequestConfig) {
    super(message, status, statusText, response, config)
    this.name = 'ServerError'
  }
}

export class CircuitBreakerOpenError extends HttpClientError {
  constructor(message: string = 'Circuit breaker is open', config?: RequestConfig) {
    super(message, undefined, 'Circuit Breaker Open', undefined, config)
    this.name = 'CircuitBreakerOpenError'
  }
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailureTime?: number
  nextAttemptTime?: number
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
  averageResponseTime: number
}

export interface HttpClientStats {
  totalRequests: number
  totalSuccesses: number
  totalFailures: number
  totalRetries: number
  averageResponseTime: number
  cacheHitRate: number
  circuitBreakerStats: Record<string, CircuitBreakerStats>
  errorsByType: Record<string, number>
  requestsByEndpoint: Record<string, number>
}

export interface IHttpClient {
  // Core HTTP methods
  get<T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>
  patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>
  delete<T = any>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>
  head(url: string, options?: RequestOptions): Promise<ApiResponse<void>>
  options(url: string, options?: RequestOptions): Promise<ApiResponse<void>>

  // Fluent API for configuration
  withAuth(token: string, type?: 'bearer' | 'api-key'): IHttpClient
  withRetry(config: Partial<RetryConfig>): IHttpClient
  withTimeout(timeout: number): IHttpClient
  withHeaders(headers: Record<string, string>): IHttpClient
  withCircuitBreaker(config?: Partial<CircuitBreakerConfig>): IHttpClient
  withCache(options?: CacheOptions): IHttpClient
  withBaseURL(baseURL: string): IHttpClient

  // Interceptors
  addRequestInterceptor(interceptor: RequestInterceptor): void
  addResponseInterceptor(interceptor: ResponseInterceptor): void
  addErrorInterceptor(interceptor: ErrorInterceptor): void

  // Utility methods
  getStats(): HttpClientStats
  clearCache(tags?: string[]): Promise<void>
  resetCircuitBreaker(url?: string): void
  isHealthy(url?: string): boolean

  // Instance management
  clone(config?: Partial<HttpClientConfig>): IHttpClient
  configure(config: Partial<HttpClientConfig>): void
}