# Error Tracker Service Documentation

## Overview

The Error Tracker Service provides comprehensive error tracking, analysis, and reporting capabilities for the AegisX platform. It automatically captures, categorizes, and analyzes errors across the system while providing healthcare-specific compliance features and multi-channel alerting.

## Features

### Core Features
- **Centralized Error Tracking**: Capture and store all application errors in one place
- **Intelligent Error Grouping**: Automatically group similar errors using fingerprinting
- **Real-time Analysis**: Analyze error patterns, trends, and impacts
- **Comprehensive Reporting**: Generate detailed reports with insights and recommendations
- **Multi-channel Alerting**: Send alerts through email, Slack, SMS, PagerDuty, and more

### Healthcare-Specific Features
- **HIPAA Compliance**: Healthcare-compliant error handling and audit trails
- **Patient Safety Monitoring**: Track errors affecting patient data and safety
- **Compliance Violation Detection**: Identify and report regulatory compliance issues
- **Audit Trail Generation**: Maintain detailed audit logs for healthcare operations
- **Risk Assessment**: Evaluate risk levels and provide mitigation recommendations

### Advanced Features
- **Error Filtering**: Smart filtering to reduce noise and focus on important errors
- **Sampling**: Configurable sampling rates for high-volume environments
- **Performance Impact Analysis**: Measure how errors affect system performance
- **Integration Support**: Connect with external monitoring and alerting systems
- **Batch Processing**: Efficient processing of high-volume error streams

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Error Tracker       │    │ Error Reporter      │    │ Error Tracker       │
│ Service             │────│ Service             │────│ Factory             │
│                     │    │                     │    │                     │
│ - Error Collection  │    │ - Multi-channel     │    │ - Environment       │
│ - Analysis & Stats  │    │   Delivery          │    │   Configurations    │
│ - Trend Detection   │    │ - Alert Management  │    │ - Healthcare Setup  │
│ - Healthcare        │    │ - Integration       │    │ - Template Creation │
│   Compliance        │    │   Management        │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Quick Start

### 1. Basic Setup

```typescript
import { ErrorTrackerFactory } from '@core/shared/services/error-tracker.factory'

// Create error tracker for development
const tracker = ErrorTrackerFactory.createForDevelopment()

// Start the tracker
await tracker.start()

// Track an error
const errorId = await tracker.track({
  name: 'DatabaseConnectionError',
  message: 'Failed to connect to database',
  level: 'error',
  category: 'database',
  severity: 'high',
  stack: error.stack
}, {
  requestId: 'req_123',
  userId: 'user_456',
  operationName: 'getUserData'
})

console.log('Error tracked with ID:', errorId)
```

### 2. Healthcare Setup

```typescript
// Create healthcare-compliant tracker
const healthcareTracker = ErrorTrackerFactory.createForHealthcare({
  databaseUrl: process.env.DATABASE_URL,
  errorRateThreshold: 3,
  alertChannels: ['email', 'slack', 'pagerduty'],
  enableAnonymization: true
})

await healthcareTracker.start()

// Track patient-related error
await healthcareTracker.track({
  name: 'PatientDataAccessError',
  message: 'Failed to access patient medical records',
  level: 'error',
  category: 'healthcare',
  severity: 'critical'
}, {
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  userId: 'DOC_789',
  operationName: 'getPatientHistory',
  isPatientData: true
})
```

### 3. Production Environment

```typescript
// Create production tracker from environment variables
const prodTracker = ErrorTrackerFactory.createFromEnvironment()

// Or create with custom options
const prodTracker = ErrorTrackerFactory.createForProduction({
  storageType: 'database',
  databaseUrl: process.env.DATABASE_URL,
  maxEntries: 100000,
  retention: 30 * 24 * 60 * 60 * 1000, // 30 days
  errorRateThreshold: 20,
  alertChannels: ['email', 'slack', 'pagerduty'],
  enableSampling: true,
  samplingRate: 0.1 // 10% sampling
})

await prodTracker.start()
```

## Configuration

### Basic Configuration

```typescript
const config = {
  // Basic settings
  enabled: true,
  environment: 'production',
  serviceName: 'aegisx-api',
  version: '1.0.0',
  
  // Storage settings
  storage: {
    type: 'database',
    connectionString: process.env.DATABASE_URL,
    maxEntries: 100000,
    retention: 2592000000,    // 30 days
    cleanup: true,
    compression: true
  },
  
  // Tracking settings
  tracking: {
    enableStackTrace: true,
    enableSourceMap: false,
    enableContext: true,
    enableMetrics: true,
    enableTrends: true
  },
  
  // Filtering
  filters: {
    ignorePatterns: ['test-*', 'dev-*'],
    ignoreTypes: ['ValidationError'],
    ignoreStatuses: [404, 422],
    minimumLevel: 'warn',
    enableSampling: true,
    samplingRate: 0.1
  },
  
  // Alerting
  alerting: {
    enabled: true,
    thresholds: {
      errorRate: 20,           // Errors per minute
      criticalErrors: 3,
      newErrorTypes: true
    },
    channels: ['email', 'slack'],
    cooldown: 300000           // 5 minutes
  }
}
```

### Healthcare Configuration

```typescript
const healthcareConfig = {
  // ... basic config
  
  // Healthcare-specific settings
  healthcare: {
    hipaaCompliant: true,
    auditTrail: true,
    patientDataHandling: true,
    encryption: true,
    anonymization: true
  },
  
  // More sensitive filtering
  filters: {
    minimumLevel: 'info',      // Track more for compliance
    enableSampling: false,     // No sampling for healthcare
    samplingRate: 1.0
  },
  
  // More aggressive alerting
  alerting: {
    thresholds: {
      errorRate: 5,            // More sensitive
      criticalErrors: 1,       // Immediate alert
      newErrorTypes: true
    },
    cooldown: 60000            // 1 minute cooldown
  }
}
```

## Usage Examples

### 1. Error Tracking

```typescript
// Track a simple error
const errorId = await tracker.track({
  name: 'ValidationError',
  message: 'Invalid email format',
  level: 'warn',
  category: 'user',
  severity: 'low'
})

// Track an HTTP error
await tracker.track({
  name: 'HTTPError',
  message: 'External API request failed',
  level: 'error',
  category: 'external',
  severity: 'medium',
  http: {
    method: 'GET',
    url: 'https://api.example.com/data',
    statusCode: 500,
    userAgent: 'AegisX/1.0',
    ip: '192.168.1.100'
  }
}, {
  requestId: 'req_123',
  userId: 'user_456',
  metadata: {
    retryCount: 2,
    timeout: 5000
  }
})

// Track a database error
await tracker.track({
  name: 'DatabaseError',
  message: 'Connection timeout',
  level: 'error',
  category: 'database',
  severity: 'high',
  code: 'CONN_TIMEOUT',
  source: {
    file: 'database.service.ts',
    line: 45,
    function: 'executeQuery'
  }
}, {
  operationName: 'getUserById',
  metadata: {
    query: 'SELECT * FROM users WHERE id = ?',
    parameters: ['123'],
    executionTime: 30000
  }
})
```

### 2. Healthcare Error Tracking

```typescript
// Track patient data access error
await tracker.track({
  name: 'PatientDataAccessError',
  message: 'Unauthorized access to patient records',
  level: 'error',
  category: 'security',
  severity: 'critical'
}, {
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  userId: 'USER_789',
  operationName: 'getPatientRecords',
  isPatientData: true,
  metadata: {
    accessLevel: 'read',
    dataType: 'medical_records',
    complianceCheck: 'failed'
  }
})

// Track medical device error
await tracker.track({
  name: 'MedicalDeviceError',
  message: 'Vital signs monitor disconnected',
  level: 'error',
  category: 'healthcare',
  severity: 'high'
}, {
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  operationName: 'readVitalSigns',
  metadata: {
    deviceId: 'DEVICE_001',
    deviceType: 'vital_signs_monitor',
    lastReading: '2024-01-01T10:30:00Z'
  }
})

// Track compliance violation
await tracker.track({
  name: 'ComplianceViolationError',
  message: 'HIPAA violation: Patient data logged inappropriately',
  level: 'fatal',
  category: 'security',
  severity: 'critical'
}, {
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  userId: 'USER_789',
  operationName: 'logPatientActivity',
  metadata: {
    violationType: 'HIPAA',
    riskLevel: 'critical',
    reportingRequired: true,
    deadline: '2024-01-02T00:00:00Z'
  }
})
```

### 3. Error Retrieval and Analysis

```typescript
// Get errors with filtering
const errors = await tracker.getErrors({
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  endTime: new Date(),
  levels: ['error', 'fatal'],
  categories: ['database', 'external'],
  severities: ['high', 'critical'],
  patientId: 'PAT_12345',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 50
})

console.log(`Found ${errors.length} errors`)

// Get error statistics
const stats = await tracker.getErrorStats({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000),
  end: new Date(),
  duration: 24 * 60 * 60 * 1000
})

console.log('Error Statistics:')
console.log(`Total Errors: ${stats.totalErrors}`)
console.log(`Error Rate: ${stats.errorRate} per minute`)
console.log(`Critical Issues: ${stats.bySeverity.critical}`)

// Get error trends
const trends = await tracker.getErrorTrends('day')
trends.forEach(trend => {
  console.log(`${trend.timestamp.toISOString()}: ${trend.errorCount} errors`)
})
```

### 4. Report Generation

```typescript
// Generate basic report
const report = await tracker.generateReport({
  title: 'Daily Error Report',
  type: 'summary',
  timeframe: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
    duration: 24 * 60 * 60 * 1000
  },
  includeDetails: true,
  includeCompliance: true
})

console.log('Report generated:', report.id)
console.log('Total errors:', report.summary.totalErrors)
console.log('Critical issues:', report.summary.criticalIssues)

// Generate healthcare compliance report
const complianceReport = await tracker.generateReport({
  title: 'Healthcare Compliance Report',
  type: 'compliance',
  timeframe: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
    end: new Date(),
    duration: 7 * 24 * 60 * 60 * 1000
  },
  includeCompliance: true,
  format: 'json'
})

if (complianceReport.complianceSection) {
  console.log('Compliance violations:', complianceReport.complianceSection.violations.length)
  console.log('Risk level:', complianceReport.complianceSection.riskAssessment.overallRisk)
}
```

## Error Reporter Integration

### 1. Basic Reporter Setup

```typescript
import { ErrorReporterService } from '@core/shared/services/error-reporter.service'

// Create reporter
const reporter = new ErrorReporterService()

// Configure email
reporter.configureEmail({
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: 'errors@aegisx.com',
  to: ['admin@aegisx.com', 'dev-team@aegisx.com'],
  subject: 'AegisX Error Report'
})

// Send report
await reporter.sendReport(report, ['email', 'slack'])
```

### 2. Alert Management

```typescript
// Create alert
const alert = {
  id: 'alert_123',
  type: 'threshold',
  severity: 'critical',
  title: 'High Error Rate Detected',
  message: 'Error rate exceeded 20 errors per minute',
  timestamp: new Date(),
  errors: criticalErrors,
  threshold: {
    metric: 'error_rate',
    value: 20,
    actual: 35
  },
  channels: ['email', 'slack', 'pagerduty'],
  deliveryStatus: {}
}

// Send alert
await reporter.sendAlert(alert)

// Alert with actions
const alertWithActions = {
  ...alert,
  actions: [
    {
      type: 'webhook',
      target: 'https://api.example.com/incident',
      payload: { incident_type: 'high_error_rate' }
    },
    {
      type: 'ticket',
      target: 'support-team',
      payload: { priority: 'high', assignee: 'on-call' }
    }
  ]
}

await reporter.sendAlert(alertWithActions)
```

### 3. External Integrations

```typescript
// Integrate with Sentry
reporter.integrateWith({
  name: 'sentry',
  type: 'logging',
  enabled: true,
  config: {
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    sampleRate: 1.0
  }
})

// Integrate with Datadog
reporter.integrateWith({
  name: 'datadog',
  type: 'monitoring',
  enabled: true,
  config: {
    apiKey: process.env.DATADOG_API_KEY,
    service: 'aegisx-api',
    environment: 'production'
  }
})

// Integrate with Slack
reporter.integrateWith({
  name: 'slack',
  type: 'alerting',
  enabled: true,
  config: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: '#alerts',
    username: 'Error Tracker'
  }
})
```

## Environment Variables

Configure the Error Tracker Service using environment variables:

```bash
# Basic Configuration
ERROR_TRACKER_ENABLED=true
ERROR_TRACKER_SERVICE_NAME=aegisx-api
ERROR_TRACKER_VERSION=1.0.0
NODE_ENV=production

# Storage Configuration
ERROR_TRACKER_STORAGE_TYPE=database
ERROR_TRACKER_DB_CONNECTION=postgresql://user:pass@localhost:5432/aegisx
ERROR_TRACKER_MAX_ENTRIES=100000
ERROR_TRACKER_RETENTION=2592000000
ERROR_TRACKER_CLEANUP=true
ERROR_TRACKER_COMPRESSION=true

# Tracking Configuration
ERROR_TRACKER_STACK_TRACE=true
ERROR_TRACKER_SOURCE_MAP=false
ERROR_TRACKER_CONTEXT=true
ERROR_TRACKER_METRICS=true
ERROR_TRACKER_TRENDS=true

# Filtering Configuration
ERROR_TRACKER_IGNORE_PATTERNS=test-*,dev-*
ERROR_TRACKER_IGNORE_TYPES=ValidationError,TestError
ERROR_TRACKER_IGNORE_STATUSES=404,422
ERROR_TRACKER_MIN_LEVEL=warn
ERROR_TRACKER_SAMPLING=true
ERROR_TRACKER_SAMPLING_RATE=0.1

# Aggregation Configuration
ERROR_TRACKER_AGGREGATION=true
ERROR_TRACKER_WINDOW_SIZE=300000
ERROR_TRACKER_MAX_DUPLICATES=100
ERROR_TRACKER_GROUP_BY=message,stack,code

# Alerting Configuration
ERROR_TRACKER_ALERTS=true
ERROR_TRACKER_ERROR_RATE_THRESHOLD=20
ERROR_TRACKER_CRITICAL_THRESHOLD=3
ERROR_TRACKER_NEW_ERROR_ALERTS=true
ERROR_TRACKER_ALERT_CHANNELS=email,slack
ERROR_TRACKER_ALERT_COOLDOWN=300000

# Performance Configuration
ERROR_TRACKER_BATCH_SIZE=500
ERROR_TRACKER_FLUSH_INTERVAL=30000
ERROR_TRACKER_MAX_QUEUE_SIZE=5000
ERROR_TRACKER_ASYNC_PROCESSING=true

# Healthcare Configuration
ERROR_TRACKER_HEALTHCARE_MODE=true
ERROR_TRACKER_HIPAA_COMPLIANT=true
ERROR_TRACKER_AUDIT_TRAIL=true
ERROR_TRACKER_PATIENT_DATA_HANDLING=true
ERROR_TRACKER_ENCRYPTION=true
ERROR_TRACKER_ANONYMIZATION=true

# Integration Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0

DATADOG_API_KEY=your-datadog-api-key
DATADOG_SERVICE=aegisx-api
DATADOG_ENV=production

NEWRELIC_LICENSE_KEY=your-newrelic-license-key
NEWRELIC_APP_NAME=AegisX API

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
SLACK_CHANNEL=#alerts
SLACK_USERNAME=Error Tracker

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
ERROR_REPORT_FROM_EMAIL=errors@aegisx.com
ERROR_REPORT_TO_EMAIL=admin@aegisx.com
ERROR_ALERT_FROM_EMAIL=alerts@aegisx.com
ERROR_ALERT_TO_EMAIL=admin@aegisx.com

# Webhook Configuration
ERROR_TRACKER_WEBHOOK_URL=https://your-webhook-endpoint.com/errors
ERROR_TRACKER_WEBHOOK_METHOD=POST
ERROR_TRACKER_WEBHOOK_TIMEOUT=10000
ERROR_TRACKER_WEBHOOK_RETRIES=3

# PagerDuty Configuration
PAGERDUTY_ROUTING_KEY=your-pagerduty-routing-key

# Discord Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook
```

## Healthcare Compliance Features

### 1. HIPAA Compliance

The Error Tracker includes built-in HIPAA compliance features:

```typescript
// Automatic patient data protection
await tracker.track({
  name: 'DataAccessError',
  message: 'Failed to access patient data',
  level: 'error',
  category: 'healthcare',
  severity: 'high'
}, {
  patientId: 'PAT_12345',        // Automatically anonymized if enabled
  facilityId: 'FACILITY_001',
  userId: 'DOC_789',
  isPatientData: true,           // Triggers HIPAA protections
  metadata: {
    dataType: 'medical_records',
    accessReason: 'treatment'
  }
})

// Audit trail automatically generated
const auditTrail = await tracker.generateReport({
  type: 'compliance',
  includeCompliance: true
})

console.log('Audit entries:', auditTrail.complianceSection?.auditTrail.length)
```

### 2. Patient Safety Monitoring

```typescript
// Track patient safety-related errors
await tracker.track({
  name: 'MedicationOrderError',
  message: 'Medication allergy check failed',
  level: 'fatal',
  category: 'healthcare',
  severity: 'critical'
}, {
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  operationName: 'prescribeMedication',
  metadata: {
    medicationId: 'MED_789',
    allergyType: 'penicillin',
    safetyLevel: 'critical',
    reportingRequired: true
  }
})

// Automatic safety alerts for critical patient errors
```

### 3. Compliance Reporting

```typescript
// Generate compliance report
const complianceReport = await tracker.generateReport({
  title: 'Monthly HIPAA Compliance Report',
  type: 'compliance',
  timeframe: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    duration: 30 * 24 * 60 * 60 * 1000
  },
  includeCompliance: true
})

// Check for violations
if (complianceReport.complianceSection) {
  const violations = complianceReport.complianceSection.violations
  
  violations.forEach(violation => {
    console.log(`Violation: ${violation.type}`)
    console.log(`Severity: ${violation.severity}`)
    console.log(`Description: ${violation.description}`)
    console.log(`Affected Records: ${violation.affectedRecords}`)
    console.log(`Remediation: ${violation.remediation.join(', ')}`)
  })
}
```

## Integration with Other Services

### 1. Circuit Breaker Integration

```typescript
import { CircuitBreakerFactory } from '@core/shared/services/circuit-breaker.factory'

// Create circuit breaker manager
const manager = CircuitBreakerFactory.createForHealthcare()

// Create error tracker
const tracker = ErrorTrackerFactory.createForHealthcare()

// Connect circuit breaker events to error tracker
manager.on('breaker-circuit-opened', async (event) => {
  await tracker.track({
    name: 'CircuitBreakerOpenError',
    message: `Circuit breaker ${event.breakerName} opened due to failures`,
    level: 'error',
    category: 'system',
    severity: 'high'
  }, {
    operationName: 'circuitBreakerMonitoring',
    metadata: {
      breakerName: event.breakerName,
      failureCount: event.failureCount,
      state: event.state
    }
  })
})
```

### 2. HTTP Client Integration

```typescript
import { httpClient } from '@core/shared/services/http-client.service'

// Track HTTP errors automatically
httpClient.interceptors.response.use(
  response => response,
  async error => {
    await tracker.track({
      name: 'HTTPRequestError',
      message: `HTTP request failed: ${error.message}`,
      level: 'error',
      category: 'external',
      severity: error.response?.status >= 500 ? 'high' : 'medium',
      http: {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        statusCode: error.response?.status,
        userAgent: error.config?.headers?.['User-Agent'],
        ip: error.config?.metadata?.clientIp
      }
    }, {
      requestId: error.config?.metadata?.requestId,
      operationName: 'httpRequest',
      metadata: {
        timeout: error.config?.timeout,
        retries: error.config?.retries,
        responseTime: error.config?.metadata?.responseTime
      }
    })
    
    throw error
  }
)
```

### 3. Background Jobs Integration

```typescript
import { backgroundJobsService } from '@core/shared/services/background-jobs.service'

// Track job failures
backgroundJobsService.on('job-failed', async (event) => {
  await tracker.track({
    name: 'BackgroundJobError',
    message: `Background job failed: ${event.error.message}`,
    level: 'error',
    category: 'system',
    severity: event.attempts >= 3 ? 'high' : 'medium',
    originalError: event.error
  }, {
    operationName: event.jobType,
    metadata: {
      jobId: event.jobId,
      attempt: event.attempts,
      maxAttempts: event.maxAttempts,
      data: event.data
    }
  })
})
```

## Performance Considerations

### 1. Sampling for High Volume

```typescript
// Configure sampling for production
const tracker = ErrorTrackerFactory.createForProduction({
  enableSampling: true,
  samplingRate: 0.1,           // Sample 10% of errors
  batchSize: 1000,             // Process in larger batches
  flushInterval: 60000,        // Flush every minute
  maxQueueSize: 10000          // Large queue for high volume
})

// Critical errors always tracked regardless of sampling
await tracker.track({
  name: 'CriticalSystemError',
  message: 'Database cluster failure',
  level: 'fatal',
  category: 'system',
  severity: 'critical'          // Always tracked
})
```

### 2. Memory Management

```typescript
// Configure memory-efficient settings
const tracker = ErrorTrackerFactory.create({
  storage: {
    type: 'database',          // Use persistent storage
    maxEntries: 50000,         // Limit memory usage
    cleanup: true,             // Auto cleanup old entries
    compression: true          // Compress stored data
  },
  
  performance: {
    enableAsyncProcessing: true, // Non-blocking processing
    batchSize: 500,             // Reasonable batch size
    maxQueueSize: 2000          // Prevent memory overflow
  }
})
```

### 3. Database Optimization

```typescript
// Optimized database configuration
const tracker = ErrorTrackerFactory.create({
  storage: {
    type: 'database',
    connectionString: process.env.DATABASE_URL,
    retention: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanup: true,
    compression: true
  },
  
  // Index on common query fields
  aggregation: {
    groupByFields: ['fingerprint', 'level', 'category', 'timestamp']
  }
})
```

## Monitoring and Observability

### 1. Error Tracker Health Monitoring

```typescript
// Monitor tracker health
tracker.on('tracker-started', () => {
  console.log('Error tracker started successfully')
})

tracker.on('tracker-stopped', () => {
  console.log('Error tracker stopped')
})

tracker.on('error-tracked', (event) => {
  console.log(`Error tracked: ${event.errorId}`)
})

tracker.on('threshold-exceeded', (event) => {
  console.log(`Threshold exceeded: ${event.type}`)
  // Trigger additional monitoring
})

// Health check endpoint
app.get('/health/error-tracker', async (req, res) => {
  try {
    // Check if tracker is running
    const isHealthy = tracker.isStarted
    
    // Get basic stats
    const recentErrors = await tracker.getErrors({
      startTime: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      limit: 1
    })
    
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      recentErrors: recentErrors.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})
```

### 2. Metrics Collection

```typescript
// Custom metrics for error tracker
import { metricsService } from '@core/shared/services/metrics.service'

tracker.on('error-tracked', (event) => {
  // Increment error counter
  metricsService.increment('errors.tracked.total', {
    level: event.error.level,
    category: event.error.category,
    severity: event.error.severity
  })
})

tracker.on('threshold-exceeded', (event) => {
  // Track threshold violations
  metricsService.increment('errors.threshold.exceeded', {
    type: event.type,
    threshold: event.threshold.toString()
  })
})

// Regular metrics reporting
setInterval(async () => {
  const stats = await tracker.getErrorStats({
    start: new Date(Date.now() - 60 * 1000), // Last minute
    end: new Date(),
    duration: 60 * 1000
  })
  
  metricsService.gauge('errors.rate.per_minute', stats.errorRate)
  metricsService.gauge('errors.critical.count', stats.bySeverity.critical)
  metricsService.gauge('errors.unique.count', stats.uniqueErrors)
}, 60000) // Every minute
```

## Testing

### 1. Unit Testing

```typescript
import { ErrorTrackerFactory } from '@core/shared/services/error-tracker.factory'

describe('Error Tracker Service', () => {
  let tracker: IErrorTracker

  beforeEach(() => {
    tracker = ErrorTrackerFactory.createForTesting()
  })

  afterEach(async () => {
    await tracker.stop()
  })

  it('should track errors successfully', async () => {
    const errorId = await tracker.track({
      name: 'TestError',
      message: 'Test error message',
      level: 'error',
      category: 'application',
      severity: 'medium'
    })

    expect(errorId).toBeDefined()
    
    const error = await tracker.getError(errorId)
    expect(error).toBeDefined()
    expect(error?.error.name).toBe('TestError')
  })

  it('should filter errors correctly', async () => {
    // Track multiple errors
    await tracker.track({
      name: 'Error1',
      message: 'First error',
      level: 'error',
      category: 'database',
      severity: 'high'
    })

    await tracker.track({
      name: 'Error2',
      message: 'Second error',
      level: 'warn',
      category: 'application',
      severity: 'low'
    })

    // Filter by level
    const errorLevelErrors = await tracker.getErrors({
      levels: ['error']
    })

    expect(errorLevelErrors).toHaveLength(1)
    expect(errorLevelErrors[0].error.name).toBe('Error1')
  })

  it('should generate statistics', async () => {
    // Track test errors
    const errors = [
      { level: 'error', category: 'database', severity: 'high' },
      { level: 'warn', category: 'application', severity: 'medium' },
      { level: 'error', category: 'external', severity: 'low' }
    ]

    for (const error of errors) {
      await tracker.track({
        name: 'TestError',
        message: 'Test message',
        level: error.level as any,
        category: error.category as any,
        severity: error.severity as any
      })
    }

    const stats = await tracker.getErrorStats()
    
    expect(stats.totalErrors).toBe(3)
    expect(stats.byLevel.error).toBe(2)
    expect(stats.byLevel.warn).toBe(1)
    expect(stats.byCategory.database).toBe(1)
  })
})
```

### 2. Integration Testing

```typescript
describe('Error Tracker Integration', () => {
  it('should integrate with circuit breaker', async () => {
    const manager = CircuitBreakerFactory.createForTesting()
    const tracker = ErrorTrackerFactory.createForTesting()
    
    // Setup integration
    manager.on('breaker-circuit-opened', async (event) => {
      await tracker.track({
        name: 'CircuitBreakerError',
        message: `Circuit opened: ${event.breakerName}`,
        level: 'error',
        category: 'system',
        severity: 'high'
      })
    })

    // Create failing circuit breaker
    const breaker = manager.create('test-service', {
      failureThreshold: 1,
      timeout: 100
    })

    // Trigger failure
    try {
      await breaker.execute(() => Promise.reject(new Error('Test failure')))
    } catch (error) {
      // Expected failure
    }

    // Check if error was tracked
    await new Promise(resolve => setTimeout(resolve, 100)) // Wait for async processing
    
    const errors = await tracker.getErrors({
      searchQuery: 'CircuitBreakerError'
    })

    expect(errors).toHaveLength(1)
    expect(errors[0].error.category).toBe('system')
  })
})
```

## Best Practices

### 1. Error Classification

```typescript
// Use consistent error classification
const errorCategories = {
  'database': ['connection', 'query', 'timeout'],
  'external': ['api', 'service', 'integration'],
  'security': ['authentication', 'authorization', 'validation'],
  'healthcare': ['patient_data', 'medical_device', 'compliance'],
  'system': ['memory', 'cpu', 'disk', 'network'],
  'application': ['business_logic', 'validation', 'processing']
}

// Example of good error tracking
await tracker.track({
  name: 'DatabaseConnectionError',
  message: 'Failed to connect to primary database',
  level: 'error',
  category: 'database',        // Consistent categorization
  severity: 'high',            // Appropriate severity
  code: 'DB_CONN_001',         // Error code for tracking
  source: {
    file: 'database.service.ts',
    line: 42,
    function: 'connect'
  }
}, {
  operationName: 'connectToDatabase',
  requestId: req.id,
  metadata: {
    connectionString: 'postgresql://***',
    timeout: 30000,
    retryAttempt: 3
  }
})
```

### 2. Context Enrichment

```typescript
// Always provide rich context
await tracker.track(error, {
  // Request context
  requestId: req.id,
  correlationId: req.headers['x-correlation-id'],
  userId: req.user?.id,
  sessionId: req.session?.id,
  
  // Operation context
  operationName: 'processPayment',
  
  // Healthcare context (if applicable)
  patientId: req.body.patientId,
  facilityId: req.user?.facilityId,
  
  // Technical context
  metadata: {
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    
    // Operation-specific data
    paymentAmount: req.body.amount,
    paymentMethod: req.body.method,
    processingTime: Date.now() - req.startTime
  }
})
```

### 3. Error Filtering

```typescript
// Configure intelligent filtering
const tracker = ErrorTrackerFactory.create({
  filters: {
    // Ignore test and development errors
    ignorePatterns: [
      '^test-.*',
      '^dev-.*',
      '.*localhost.*'
    ],
    
    // Ignore common non-critical errors
    ignoreTypes: [
      'ValidationError',
      'NotFoundError'
    ],
    
    // Ignore client errors (4xx)
    ignoreStatuses: [400, 401, 403, 404, 422],
    
    // Only track warnings and above
    minimumLevel: 'warn',
    
    // Custom error filter
    errorFilter: (error) => {
      // Don't track errors from automated tests
      if (error.source?.file?.includes('.test.')) {
        return false
      }
      
      // Don't track rate limiting errors for public endpoints
      if (error.code === 'RATE_LIMIT' && error.http?.url?.startsWith('/api/public/')) {
        return false
      }
      
      return true
    }
  }
})
```

### 4. Performance Optimization

```typescript
// Optimize for high-volume environments
const tracker = ErrorTrackerFactory.createForProduction({
  // Efficient storage
  storage: {
    type: 'database',
    compression: true,
    cleanup: true
  },
  
  // Smart sampling
  enableSampling: true,
  samplingRate: 0.1,          // 10% sampling
  
  // Batch processing
  performance: {
    enableAsyncProcessing: true,
    batchSize: 1000,
    flushInterval: 30000,     // 30 seconds
    maxQueueSize: 10000
  },
  
  // Intelligent aggregation
  aggregation: {
    enabled: true,
    windowSize: 300000,       // 5 minutes
    maxDuplicates: 500,
    groupByFields: ['fingerprint', 'level', 'category']
  }
})
```

This comprehensive Error Tracker Service provides enterprise-grade error monitoring with specialized healthcare compliance features, making it ideal for the AegisX healthcare platform while maintaining flexibility for other applications.