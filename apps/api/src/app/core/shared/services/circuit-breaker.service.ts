/**
 * Circuit Breaker Service
 * 
 * Core implementation of the circuit breaker pattern for preventing
 * cascade failures and providing fault tolerance in distributed systems
 */

import { EventBus } from '../events/interfaces/event-bus.interface'
import {
  CircuitBreakerStateChangedEvent,
  CircuitBreakerOperationEvent,
  CircuitBreakerThresholdEvent
} from '../events/types/service-events.types'
import {
  ICircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitBreakerHealth,
  CircuitBreakerContext,
  CircuitBreakerError,
  CircuitBreakerEvent,
  CircuitBreakerEventData,
  CircuitBreakerMetrics,
  HealthIndicator,
  DefaultCircuitBreakerConfig
} from '../types/circuit-breaker.types'

export class CircuitBreakerService implements ICircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private config: CircuitBreakerConfig
  private stats: CircuitBreakerStats
  private callWindow: CallRecord[] = []
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private stateChangedAt: Date = new Date()
  private consecutiveFailures = 0
  private consecutiveSuccesses = 0
  private nextRetryTime?: Date
  private isRunning = false
  private cleanupInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {},
    private eventBus?: EventBus
  ) {
    this.config = {
      ...DefaultCircuitBreakerConfig,
      ...config
    }
    
    this.stats = this.initializeStats()
    this.setupMetricsCollection()
  }

  /**
   * Execute an async operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: CircuitBreakerContext = {}
  ): Promise<T> {
    const startTime = Date.now()
    const callId = this.generateCallId()
    
    try {
      // Check if circuit is open
      if (this.shouldRejectCall()) {
        const error = new CircuitBreakerError(
          `Circuit breaker '${this.name}' is OPEN`,
          'CIRCUIT_OPEN',
          this.name,
          this.state
        )
        this.recordFailure(callId, startTime, error, context)
        throw error
      }

      // Check for emergency bypass
      if (this.shouldBypassForEmergency(context)) {
        this.emitEvent('emergency-bypass', { context })
        return await this.executeWithTimeout(operation, context.timeout || this.config.timeout)
      }

      // Execute operation with timeout
      const result = await this.executeWithTimeout(
        operation, 
        context.timeout || this.config.timeout
      )
      
      this.recordSuccess(callId, startTime, context)
      return result

    } catch (error) {
      this.recordFailure(callId, startTime, error, context)
      throw error
    }
  }

  /**
   * Execute a synchronous operation with circuit breaker protection
   */
  executeSync<T>(
    operation: () => T,
    context: CircuitBreakerContext = {}
  ): T {
    const startTime = Date.now()
    const callId = this.generateCallId()
    
    try {
      // Check if circuit is open
      if (this.shouldRejectCall()) {
        const error = new CircuitBreakerError(
          `Circuit breaker '${this.name}' is OPEN`,
          'CIRCUIT_OPEN',
          this.name,
          this.state
        )
        this.recordFailure(callId, startTime, error, context)
        throw error
      }

      // Check for emergency bypass
      if (this.shouldBypassForEmergency(context)) {
        this.emitEvent('emergency-bypass', { context })
        return operation()
      }

      // Execute operation
      const result = operation()
      
      this.recordSuccess(callId, startTime, context)
      return result

    } catch (error) {
      this.recordFailure(callId, startTime, error, context)
      throw error
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    this.updateWindowStats()
    return { ...this.stats }
  }

  /**
   * Get circuit breaker health information
   */
  getHealth(): CircuitBreakerHealth {
    const currentStats = this.getStats()
    const now = new Date()
    
    // Calculate health indicators
    const failureRateIndicator = this.calculateHealthIndicator(
      'failureRate',
      currentStats.failureRate,
      this.config.errorPercentageThreshold
    )
    
    const responseTimeIndicator = this.calculateHealthIndicator(
      'responseTime',
      currentStats.averageResponseTime,
      this.config.slowCallDurationThreshold
    )
    
    const availabilityIndicator = this.calculateAvailabilityIndicator()
    const errorRateIndicator = failureRateIndicator // Same as failure rate
    
    // Calculate overall health score
    const healthScore = this.calculateHealthScore([
      failureRateIndicator,
      responseTimeIndicator,
      availabilityIndicator,
      errorRateIndicator
    ])
    
    // Determine status
    const status = this.determineHealthStatus(healthScore, currentStats.state)
    
    const health: CircuitBreakerHealth = {
      name: this.name,
      state: currentStats.state,
      isHealthy: healthScore >= 70,
      healthScore,
      indicators: {
        failureRate: failureRateIndicator,
        responseTime: responseTimeIndicator,
        availability: availabilityIndicator,
        errorRate: errorRateIndicator
      },
      status,
      lastHealthCheck: now,
      uptime: now.getTime() - this.stateChangedAt.getTime()
    }
    
    // Add issues and recommendations
    this.addHealthIssuesAndRecommendations(health)
    
    return health
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.setState('CLOSED')
    this.consecutiveFailures = 0
    this.consecutiveSuccesses = 0
    this.nextRetryTime = undefined
    this.clearCallWindow()
    this.emitEvent('circuit-closed', {})
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.setState('FORCED_OPEN')
    this.emitEvent('circuit-opened', {})
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClose(): void {
    this.setState('FORCED_CLOSED')
    this.consecutiveFailures = 0
    this.emitEvent('circuit-closed', {})
  }

  /**
   * Update circuit breaker configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    }
    
    // Validate new configuration
    this.validateConfig()
    
    this.emitEvent('state-changed', {})
  }

  /**
   * Start circuit breaker monitoring
   */
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.setupCleanupInterval()
    
    if (this.config.enableMetrics) {
      this.setupMetricsCollection()
    }
  }

  /**
   * Stop circuit breaker monitoring
   */
  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }
  }

  // Private methods

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerError(
          `Operation timeout after ${timeout}ms`,
          'OPERATION_TIMEOUT',
          this.name,
          this.state
        ))
      }, timeout)

      operation()
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  private shouldRejectCall(): boolean {
    // Never reject forced closed
    if (this.state === 'FORCED_CLOSED') {
      return false
    }
    
    // Always reject forced open
    if (this.state === 'FORCED_OPEN') {
      return true
    }
    
    // Reject if open
    if (this.state === 'OPEN') {
      // Check if we should transition to half-open
      if (this.canTransitionToHalfOpen()) {
        this.setState('HALF_OPEN')
        return false
      }
      return true
    }
    
    // Check if we should open based on failure rate
    if (this.shouldOpenCircuit()) {
      this.setState('OPEN')
      this.setNextRetryTime()
      this.emitEvent('circuit-opened', {})
      return true
    }
    
    return false
  }

  private shouldOpenCircuit(): boolean {
    const windowStats = this.getWindowStats()
    
    // Not enough volume
    if (windowStats.calls < this.config.volumeThreshold) {
      return false
    }
    
    // Check failure percentage
    const failureRate = (windowStats.failures / windowStats.calls) * 100
    if (failureRate >= this.config.errorPercentageThreshold) {
      return true
    }
    
    // Check slow call rate
    const slowCallRate = (windowStats.slowCalls / windowStats.calls) * 100
    if (slowCallRate >= this.config.slowCallRateThreshold) {
      return true
    }
    
    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true
    }
    
    return false
  }

  private canTransitionToHalfOpen(): boolean {
    if (!this.nextRetryTime) {
      return true
    }
    
    return Date.now() >= this.nextRetryTime.getTime()
  }

  private shouldBypassForEmergency(context: CircuitBreakerContext): boolean {
    if (!this.config.healthcare?.emergencyBypass) {
      return false
    }
    
    return context.isEmergency === true
  }

  private recordSuccess(
    callId: string,
    startTime: number,
    context: CircuitBreakerContext
  ): void {
    const duration = Date.now() - startTime
    const isSlowCall = duration >= this.config.slowCallDurationThreshold
    
    const record: CallRecord = {
      id: callId,
      timestamp: new Date(),
      success: true,
      duration,
      isSlowCall,
      context
    }
    
    this.addCallRecord(record)
    this.updateSuccessStats(duration)
    
    // Handle state transitions
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.setState('CLOSED')
        this.consecutiveFailures = 0
        this.emitEvent('circuit-closed', {})
      }
    } else {
      this.consecutiveFailures = 0
    }
    
    this.lastSuccessTime = new Date()
    this.emitEvent('call-succeeded', { context, duration })
  }

  private recordFailure(
    callId: string,
    startTime: number,
    error: any,
    context: CircuitBreakerContext
  ): void {
    const duration = Date.now() - startTime
    
    // Check if this error should be recorded
    if (!this.shouldRecordError(error)) {
      return
    }
    
    const record: CallRecord = {
      id: callId,
      timestamp: new Date(),
      success: false,
      duration,
      error,
      context
    }
    
    this.addCallRecord(record)
    this.updateFailureStats(duration)
    
    this.consecutiveFailures++
    this.consecutiveSuccesses = 0
    this.lastFailureTime = new Date()
    
    this.emitEvent('call-failed', { context, error, duration })
    
    // Audit healthcare failures
    if (this.config.healthcare?.auditFailures) {
      this.auditHealthcareFailure(context, error)
    }
  }

  private shouldRecordError(error: any): boolean {
    // Check ignore list
    if (this.config.ignoreErrors?.length) {
      const errorType = error.constructor.name
      const errorCode = error.code || error.name
      
      if (this.config.ignoreErrors.includes(errorType) || 
          this.config.ignoreErrors.includes(errorCode)) {
        return false
      }
    }
    
    // Check record list (if specified, only record these)
    if (this.config.recordErrors?.length) {
      const errorType = error.constructor.name
      const errorCode = error.code || error.name
      
      return this.config.recordErrors.includes(errorType) || 
             this.config.recordErrors.includes(errorCode)
    }
    
    // Use error filter if provided
    if (this.config.errorFilter) {
      return this.config.errorFilter(error)
    }
    
    return true
  }

  private setState(newState: CircuitBreakerState): void {
    const oldState = this.state
    this.state = newState
    this.stateChangedAt = new Date()
    
    this.emitEvent('state-changed', {
      metadata: { oldState, newState }
    })
  }

  private setNextRetryTime(): void {
    let resetTimeout = this.config.resetTimeout
    
    // Apply exponential backoff if enabled
    if (this.config.exponentialBackoff) {
      const backoffFactor = Math.min(
        this.consecutiveFailures,
        10 // Cap the exponent
      )
      resetTimeout = Math.min(
        resetTimeout * Math.pow(this.config.backoffMultiplier, backoffFactor),
        this.config.maxResetTimeout
      )
    }
    
    this.nextRetryTime = new Date(Date.now() + resetTimeout)
  }

  private addCallRecord(record: CallRecord): void {
    this.callWindow.push(record)
    
    // Remove old records outside monitoring period
    const cutoffTime = Date.now() - this.config.monitoringPeriod
    this.callWindow = this.callWindow.filter(
      call => call.timestamp.getTime() > cutoffTime
    )
    
    // Limit window size for memory management
    if (this.callWindow.length > this.config.metricsWindowSize) {
      this.callWindow = this.callWindow.slice(-this.config.metricsWindowSize)
    }
  }

  private getWindowStats() {
    const now = Date.now()
    const cutoffTime = now - this.config.monitoringPeriod
    
    const windowCalls = this.callWindow.filter(
      call => call.timestamp.getTime() > cutoffTime
    )
    
    return {
      calls: windowCalls.length,
      failures: windowCalls.filter(call => !call.success).length,
      successes: windowCalls.filter(call => call.success).length,
      slowCalls: windowCalls.filter(call => call.isSlowCall).length,
      startTime: new Date(cutoffTime)
    }
  }

  private updateSuccessStats(duration: number): void {
    this.stats.totalCalls++
    this.stats.successfulCalls++
    this.updateResponseTimeStats(duration)
    this.updateRates()
  }

  private updateFailureStats(duration: number): void {
    this.stats.totalCalls++
    this.stats.failedCalls++
    this.updateResponseTimeStats(duration)
    this.updateRates()
  }

  private updateResponseTimeStats(duration: number): void {
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalCalls - 1)
    this.stats.averageResponseTime = (totalResponseTime + duration) / this.stats.totalCalls
    
    if (duration >= this.config.slowCallDurationThreshold) {
      this.stats.slowCalls++
    }
  }

  private updateRates(): void {
    if (this.stats.totalCalls === 0) {
      this.stats.failureRate = 0
      this.stats.successRate = 0
      this.stats.slowCallRate = 0
      return
    }
    
    this.stats.failureRate = (this.stats.failedCalls / this.stats.totalCalls) * 100
    this.stats.successRate = (this.stats.successfulCalls / this.stats.totalCalls) * 100
    this.stats.slowCallRate = (this.stats.slowCalls / this.stats.totalCalls) * 100
  }

  private updateWindowStats(): void {
    const windowStats = this.getWindowStats()
    this.stats.windowStats = windowStats
    this.stats.consecutiveFailures = this.consecutiveFailures
    this.stats.consecutiveSuccesses = this.consecutiveSuccesses
    this.stats.timeSinceLastFailure = this.lastFailureTime 
      ? Date.now() - this.lastFailureTime.getTime() 
      : 0
    this.stats.nextRetryTime = this.nextRetryTime
    this.stats.lastFailureTime = this.lastFailureTime
    this.stats.lastSuccessTime = this.lastSuccessTime
    this.stats.stateChangedAt = this.stateChangedAt
  }

  private calculateHealthIndicator(
    type: string,
    value: number,
    threshold: number
  ): HealthIndicator {
    const ratio = value / threshold
    
    if (ratio <= 0.5) {
      return {
        status: 'HEALTHY',
        value,
        threshold,
        message: `${type} is within healthy range`
      }
    } else if (ratio <= 0.8) {
      return {
        status: 'WARNING',
        value,
        threshold,
        message: `${type} is approaching threshold`
      }
    } else {
      return {
        status: 'CRITICAL',
        value,
        threshold,
        message: `${type} has exceeded threshold`
      }
    }
  }

  private calculateAvailabilityIndicator(): HealthIndicator {
    const availability = this.state === 'CLOSED' || this.state === 'FORCED_CLOSED' ? 100 : 0
    
    return {
      status: availability === 100 ? 'HEALTHY' : 'CRITICAL',
      value: availability,
      threshold: 100,
      message: `Circuit is ${this.state.toLowerCase()}`
    }
  }

  private calculateHealthScore(indicators: HealthIndicator[]): number {
    const scores = indicators.map(indicator => {
      switch (indicator.status) {
        case 'HEALTHY': return 100
        case 'WARNING': return 60
        case 'CRITICAL': return 20
        default: return 0
      }
    })
    
    return scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
  }

  private determineHealthStatus(
    healthScore: number,
    state: CircuitBreakerState
  ): 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN' {
    if (state === 'OPEN' || state === 'FORCED_OPEN') {
      return 'DOWN'
    }
    
    if (healthScore >= 80) {
      return 'UP'
    } else if (healthScore >= 50) {
      return 'DEGRADED'
    } else {
      return 'DOWN'
    }
  }

  private addHealthIssuesAndRecommendations(health: CircuitBreakerHealth): void {
    const issues: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    
    // Check for issues
    if (health.state === 'OPEN') {
      issues.push('Circuit breaker is OPEN - calls are being rejected')
      recommendations.push('Check downstream service health')
      recommendations.push('Consider manual intervention if needed')
    }
    
    if (health.indicators.failureRate.status === 'CRITICAL') {
      issues.push('High failure rate detected')
      recommendations.push('Investigate root cause of failures')
    }
    
    if (health.indicators.responseTime.status === 'CRITICAL') {
      issues.push('Slow response times detected')
      recommendations.push('Check service performance and capacity')
    }
    
    // Check for warnings
    if (health.indicators.failureRate.status === 'WARNING') {
      warnings.push('Failure rate is approaching threshold')
    }
    
    if (health.indicators.responseTime.status === 'WARNING') {
      warnings.push('Response times are slowing down')
    }
    
    if (issues.length > 0) health.issues = issues
    if (warnings.length > 0) health.warnings = warnings
    if (recommendations.length > 0) health.recommendations = recommendations
  }

  private clearCallWindow(): void {
    this.callWindow = []
  }

  private generateCallId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      slowCalls: 0,
      failureRate: 0,
      slowCallRate: 0,
      successRate: 0,
      averageResponseTime: 0,
      stateChangedAt: this.stateChangedAt,
      windowStats: {
        calls: 0,
        failures: 0,
        successes: 0,
        slowCalls: 0,
        startTime: new Date()
      },
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      timeSinceLastFailure: 0
    }
  }

  private setupCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords()
    }, this.config.monitoringPeriod)
  }

  private setupMetricsCollection(): void {
    if (!this.config.enableMetrics) return
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    
    this.metricsInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.metricsInterval || 60000)
  }

  private cleanupOldRecords(): void {
    const cutoffTime = Date.now() - this.config.monitoringPeriod
    this.callWindow = this.callWindow.filter(
      call => call.timestamp.getTime() > cutoffTime
    )
  }

  private collectMetrics(): void {
    const metrics: CircuitBreakerMetrics = {
      name: this.name,
      timestamp: new Date(),
      state: this.state,
      callsInWindow: this.stats.windowStats.calls,
      failuresInWindow: this.stats.windowStats.failures,
      successesInWindow: this.stats.windowStats.successes,
      averageResponseTime: this.stats.averageResponseTime,
      p95ResponseTime: this.calculatePercentile(95),
      p99ResponseTime: this.calculatePercentile(99)
    }
    
    this.emitEvent('threshold-exceeded', { metadata: { metrics } })
  }

  private calculatePercentile(percentile: number): number {
    if (this.callWindow.length === 0) return 0
    
    const durations = this.callWindow
      .map(call => call.duration)
      .sort((a, b) => a - b)
    
    const index = Math.ceil((percentile / 100) * durations.length) - 1
    return durations[Math.max(0, index)] || 0
  }

  private validateConfig(): void {
    if (this.config.failureThreshold <= 0) {
      throw new Error('failureThreshold must be greater than 0')
    }
    
    if (this.config.successThreshold <= 0) {
      throw new Error('successThreshold must be greater than 0')
    }
    
    if (this.config.timeout <= 0) {
      throw new Error('timeout must be greater than 0')
    }
    
    if (this.config.resetTimeout <= 0) {
      throw new Error('resetTimeout must be greater than 0')
    }
  }

  private auditHealthcareFailure(
    context: CircuitBreakerContext,
    error: any
  ): void {
    // Implementation would integrate with audit system
    console.warn(`Healthcare circuit breaker failure: ${this.name}`, {
      patientId: context.patientId,
      facilityId: context.facilityId,
      error: error.message,
      timestamp: new Date()
    })
  }

  private emitEvent(
    type: CircuitBreakerEvent,
    data: Partial<CircuitBreakerEventData>
  ): void {
    if (!this.eventBus) {
      return
    }

    const timestamp = new Date()
    const stats = this.getStats()

    // Fire and forget event publishing to avoid blocking circuit breaker operations
    setImmediate(async () => {
      try {
        switch (type) {
          case 'state-changed':
            await this.eventBus?.publish('circuit-breaker.state-changed', {
              breakerName: this.name,
              oldState: (data as any).oldState || this.state,
              newState: this.state,
              timestamp,
              reason: (data as any).reason,
              stats
            } as CircuitBreakerStateChangedEvent)
            break

          case 'call-succeeded':
          case 'call-failed':
          case 'circuit-opened':
          case 'circuit-closed':
          case 'emergency-bypass':
            await this.eventBus?.publish('circuit-breaker.operation', {
              breakerName: this.name,
              operation: type === 'call-succeeded' ? 'execute' : 
                        type === 'call-failed' ? 'execute' :
                        type === 'circuit-opened' ? 'force-open' :
                        type === 'circuit-closed' ? 'force-close' : 'reset',
              success: type === 'call-succeeded' || type === 'circuit-closed',
              duration: data.duration,
              error: data.error?.message,
              timestamp
            } as CircuitBreakerOperationEvent)
            break

          case 'threshold-exceeded':
            await this.eventBus?.publish('circuit-breaker.threshold-exceeded', {
              breakerName: this.name,
              thresholdType: 'failure',
              threshold: this.config.failureThreshold,
              actual: this.consecutiveFailures,
              timestamp
            } as CircuitBreakerThresholdEvent)
            break
        }
      } catch (error) {
        // Silently fail event publishing to avoid affecting circuit breaker operation
        console.warn(`Failed to publish circuit breaker event ${type}:`, error)
      }
    })
  }

  /**
   * Event listening not supported - use Event Bus subscriptions instead
   */
  on(event: CircuitBreakerEvent, listener: any): void {
    console.warn('Circuit Breaker event listening not supported. Use Event Bus subscriptions instead.')
  }

  /**
   * Event unsubscribing not supported - use Event Bus unsubscribe instead
   */
  off(event: CircuitBreakerEvent, listener: any): void {
    console.warn('Circuit Breaker event unsubscribing not supported. Use Event Bus unsubscribe instead.')
  }
}

// Internal types
interface CallRecord {
  id: string
  timestamp: Date
  success: boolean
  duration: number
  isSlowCall?: boolean
  error?: any
  context?: CircuitBreakerContext
}