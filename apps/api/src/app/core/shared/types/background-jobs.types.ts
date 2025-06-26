/**
 * Background Jobs Types
 * 
 * Comprehensive types for background job processing system
 * Supporting multiple queue adapters and healthcare-specific use cases
 */

// Core interfaces
export interface IJobManager {
  // Job operations
  add(name: string, data?: any, options?: JobOptions): Promise<Job>
  addBulk(jobs: BulkJobData[]): Promise<Job[]>
  
  // Job control
  getJob(jobId: string): Promise<Job | null>
  removeJob(jobId: string): Promise<boolean>
  retryJob(jobId: string): Promise<Job>
  
  // Queue management
  getJobs(status?: JobStatus, limit?: number): Promise<Job[]>
  getJobCounts(): Promise<JobCounts>
  pauseQueue(queueName?: string): Promise<void>
  resumeQueue(queueName?: string): Promise<void>
  emptyQueue(queueName?: string): Promise<void>
  
  // Scheduling
  schedule(name: string, cronExpression: string, data?: any, options?: ScheduleOptions): Promise<string>
  unschedule(scheduleId: string): Promise<boolean>
  getSchedules(): Promise<Schedule[]>
  
  // Workers
  process(name: string, handler: JobHandler): void
  processWithConcurrency(name: string, concurrency: number, handler: JobHandler): void
  
  // Monitoring
  getQueueHealth(): Promise<QueueHealth>
  getWorkerStats(): Promise<WorkerStats[]>
  
  // Lifecycle
  start(): Promise<void>
  stop(): Promise<void>
  shutdown(): Promise<void>
}

export interface IJobQueue {
  name: string
  adapter: string
  
  // Queue operations
  add(job: JobData): Promise<Job>
  addBulk(jobs: JobData[]): Promise<Job[]>
  
  // Job retrieval
  getNext(): Promise<Job | null>
  getJob(jobId: string): Promise<Job | null>
  getJobs(status?: JobStatus, limit?: number): Promise<Job[]>
  
  // Job management
  removeJob(jobId: string): Promise<boolean>
  updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null>
  
  // Queue management
  pause(): Promise<void>
  resume(): Promise<void>
  empty(): Promise<void>
  
  // Stats and monitoring
  getStats(): Promise<QueueStats>
  
  // Lifecycle
  initialize(): Promise<void>
  shutdown(): Promise<void>
}

export interface IJobWorker {
  id: string
  queueName: string
  concurrency: number
  isRunning: boolean
  
  // Worker operations
  start(): Promise<void>
  stop(): Promise<void>
  process(job: Job): Promise<JobResult>
  
  // Stats
  getStats(): WorkerStats
}

// Job data structures
export interface Job {
  id: string
  name: string
  data: any
  options: JobOptions
  status: JobStatus
  progress: number
  
  // Timing
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
  completedAt?: Date
  failedAt?: Date
  
  // Retry and delay
  attempts: number
  maxAttempts: number
  delay?: number
  
  // Results and errors
  result?: any
  error?: JobError
  
  // Metadata
  queue: string
  priority: JobPriority
  tags?: string[]
  parentJobId?: string
  
  // Healthcare specific
  patientId?: string
  facilityId?: string
  operationType?: HealthcareOperationType
}

export interface JobData {
  name: string
  data?: any
  options?: JobOptions
}

export interface BulkJobData extends JobData {
  id?: string
}

export interface JobOptions {
  // Basic options
  priority?: JobPriority
  delay?: number
  attempts?: number
  backoff?: BackoffStrategy
  queue?: string
  
  // Timing
  timeout?: number
  ttl?: number // Time to live
  
  // Retry configuration
  retryDelay?: number
  retryBackoff?: BackoffStrategy
  retryFilter?: (error: any) => boolean
  
  // Job relationships
  parentJobId?: string
  dependsOn?: string[]
  
  // Metadata
  tags?: string[]
  metadata?: Record<string, any>
  
  // Healthcare specific
  patientId?: string
  facilityId?: string
  operationType?: HealthcareOperationType
  hipaaCompliant?: boolean
  
  // Advanced options
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
  jobId?: string
}

export interface JobResult {
  success: boolean
  result?: any
  error?: JobError
  progress?: number
  logs?: string[]
}

export interface JobError {
  name: string
  message: string
  stack?: string
  code?: string
  isRetryable: boolean
  attempts: number
}

// Enums and types
export type JobStatus = 
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'stuck'

export type JobPriority = 'low' | 'normal' | 'high' | 'critical'

export type BackoffStrategy = 'fixed' | 'exponential' | 'linear'

export type HealthcareOperationType = 
  | 'patient_registration'
  | 'appointment_reminder'
  | 'lab_result_processing'
  | 'billing_generation'
  | 'insurance_verification'
  | 'medication_reminder'
  | 'report_generation'
  | 'data_export'
  | 'audit_log_processing'
  | 'backup_creation'

// Queue adapters
export type QueueAdapterType = 'memory' | 'redis' | 'rabbitmq' | 'database'

export interface QueueAdapterConfig {
  type: QueueAdapterType
  connection?: any
  options?: Record<string, any>
}

export interface MemoryAdapterConfig {
  maxJobs?: number
  persistToDisk?: boolean
  storageFile?: string
}

export interface RedisAdapterConfig {
  host?: string
  port?: number
  db?: number
  keyPrefix?: string
  maxRetriesPerRequest?: number
}

export interface RabbitMQAdapterConfig {
  url: string
  exchange?: string
  routingKey?: string
  durable?: boolean
  prefetch?: number
}

export interface DatabaseAdapterConfig {
  table: string
  pollInterval?: number
  maxConcurrency?: number
}

// Job manager configuration
export interface BackgroundJobsConfig {
  // Default queue configuration
  defaultQueue: string
  
  // Queue configurations
  queues: {
    [queueName: string]: {
      adapter: QueueAdapterConfig
      workers?: number
      concurrency?: number
    }
  }
  
  // Global settings
  settings?: {
    maxConcurrency?: number
    defaultJobTimeout?: number
    defaultJobTTL?: number
    defaultMaxAttempts?: number
    cleanupInterval?: number
    stalledInterval?: number
    maxStalledCount?: number
  }
  
  // Monitoring
  monitoring?: {
    enabled: boolean
    metricsInterval?: number
    healthCheckInterval?: number
  }
  
  // Healthcare specific
  healthcare?: {
    auditJobs?: boolean
    encryptSensitiveData?: boolean
    retentionPeriod?: number
    complianceMode?: boolean
  }
}

// Scheduling
export interface Schedule {
  id: string
  name: string
  cronExpression: string
  data?: any
  options?: ScheduleOptions
  nextRun: Date
  lastRun?: Date
  isActive: boolean
  createdAt: Date
}

export interface ScheduleOptions extends JobOptions {
  timezone?: string
  startDate?: Date
  endDate?: Date
  maxRuns?: number
}

// Statistics and monitoring
export interface JobCounts {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
  stuck: number
  total: number
}

export interface QueueStats {
  name: string
  jobs: JobCounts
  workers: number
  processing: number
  throughput: {
    completed: number
    failed: number
    perMinute: number
    perHour: number
  }
  avgProcessingTime: number
  lastProcessed?: Date
}

export interface WorkerStats {
  id: string
  queueName: string
  status: 'idle' | 'busy' | 'stopped'
  processed: number
  failed: number
  avgProcessingTime: number
  uptime: number
  lastJob?: {
    name: string
    completedAt: Date
    duration: number
  }
}

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  queues: {
    [queueName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      stats: QueueStats
      issues?: string[]
    }
  }
  workers: WorkerStats[]
  uptime: number
  lastChecked: Date
}

// Event types
export interface JobEvent {
  type: JobEventType
  job: Job
  timestamp: Date
  worker?: string
  error?: JobError
  result?: any
}

export type JobEventType = 
  | 'job.added'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'job.retry'
  | 'job.removed'
  | 'queue.paused'
  | 'queue.resumed'
  | 'worker.started'
  | 'worker.stopped'

// Job handlers
export type JobHandler = (job: Job) => Promise<any>

export interface JobMiddleware {
  name: string
  beforeProcess?: (job: Job) => Promise<void>
  afterProcess?: (job: Job, result: JobResult) => Promise<void>
  onError?: (job: Job, error: JobError) => Promise<void>
}

// Error types
export class BackgroundJobsError extends Error {
  constructor(
    message: string,
    public code: string,
    public queue?: string,
    public jobId?: string
  ) {
    super(message)
    this.name = 'BackgroundJobsError'
  }
}

export class JobNotFoundError extends BackgroundJobsError {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', undefined, jobId)
    this.name = 'JobNotFoundError'
  }
}

export class QueueNotFoundError extends BackgroundJobsError {
  constructor(queueName: string) {
    super(`Queue not found: ${queueName}`, 'QUEUE_NOT_FOUND', queueName)
    this.name = 'QueueNotFoundError'
  }
}

export class JobTimeoutError extends BackgroundJobsError {
  constructor(jobId: string, timeout: number) {
    super(`Job ${jobId} timed out after ${timeout}ms`, 'JOB_TIMEOUT', undefined, jobId)
    this.name = 'JobTimeoutError'
  }
}

export class WorkerError extends BackgroundJobsError {
  constructor(workerId: string, message: string) {
    super(`Worker ${workerId}: ${message}`, 'WORKER_ERROR')
    this.name = 'WorkerError'
  }
}

// Built-in job types for healthcare
export interface PatientRegistrationJobData {
  patientInfo: {
    firstName: string
    lastName: string
    dateOfBirth: Date
    ssn?: string
    phone: string
    email?: string
    address: any
  }
  facilityId: string
  registrationSource: string
}

export interface AppointmentReminderJobData {
  appointmentId: string
  patientId: string
  facilityId: string
  appointmentDate: Date
  reminderType: 'sms' | 'email' | 'call'
  customMessage?: string
}

export interface LabResultProcessingJobData {
  labOrderId: string
  patientId: string
  facilityId: string
  results: any[]
  providerNotification: boolean
}

export interface BillingGenerationJobData {
  patientId: string
  facilityId: string
  serviceDate: Date
  procedures: any[]
  insuranceInfo?: any
}

export interface ReportGenerationJobData {
  reportType: string
  facilityId: string
  dateRange: {
    start: Date
    end: Date
  }
  filters: Record<string, any>
  outputFormat: 'pdf' | 'excel' | 'csv'
  recipientEmail?: string
}

// Utility types
export interface JobProgress {
  percentage: number
  message?: string
  data?: any
}

export interface JobFilter {
  status?: JobStatus[]
  priority?: JobPriority[]
  queue?: string[]
  tags?: string[]
  createdAfter?: Date
  createdBefore?: Date
  limit?: number
  offset?: number
}

export interface BulkJobOperation {
  operation: 'retry' | 'remove' | 'pause' | 'resume'
  filter: JobFilter
  dryRun?: boolean
}

// Plugin configuration
export interface BackgroundJobsPluginConfig extends BackgroundJobsConfig {
  enableMetrics?: boolean
  enableAdminRoutes?: boolean
  adminRoutePrefix?: string
  enableHealthCheck?: boolean
}

// Pre-configured settings
export const DefaultBackgroundJobsConfig: Partial<BackgroundJobsConfig> = {
  defaultQueue: 'default',
  settings: {
    maxConcurrency: 10,
    defaultJobTimeout: 300000, // 5 minutes
    defaultJobTTL: 86400000, // 24 hours
    defaultMaxAttempts: 3,
    cleanupInterval: 3600000, // 1 hour
    stalledInterval: 30000, // 30 seconds
    maxStalledCount: 1
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    healthCheckInterval: 30000 // 30 seconds
  },
  healthcare: {
    auditJobs: true,
    encryptSensitiveData: true,
    retentionPeriod: 2592000000, // 30 days
    complianceMode: true
  }
}

export const HealthcareJobsConfig: Partial<BackgroundJobsConfig> = {
  defaultQueue: 'healthcare',
  queues: {
    healthcare: {
      adapter: {
        type: 'redis',
        options: { keyPrefix: 'healthcare:' }
      },
      workers: 3,
      concurrency: 5
    },
    notifications: {
      adapter: {
        type: 'redis', 
        options: { keyPrefix: 'notifications:' }
      },
      workers: 2,
      concurrency: 10
    },
    reports: {
      adapter: {
        type: 'database',
        options: { table: 'report_jobs' }
      },
      workers: 1,
      concurrency: 2
    }
  },
  healthcare: {
    auditJobs: true,
    encryptSensitiveData: true,
    retentionPeriod: 7776000000, // 90 days for healthcare
    complianceMode: true
  }
}