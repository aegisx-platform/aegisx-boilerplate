/**
 * Service Events Types
 * 
 * Centralized event types for all services to use with Event Bus
 */

// Circuit Breaker Events
export interface CircuitBreakerStateChangedEvent {
  breakerName: string
  oldState: string
  newState: string
  timestamp: Date
  reason?: string
  stats?: any
}

export interface CircuitBreakerOperationEvent {
  breakerName: string
  operation: 'execute' | 'reset' | 'force-open' | 'force-close'
  success: boolean
  duration?: number
  error?: string
  timestamp: Date
}

export interface CircuitBreakerThresholdEvent {
  breakerName: string
  thresholdType: 'failure' | 'success' | 'timeout'
  threshold: number
  actual: number
  timestamp: Date
}

// Error Tracker Events
export interface ErrorTrackedEvent {
  errorId: string
  errorName: string
  errorLevel: string
  errorCategory: string
  errorSeverity: string
  timestamp: Date
  context?: {
    userId?: string
    requestId?: string
    patientId?: string
    facilityId?: string
  }
}

export interface ErrorThresholdExceededEvent {
  thresholdType: 'error-rate' | 'critical-errors' | 'new-error-type'
  threshold: number
  actual: number
  errors: Array<{
    id: string
    name: string
    message: string
  }>
  timestamp: Date
}

export interface ErrorReportGeneratedEvent {
  reportId: string
  reportType: string
  title: string
  timeframe: {
    start: Date
    end: Date
  }
  summary: {
    totalErrors: number
    criticalIssues: number
  }
  timestamp: Date
}

// Cache Manager Events
export interface CacheOperationEvent {
  operation: 'get' | 'set' | 'delete' | 'clear'
  key?: string
  layer?: string
  success: boolean
  duration?: number
  timestamp: Date
  metadata?: {
    hitRate?: number
    memoryUsage?: number
    keyCount?: number
  }
}

export interface CacheHealthChangedEvent {
  layer: string
  oldStatus: string
  newStatus: string
  healthScore: number
  issues: string[]
  timestamp: Date
}

export interface CacheLayerFallbackEvent {
  originalLayer: string
  fallbackLayer: string
  key: string
  reason: string
  timestamp: Date
}

// Background Jobs Events
export interface JobStatusChangedEvent {
  jobId: string
  jobType: string
  oldStatus: string
  newStatus: string
  attempt: number
  maxAttempts: number
  error?: string
  timestamp: Date
}

export interface JobQueueEvent {
  queueName: string
  event: 'added' | 'completed' | 'failed' | 'stalled' | 'removed'
  jobId: string
  jobCount: number
  timestamp: Date
}

export interface JobSchedulerEvent {
  schedulerName: string
  event: 'started' | 'stopped' | 'paused' | 'resumed'
  activeJobs: number
  timestamp: Date
}

// HTTP Client Events
export interface HttpRequestEvent {
  method: string
  url: string
  status?: number
  duration?: number
  success: boolean
  retryAttempt?: number
  circuitBreakerState?: string
  error?: string
  timestamp: Date
}

export interface HttpCircuitBreakerEvent {
  url: string
  event: 'opened' | 'closed' | 'half-opened'
  failureCount?: number
  timestamp: Date
}

// Secrets Manager Events
export interface SecretAccessedEvent {
  secretName: string
  userId?: string
  source: string
  success: boolean
  timestamp: Date
}

export interface SecretRotationEvent {
  secretName: string
  rotationType: 'scheduled' | 'manual' | 'emergency'
  success: boolean
  timestamp: Date
}

// Storage Service Events
export interface StorageOperationEvent {
  operation: 'upload' | 'download' | 'delete' | 'copy' | 'move' | 'list' | 'search'
  fileId?: string
  filename?: string
  path?: string
  provider: 'local' | 'minio'
  userId?: string
  success: boolean
  duration?: number
  size?: number
  metadata?: {
    mimeType?: string
    dataClassification?: string
    encrypted?: boolean
    compressed?: boolean
    tags?: string[]
  }
  timestamp: Date
}

export interface StorageHealthChangedEvent {
  provider: 'local' | 'minio'
  oldStatus: string
  newStatus: string
  healthScore: number
  issues: string[]
  recommendations: string[]
  diskUsage?: {
    used: number
    total: number
    percentage: number
  }
  timestamp: Date
}

export interface StorageComplianceEvent {
  eventType: 'hipaa-violation' | 'encryption-required' | 'audit-required'
  fileId: string
  filename?: string
  provider: 'local' | 'minio'
  userId: string
  violationType: string
  dataClassification: string
  requiredAction: string
  timestamp: Date
}

export interface StorageCleanupEvent {
  provider: 'local' | 'minio'
  filesRemoved: number
  bytesFreed: number
  categories: {
    tempFiles: number
    oldFiles: number
    unusedFiles: number
    corruptedFiles: number
  }
  errors: number
  timestamp: Date
}

// Healthcare Compliance Events
export interface HealthcareAuditEvent {
  auditType: 'data-access' | 'system-error' | 'compliance-violation'
  patientId?: string
  facilityId?: string
  userId: string
  action: string
  resource: string
  result: 'success' | 'failure' | 'denied'
  complianceLevel: 'hipaa' | 'gdpr' | 'internal'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface PatientDataEvent {
  patientId: string
  facilityId: string
  dataType: string
  operation: 'create' | 'read' | 'update' | 'delete'
  userId: string
  success: boolean
  auditRequired: boolean
  timestamp: Date
}

// System Health Events
export interface ServiceHealthChangedEvent {
  serviceName: string
  component?: string
  oldStatus: string
  newStatus: string
  healthScore: number
  issues: string[]
  recommendations: string[]
  timestamp: Date
}

export interface SystemMetricsEvent {
  serviceName: string
  metrics: {
    cpu?: number
    memory?: number
    connections?: number
    responseTime?: number
    throughput?: number
    errorRate?: number
  }
  timestamp: Date
}

// Event Type Mapping for Type Safety
export interface ServiceEventMap {
  // Circuit Breaker Events
  'circuit-breaker.state-changed': CircuitBreakerStateChangedEvent
  'circuit-breaker.operation': CircuitBreakerOperationEvent
  'circuit-breaker.threshold-exceeded': CircuitBreakerThresholdEvent
  
  // Error Tracker Events
  'error-tracker.error-tracked': ErrorTrackedEvent
  'error-tracker.threshold-exceeded': ErrorThresholdExceededEvent
  'error-tracker.report-generated': ErrorReportGeneratedEvent
  
  // Cache Manager Events
  'cache-manager.operation': CacheOperationEvent
  'cache-manager.health-changed': CacheHealthChangedEvent
  'cache-manager.layer-fallback': CacheLayerFallbackEvent
  
  // Background Jobs Events
  'background-jobs.status-changed': JobStatusChangedEvent
  'background-jobs.queue-event': JobQueueEvent
  'background-jobs.scheduler-event': JobSchedulerEvent
  
  // HTTP Client Events
  'http-client.request': HttpRequestEvent
  'http-client.circuit-breaker': HttpCircuitBreakerEvent
  
  // Secrets Manager Events
  'secrets-manager.secret-accessed': SecretAccessedEvent
  'secrets-manager.secret-rotated': SecretRotationEvent
  
  // Storage Service Events
  'storage.operation': StorageOperationEvent
  'storage.health-changed': StorageHealthChangedEvent
  'storage.compliance-violation': StorageComplianceEvent
  'storage.cleanup-completed': StorageCleanupEvent
  
  // Healthcare Events
  'healthcare.audit': HealthcareAuditEvent
  'healthcare.patient-data': PatientDataEvent
  
  // System Health Events
  'system.health-changed': ServiceHealthChangedEvent
  'system.metrics': SystemMetricsEvent
}

// Helper Types
export type ServiceEventName = keyof ServiceEventMap
export type ServiceEventData<T extends ServiceEventName> = ServiceEventMap[T]

// Event Publishing Helper Interface
export interface ServiceEventPublisher {
  publishEvent<T extends ServiceEventName>(
    eventName: T,
    data: ServiceEventData<T>,
    options?: {
      delay?: number
      priority?: number
      correlationId?: string
    }
  ): Promise<void>
}

// Event Subscription Helper Interface
export interface ServiceEventSubscriber {
  subscribeToEvent<T extends ServiceEventName>(
    eventName: T,
    handler: (data: ServiceEventData<T>) => Promise<void> | void
  ): Promise<void>
  
  unsubscribeFromEvent<T extends ServiceEventName>(
    eventName: T,
    handler?: (data: ServiceEventData<T>) => Promise<void> | void
  ): Promise<void>
}