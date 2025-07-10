/**
 * Common Queue Interface
 * 
 * Unified interface for different queue implementations (Bull/Redis, RabbitMQ)
 * Provides consistent API for job management across different brokers
 */

export interface JobOptions {
  // Scheduling
  delay?: number // Delay in milliseconds
  repeat?: RepeatOptions // For recurring jobs
  
  // Execution
  priority?: number // Job priority (higher = more important)
  attempts?: number // Number of retry attempts
  backoff?: BackoffOptions // Retry backoff strategy
  timeout?: number // Job timeout in milliseconds
  
  // Lifecycle
  removeOnComplete?: boolean | number // Remove job after completion
  removeOnFail?: boolean | number // Remove job after failure
  
  // Metadata
  jobId?: string // Custom job ID
  tags?: string[] // Job tags for filtering
  metadata?: Record<string, any> // Additional metadata
}

export interface RepeatOptions {
  cron?: string // Cron expression
  tz?: string // Timezone
  startDate?: Date | string // Start date
  endDate?: Date | string // End date
  limit?: number // Max number of repeats
  interval?: string | number // Simple interval (e.g., '30s', '5m', '1h', or milliseconds)
  immediately?: boolean // Run immediately on start
}

export interface BackoffOptions {
  type: 'fixed' | 'exponential' | 'linear'
  delay: number // Base delay in milliseconds
  maxDelay?: number // Maximum delay
  jitter?: number // Random jitter (0-1)
}

export interface Job<T = any> {
  id: string
  name: string
  data: T
  opts: JobOptions
  progressValue: number
  attemptsMade: number
  
  // Timestamps
  timestamp: number // Creation time
  processedOn?: number // Processing start time
  finishedOn?: number // Completion time
  
  // Status
  delay: number
  failedReason?: string
  stacktrace?: string[]
  returnvalue?: any
  
  // Methods
  getState(): Promise<JobState>
  update(data: T): Promise<void>
  progress(value: number | object): Promise<void>
  log(message: string): Promise<void>
  remove(): Promise<void>
  retry(): Promise<void>
  discard(): Promise<void>
  promote(): Promise<void>
}

export type JobState = 
  | 'waiting'
  | 'active' 
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'stuck'

export interface QueueMetrics {
  name: string
  broker: 'redis' | 'rabbitmq'
  
  // Job counts
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
  
  // Rates
  processingRate: number // Jobs per second
  errorRate: number // Errors per second
  
  // Performance
  avgProcessingTime: number // Milliseconds
  minProcessingTime: number
  maxProcessingTime: number
  
  // Health
  isPaused: boolean
  lastActivity?: Date
  errorCount24h: number
}

export interface QueueEvents {
  // Job lifecycle
  'job:added': (job: Job) => void
  'job:active': (job: Job) => void
  'job:progress': (job: Job, progress: number | object) => void
  'job:completed': (job: Job, result: any) => void
  'job:failed': (job: Job, error: Error) => void
  'job:stalled': (job: Job) => void
  'job:removed': (jobId: string) => void
  
  // Queue events
  'queue:paused': () => void
  'queue:resumed': () => void
  'queue:cleaned': (jobs: string[], type: JobState) => void
  'queue:error': (error: Error) => void
  'queue:drained': () => void
}

export type ProcessFunction<T = any, R = any> = (job: Job<T>) => Promise<R>

export interface IQueueService {
  name: string
  broker: 'redis' | 'rabbitmq'
  
  // Job management
  add<T = any>(name: string, data: T, opts?: JobOptions): Promise<Job<T>>
  addBulk<T = any>(jobs: Array<{ name: string; data: T; opts?: JobOptions }>): Promise<Job<T>[]>
  
  // Job processing
  process<T = any, R = any>(name: string, concurrency: number | ProcessFunction<T, R>, processor?: ProcessFunction<T, R>): void
  
  // Job queries
  getJob(jobId: string): Promise<Job | null>
  getJobs(types: JobState[], start?: number, end?: number): Promise<Job[]>
  getJobCounts(): Promise<Record<JobState, number>>
  
  // Queue control
  pause(): Promise<void>
  resume(): Promise<void>
  clean(grace: number, status?: JobState, limit?: number): Promise<string[]>
  empty(): Promise<void>
  close(): Promise<void>
  
  // Monitoring
  getMetrics(): Promise<QueueMetrics>
  getQueueEvents(): QueueEvents
  isReady(): Promise<boolean>
  
  // Event handling
  on<K extends keyof QueueEvents>(event: K, handler: QueueEvents[K]): void
  off<K extends keyof QueueEvents>(event: K, handler: QueueEvents[K]): void
}

// Helper type for creating typed queues
export interface TypedQueue<T = any> extends Omit<IQueueService, 'add' | 'process'> {
  add(name: string, data: T, opts?: JobOptions): Promise<Job<T>>
  process<R = any>(name: string, processor: ProcessFunction<T, R>): void
}

// Utility function to parse interval strings
export function parseInterval(interval: string | number): number {
  if (typeof interval === 'number') {
    return interval
  }
  
  const match = interval.match(/^(\d+)(ms|s|m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid interval format: ${interval}`)
  }
  
  const [, value, unit] = match
  const num = parseInt(value, 10)
  
  switch (unit) {
    case 'ms': return num
    case 's': return num * 1000
    case 'm': return num * 60 * 1000
    case 'h': return num * 60 * 60 * 1000
    case 'd': return num * 24 * 60 * 60 * 1000
    default: throw new Error(`Unknown interval unit: ${unit}`)
  }
}

// Convert interval to cron expression for simple intervals
export function intervalToCron(interval: string | number): string | null {
  const ms = parseInterval(interval)
  
  // Convert common intervals to cron
  switch (ms) {
    case 60000: return '* * * * *' // Every minute
    case 300000: return '*/5 * * * *' // Every 5 minutes
    case 900000: return '*/15 * * * *' // Every 15 minutes
    case 1800000: return '*/30 * * * *' // Every 30 minutes
    case 3600000: return '0 * * * *' // Every hour
    case 86400000: return '0 0 * * *' // Every day
    default: return null // Can't convert to cron
  }
}