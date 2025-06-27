/**
 * Error Tracker Types
 * 
 * Comprehensive types for centralized error handling, tracking,
 * and reporting system with healthcare compliance features
 */

// Core interfaces
export interface IErrorTracker {
  // Error tracking
  track(error: TrackableError, context?: ErrorContext): Promise<string>
  trackSync(error: TrackableError, context?: ErrorContext): string
  
  // Error retrieval
  getError(errorId: string): Promise<TrackedError | null>
  getErrors(filter?: ErrorFilter): Promise<TrackedError[]>
  
  // Error analysis
  getErrorStats(timeframe?: TimeFrame): Promise<ErrorStats>
  getErrorTrends(period?: TimePeriod): Promise<ErrorTrend[]>
  
  // Error reporting
  generateReport(options?: ReportOptions): Promise<ErrorReport>
  
  // Configuration
  configure(config: Partial<ErrorTrackerConfig>): void
  
  // Lifecycle
  start(): Promise<void>
  stop(): Promise<void>
}

export interface IErrorReporter {
  // Report delivery
  sendReport(report: ErrorReport, channels: ReportChannel[]): Promise<void>
  
  // Alert management
  sendAlert(alert: ErrorAlert): Promise<void>
  
  // Integration
  integrateWith(service: ExternalService): void
}

// Configuration types
export interface ErrorTrackerConfig {
  // Basic settings
  enabled: boolean
  environment: string
  serviceName: string
  version: string
  
  // Storage settings
  storage: {
    type: 'memory' | 'database' | 'file' | 'external'
    connectionString?: string
    maxEntries: number
    retention: number              // Retention period in milliseconds
    cleanup: boolean
    compression: boolean
  }
  
  // Tracking settings
  tracking: {
    enableStackTrace: boolean
    enableSourceMap: boolean
    enableContext: boolean
    enableMetrics: boolean
    enableTrends: boolean
  }
  
  // Filtering
  filters: {
    ignorePatterns: string[]       // Regex patterns to ignore
    ignoreTypes: string[]          // Error types to ignore
    ignoreStatuses: number[]       // HTTP status codes to ignore
    minimumLevel: ErrorLevel       // Minimum error level to track
    enableSampling: boolean
    samplingRate: number           // Sampling rate (0-1)
  }
  
  // Aggregation
  aggregation: {
    enabled: boolean
    windowSize: number             // Time window for aggregation (ms)
    maxDuplicates: number          // Max duplicate errors to store
    groupByFields: string[]        // Fields to group errors by
  }
  
  // Alerting
  alerting: {
    enabled: boolean
    thresholds: {
      errorRate: number            // Errors per minute
      criticalErrors: number       // Critical errors count
      newErrorTypes: boolean       // Alert on new error types
    }
    channels: AlertChannel[]
    cooldown: number               // Cooldown period between alerts (ms)
  }
  
  // Healthcare compliance
  healthcare?: {
    hipaaCompliant: boolean
    auditTrail: boolean
    patientDataHandling: boolean
    encryption: boolean
    anonymization: boolean
  }
  
  // Performance
  performance: {
    batchSize: number
    flushInterval: number          // Flush interval (ms)
    maxQueueSize: number
    enableAsyncProcessing: boolean
  }
  
  // Integration
  integrations: {
    sentry?: SentryConfig
    datadog?: DatadogConfig
    newrelic?: NewRelicConfig
    slack?: SlackConfig
    email?: EmailConfig
    webhook?: WebhookConfig
  }
}

// Error types and classification
export type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type ErrorCategory = 'system' | 'application' | 'network' | 'database' | 'external' | 'user' | 'security' | 'healthcare'
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface TrackableError {
  // Basic error information
  name: string
  message: string
  stack?: string
  code?: string | number
  
  // Classification
  level: ErrorLevel
  category: ErrorCategory
  severity: ErrorSeverity
  
  // Source information
  source?: {
    file?: string
    line?: number
    column?: number
    function?: string
  }
  
  // HTTP context (if applicable)
  http?: {
    method?: string
    url?: string
    statusCode?: number
    userAgent?: string
    ip?: string
  }
  
  // Original error (if wrapped)
  originalError?: Error
  
  // Custom data
  data?: Record<string, any>
  tags?: string[]
}

export interface ErrorContext {
  // Request context
  requestId?: string
  correlationId?: string
  userId?: string
  sessionId?: string
  
  // Application context
  service?: string
  version?: string
  environment?: string
  
  // Healthcare context
  patientId?: string
  facilityId?: string
  operationType?: string
  isPatientData?: boolean
  
  // Technical context
  timestamp?: Date
  hostname?: string
  platform?: string
  nodeVersion?: string
  
  // Custom context
  metadata?: Record<string, any>
  breadcrumbs?: Breadcrumb[]
}

export interface Breadcrumb {
  timestamp: Date
  level: ErrorLevel
  message: string
  category?: string
  data?: Record<string, any>
}

// Tracked error (stored error)
export interface TrackedError {
  // Identity
  id: string
  fingerprint: string             // Unique identifier for grouping
  
  // Error details
  error: TrackableError
  context: ErrorContext
  
  // Metadata
  timestamp: Date
  firstSeen: Date
  lastSeen: Date
  count: number                   // Number of occurrences
  
  // Status
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored'
  assignedTo?: string
  resolution?: string
  
  // Grouping
  groupId?: string
  similarErrors?: string[]        // IDs of similar errors
  
  // Analysis
  impact: ErrorImpact
  frequency: ErrorFrequency
  
  // Healthcare specific
  healthcareData?: {
    affectedPatients?: string[]
    facilityImpact?: string
    complianceIssues?: string[]
    auditRequired?: boolean
  }
}

export interface ErrorImpact {
  severity: ErrorSeverity
  affectedUsers: number
  affectedSessions: number
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical'
  estimatedRevenueLoss?: number
}

export interface ErrorFrequency {
  total: number
  perHour: number
  perDay: number
  trend: 'increasing' | 'decreasing' | 'stable'
  peakHours: number[]
}

// Statistics and analysis
export interface ErrorStats {
  timeframe: TimeFrame
  
  // Overview
  totalErrors: number
  uniqueErrors: number
  errorRate: number               // Errors per minute
  
  // By level
  byLevel: Record<ErrorLevel, number>
  
  // By category
  byCategory: Record<ErrorCategory, number>
  
  // By severity
  bySeverity: Record<ErrorSeverity, number>
  
  // Top errors
  topErrors: Array<{
    fingerprint: string
    count: number
    message: string
    lastSeen: Date
  }>
  
  // Trends
  hourlyTrend: Array<{
    hour: number
    count: number
  }>
  
  // Performance impact
  performanceImpact: {
    averageResponseTime: number
    slowestEndpoints: Array<{
      endpoint: string
      averageTime: number
      errorRate: number
    }>
  }
  
  // Healthcare specific
  healthcareStats?: {
    patientDataErrors: number
    complianceViolations: number
    auditableEvents: number
  }
}

export interface ErrorTrend {
  timestamp: Date
  errorCount: number
  errorRate: number
  uniqueErrors: number
  topError?: {
    message: string
    count: number
  }
}

// Filtering and querying
export interface ErrorFilter {
  // Time range
  startTime?: Date
  endTime?: Date
  
  // Error properties
  levels?: ErrorLevel[]
  categories?: ErrorCategory[]
  severities?: ErrorSeverity[]
  
  // Status
  status?: Array<'new' | 'acknowledged' | 'resolved' | 'ignored'>
  
  // Context
  userId?: string
  service?: string
  environment?: string
  
  // Healthcare
  patientId?: string
  facilityId?: string
  
  // Text search
  searchQuery?: string
  
  // Pagination
  limit?: number
  offset?: number
  
  // Sorting
  sortBy?: 'timestamp' | 'count' | 'severity' | 'impact'
  sortOrder?: 'asc' | 'desc'
}

export interface TimeFrame {
  start: Date
  end: Date
  duration: number                // Duration in milliseconds
}

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

// Report options
export interface ReportOptions {
  title?: string
  type?: ReportType
  timeframe?: TimeFrame
  period?: TimePeriod
  includeDetails?: boolean
  includeCompliance?: boolean
  format?: 'json' | 'pdf' | 'csv'
}

// Reporting
export interface ErrorReport {
  id: string
  title: string
  type: ReportType
  generatedAt: Date
  timeframe: TimeFrame
  
  // Report content
  summary: ErrorReportSummary
  details: ErrorReportDetails
  recommendations: string[]
  
  // Healthcare compliance
  complianceSection?: {
    violations: ComplianceViolation[]
    auditTrail: AuditEntry[]
    riskAssessment: RiskAssessment
  }
  
  // Attachments
  attachments?: ReportAttachment[]
}

export type ReportType = 'summary' | 'detailed' | 'compliance' | 'trend' | 'incident'

export interface ErrorReportSummary {
  totalErrors: number
  uniqueErrors: number
  errorRate: number
  topCategories: Array<{
    category: ErrorCategory
    count: number
    percentage: number
  }>
  criticalIssues: number
  resolvedIssues: number
  newIssues: number
}

export interface ErrorReportDetails {
  errorBreakdown: ErrorStats
  trends: ErrorTrend[]
  topErrors: TrackedError[]
  performanceImpact: {
    slowestOperations: Array<{
      operation: string
      averageTime: number
      errorCount: number
    }>
    resourceUsage: {
      memory: number
      cpu: number
      database: number
    }
  }
}

export interface ComplianceViolation {
  type: 'hipaa' | 'gdpr' | 'sox' | 'pci' | 'custom'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedRecords: number
  remediation: string[]
  deadline?: Date
}

export interface AuditEntry {
  timestamp: Date
  action: string
  userId?: string
  details: Record<string, any>
  result: 'success' | 'failure'
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  factors: Array<{
    factor: string
    impact: 'low' | 'medium' | 'high'
    likelihood: 'low' | 'medium' | 'high'
    mitigation: string
  }>
}

export interface ReportAttachment {
  name: string
  type: 'csv' | 'json' | 'pdf' | 'xlsx'
  data: Buffer | string
  size: number
}

// Alerting
export interface ErrorAlert {
  id: string
  type: AlertType
  severity: ErrorSeverity
  title: string
  message: string
  timestamp: Date
  
  // Context
  errors: TrackedError[]
  threshold: {
    metric: string
    value: number
    actual: number
  }
  
  // Actions
  actions?: AlertAction[]
  
  // Delivery
  channels: AlertChannel[]
  deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'>
}

export type AlertType = 'threshold' | 'anomaly' | 'new_error' | 'critical_error' | 'compliance'

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'ticket' | 'runbook'
  target: string
  payload?: Record<string, any>
}

export type AlertChannel = 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty' | 'discord'

export type ReportChannel = 'email' | 'slack' | 'webhook' | 'file' | 'database'

// Integration configurations
export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  sampleRate?: number
}

export interface DatadogConfig {
  apiKey: string
  service: string
  environment: string
  version?: string
}

export interface NewRelicConfig {
  licenseKey: string
  appName: string
  environment: string
}

export interface SlackConfig {
  webhookUrl: string
  channel: string
  username?: string
  iconEmoji?: string
}

export interface EmailConfig {
  smtp: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  from: string
  to: string[]
  subject: string
}

export interface WebhookConfig {
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  timeout: number
  retries: number
}

export interface ExternalService {
  name: string
  type: 'monitoring' | 'logging' | 'alerting' | 'ticketing'
  config: Record<string, any>
  enabled: boolean
}

// Error processing
export interface ErrorProcessor {
  name: string
  process(error: TrackedError): Promise<ProcessingResult>
  canProcess(error: TrackedError): boolean
  priority: number
}

export interface ProcessingResult {
  success: boolean
  error?: Error
  metadata?: Record<string, any>
  actions?: ProcessingAction[]
}

export interface ProcessingAction {
  type: 'notify' | 'escalate' | 'suppress' | 'merge' | 'tag'
  data: Record<string, any>
}

// Healthcare-specific types
export interface PatientSafetyError extends TrackableError {
  patientId: string
  facilityId: string
  safetyLevel: 'routine' | 'moderate' | 'high' | 'critical'
  reportingRequired: boolean
  regulatoryImpact: boolean
}

export interface ComplianceError extends TrackableError {
  regulationType: 'hipaa' | 'gdpr' | 'sox' | 'pci'
  violationType: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reportingDeadline?: Date
  remediationSteps: string[]
}

// Utility types
export interface ErrorFingerprint {
  algorithm: 'default' | 'stack' | 'message' | 'custom'
  fields: string[]
  normalize: boolean
}

export interface ErrorGroup {
  id: string
  fingerprint: string
  title: string
  count: number
  firstSeen: Date
  lastSeen: Date
  errors: TrackedError[]
  status: 'new' | 'acknowledged' | 'resolved'
}

// Default configurations
export const DefaultErrorTrackerConfig: ErrorTrackerConfig = {
  enabled: true,
  environment: 'development',
  serviceName: 'aegisx-api',
  version: '1.0.0',
  
  storage: {
    type: 'memory',
    maxEntries: 10000,
    retention: 604800000,        // 7 days
    cleanup: true,
    compression: false
  },
  
  tracking: {
    enableStackTrace: true,
    enableSourceMap: true,
    enableContext: true,
    enableMetrics: true,
    enableTrends: true
  },
  
  filters: {
    ignorePatterns: [],
    ignoreTypes: [],
    ignoreStatuses: [404],
    minimumLevel: 'warn',
    enableSampling: false,
    samplingRate: 1.0
  },
  
  aggregation: {
    enabled: true,
    windowSize: 300000,          // 5 minutes
    maxDuplicates: 100,
    groupByFields: ['message', 'stack', 'code']
  },
  
  alerting: {
    enabled: true,
    thresholds: {
      errorRate: 10,             // 10 errors per minute
      criticalErrors: 1,
      newErrorTypes: true
    },
    channels: ['email'],
    cooldown: 300000             // 5 minutes
  },
  
  performance: {
    batchSize: 100,
    flushInterval: 30000,        // 30 seconds
    maxQueueSize: 1000,
    enableAsyncProcessing: true
  },
  
  integrations: {}
}

export const HealthcareErrorTrackerConfig: ErrorTrackerConfig = {
  ...DefaultErrorTrackerConfig,
  
  storage: {
    ...DefaultErrorTrackerConfig.storage,
    type: 'database',
    retention: 2592000000,       // 30 days for healthcare
    compression: true
  },
  
  filters: {
    ...DefaultErrorTrackerConfig.filters,
    minimumLevel: 'info',        // Track more for compliance
    enableSampling: false        // No sampling for healthcare
  },
  
  alerting: {
    ...DefaultErrorTrackerConfig.alerting,
    thresholds: {
      errorRate: 5,              // More sensitive
      criticalErrors: 1,
      newErrorTypes: true
    },
    cooldown: 60000              // 1 minute cooldown
  },
  
  healthcare: {
    hipaaCompliant: true,
    auditTrail: true,
    patientDataHandling: true,
    encryption: true,
    anonymization: true
  }
}

// Event types for error tracker
export type ErrorTrackerEvent = 
  | 'error-tracked'
  | 'error-grouped'
  | 'error-resolved'
  | 'threshold-exceeded'
  | 'report-generated'
  | 'alert-sent'
  | 'compliance-violation'

export interface ErrorTrackerEventData {
  type: ErrorTrackerEvent
  timestamp: Date
  errorId?: string
  groupId?: string
  metadata?: Record<string, any>
}