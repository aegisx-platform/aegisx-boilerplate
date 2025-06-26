/**
 * Retry Mechanism with Exponential Backoff and Jitter
 * Provides robust retry strategies for HTTP requests
 */

import { RetryConfig } from '../types/http-client.types'

interface RetryOptions extends RetryConfig {
  name?: string
  maxDelay?: number // Maximum delay cap
  onRetry?: (error: any, attemptNumber: number) => void
}

export class RetryManager {
  private readonly config: Required<RetryOptions>

  constructor(config: RetryOptions) {
    this.config = {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential',
      jitter: true,
      maxDelay: 30000,
      name: 'unknown',
      retryCondition: this.defaultRetryCondition,
      onRetry: () => {},
      ...config
    }

    this.validateConfig()
  }

  private validateConfig(): void {
    if (this.config.attempts <= 0) {
      throw new Error('Retry attempts must be greater than 0')
    }
    if (this.config.delay < 0) {
      throw new Error('Retry delay must be non-negative')
    }
    if (this.config.maxDelay && this.config.maxDelay < this.config.delay) {
      throw new Error('Max delay must be greater than or equal to base delay')
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any
    let attempt = 0

    while (attempt <= this.config.attempts) {
      try {
        const result = await fn()
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          console.log(`[${this.config.name}] Retry succeeded on attempt ${attempt + 1}`)
        }
        
        return result
      } catch (error) {
        lastError = error
        attempt++

        // Check if we should retry this error
        if (!this.config.retryCondition(error)) {
          throw error
        }

        // Check if we've exhausted all attempts
        if (attempt > this.config.attempts) {
          break
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt)
        
        // Call retry callback
        this.config.onRetry(error, attempt)
        
        console.log(`[${this.config.name}] Retrying in ${delay}ms (attempt ${attempt}/${this.config.attempts})`)
        
        // Wait before retrying
        await this.sleep(delay)
      }
    }

    // All retries exhausted, throw the last error
    throw lastError
  }

  private calculateDelay(attemptNumber: number): number {
    let delay: number

    switch (this.config.backoff) {
      case 'linear':
        delay = this.config.delay * attemptNumber
        break
      case 'exponential':
        delay = this.config.delay * Math.pow(2, attemptNumber - 1)
        break
      case 'fixed':
      default:
        delay = this.config.delay
        break
    }

    // Apply jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = this.addJitter(delay)
    }

    // Apply maximum delay cap
    if (this.config.maxDelay) {
      delay = Math.min(delay, this.config.maxDelay)
    }

    return Math.floor(delay)
  }

  private addJitter(delay: number): number {
    // Add random jitter up to ±25% of the delay
    const jitterRange = delay * 0.25
    const jitter = (Math.random() * 2 - 1) * jitterRange
    return delay + jitter
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private defaultRetryCondition(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx status codes
    if (!error.status) {
      // Network error or timeout
      return true
    }

    // Retry on server errors (5xx) but not client errors (4xx)
    return error.status >= 500 && error.status < 600
  }

  public getConfig(): Required<RetryOptions> {
    return { ...this.config }
  }
}

/**
 * Predefined retry strategies for common scenarios
 */
export const RetryStrategies = {
  /**
   * Aggressive retry for critical operations
   */
  AGGRESSIVE: {
    attempts: 5,
    delay: 500,
    backoff: 'exponential' as const,
    jitter: true,
    maxDelay: 15000
  },

  /**
   * Standard retry for most HTTP operations
   */
  STANDARD: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
    jitter: true,
    maxDelay: 10000
  },

  /**
   * Conservative retry for less critical operations
   */
  CONSERVATIVE: {
    attempts: 2,
    delay: 2000,
    backoff: 'linear' as const,
    jitter: false,
    maxDelay: 8000
  },

  /**
   * No retry - fail fast
   */
  NONE: {
    attempts: 0,
    delay: 0,
    backoff: 'fixed' as const,
    jitter: false
  },

  /**
   * Quick retry for real-time operations
   */
  QUICK: {
    attempts: 2,
    delay: 200,
    backoff: 'fixed' as const,
    jitter: true,
    maxDelay: 1000
  }
}

/**
 * Custom retry conditions for specific scenarios
 */
export const RetryConditions = {
  /**
   * Retry on any error
   */
  ALWAYS: () => true,

  /**
   * Never retry
   */
  NEVER: () => false,

  /**
   * Retry only on network errors and timeouts
   */
  NETWORK_ONLY: (error: any) => !error.status,

  /**
   * Retry on 5xx server errors only
   */
  SERVER_ERROR_ONLY: (error: any) => error.status >= 500 && error.status < 600,

  /**
   * Retry on specific status codes
   */
  STATUS_CODES: (codes: number[]) => (error: any) => codes.includes(error.status),

  /**
   * Retry on network errors and specific status codes
   */
  NETWORK_AND_STATUS: (codes: number[]) => (error: any) => {
    if (!error.status) return true // Network error
    return codes.includes(error.status)
  },

  /**
   * Retry on idempotent operations (GET, PUT, DELETE)
   */
  IDEMPOTENT_ONLY: (method: string) => (error: any) => {
    const idempotentMethods = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
    return idempotentMethods.includes(method.toUpperCase())
  }
}

/**
 * Utility function to create a retry manager with predefined strategy
 */
export function createRetryManager(
  strategy: keyof typeof RetryStrategies | RetryOptions,
  overrides?: Partial<RetryOptions>
): RetryManager {
  const config = typeof strategy === 'string' 
    ? { ...RetryStrategies[strategy], ...overrides }
    : { ...strategy, ...overrides }

  return new RetryManager(config)
}

/**
 * Decorator for automatic retry functionality
 */
export function withRetry<T extends any[], R>(
  config: RetryOptions
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const originalMethod = descriptor.value!
    const retryManager = new RetryManager({ ...config, name: `${target.constructor.name}.${propertyKey}` })

    descriptor.value = async function (...args: T): Promise<R> {
      return retryManager.execute(() => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

/**
 * Simple retry function for one-off operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryOptions
): Promise<T> {
  const retryManager = new RetryManager(config)
  return retryManager.execute(fn)
}