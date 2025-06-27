/**
 * Circuit Breaker Types
 * 
 * Comprehensive types for circuit breaker pattern implementation
 * to prevent cascade failures and provide fault tolerance
 */

// Core interfaces
export interface ICircuitBreaker {
  // Execution
  execute<T>(operation: () => Promise<T>, context?: CircuitBreakerContext): Promise<T>
  executeSync<T>(operation: () => T, context?: CircuitBreakerContext): T
  
  // State management
  getState(): CircuitBreakerState
  getStats(): CircuitBreakerStats
  getHealth(): CircuitBreakerHealth
  
  // Control operations
  reset(): void
  forceOpen(): void
  forceClose(): void
  
  // Configuration
  updateConfig(config: Partial<CircuitBreakerConfig>): void
  
  // Lifecycle
  start(): void
  stop(): void
  
  // Events
  on(event: CircuitBreakerEvent, listener: CircuitBreakerEventListener): void
  off(event: CircuitBreakerEvent, listener: CircuitBreakerEventListener): void
}

export interface ICircuitBreakerManager {
  // Circuit breaker management
  create(name: string, config?: Partial<CircuitBreakerConfig>): ICircuitBreaker
  createFromTemplate(name: string, templateName: keyof typeof CircuitBreakerTemplates, overrides?: Partial<CircuitBreakerConfig>): ICircuitBreaker
  get(name: string): ICircuitBreaker | null
  remove(name: string): boolean
  list(): string[]
  
  // Global operations
  getGlobalStats(): GlobalCircuitBreakerStats
  getGlobalHealth(): GlobalCircuitBreakerHealth
  resetAll(): void
  
  // Bulk operations
  executeWithBreaker<T>(
    breakerName: string, 
    operation: () => Promise<T>,
    context?: CircuitBreakerContext
  ): Promise<T>
  
  // Lifecycle
  initialize(): Promise<void>
  shutdown(): Promise<void>
}

// Configuration types
export interface CircuitBreakerConfig {
  // Failure detection
  failureThreshold: number        // Number of failures before opening
  successThreshold: number        // Number of successes to close from half-open
  timeout: number                 // Timeout for half-open state (ms)
  
  // Timing
  resetTimeout: number            // Time before attempting to close (ms)
  monitoringPeriod: number        // Window for failure counting (ms)
  
  // Advanced settings
  volumeThreshold: number         // Minimum number of calls before circuit can trip
  errorPercentageThreshold: number // Percentage of errors to trip circuit
  slowCallDurationThreshold: number // Duration considered as slow call (ms)
  slowCallRateThreshold: number   // Percentage of slow calls to trip circuit
  
  // Exponential backoff
  exponentialBackoff: boolean     // Enable exponential backoff
  maxResetTimeout: number         // Maximum reset timeout (ms)
  backoffMultiplier: number       // Multiplier for exponential backoff
  
  // Error filtering
  errorFilter?: (error: any) => boolean // Function to filter which errors count
  ignoreErrors?: string[]         // Error types/codes to ignore
  recordErrors?: string[]         // Error types/codes to specifically record
  
  // Performance monitoring
  enableMetrics: boolean          // Enable performance metrics
  metricsWindowSize: number       // Number of recent calls to track
  metricsInterval?: number        // Metrics collection interval (ms)
  
  // Healthcare specific
  healthcare?: {
    patientSafetyMode: boolean    // Extra safety for patient data operations
    emergencyBypass: boolean      // Allow bypass in emergency situations
    auditFailures: boolean        // Audit all circuit breaker failures
  }
}

// State and status types
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'FORCED_OPEN' | 'FORCED_CLOSED'

export interface CircuitBreakerStats {
  name: string
  state: CircuitBreakerState
  
  // Call statistics
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  slowCalls: number
  
  // Percentages
  failureRate: number             // Percentage of failed calls
  slowCallRate: number            // Percentage of slow calls
  successRate: number             // Percentage of successful calls
  
  // Timing statistics
  averageResponseTime: number     // Average response time (ms)
  lastFailureTime?: Date          // Time of last failure
  lastSuccessTime?: Date          // Time of last success
  stateChangedAt: Date            // When state last changed
  
  // Current window
  windowStats: {
    calls: number
    failures: number
    successes: number
    slowCalls: number
    startTime: Date
  }
  
  // Circuit breaker specific
  consecutiveFailures: number     // Current consecutive failures
  consecutiveSuccesses: number    // Current consecutive successes
  timeSinceLastFailure: number    // Time since last failure (ms)
  nextRetryTime?: Date            // When next retry is allowed
}

export interface CircuitBreakerHealth {
  name: string
  state: CircuitBreakerState
  isHealthy: boolean
  healthScore: number             // 0-100 health score
  
  // Health indicators
  indicators: {
    failureRate: HealthIndicator
    responseTime: HealthIndicator
    availability: HealthIndicator
    errorRate: HealthIndicator
  }
  
  // Status information
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  lastHealthCheck: Date
  uptime: number                  // Uptime in milliseconds
  
  // Issues and warnings
  issues?: string[]
  warnings?: string[]
  recommendations?: string[]
}

export interface HealthIndicator {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  value: number
  threshold: number
  message?: string
}

// Context and execution types
export interface CircuitBreakerContext {
  operationName?: string          // Name of the operation being executed
  timeout?: number                // Override default timeout
  metadata?: Record<string, any>  // Additional context data
  userId?: string                 // User context for auditing
  requestId?: string              // Request correlation ID
  priority?: 'low' | 'normal' | 'high' | 'critical'
  
  // Healthcare specific
  patientId?: string              // Patient context
  facilityId?: string             // Facility context
  isEmergency?: boolean           // Emergency operation flag
}

export interface CircuitBreakerResult<T> {
  success: boolean
  result?: T
  error?: CircuitBreakerError
  executionTime: number
  circuitBreakerState: CircuitBreakerState
  fromCache?: boolean             // If result came from cache/fallback
  metadata?: Record<string, any>
}

// Error types
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public code: CircuitBreakerErrorCode,
    public breakerName?: string,
    public state?: CircuitBreakerState,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

export type CircuitBreakerErrorCode = 
  | 'CIRCUIT_OPEN'
  | 'OPERATION_TIMEOUT'
  | 'OPERATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONFIGURATION_ERROR'
  | 'BREAKER_NOT_FOUND'
  | 'EMERGENCY_STOP'

// Event types
export type CircuitBreakerEvent =
  | 'state-changed'
  | 'call-succeeded'
  | 'call-failed'
  | 'call-timeout'
  | 'circuit-opened'
  | 'circuit-closed'
  | 'circuit-half-opened'
  | 'threshold-exceeded'
  | 'reset-timeout-reached'
  | 'emergency-bypass'

export type CircuitBreakerEventListener = (event: CircuitBreakerEventData) => void

export interface CircuitBreakerEventData {
  type: CircuitBreakerEvent
  breakerName: string
  timestamp: Date
  state: CircuitBreakerState
  stats: CircuitBreakerStats
  context?: CircuitBreakerContext
  error?: Error
  duration?: number
  metadata?: Record<string, any>
}

// Global management types
export interface GlobalCircuitBreakerStats {
  totalBreakers: number
  breakersByState: Record<CircuitBreakerState, number>
  globalStats: {
    totalCalls: number
    successfulCalls: number
    failedCalls: number
    averageResponseTime: number
  }
  topFailingBreakers: Array<{
    name: string
    failureRate: number
    state: CircuitBreakerState
  }>
  lastUpdated: Date
}

export interface GlobalCircuitBreakerHealth {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  healthScore: number
  totalBreakers: number
  healthyBreakers: number
  unhealthyBreakers: number
  breakerHealth: Record<string, CircuitBreakerHealth>
  systemStatus: {
    cascadeFailureRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    recommendedActions: string[]
  }
  lastHealthCheck: Date
}

// Factory and manager configuration
export interface CircuitBreakerManagerConfig {
  // Default settings
  defaultConfig: CircuitBreakerConfig
  
  // Global settings
  maxBreakers: number             // Maximum number of circuit breakers
  globalTimeout: number           // Global operation timeout
  enableGlobalMetrics: boolean    // Enable global metrics collection
  
  // Monitoring
  healthCheckInterval: number     // Health check interval (ms)
  metricsInterval: number         // Metrics collection interval (ms)
  cleanupInterval: number         // Cleanup interval for old data (ms)
  
  // Storage
  persistMetrics: boolean         // Persist metrics to storage
  metricsRetention: number        // Metrics retention period (ms)
  
  // Healthcare specific
  healthcare?: {
    enableAuditTrail: boolean     // Enable audit trail for all operations
    emergencyBypassCode?: string  // Emergency bypass code
    patientSafetyChecks: boolean  // Enable patient safety checks
    facilityIsolation: boolean    // Isolate failures by facility
  }
}

// Predefined configurations
export const DefaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  resetTimeout: 60000,
  monitoringPeriod: 300000,       // 5 minutes
  volumeThreshold: 10,
  errorPercentageThreshold: 50,
  slowCallDurationThreshold: 5000,
  slowCallRateThreshold: 30,
  exponentialBackoff: true,
  maxResetTimeout: 300000,        // 5 minutes
  backoffMultiplier: 2,
  enableMetrics: true,
  metricsWindowSize: 100
}

export const HealthcareCircuitBreakerConfig: CircuitBreakerConfig = {
  ...DefaultCircuitBreakerConfig,
  failureThreshold: 3,            // More sensitive for healthcare
  successThreshold: 5,            // More conservative recovery
  timeout: 30000,                 // Longer timeout for complex operations
  resetTimeout: 120000,           // Longer reset timeout
  volumeThreshold: 5,             // Lower volume threshold
  errorPercentageThreshold: 30,   // Lower error tolerance
  healthcare: {
    patientSafetyMode: true,
    emergencyBypass: true,
    auditFailures: true
  }
}

export const ProductionCircuitBreakerConfig: CircuitBreakerConfig = {
  ...DefaultCircuitBreakerConfig,
  failureThreshold: 10,
  successThreshold: 5,
  timeout: 15000,
  resetTimeout: 300000,           // 5 minutes
  monitoringPeriod: 600000,       // 10 minutes
  volumeThreshold: 20,
  errorPercentageThreshold: 40,
  slowCallDurationThreshold: 10000,
  enableMetrics: true,
  metricsWindowSize: 200
}

// Utility types for common operations
export interface CircuitBreakerMetrics {
  name: string
  timestamp: Date
  state: CircuitBreakerState
  callsInWindow: number
  failuresInWindow: number
  successesInWindow: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
}

export interface CircuitBreakerSnapshot {
  name: string
  config: CircuitBreakerConfig
  stats: CircuitBreakerStats
  health: CircuitBreakerHealth
  metrics: CircuitBreakerMetrics[]
  createdAt: Date
  lastActivity: Date
}

// Healthcare-specific types
export interface PatientSafetyContext {
  patientId: string
  facilityId: string
  operationType: 'read' | 'write' | 'critical'
  isEmergency: boolean
  requiredApprovals?: string[]
  safetyChecks?: string[]
}

export interface HealthcareBreakerAudit {
  breakerName: string
  operationType: string
  patientId?: string
  facilityId?: string
  userId: string
  timestamp: Date
  action: 'EXECUTED' | 'FAILED' | 'BYPASSED' | 'BLOCKED'
  reason?: string
  metadata?: Record<string, any>
}

// Advanced features
export interface CircuitBreakerBulkOperation {
  breakerNames: string[]
  operation: 'reset' | 'force-open' | 'force-close' | 'update-config'
  config?: Partial<CircuitBreakerConfig>
  reason?: string
}

export interface CircuitBreakerTemplate {
  name: string
  description: string
  config: CircuitBreakerConfig
  useCase: string
  tags: string[]
}

// Built-in templates for common use cases
export const CircuitBreakerTemplates: Record<string, CircuitBreakerTemplate> = {
  DATABASE: {
    name: 'Database Operations',
    description: 'Circuit breaker for database operations',
    config: {
      ...DefaultCircuitBreakerConfig,
      timeout: 30000,
      slowCallDurationThreshold: 5000,
      resetTimeout: 120000
    },
    useCase: 'Database connections and queries',
    tags: ['database', 'infrastructure']
  },
  
  API_CALL: {
    name: 'External API Calls',
    description: 'Circuit breaker for external API calls',
    config: {
      ...DefaultCircuitBreakerConfig,
      timeout: 15000,
      failureThreshold: 3,
      resetTimeout: 60000
    },
    useCase: 'External service integrations',
    tags: ['api', 'external', 'integration']
  },
  
  HEALTHCARE_CRITICAL: {
    name: 'Healthcare Critical Operations',
    description: 'Circuit breaker for patient-critical operations',
    config: HealthcareCircuitBreakerConfig,
    useCase: 'Patient data and critical healthcare operations',
    tags: ['healthcare', 'critical', 'patient-safety']
  },
  
  PAYMENT: {
    name: 'Payment Processing',
    description: 'Circuit breaker for payment operations',
    config: {
      ...DefaultCircuitBreakerConfig,
      failureThreshold: 2,
      successThreshold: 5,
      timeout: 60000,
      resetTimeout: 300000
    },
    useCase: 'Payment processing and financial operations',
    tags: ['payment', 'financial', 'critical']
  },
  
  NOTIFICATION: {
    name: 'Notification Services',
    description: 'Circuit breaker for notification services',
    config: {
      ...DefaultCircuitBreakerConfig,
      failureThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
      errorPercentageThreshold: 60
    },
    useCase: 'Email, SMS, and push notifications',
    tags: ['notification', 'communication']
  }
}