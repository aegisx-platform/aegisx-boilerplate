# Background Jobs System Documentation

## Overview

The Background Jobs System is a comprehensive, enterprise-grade solution for asynchronous task processing in the AegisX Boilerplate. It provides reliable job queuing, scheduling, and processing with support for multiple queue adapters, healthcare-specific features, and HIPAA compliance capabilities.

## Features

### Core Features
- **Multiple Queue Adapters**: Memory, Redis, RabbitMQ, Database
- **Job Scheduling**: Cron-based recurring jobs with timezone support
- **Concurrency Control**: Configurable worker concurrency per queue
- **Error Handling**: Retry mechanisms with exponential backoff
- **Monitoring**: Real-time metrics and health checks
- **Circuit Breaker Integration**: Fault tolerance and cascade failure prevention

### Healthcare-Specific Features
- **HIPAA Compliance**: Secure data handling and retention policies
- **Audit Trails**: Comprehensive job auditing
- **Data Encryption**: Sensitive data encryption at rest
- **Retention Management**: Configurable data retention periods
- **Healthcare Job Types**: Pre-built processors for common healthcare tasks

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Job Manager   │────│   Job Queues    │────│   Job Workers   │
│                 │    │                 │    │                 │
│ - Add Jobs      │    │ - Memory        │    │ - Process Jobs  │
│ - Schedule Jobs │    │ - Redis         │    │ - Error Handling│
│ - Monitor       │    │ - RabbitMQ      │    │ - Middleware    │
│ - Health Check  │    │ - Database      │    │ - Concurrency   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Job Scheduler  │
                    │                 │
                    │ - Cron Jobs     │
                    │ - Recurring     │
                    │ - Timezone      │
                    └─────────────────┘
```

## Installation & Setup

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Job System Configuration
JOBS_ADAPTER_TYPE=memory          # memory | redis | rabbitmq | database
JOBS_WORKERS=2                    # Number of workers per queue
JOBS_CONCURRENCY=5                # Jobs processed simultaneously per worker
JOBS_MAX_CONCURRENCY=20           # Global max concurrent jobs

# Redis Configuration (if using redis adapter)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_JOBS_DB=1
JOBS_REDIS_PREFIX=jobs:

# Database Configuration (if using database adapter)
JOBS_DB_TABLE=background_jobs
JOBS_POLL_INTERVAL=5000

# Memory Configuration (if using memory adapter)
JOBS_MEMORY_MAX=10000
JOBS_MEMORY_PERSIST=true
JOBS_MEMORY_FILE=./jobs-storage.json

# Job Settings
JOBS_DEFAULT_TIMEOUT=300000       # 5 minutes
JOBS_DEFAULT_TTL=86400000         # 24 hours
JOBS_DEFAULT_ATTEMPTS=3
JOBS_CLEANUP_INTERVAL=3600000     # 1 hour
JOBS_STALLED_INTERVAL=30000       # 30 seconds

# Monitoring
JOBS_MONITORING_ENABLED=true
JOBS_METRICS_INTERVAL=60000       # 1 minute
JOBS_HEALTH_INTERVAL=30000        # 30 seconds

# Healthcare/Compliance
JOBS_AUDIT_ENABLED=true
JOBS_ENCRYPT_DATA=true
JOBS_RETENTION_PERIOD=2592000000  # 30 days
JOBS_COMPLIANCE_MODE=true
```

### 2. Register the Plugin

In your Fastify application setup:

```typescript
// apps/api/src/app/app.ts
import backgroundJobsPlugin from './core/plugins/background-jobs'

export default async function app(fastify: FastifyInstance) {
  // Register background jobs plugin
  await fastify.register(backgroundJobsPlugin, {
    enableMetrics: true,
    enableAdminRoutes: true,
    adminRoutePrefix: '/admin/jobs',
    enableHealthCheck: true
  })
  
  // Other plugins...
}
```

## Basic Usage

### 1. Adding Jobs

```typescript
// Add a simple job
const job = await fastify.jobManager.add('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome'
})

// Add a job with options
const priorityJob = await fastify.jobManager.add('process-payment', {
  orderId: '12345',
  amount: 99.99
}, {
  priority: 'high',
  attempts: 5,
  delay: 1000, // 1 second delay
  timeout: 30000, // 30 seconds timeout
  queue: 'payments'
})

// Add bulk jobs
const jobs = await fastify.jobManager.addBulk([
  { name: 'send-sms', data: { phone: '+1234567890', message: 'Hello!' } },
  { name: 'update-analytics', data: { userId: 123, event: 'login' } },
  { name: 'backup-data', data: { tables: ['users', 'orders'] } }
])
```

### 2. Processing Jobs

```typescript
// Register a job processor
fastify.jobManager.process('send-email', async (job) => {
  const { to, subject, template } = job.data
  
  console.log(`Sending email to ${to}`)
  
  // Update progress
  job.progress = 50
  
  // Simulate email sending
  await emailService.send({ to, subject, template })
  
  job.progress = 100
  
  return {
    success: true,
    messageId: 'email-123',
    sentAt: new Date()
  }
})

// Register processor with concurrency
fastify.jobManager.processWithConcurrency('process-images', 3, async (job) => {
  const { imageUrl, transformations } = job.data
  
  // Process image...
  const result = await imageProcessor.transform(imageUrl, transformations)
  
  return result
})
```

### 3. Scheduling Recurring Jobs

```typescript
// Schedule a daily report
const scheduleId = await fastify.jobManager.schedule(
  'daily-report',
  '0 9 * * *', // Every day at 9 AM
  { reportType: 'daily', recipients: ['admin@company.com'] },
  {
    timezone: 'America/New_York',
    queue: 'reports'
  }
)

// Schedule appointment reminders
await fastify.jobManager.schedule(
  'appointment-reminders',
  '0 */2 * * *', // Every 2 hours
  {},
  {
    timezone: 'UTC',
    queue: 'notifications',
    priority: 'high'
  }
)

// Unschedule a job
await fastify.jobManager.unschedule(scheduleId)
```

## Healthcare Use Cases

### 1. Patient Registration Processing

```typescript
// Register patient registration processor
fastify.jobManager.process('patient-registration', async (job) => {
  const { patientInfo, facilityId } = job.data
  
  // Validate patient information
  const validationResult = await patientValidator.validate(patientInfo)
  if (!validationResult.isValid) {
    throw new Error(`Invalid patient data: ${validationResult.errors.join(', ')}`)
  }
  
  job.progress = 25
  
  // Check for duplicate patients
  const duplicate = await patientService.findDuplicate(patientInfo)
  if (duplicate) {
    return { duplicate: true, existingPatientId: duplicate.id }
  }
  
  job.progress = 50
  
  // Create patient record
  const patient = await patientService.create({
    ...patientInfo,
    facilityId,
    registrationDate: new Date()
  })
  
  job.progress = 75
  
  // Send welcome notification
  await notificationService.sendWelcome(patient)
  
  job.progress = 100
  
  return {
    patientId: patient.id,
    registrationComplete: true,
    welcomeNotificationSent: true
  }
})

// Add patient registration job
const job = await fastify.jobManager.add('patient-registration', {
  patientInfo: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    ssn: '123-45-6789',
    phone: '+1234567890',
    email: 'john.doe@email.com',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      zipCode: '12345'
    }
  },
  facilityId: 'FACILITY_001',
  registrationSource: 'web_portal'
}, {
  priority: 'high',
  queue: 'patients',
  hipaaCompliant: true,
  patientId: 'TEMP_001',
  facilityId: 'FACILITY_001',
  operationType: 'patient_registration'
})
```

### 2. Appointment Reminders

```typescript
// Register appointment reminder processor
fastify.jobManager.process('appointment-reminder', async (job) => {
  const { appointmentId, patientId, reminderType, customMessage } = job.data
  
  // Get appointment details
  const appointment = await appointmentService.getById(appointmentId)
  if (!appointment) {
    throw new Error(`Appointment not found: ${appointmentId}`)
  }
  
  // Get patient contact info
  const patient = await patientService.getById(patientId)
  if (!patient) {
    throw new Error(`Patient not found: ${patientId}`)
  }
  
  job.progress = 33
  
  // Send reminder based on type
  let result
  switch (reminderType) {
    case 'sms':
      result = await smsService.send({
        to: patient.phone,
        message: customMessage || `Reminder: You have an appointment on ${appointment.date} at ${appointment.time}`
      })
      break
      
    case 'email':
      result = await emailService.send({
        to: patient.email,
        subject: 'Appointment Reminder',
        template: 'appointment-reminder',
        data: { appointment, patient }
      })
      break
      
    case 'call':
      result = await callService.schedule({
        to: patient.phone,
        message: customMessage || 'appointment reminder',
        scheduledTime: new Date(Date.now() + 300000) // 5 minutes from now
      })
      break
  }
  
  job.progress = 66
  
  // Log reminder in audit trail
  await auditService.log({
    action: 'appointment_reminder_sent',
    patientId,
    appointmentId,
    reminderType,
    result
  })
  
  job.progress = 100
  
  return {
    reminderSent: true,
    reminderType,
    sentAt: new Date(),
    result
  }
})

// Schedule daily appointment reminders
await fastify.jobManager.schedule(
  'daily-appointment-reminders',
  '0 8 * * *', // Every day at 8 AM
  {},
  {
    timezone: 'America/New_York',
    queue: 'notifications',
    operationType: 'appointment_reminder'
  }
)
```

### 3. Lab Result Processing

```typescript
fastify.jobManager.process('lab-result-processing', async (job) => {
  const { labOrderId, results, providerNotification } = job.data
  
  // Get lab order
  const labOrder = await labService.getOrderById(labOrderId)
  if (!labOrder) {
    throw new Error(`Lab order not found: ${labOrderId}`)
  }
  
  job.progress = 20
  
  // Validate results format
  const validation = await labService.validateResults(results)
  if (!validation.isValid) {
    throw new Error(`Invalid lab results: ${validation.errors.join(', ')}`)
  }
  
  job.progress = 40
  
  // Save results to database
  const savedResults = await labService.saveResults(labOrderId, results)
  
  job.progress = 60
  
  // Check for critical values
  const criticalValues = await labService.checkCriticalValues(results)
  if (criticalValues.length > 0) {
    // Send immediate alerts for critical values
    await alertService.sendCriticalValueAlert({
      patientId: labOrder.patientId,
      providerId: labOrder.providerId,
      criticalValues
    })
  }
  
  job.progress = 80
  
  // Notify provider if requested
  if (providerNotification) {
    await notificationService.notifyProvider({
      providerId: labOrder.providerId,
      message: 'New lab results available',
      labOrderId,
      hasCriticalValues: criticalValues.length > 0
    })
  }
  
  job.progress = 100
  
  return {
    resultsProcessed: true,
    criticalValuesFound: criticalValues.length,
    providerNotified: providerNotification
  }
})
```

### 4. Billing Generation

```typescript
fastify.jobManager.process('billing-generation', async (job) => {
  const { patientId, serviceDate, procedures, insuranceInfo } = job.data
  
  // Get patient information
  const patient = await patientService.getById(patientId)
  
  job.progress = 15
  
  // Validate insurance information
  if (insuranceInfo) {
    const insuranceValidation = await insuranceService.validate(insuranceInfo)
    if (!insuranceValidation.isValid) {
      throw new Error(`Invalid insurance: ${insuranceValidation.error}`)
    }
  }
  
  job.progress = 30
  
  // Calculate charges for procedures
  const charges = await billingService.calculateCharges(procedures, patient.facilityId)
  
  job.progress = 50
  
  // Create billing record
  const bill = await billingService.createBill({
    patientId,
    serviceDate,
    procedures,
    charges,
    insuranceInfo,
    status: 'pending'
  })
  
  job.progress = 70
  
  // Submit to insurance if available
  if (insuranceInfo) {
    const insuranceClaim = await insuranceService.submitClaim({
      billId: bill.id,
      patientId,
      procedures,
      charges,
      insuranceInfo
    })
    
    bill.insuranceClaimId = insuranceClaim.id
    await billingService.updateBill(bill.id, { insuranceClaimId: insuranceClaim.id })
  }
  
  job.progress = 90
  
  // Generate patient statement
  const statement = await billingService.generateStatement(bill.id)
  
  job.progress = 100
  
  return {
    billId: bill.id,
    totalCharges: charges.total,
    insuranceSubmitted: !!insuranceInfo,
    statementGenerated: true
  }
})
```

## Factory Configurations

### Development Environment

```typescript
import { BackgroundJobsFactory } from './core/shared/services/background-jobs.factory'

// Development with memory persistence
const jobManager = BackgroundJobsFactory.createForDevelopment()

// Custom development setup
const customDevManager = BackgroundJobsFactory.createWithMemory({
  maxJobs: 500,
  persistToDisk: true,
  storageFile: './dev-jobs.json'
}, {
  workers: 2,
  concurrency: 3
})
```

### Production Environment

```typescript
// Production with Redis
const prodManager = BackgroundJobsFactory.createForProduction({
  adapterType: 'redis',
  workers: 5,
  concurrency: 10,
  maxConcurrency: 50
})

// Environment-based configuration
const envManager = BackgroundJobsFactory.createFromEnvironment()
```

### Healthcare Configuration

```typescript
// Healthcare-optimized setup
const healthcareManager = BackgroundJobsFactory.createForHealthcare({
  adapterType: 'redis',
  maxConcurrency: 25,
  adapterOptions: {
    host: 'redis-cluster.healthcare.internal',
    port: 6379,
    keyPrefix: 'hc:jobs:'
  }
})
```

## Monitoring & Admin Routes

### Health Check

```bash
# Check overall system health
GET /admin/jobs/health

# Response
{
  "status": "healthy",
  "uptime": 3600000,
  "lastChecked": "2024-01-15T10:30:00Z",
  "queues": {
    "default": {
      "status": "healthy",
      "stats": {
        "jobs": {
          "waiting": 5,
          "active": 2,
          "completed": 150,
          "failed": 3
        },
        "throughput": {
          "completed": 147,
          "failed": 3,
          "perMinute": 2.45,
          "perHour": 147
        }
      }
    }
  },
  "workers": [
    {
      "id": "default-worker-1",
      "status": "busy",
      "processed": 75,
      "failed": 1,
      "uptime": 3600000
    }
  ]
}
```

### Job Management

```bash
# Get all jobs
GET /admin/jobs

# Get jobs by status
GET /admin/jobs?status=failed&limit=10

# Get specific job
GET /admin/jobs/:jobId

# Retry failed job
POST /admin/jobs/:jobId/retry

# Remove job
DELETE /admin/jobs/:jobId

# Get job counts
GET /admin/jobs/counts
```

### Queue Management

```bash
# Pause queue
POST /admin/jobs/queues/:queueName/pause

# Resume queue
POST /admin/jobs/queues/:queueName/resume

# Empty queue
POST /admin/jobs/queues/:queueName/empty

# Get queue stats
GET /admin/jobs/queues/:queueName/stats
```

### Schedules

```bash
# Get all schedules
GET /admin/jobs/schedules

# Create schedule
POST /admin/jobs/schedules
{
  "name": "daily-cleanup",
  "cronExpression": "0 2 * * *",
  "data": { "type": "cleanup" },
  "options": {
    "timezone": "UTC",
    "queue": "maintenance"
  }
}

# Delete schedule
DELETE /admin/jobs/schedules/:scheduleId
```

## Error Handling & Retry Strategies

### Automatic Retries

```typescript
// Job with retry configuration
await fastify.jobManager.add('unreliable-task', { data: 'test' }, {
  attempts: 5,
  retryDelay: 1000,
  retryBackoff: 'exponential',
  retryFilter: (error) => {
    // Only retry on specific errors
    return error.code !== 'PERMANENT_FAILURE'
  }
})
```

### Custom Error Handling

```typescript
fastify.jobManager.process('risky-operation', async (job) => {
  try {
    const result = await riskyService.doSomething(job.data)
    return result
  } catch (error) {
    if (error.code === 'RATE_LIMIT') {
      // Delay retry for rate limiting
      throw new BackgroundJobsError(
        'Rate limited, will retry later',
        'RATE_LIMIT_ERROR'
      )
    } else if (error.code === 'INVALID_DATA') {
      // Don't retry for invalid data
      throw new BackgroundJobsError(
        'Invalid data provided',
        'PERMANENT_FAILURE'
      )
    }
    throw error
  }
})
```

## Performance Optimization

### Queue Strategies

```typescript
// Separate queues by priority and type
const config = {
  defaultQueue: 'normal',
  queues: {
    'critical': {
      adapter: { type: 'redis' },
      workers: 5,
      concurrency: 3
    },
    'normal': {
      adapter: { type: 'redis' },
      workers: 3,
      concurrency: 5
    },
    'batch': {
      adapter: { type: 'database' },
      workers: 1,
      concurrency: 10
    }
  }
}
```

### Bulk Operations

```typescript
// Process multiple jobs efficiently
const bulkJobs = patientIds.map(patientId => ({
  name: 'send-appointment-reminder',
  data: { patientId },
  options: { queue: 'notifications' }
}))

await fastify.jobManager.addBulk(bulkJobs)
```

## Testing

### Unit Testing Jobs

```typescript
import { BackgroundJobsFactory } from '../services/background-jobs.factory'

describe('Email Jobs', () => {
  let jobManager

  beforeEach(() => {
    jobManager = BackgroundJobsFactory.createForTesting()
  })

  afterEach(async () => {
    await jobManager.shutdown()
  })

  it('should send email successfully', async () => {
    const emailSent = jest.fn().mockResolvedValue({ messageId: 'test-123' })
    
    jobManager.process('send-email', async (job) => {
      const result = await emailSent(job.data)
      return result
    })

    await jobManager.start()

    const job = await jobManager.add('send-email', {
      to: 'test@example.com',
      subject: 'Test Email'
    })

    // Wait for job to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(emailSent).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test Email'
    })
  })
})
```

## Security & Compliance

### HIPAA Compliance

```typescript
// Enable HIPAA compliance mode
const jobManager = BackgroundJobsFactory.createForHealthcare({
  healthcare: {
    auditJobs: true,
    encryptSensitiveData: true,
    retentionPeriod: 7776000000, // 90 days
    complianceMode: true
  }
})

// Jobs with patient data
await jobManager.add('process-patient-data', {
  patientId: 'PAT_001',
  medicalRecord: '...',
  phi: true // Mark as containing PHI
}, {
  hipaaCompliant: true,
  encryptData: true
})
```

### Data Encryption

```typescript
// Sensitive job data is automatically encrypted when compliance mode is enabled
await jobManager.add('billing-process', {
  ssn: '123-45-6789',
  creditCard: '4111-1111-1111-1111',
  medicalInfo: { ... }
}, {
  operationType: 'billing_generation',
  hipaaCompliant: true,
  facilityId: 'FACILITY_001'
})
```

## Best Practices

### 1. Job Design
- Keep jobs small and focused on a single responsibility
- Make jobs idempotent (safe to run multiple times)
- Include comprehensive error handling
- Update progress for long-running jobs

### 2. Queue Organization
- Use separate queues for different priorities
- Isolate critical jobs from batch operations
- Consider data locality when assigning jobs to queues

### 3. Error Handling
- Implement circuit breaker patterns for external services
- Use appropriate retry strategies for different error types
- Log errors with sufficient context for debugging

### 4. Monitoring
- Monitor queue health and worker performance
- Set up alerts for job failures and queue backlogs
- Track job processing times and success rates

### 5. Healthcare Compliance
- Always mark healthcare jobs with appropriate compliance flags
- Use proper data retention and encryption settings
- Audit all job activities involving PHI

## Troubleshooting

### Common Issues

1. **Jobs Stuck in Queue**
   - Check worker status and queue health
   - Verify job handlers are properly registered
   - Check for memory or resource limitations

2. **High Failure Rates**
   - Review error logs for common failure patterns
   - Adjust retry strategies and timeouts
   - Check external service availability

3. **Performance Issues**
   - Monitor worker concurrency and adjust as needed
   - Consider queue separation strategies
   - Optimize job processing logic

### Debug Commands

```typescript
// Get detailed job information
const job = await jobManager.getJob('job-id')
console.log('Job details:', JSON.stringify(job, null, 2))

// Check queue health
const health = await jobManager.getQueueHealth()
console.log('Queue health:', health)

// Worker statistics
const stats = await jobManager.getWorkerStats()
console.log('Worker stats:', stats)
```

This comprehensive Background Jobs System provides a robust foundation for asynchronous task processing in healthcare and enterprise applications, with built-in compliance features and monitoring capabilities.