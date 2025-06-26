/**
 * Circuit Breaker Implementation
 * Prevents cascade failures by temporarily stopping requests to failing services
 */

import { CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerStats, CircuitBreakerOpenError } from '../types/http-client.types'

interface CircuitBreakerOptions extends CircuitBreakerConfig {
  name?: string
  onStateChange?: (state: CircuitBreakerState, stats: CircuitBreakerStats) => void
  onFailure?: (error: any) => void
  onSuccess?: () => void
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures = 0
  private successes = 0
  private lastFailureTime?: number
  private nextAttemptTime?: number
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private responseTimes: number[] = []

  constructor(private readonly options: CircuitBreakerOptions) {
    this.validateConfig()
  }

  private validateConfig(): void {
    const { failureThreshold, successThreshold, timeout, monitoringPeriod } = this.options

    if (failureThreshold <= 0) {
      throw new Error('Circuit breaker failure threshold must be greater than 0')
    }
    if (successThreshold <= 0) {
      throw new Error('Circuit breaker success threshold must be greater than 0')
    }
    if (timeout <= 0) {
      throw new Error('Circuit breaker timeout must be greater than 0')
    }
    if (monitoringPeriod <= 0) {
      throw new Error('Circuit breaker monitoring period must be greater than 0')
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()

    // Check if circuit breaker should allow the request
    if (!this.canExecute()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker "${this.options.name || 'unknown'}" is open. Next attempt at ${new Date(this.nextAttemptTime!)}`
      )
    }

    this.totalRequests++

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.onSuccess(duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.onFailure(error, duration)
      throw error
    }
  }

  private canExecute(): boolean {
    const now = Date.now()

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true

      case CircuitBreakerState.OPEN:
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.changeState(CircuitBreakerState.HALF_OPEN)
          return true
        }
        return false

      case CircuitBreakerState.HALF_OPEN:
        return true

      default:
        return false
    }
  }

  private onSuccess(duration: number): void {
    this.successes++
    this.totalSuccesses++
    this.recordResponseTime(duration)

    this.options.onSuccess?.()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successes >= this.options.successThreshold) {
        this.reset()
        this.changeState(CircuitBreakerState.CLOSED)
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure counter on success in closed state
      this.failures = 0
    }
  }

  private onFailure(error: any, duration: number): void {
    this.failures++
    this.totalFailures++
    this.lastFailureTime = Date.now()
    this.recordResponseTime(duration)

    this.options.onFailure?.(error)

    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.failures >= this.options.failureThreshold) {
        this.changeState(CircuitBreakerState.OPEN)
        this.nextAttemptTime = Date.now() + this.options.timeout
      }
    }
  }

  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.state
    this.state = newState

    if (oldState !== newState) {
      this.options.onStateChange?.(newState, this.getStats())
    }
  }

  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration)
    
    // Keep only recent response times for moving average
    const maxSamples = 100
    if (this.responseTimes.length > maxSamples) {
      this.responseTimes = this.responseTimes.slice(-maxSamples)
    }
  }

  private reset(): void {
    this.failures = 0
    this.successes = 0
    this.nextAttemptTime = undefined
  }

  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      averageResponseTime: this.calculateAverageResponseTime()
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  public getState(): CircuitBreakerState {
    return this.state
  }

  public isHealthy(): boolean {
    return this.state === CircuitBreakerState.CLOSED
  }

  public forceOpen(): void {
    this.changeState(CircuitBreakerState.OPEN)
    this.nextAttemptTime = Date.now() + this.options.timeout
  }

  public forceClose(): void {
    this.reset()
    this.changeState(CircuitBreakerState.CLOSED)
  }

  public forceClosed(): void {
    this.forceClose()
  }

  public getName(): string {
    return this.options.name || 'unknown'
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different endpoints
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private defaultConfig: CircuitBreakerConfig

  constructor(defaultConfig: CircuitBreakerConfig) {
    this.defaultConfig = defaultConfig
  }

  getCircuitBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      const circuitBreakerConfig = {
        ...this.defaultConfig,
        ...config,
        name: key
      }
      
      this.circuitBreakers.set(key, new CircuitBreaker(circuitBreakerConfig))
    }

    return this.circuitBreakers.get(key)!
  }

  async execute<T>(key: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(key, config)
    return circuitBreaker.execute(fn)
  }

  getStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    
    for (const [key, circuitBreaker] of this.circuitBreakers) {
      stats[key] = circuitBreaker.getStats()
    }

    return stats
  }

  getHealthyEndpoints(): string[] {
    return Array.from(this.circuitBreakers.entries())
      .filter(([, circuitBreaker]) => circuitBreaker.isHealthy())
      .map(([key]) => key)
  }

  getUnhealthyEndpoints(): string[] {
    return Array.from(this.circuitBreakers.entries())
      .filter(([, circuitBreaker]) => !circuitBreaker.isHealthy())
      .map(([key]) => key)
  }

  reset(key?: string): void {
    if (key) {
      const circuitBreaker = this.circuitBreakers.get(key)
      circuitBreaker?.forceClosed()
    } else {
      // Reset all circuit breakers
      for (const circuitBreaker of this.circuitBreakers.values()) {
        circuitBreaker.forceClosed()
      }
    }
  }

  remove(key: string): boolean {
    return this.circuitBreakers.delete(key)
  }

  clear(): void {
    this.circuitBreakers.clear()
  }

  size(): number {
    return this.circuitBreakers.size
  }

  keys(): string[] {
    return Array.from(this.circuitBreakers.keys())
  }
}