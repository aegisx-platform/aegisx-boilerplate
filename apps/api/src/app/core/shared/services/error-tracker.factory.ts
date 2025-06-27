/**
 * Error Tracker Factory
 * 
 * Factory service for creating pre-configured error trackers
 * for different environments and use cases
 */

import {
  IErrorTracker,
  ErrorTrackerConfig,
  DefaultErrorTrackerConfig,
  HealthcareErrorTrackerConfig
} from '../types/error-tracker.types'
import { ErrorTrackerService } from './error-tracker.service'
import { ErrorReporterService } from './error-reporter.service'

export class ErrorTrackerFactory {
  /**
   * Create error tracker with default configuration
   */
  static create(config: Partial<ErrorTrackerConfig> = {}): IErrorTracker {
    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker for development environment
   */
  static createForDevelopment(): IErrorTracker {
    const config: Partial<ErrorTrackerConfig> = {
      ...DefaultErrorTrackerConfig,
      environment: 'development',
      
      storage: {
        type: 'memory',
        maxEntries: 1000,
        retention: 3600000,        // 1 hour
        cleanup: true,
        compression: false
      },
      
      filters: {
        ignorePatterns: [],
        ignoreTypes: ['ValidationError'],
        ignoreStatuses: [404],
        minimumLevel: 'warn',
        enableSampling: false,
        samplingRate: 1.0
      },
      
      alerting: {
        enabled: false,
        thresholds: {
          errorRate: 50,           // Higher threshold for dev
          criticalErrors: 5,
          newErrorTypes: false
        },
        channels: ['email'],
        cooldown: 600000           // 10 minutes
      },
      
      performance: {
        batchSize: 50,
        flushInterval: 10000,      // 10 seconds
        maxQueueSize: 500,
        enableAsyncProcessing: true
      }
    }

    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker for testing environment
   */
  static createForTesting(): IErrorTracker {
    const config: Partial<ErrorTrackerConfig> = {
      ...DefaultErrorTrackerConfig,
      environment: 'test',
      
      storage: {
        type: 'memory',
        maxEntries: 100,
        retention: 300000,         // 5 minutes
        cleanup: true,
        compression: false
      },
      
      tracking: {
        enableStackTrace: false,   // Simpler tracking for tests
        enableSourceMap: false,
        enableContext: true,
        enableMetrics: false,
        enableTrends: false
      },
      
      filters: {
        ignorePatterns: ['test-*'],
        ignoreTypes: ['TestError', 'ValidationError'],
        ignoreStatuses: [404, 422],
        minimumLevel: 'error',
        enableSampling: false,
        samplingRate: 1.0
      },
      
      aggregation: {
        enabled: false,            // No aggregation for tests
        windowSize: 60000,         // 1 minute
        maxDuplicates: 10,
        groupByFields: ['message']
      },
      
      alerting: {
        enabled: false,            // No alerts during testing
        thresholds: {
          errorRate: 100,
          criticalErrors: 10,
          newErrorTypes: false
        },
        channels: [],
        cooldown: 0
      },
      
      performance: {
        batchSize: 10,
        flushInterval: 1000,       // 1 second
        maxQueueSize: 50,
        enableAsyncProcessing: false
      }
    }

    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker for production environment
   */
  static createForProduction(options: ProductionOptions = {}): IErrorTracker {
    const config: Partial<ErrorTrackerConfig> = {
      ...DefaultErrorTrackerConfig,
      environment: 'production',
      
      storage: {
        type: options.storageType || 'database',
        connectionString: options.databaseUrl,
        maxEntries: options.maxEntries || 100000,
        retention: options.retention || 2592000000, // 30 days
        cleanup: true,
        compression: true
      },
      
      tracking: {
        enableStackTrace: true,
        enableSourceMap: options.enableSourceMap || false,
        enableContext: true,
        enableMetrics: true,
        enableTrends: true
      },
      
      filters: {
        ignorePatterns: options.ignorePatterns || [],
        ignoreTypes: options.ignoreTypes || ['ValidationError'],
        ignoreStatuses: options.ignoreStatuses || [404],
        minimumLevel: options.minimumLevel || 'warn',
        enableSampling: options.enableSampling || true,
        samplingRate: options.samplingRate || 0.1 // Sample 10% in production
      },
      
      aggregation: {
        enabled: true,
        windowSize: 900000,        // 15 minutes
        maxDuplicates: 1000,
        groupByFields: ['message', 'stack', 'code', 'source.file']
      },
      
      alerting: {
        enabled: true,
        thresholds: {
          errorRate: options.errorRateThreshold || 20,
          criticalErrors: options.criticalErrorThreshold || 3,
          newErrorTypes: true
        },
        channels: (options.alertChannels as any) || ['email', 'slack'],
        cooldown: options.alertCooldown || 300000 // 5 minutes
      },
      
      performance: {
        batchSize: options.batchSize || 500,
        flushInterval: options.flushInterval || 30000, // 30 seconds
        maxQueueSize: options.maxQueueSize || 5000,
        enableAsyncProcessing: true
      },
      
      integrations: options.integrations || {}
    }

    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker for healthcare applications
   */
  static createForHealthcare(options: HealthcareOptions = {}): IErrorTracker {
    const config: Partial<ErrorTrackerConfig> = {
      ...HealthcareErrorTrackerConfig,
      environment: options.environment || 'production',
      
      storage: {
        type: 'database',          // Required for healthcare compliance
        connectionString: options.databaseUrl,
        maxEntries: 1000000,       // Large capacity for compliance
        retention: options.retention || 2592000000, // 30 days minimum
        cleanup: true,
        compression: true
      },
      
      tracking: {
        enableStackTrace: true,
        enableSourceMap: false,    // Security consideration
        enableContext: true,
        enableMetrics: true,
        enableTrends: true
      },
      
      filters: {
        ignorePatterns: options.ignorePatterns || [],
        ignoreTypes: [],           // Track all error types for compliance
        ignoreStatuses: [],        // Track all status codes
        minimumLevel: 'info',      // Lower threshold for healthcare
        enableSampling: false,     // No sampling for compliance
        samplingRate: 1.0
      },
      
      aggregation: {
        enabled: true,
        windowSize: 300000,        // 5 minutes
        maxDuplicates: 500,
        groupByFields: ['message', 'stack', 'patientId', 'facilityId']
      },
      
      alerting: {
        enabled: true,
        thresholds: {
          errorRate: options.errorRateThreshold || 5, // More sensitive
          criticalErrors: 1,       // Immediate alert for critical errors
          newErrorTypes: true
        },
        channels: (options.alertChannels as any) || ['email', 'slack', 'pagerduty'],
        cooldown: 60000            // 1 minute for healthcare
      },
      
      healthcare: {
        hipaaCompliant: true,
        auditTrail: true,
        patientDataHandling: true,
        encryption: true,
        anonymization: options.enableAnonymization || true
      },
      
      integrations: {
        ...options.integrations,
      }
    }

    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker from environment variables
   */
  static createFromEnvironment(): IErrorTracker {
    const env = process.env
    
    const config: Partial<ErrorTrackerConfig> = {
      enabled: env.ERROR_TRACKER_ENABLED !== 'false',
      environment: env.NODE_ENV || 'development',
      serviceName: env.ERROR_TRACKER_SERVICE_NAME || 'aegisx-api',
      version: env.ERROR_TRACKER_VERSION || '1.0.0',
      
      storage: {
        type: (env.ERROR_TRACKER_STORAGE_TYPE as any) || 'memory',
        connectionString: env.ERROR_TRACKER_DB_CONNECTION,
        maxEntries: parseInt(env.ERROR_TRACKER_MAX_ENTRIES || '10000'),
        retention: parseInt(env.ERROR_TRACKER_RETENTION || '604800000'), // 7 days
        cleanup: env.ERROR_TRACKER_CLEANUP !== 'false',
        compression: env.ERROR_TRACKER_COMPRESSION === 'true'
      },
      
      tracking: {
        enableStackTrace: env.ERROR_TRACKER_STACK_TRACE !== 'false',
        enableSourceMap: env.ERROR_TRACKER_SOURCE_MAP === 'true',
        enableContext: env.ERROR_TRACKER_CONTEXT !== 'false',
        enableMetrics: env.ERROR_TRACKER_METRICS !== 'false',
        enableTrends: env.ERROR_TRACKER_TRENDS !== 'false'
      },
      
      filters: {
        ignorePatterns: env.ERROR_TRACKER_IGNORE_PATTERNS?.split(',') || [],
        ignoreTypes: env.ERROR_TRACKER_IGNORE_TYPES?.split(',') || [],
        ignoreStatuses: env.ERROR_TRACKER_IGNORE_STATUSES?.split(',').map(Number) || [404],
        minimumLevel: (env.ERROR_TRACKER_MIN_LEVEL as any) || 'warn',
        enableSampling: env.ERROR_TRACKER_SAMPLING === 'true',
        samplingRate: parseFloat(env.ERROR_TRACKER_SAMPLING_RATE || '1.0')
      },
      
      aggregation: {
        enabled: env.ERROR_TRACKER_AGGREGATION !== 'false',
        windowSize: parseInt(env.ERROR_TRACKER_WINDOW_SIZE || '300000'),
        maxDuplicates: parseInt(env.ERROR_TRACKER_MAX_DUPLICATES || '100'),
        groupByFields: env.ERROR_TRACKER_GROUP_BY?.split(',') || ['message', 'stack']
      },
      
      alerting: {
        enabled: env.ERROR_TRACKER_ALERTS === 'true',
        thresholds: {
          errorRate: parseInt(env.ERROR_TRACKER_ERROR_RATE_THRESHOLD || '10'),
          criticalErrors: parseInt(env.ERROR_TRACKER_CRITICAL_THRESHOLD || '1'),
          newErrorTypes: env.ERROR_TRACKER_NEW_ERROR_ALERTS === 'true'
        },
        channels: (env.ERROR_TRACKER_ALERT_CHANNELS?.split(',') as any) || ['email'],
        cooldown: parseInt(env.ERROR_TRACKER_ALERT_COOLDOWN || '300000')
      },
      
      performance: {
        batchSize: parseInt(env.ERROR_TRACKER_BATCH_SIZE || '100'),
        flushInterval: parseInt(env.ERROR_TRACKER_FLUSH_INTERVAL || '30000'),
        maxQueueSize: parseInt(env.ERROR_TRACKER_MAX_QUEUE_SIZE || '1000'),
        enableAsyncProcessing: env.ERROR_TRACKER_ASYNC_PROCESSING !== 'false'
      }
    }

    // Healthcare configuration
    if (env.ERROR_TRACKER_HEALTHCARE_MODE === 'true') {
      config.healthcare = {
        hipaaCompliant: env.ERROR_TRACKER_HIPAA_COMPLIANT === 'true',
        auditTrail: env.ERROR_TRACKER_AUDIT_TRAIL === 'true',
        patientDataHandling: env.ERROR_TRACKER_PATIENT_DATA_HANDLING === 'true',
        encryption: env.ERROR_TRACKER_ENCRYPTION === 'true',
        anonymization: env.ERROR_TRACKER_ANONYMIZATION === 'true'
      }
    }

    // Integration configurations
    config.integrations = {}
    
    if (env.SENTRY_DSN) {
      config.integrations.sentry = {
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT || config.environment!,
        release: env.SENTRY_RELEASE,
        sampleRate: parseFloat(env.SENTRY_SAMPLE_RATE || '1.0')
      }
    }
    
    if (env.DATADOG_API_KEY) {
      config.integrations.datadog = {
        apiKey: env.DATADOG_API_KEY,
        service: env.DATADOG_SERVICE || config.serviceName!,
        environment: env.DATADOG_ENV || config.environment!,
        version: env.DATADOG_VERSION || config.version
      }
    }
    
    if (env.NEWRELIC_LICENSE_KEY) {
      config.integrations.newrelic = {
        licenseKey: env.NEWRELIC_LICENSE_KEY,
        appName: env.NEWRELIC_APP_NAME || config.serviceName!,
        environment: env.NEWRELIC_ENVIRONMENT || config.environment!
      }
    }
    
    if (env.SLACK_WEBHOOK_URL) {
      config.integrations.slack = {
        webhookUrl: env.SLACK_WEBHOOK_URL,
        channel: env.SLACK_CHANNEL || '#alerts',
        username: env.SLACK_USERNAME || 'Error Tracker',
        iconEmoji: env.SLACK_ICON_EMOJI || ':warning:'
      }
    }
    
    if (env.ERROR_TRACKER_WEBHOOK_URL) {
      config.integrations.webhook = {
        url: env.ERROR_TRACKER_WEBHOOK_URL,
        method: (env.ERROR_TRACKER_WEBHOOK_METHOD as any) || 'POST',
        headers: env.ERROR_TRACKER_WEBHOOK_HEADERS ? 
          JSON.parse(env.ERROR_TRACKER_WEBHOOK_HEADERS) : undefined,
        timeout: parseInt(env.ERROR_TRACKER_WEBHOOK_TIMEOUT || '10000'),
        retries: parseInt(env.ERROR_TRACKER_WEBHOOK_RETRIES || '3')
      }
    }

    return new ErrorTrackerService(config)
  }

  /**
   * Create error tracker with reporter
   */
  static createWithReporter(
    trackerConfig: Partial<ErrorTrackerConfig> = {},
    reporterConfig: any = {}
  ): { tracker: IErrorTracker; reporter: ErrorReporterService } {
    const tracker = new ErrorTrackerService(trackerConfig)
    const reporter = new ErrorReporterService()
    
    // Configure email if provided
    if (reporterConfig.email) {
      reporter.configureEmail(reporterConfig.email)
    }
    
    // Setup integrations
    if (reporterConfig.integrations) {
      Object.values(reporterConfig.integrations).forEach((integration: any) => {
        reporter.integrateWith(integration)
      })
    }
    
    // Connect tracker and reporter - commented out due to Event Bus integration
    // Use Event Bus subscriptions instead of direct event listeners
    /*
    tracker.on('threshold-exceeded', async (data: any) => {
      const alert = {
        id: `alert-${Date.now()}`,
        type: 'threshold' as const,
        severity: data.type === 'critical-errors' ? 'critical' as const : 'high' as const,
        title: `Error Threshold Exceeded: ${data.type}`,
        message: `Threshold for ${data.threshold.metric} exceeded. Expected: ${data.threshold.value}, Actual: ${data.threshold.actual}`,
        timestamp: new Date(),
        errors: data.errors || [],
        threshold: {
          metric: data.type,
          value: data.threshold,
          actual: data.actual
        },
        channels: trackerConfig.alerting?.channels || ['email'],
        deliveryStatus: {}
      }
      
      try {
        await reporter.sendAlert(alert)
      } catch (error) {
        console.error('Failed to send alert:', error)
      }
    })
    */
    
    return { tracker, reporter }
  }

  /**
   * Validate error tracker configuration
   */
  static validateConfig(config: ErrorTrackerConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Storage validation
    if (config.storage.maxEntries <= 0) {
      errors.push('storage.maxEntries must be greater than 0')
    }
    
    if (config.storage.retention <= 0) {
      errors.push('storage.retention must be greater than 0')
    }

    // Filter validation
    if (config.filters.samplingRate < 0 || config.filters.samplingRate > 1) {
      errors.push('filters.samplingRate must be between 0 and 1')
    }

    // Aggregation validation
    if (config.aggregation.windowSize <= 0) {
      errors.push('aggregation.windowSize must be greater than 0')
    }
    
    if (config.aggregation.maxDuplicates <= 0) {
      errors.push('aggregation.maxDuplicates must be greater than 0')
    }

    // Alerting validation
    if (config.alerting.thresholds.errorRate < 0) {
      errors.push('alerting.thresholds.errorRate must be non-negative')
    }
    
    if (config.alerting.thresholds.criticalErrors < 0) {
      errors.push('alerting.thresholds.criticalErrors must be non-negative')
    }
    
    if (config.alerting.cooldown < 0) {
      errors.push('alerting.cooldown must be non-negative')
    }

    // Performance validation
    if (config.performance.batchSize <= 0) {
      errors.push('performance.batchSize must be greater than 0')
    }
    
    if (config.performance.flushInterval <= 0) {
      errors.push('performance.flushInterval must be greater than 0')
    }
    
    if (config.performance.maxQueueSize <= 0) {
      errors.push('performance.maxQueueSize must be greater than 0')
    }

    // Healthcare validation
    if (config.healthcare?.hipaaCompliant && config.storage.type === 'memory') {
      errors.push('HIPAA compliance requires persistent storage (not memory)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Supporting types
export interface ProductionOptions {
  storageType?: 'database' | 'file' | 'external'
  databaseUrl?: string
  maxEntries?: number
  retention?: number
  enableSourceMap?: boolean
  ignorePatterns?: string[]
  ignoreTypes?: string[]
  ignoreStatuses?: number[]
  minimumLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  enableSampling?: boolean
  samplingRate?: number
  errorRateThreshold?: number
  criticalErrorThreshold?: number
  alertChannels?: string[]
  alertCooldown?: number
  batchSize?: number
  flushInterval?: number
  maxQueueSize?: number
  integrations?: Record<string, any>
}

export interface HealthcareOptions {
  environment?: string
  databaseUrl?: string
  retention?: number
  ignorePatterns?: string[]
  errorRateThreshold?: number
  alertChannels?: string[]
  enableAnonymization?: boolean
  integrations?: Record<string, any>
}

// Pre-configured instances
export const ErrorTrackers = {
  /**
   * Development tracker with relaxed settings
   */
  development: () => ErrorTrackerFactory.createForDevelopment(),

  /**
   * Testing tracker with minimal overhead
   */
  testing: () => ErrorTrackerFactory.createForTesting(),

  /**
   * Production tracker with robust settings
   */
  production: (options?: ProductionOptions) => ErrorTrackerFactory.createForProduction(options),

  /**
   * Healthcare tracker with compliance features
   */
  healthcare: (options?: HealthcareOptions) => ErrorTrackerFactory.createForHealthcare(options),

  /**
   * Environment-based tracker
   */
  fromEnv: () => ErrorTrackerFactory.createFromEnvironment()
}