import { EventHandler, EventMetadata } from '../interfaces'

export interface RetryOptions {
  enabled?: boolean
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
  nonRetryableErrors?: string[]
}

export class RetryMiddleware {
  private options: Required<RetryOptions>

  constructor(options: RetryOptions = {}) {
    this.options = {
      enabled: true,
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'],
      nonRetryableErrors: ['ValidationError', 'TypeError', 'SyntaxError'],
      ...options
    }
  }

  wrap(eventName: string, handler: EventHandler): EventHandler {
    if (!this.options.enabled) {
      return handler
    }

    return async (data: any, metadata: EventMetadata) => {
      let lastError: Error | undefined
      let attempt = 0

      while (attempt < this.options.maxAttempts) {
        try {
          // Add retry count to metadata
          const retryMetadata: EventMetadata = {
            ...metadata,
            retryCount: attempt
          }

          const result = await handler(data, retryMetadata)
          
          if (attempt > 0) {
            this.logRetrySuccess(eventName, metadata, attempt)
          }
          
          return result
        } catch (error) {
          lastError = error as Error
          attempt++

          // Check if error is retryable
          if (!this.shouldRetry(error, attempt)) {
            this.logNonRetryableError(eventName, metadata, error, attempt)
            throw error
          }

          // Don't delay on the last attempt
          if (attempt < this.options.maxAttempts) {
            const delay = this.calculateDelay(attempt)
            this.logRetryAttempt(eventName, metadata, error, attempt, delay)
            await this.sleep(delay)
          }
        }
      }

      if (!lastError) {
        lastError = new Error('Retry attempts exhausted with no specific error')
      }

      this.logRetryExhausted(eventName, metadata, lastError, this.options.maxAttempts)
      throw lastError
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= this.options.maxAttempts) {
      return false
    }

    // Check for non-retryable errors
    if (this.options.nonRetryableErrors.some(errorType => 
      error.name === errorType || error.constructor.name === errorType
    )) {
      return false
    }

    // Check for explicitly retryable errors
    if (this.options.retryableErrors.some(errorCode => 
      error.code === errorCode || error.message?.includes(errorCode)
    )) {
      return true
    }

    // Default: retry for network-related errors and timeouts
    return error.code === 'ECONNRESET' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ECONNREFUSED' ||
           error.message?.includes('timeout') ||
           error.message?.includes('connection')
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.options.baseDelay
    const exponentialDelay = baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1)
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
    const delayWithJitter = exponentialDelay + jitter
    
    // Cap at max delay
    return Math.min(delayWithJitter, this.options.maxDelay)
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logRetryAttempt(
    eventName: string, 
    metadata: EventMetadata, 
    error: any, 
    attempt: number, 
    delay: number
  ): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      attempt,
      maxAttempts: this.options.maxAttempts,
      delay: `${delay}ms`,
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    }

    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Event handler failed, retrying',
      component: 'event-bus-retry',
      ...logData
    }))
  }

  private logRetrySuccess(eventName: string, metadata: EventMetadata, attempt: number): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      attempt,
      status: 'success_after_retry'
    }

    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Event handler succeeded after retry',
      component: 'event-bus-retry',
      ...logData
    }))
  }

  private logNonRetryableError(
    eventName: string, 
    metadata: EventMetadata, 
    error: any, 
    attempt: number
  ): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      attempt,
      reason: 'non_retryable_error',
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Event handler failed with non-retryable error',
      component: 'event-bus-retry',
      ...logData
    }))
  }

  private logRetryExhausted(
    eventName: string, 
    metadata: EventMetadata, 
    error: any, 
    maxAttempts: number
  ): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      maxAttempts,
      reason: 'retry_exhausted',
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      }
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Event handler retry attempts exhausted',
      component: 'event-bus-retry',
      ...logData
    }))
  }
}