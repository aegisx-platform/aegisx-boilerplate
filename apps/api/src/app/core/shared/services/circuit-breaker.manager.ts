/**
 * Circuit Breaker Manager
 * 
 * Central manager for multiple circuit breakers with global monitoring,
 * health checks, and bulk operations
 */

import { EventEmitter } from 'events'
import {
  ICircuitBreaker,
  ICircuitBreakerManager,
  CircuitBreakerConfig,
  CircuitBreakerContext,
  CircuitBreakerManagerConfig,
  GlobalCircuitBreakerStats,
  GlobalCircuitBreakerHealth,
  CircuitBreakerError,
  CircuitBreakerState,
  CircuitBreakerBulkOperation,
  CircuitBreakerTemplates,
  DefaultCircuitBreakerConfig
} from '../types/circuit-breaker.types'
import { CircuitBreakerService } from './circuit-breaker.service'

export class CircuitBreakerManager extends EventEmitter implements ICircuitBreakerManager {
  private breakers: Map<string, ICircuitBreaker> = new Map()
  private config: CircuitBreakerManagerConfig
  private isInitialized = false
  private healthCheckInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout

  constructor(config: Partial<CircuitBreakerManagerConfig> = {}) {
    super()
    
    this.config = {
      defaultConfig: DefaultCircuitBreakerConfig,
      maxBreakers: 100,
      globalTimeout: 60000,
      enableGlobalMetrics: true,
      healthCheckInterval: 30000,
      metricsInterval: 60000,
      cleanupInterval: 300000,
      persistMetrics: false,
      metricsRetention: 86400000,
      ...config
    }
  }

  /**
   * Create a new circuit breaker
   */
  create(name: string, config: Partial<CircuitBreakerConfig> = {}): ICircuitBreaker {
    if (this.breakers.has(name)) {
      throw new CircuitBreakerError(
        `Circuit breaker '${name}' already exists`,
        'CONFIGURATION_ERROR'
      )
    }

    if (this.breakers.size >= this.config.maxBreakers) {
      throw new CircuitBreakerError(
        `Maximum number of circuit breakers (${this.config.maxBreakers}) reached`,
        'CONFIGURATION_ERROR'
      )
    }

    const mergedConfig = {
      ...this.config.defaultConfig,
      ...config
    }

    const breaker = new CircuitBreakerService(name, mergedConfig)
    
    // Forward events from individual breakers
    this.setupBreakerEventForwarding(breaker, name)
    
    this.breakers.set(name, breaker)
    
    // Start the breaker if manager is initialized
    if (this.isInitialized) {
      breaker.start()
    }

    this.emit('breaker-created', { name, config: mergedConfig })
    
    return breaker
  }

  /**
   * Create circuit breaker from template
   */
  createFromTemplate(
    name: string, 
    templateName: keyof typeof CircuitBreakerTemplates,
    overrides: Partial<CircuitBreakerConfig> = {}
  ): ICircuitBreaker {
    const template = CircuitBreakerTemplates[templateName]
    if (!template) {
      throw new CircuitBreakerError(
        `Template '${templateName}' not found`,
        'CONFIGURATION_ERROR'
      )
    }

    const config = {
      ...template.config,
      ...overrides
    }

    return this.create(name, config)
  }

  /**
   * Get an existing circuit breaker
   */
  get(name: string): ICircuitBreaker | null {
    return this.breakers.get(name) || null
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    const breaker = this.breakers.get(name)
    if (!breaker) {
      return false
    }

    breaker.stop()
    this.breakers.delete(name)
    
    this.emit('breaker-removed', { name })
    
    return true
  }

  /**
   * List all circuit breaker names
   */
  list(): string[] {
    return Array.from(this.breakers.keys())
  }

  /**
   * Execute operation with specified circuit breaker
   */
  async executeWithBreaker<T>(
    breakerName: string,
    operation: () => Promise<T>,
    context: CircuitBreakerContext = {}
  ): Promise<T> {
    const breaker = this.breakers.get(breakerName)
    if (!breaker) {
      throw new CircuitBreakerError(
        `Circuit breaker '${breakerName}' not found`,
        'BREAKER_NOT_FOUND'
      )
    }

    return breaker.execute(operation, context)
  }

  /**
   * Get global statistics across all circuit breakers
   */
  getGlobalStats(): GlobalCircuitBreakerStats {
    const breakersByState: Record<CircuitBreakerState, number> = {
      'CLOSED': 0,
      'OPEN': 0,
      'HALF_OPEN': 0,
      'FORCED_OPEN': 0,
      'FORCED_CLOSED': 0
    }

    let totalCalls = 0
    let successfulCalls = 0
    let failedCalls = 0
    let totalResponseTime = 0
    let responseTimeCount = 0

    const failingBreakers: Array<{
      name: string
      failureRate: number
      state: CircuitBreakerState
    }> = []

    for (const [name, breaker] of this.breakers.entries()) {
      const stats = breaker.getStats()
      
      breakersByState[stats.state]++
      totalCalls += stats.totalCalls
      successfulCalls += stats.successfulCalls
      failedCalls += stats.failedCalls
      
      if (stats.totalCalls > 0) {
        totalResponseTime += stats.averageResponseTime
        responseTimeCount++
      }

      if (stats.failureRate > 0) {
        failingBreakers.push({
          name,
          failureRate: stats.failureRate,
          state: stats.state
        })
      }
    }

    // Sort failing breakers by failure rate
    failingBreakers.sort((a, b) => b.failureRate - a.failureRate)

    return {
      totalBreakers: this.breakers.size,
      breakersByState,
      globalStats: {
        totalCalls,
        successfulCalls,
        failedCalls,
        averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
      },
      topFailingBreakers: failingBreakers.slice(0, 10),
      lastUpdated: new Date()
    }
  }

  /**
   * Get global health status
   */
  getGlobalHealth(): GlobalCircuitBreakerHealth {
    const breakerHealth: Record<string, any> = {}
    let totalHealthScore = 0
    let healthyBreakers = 0
    let unhealthyBreakers = 0

    for (const [name, breaker] of this.breakers.entries()) {
      const health = breaker.getHealth()
      breakerHealth[name] = health
      
      totalHealthScore += health.healthScore
      
      if (health.isHealthy) {
        healthyBreakers++
      } else {
        unhealthyBreakers++
      }
    }

    const overallHealthScore = this.breakers.size > 0 
      ? totalHealthScore / this.breakers.size 
      : 100

    // Determine overall health
    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
    if (overallHealthScore >= 80) {
      overallHealth = 'HEALTHY'
    } else if (overallHealthScore >= 50) {
      overallHealth = 'DEGRADED'
    } else {
      overallHealth = 'CRITICAL'
    }

    // Calculate cascade failure risk
    const openBreakers = Array.from(this.breakers.values())
      .filter(b => b.getState() === 'OPEN').length
    
    let cascadeFailureRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    const openRatio = this.breakers.size > 0 ? openBreakers / this.breakers.size : 0
    
    if (openRatio <= 0.1) {
      cascadeFailureRisk = 'LOW'
    } else if (openRatio <= 0.3) {
      cascadeFailureRisk = 'MEDIUM'
    } else {
      cascadeFailureRisk = 'HIGH'
    }

    // Generate recommendations
    const recommendedActions: string[] = []
    if (unhealthyBreakers > 0) {
      recommendedActions.push(`${unhealthyBreakers} circuit breakers need attention`)
    }
    if (cascadeFailureRisk === 'HIGH') {
      recommendedActions.push('High risk of cascade failures detected')
      recommendedActions.push('Consider implementing fallback mechanisms')
    }
    if (overallHealth === 'CRITICAL') {
      recommendedActions.push('System is in critical state - immediate action required')
    }

    return {
      overallHealth,
      healthScore: overallHealthScore,
      totalBreakers: this.breakers.size,
      healthyBreakers,
      unhealthyBreakers,
      breakerHealth,
      systemStatus: {
        cascadeFailureRisk,
        recommendedActions
      },
      lastHealthCheck: new Date()
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
    
    this.emit('all-breakers-reset')
  }

  /**
   * Perform bulk operation on multiple circuit breakers
   */
  bulkOperation(operation: CircuitBreakerBulkOperation): void {
    const targetBreakers = operation.breakerNames.length > 0
      ? operation.breakerNames
      : this.list()

    for (const name of targetBreakers) {
      const breaker = this.breakers.get(name)
      if (!breaker) continue

      switch (operation.operation) {
        case 'reset':
          breaker.reset()
          break
        case 'force-open':
          breaker.forceOpen()
          break
        case 'force-close':
          breaker.forceClose()
          break
        case 'update-config':
          if (operation.config) {
            breaker.updateConfig(operation.config)
          }
          break
      }
    }

    this.emit('bulk-operation-completed', operation)
  }

  /**
   * Initialize the circuit breaker manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Start all existing breakers
    for (const breaker of this.breakers.values()) {
      breaker.start()
    }

    // Start monitoring intervals
    this.startHealthChecks()
    this.startMetricsCollection()
    this.startCleanup()

    this.isInitialized = true
    this.emit('manager-initialized')
  }

  /**
   * Shutdown the circuit breaker manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    // Stop all intervals
    this.stopAllIntervals()

    // Stop all breakers
    for (const breaker of this.breakers.values()) {
      breaker.stop()
    }

    this.isInitialized = false
    this.emit('manager-shutdown')
  }

  // Healthcare-specific methods

  /**
   * Create healthcare-compliant circuit breaker
   */
  createHealthcareBreaker(
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ): ICircuitBreaker {
    const healthcareConfig = {
      ...this.config.defaultConfig,
      failureThreshold: 3,
      successThreshold: 5,
      timeout: 30000,
      resetTimeout: 120000,
      healthcare: {
        patientSafetyMode: true,
        emergencyBypass: true,
        auditFailures: true
      },
      ...config
    }

    return this.create(name, healthcareConfig)
  }

  /**
   * Execute operation with emergency bypass capability
   */
  async executeWithEmergencyBypass<T>(
    breakerName: string,
    operation: () => Promise<T>,
    context: CircuitBreakerContext,
    emergencyCode?: string
  ): Promise<T> {
    const enhancedContext = {
      ...context,
      isEmergency: this.validateEmergencyCode(emergencyCode)
    }

    return this.executeWithBreaker(breakerName, operation, enhancedContext)
  }

  // Private methods

  private setupBreakerEventForwarding(breaker: ICircuitBreaker, name: string): void {
    const events: string[] = [
      'state-changed',
      'call-succeeded',
      'call-failed',
      'call-timeout',
      'circuit-opened',
      'circuit-closed',
      'circuit-half-opened',
      'threshold-exceeded',
      'reset-timeout-reached',
      'emergency-bypass'
    ]

    events.forEach(event => {
      breaker.on(event as any, (data: any) => {
        this.emit(`breaker-${event}`, { breakerName: name, ...data })
      })
    })
  }

  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      const health = this.getGlobalHealth()
      this.emit('global-health-check', health)

      // Alert on critical conditions
      if (health.overallHealth === 'CRITICAL') {
        this.emit('critical-health-alert', health)
      }
    }, this.config.healthCheckInterval)
  }

  private startMetricsCollection(): void {
    if (!this.config.enableGlobalMetrics) return

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    this.metricsInterval = setInterval(() => {
      const stats = this.getGlobalStats()
      this.emit('global-metrics', stats)
    }, this.config.metricsInterval)
  }

  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }

  private stopAllIntervals(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  private performCleanup(): void {
    // Cleanup logic for old metrics, logs, etc.
    // This would integrate with persistent storage if enabled
    this.emit('cleanup-completed', {
      timestamp: new Date(),
      breakersCount: this.breakers.size
    })
  }

  private validateEmergencyCode(code?: string): boolean {
    if (!this.config.healthcare?.emergencyBypassCode) {
      return false
    }

    return code === this.config.healthcare.emergencyBypassCode
  }

  /**
   * Get circuit breaker by name (with error if not found)
   */
  getOrThrow(name: string): ICircuitBreaker {
    const breaker = this.breakers.get(name)
    if (!breaker) {
      throw new CircuitBreakerError(
        `Circuit breaker '${name}' not found`,
        'BREAKER_NOT_FOUND'
      )
    }
    return breaker
  }

  /**
   * Get all circuit breaker names with their states
   */
  listWithStates(): Array<{ name: string; state: CircuitBreakerState }> {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      state: breaker.getState()
    }))
  }

  /**
   * Check if any circuit breakers are in critical state
   */
  hasCriticalBreakers(): boolean {
    for (const breaker of this.breakers.values()) {
      const health = breaker.getHealth()
      if (!health.isHealthy && health.healthScore < 30) {
        return true
      }
    }
    return false
  }

  /**
   * Get circuit breakers by state
   */
  getBreakersByState(state: CircuitBreakerState): string[] {
    return Array.from(this.breakers.entries())
      .filter(([, breaker]) => breaker.getState() === state)
      .map(([name]) => name)
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(config: Partial<CircuitBreakerManagerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    }

    // Restart intervals if they changed
    if (config.healthCheckInterval) {
      this.startHealthChecks()
    }
    if (config.metricsInterval) {
      this.startMetricsCollection()
    }
    if (config.cleanupInterval) {
      this.startCleanup()
    }

    this.emit('global-config-updated', config)
  }
}