/**
 * Bull Queue Service
 * 
 * Redis-based queue implementation using Bull library
 * Provides job management, scheduling, and processing capabilities
 */

import Bull, { Queue, Job as BullJob, JobOptions as BullJobOptions, JobStatus } from 'bull'
import { EventEmitter } from 'events'
import {
  IQueueService,
  Job,
  JobOptions,
  JobState,
  ProcessFunction,
  QueueMetrics,
  QueueEvents,
  parseInterval,
  intervalToCron,
  RepeatOptions
} from '../interfaces/queue.interface'

export interface BullQueueConfig {
  redis: {
    host: string
    port: number
    password?: string
    db?: number
    maxRetriesPerRequest?: number
    enableReadyCheck?: boolean
    connectTimeout?: number
  }
  prefix?: string
  defaultJobOptions?: Partial<JobOptions>
  metrics?: {
    maxDataPoints?: number
    collectionInterval?: number
  }
}

export class BullQueueService extends EventEmitter implements IQueueService {
  public readonly name: string
  public readonly broker: 'redis' | 'rabbitmq' = 'redis'
  
  private queue: Queue
  private config: BullQueueConfig
  private metricsCollector?: NodeJS.Timeout
  private metricsData: QueueMetrics
  
  constructor(name: string, config: BullQueueConfig) {
    super()
    this.name = name
    this.config = config
    
    // Initialize Bull queue
    this.queue = new Bull(name, {
      redis: config.redis,
      prefix: config.prefix || 'bull',
      defaultJobOptions: this.mapJobOptions(config.defaultJobOptions || {})
    })
    
    // Initialize metrics
    this.metricsData = this.createEmptyMetrics()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Start metrics collection if enabled
    if (config.metrics?.collectionInterval) {
      this.startMetricsCollection(config.metrics.collectionInterval)
    }
  }
  
  /**
   * Add a job to the queue
   */
  async add<T = any>(name: string, data: T, opts?: JobOptions): Promise<Job<T>> {
    const bullOpts = this.mapJobOptions(opts || {})
    const bullJob = await this.queue.add(name, data, bullOpts)
    return this.mapBullJobToJob(bullJob)
  }
  
  /**
   * Add multiple jobs in bulk
   */
  async addBulk<T = any>(jobs: Array<{ name: string; data: T; opts?: JobOptions }>): Promise<Job<T>[]> {
    const bullJobs = jobs.map(job => ({
      name: job.name,
      data: job.data,
      opts: this.mapJobOptions(job.opts || {})
    }))
    
    const addedJobs = await this.queue.addBulk(bullJobs)
    return addedJobs.map(job => this.mapBullJobToJob(job))
  }
  
  /**
   * Process jobs
   */
  process<T = any, R = any>(
    name: string,
    concurrency: number | ProcessFunction<T, R>,
    processor?: ProcessFunction<T, R>
  ): void {
    // Handle overloaded parameters
    const actualConcurrency = typeof concurrency === 'number' ? concurrency : 1
    const actualProcessor = typeof concurrency === 'function' ? concurrency : processor!
    
    this.queue.process(name, actualConcurrency, async (bullJob: BullJob) => {
      const job = this.mapBullJobToJob<T>(bullJob)
      return await actualProcessor(job)
    })
  }
  
  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const bullJob = await this.queue.getJob(jobId)
    return bullJob ? this.mapBullJobToJob(bullJob) : null
  }
  
  /**
   * Get jobs by status
   */
  async getJobs(types: JobState[], start?: number, end?: number): Promise<Job[]> {
    const jobs: BullJob[] = []
    
    for (const type of types) {
      const bullStatus = this.mapJobStateToBullStatus(type)
      if (bullStatus) {
        const statusJobs = await this.queue.getJobs([bullStatus], start, end)
        jobs.push(...statusJobs)
      }
    }
    
    return jobs.map(job => this.mapBullJobToJob(job))
  }
  
  /**
   * Get job counts by status
   */
  async getJobCounts(): Promise<Record<JobState, number>> {
    const counts = await this.queue.getJobCounts()
    
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
      stuck: 0 // Bull doesn't have stuck state
    }
  }
  
  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause()
  }
  
  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume()
  }
  
  /**
   * Clean jobs
   */
  async clean(grace: number, status?: JobState, limit?: number): Promise<string[]> {
    if (!status) {
      // Clean all completed and failed jobs
      const completed = await this.queue.clean(grace, 'completed', limit)
      const failed = await this.queue.clean(grace, 'failed', limit)
      return [...completed, ...failed]
    }
    
    const bullStatus = this.mapJobStateToBullStatus(status)
    if (!bullStatus || (bullStatus !== 'completed' && bullStatus !== 'failed')) {
      return []
    }
    
    return await this.queue.clean(grace, bullStatus, limit)
  }
  
  /**
   * Empty the queue
   */
  async empty(): Promise<void> {
    await this.queue.empty()
  }
  
  /**
   * Close the queue
   */
  async close(): Promise<void> {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector)
    }
    await this.queue.close()
  }
  
  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const counts = await this.getJobCounts()
    const isPaused = await this.queue.isPaused()
    
    return {
      ...this.metricsData,
      ...counts,
      isPaused,
      lastActivity: new Date()
    }
  }
  
  /**
   * Get queue events (type assertion for compatibility)
   */
  getQueueEvents(): QueueEvents {
    return this as any as QueueEvents
  }
  
  /**
   * Check if queue is ready
   */
  async isReady(): Promise<boolean> {
    try {
      await this.queue.isReady()
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Job events
    this.queue.on('active', (job) => {
      this.emit('job:active', this.mapBullJobToJob(job))
    })
    
    this.queue.on('completed', (job, result) => {
      this.emit('job:completed', this.mapBullJobToJob(job), result)
      this.updateMetrics('completed')
    })
    
    this.queue.on('failed', (job, error) => {
      this.emit('job:failed', this.mapBullJobToJob(job), error)
      this.updateMetrics('failed')
    })
    
    this.queue.on('progress', (job, progress) => {
      this.emit('job:progress', this.mapBullJobToJob(job), progress)
    })
    
    this.queue.on('stalled', (job) => {
      this.emit('job:stalled', this.mapBullJobToJob(job))
    })
    
    this.queue.on('removed', (job) => {
      this.emit('job:removed', job.id)
    })
    
    // Queue events
    this.queue.on('paused', () => {
      this.emit('queue:paused')
    })
    
    this.queue.on('resumed', () => {
      this.emit('queue:resumed')
    })
    
    this.queue.on('cleaned', (jobs, type) => {
      this.emit('queue:cleaned', jobs.map(j => j.id), type as JobState)
    })
    
    this.queue.on('error', (error) => {
      this.emit('queue:error', error)
    })
    
    this.queue.on('drained', () => {
      this.emit('queue:drained')
    })
  }
  
  /**
   * Map our JobOptions to Bull JobOptions
   */
  private mapJobOptions(opts: JobOptions): BullJobOptions {
    const bullOpts: BullJobOptions = {
      delay: opts.delay,
      priority: opts.priority,
      attempts: opts.attempts,
      timeout: opts.timeout,
      removeOnComplete: opts.removeOnComplete,
      removeOnFail: opts.removeOnFail,
      jobId: opts.jobId
    }
    
    // Handle repeat options
    if (opts.repeat) {
      bullOpts.repeat = this.mapRepeatOptions(opts.repeat)
    }
    
    // Handle backoff
    if (opts.backoff) {
      bullOpts.backoff = {
        type: opts.backoff.type,
        delay: opts.backoff.delay
      }
    }
    
    return bullOpts
  }
  
  /**
   * Map repeat options
   */
  private mapRepeatOptions(repeat: RepeatOptions): Bull.CronRepeatOptions | Bull.EveryRepeatOptions {
    // If interval is provided, try to convert to cron or use every
    if (repeat.interval) {
      const cron = intervalToCron(repeat.interval)
      if (cron) {
        return {
          cron,
          tz: repeat.tz,
          startDate: repeat.startDate,
          endDate: repeat.endDate,
          limit: repeat.limit
        }
      } else {
        // Use every for intervals that can't be expressed as cron
        return {
          every: parseInterval(repeat.interval),
          limit: repeat.limit
        }
      }
    }
    
    // Use cron expression directly
    return {
      cron: repeat.cron!,
      tz: repeat.tz,
      startDate: repeat.startDate,
      endDate: repeat.endDate,
      limit: repeat.limit
    }
  }
  
  /**
   * Map Bull Job to our Job interface
   */
  private mapBullJobToJob<T = any>(bullJob: BullJob<T>): Job<T> {
    const job: Job<T> = {
      id: bullJob.id.toString(),
      name: bullJob.name,
      data: bullJob.data,
      opts: {
        delay: bullJob.opts.delay,
        priority: bullJob.opts.priority,
        attempts: bullJob.opts.attempts,
        timeout: bullJob.opts.timeout,
        removeOnComplete: bullJob.opts.removeOnComplete,
        removeOnFail: bullJob.opts.removeOnFail
      },
      progress: bullJob.progress(),
      attemptsMade: bullJob.attemptsMade,
      timestamp: bullJob.timestamp,
      processedOn: bullJob.processedOn || undefined,
      finishedOn: bullJob.finishedOn || undefined,
      delay: bullJob.opts.delay || 0,
      failedReason: bullJob.failedReason || undefined,
      stacktrace: bullJob.stacktrace || undefined,
      returnvalue: bullJob.returnvalue,
      
      // Methods
      getState: async () => {
        const state = await bullJob.getState()
        return this.mapBullStateToJobState(state)
      },
      update: async (data: T) => {
        await bullJob.update(data)
      },
      progress: async (value: number | object) => {
        await bullJob.progress(value)
      },
      log: async (message: string) => {
        await bullJob.log(message)
      },
      remove: async () => {
        await bullJob.remove()
      },
      retry: async () => {
        await bullJob.retry()
      },
      discard: async () => {
        await bullJob.discard()
      },
      promote: async () => {
        await bullJob.promote()
      }
    }
    
    return job
  }
  
  /**
   * Map Bull state to our JobState
   */
  private mapBullStateToJobState(state: JobStatus | 'stuck'): JobState {
    const stateMap: Record<string, JobState> = {
      waiting: 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused',
      stuck: 'stuck'
    }
    
    return stateMap[state] || 'waiting'
  }
  
  /**
   * Map our JobState to Bull JobStatus
   */
  private mapJobStateToBullStatus(state: JobState): JobStatus | null {
    const statusMap: Record<JobState, JobStatus | null> = {
      waiting: 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused',
      stuck: null // Bull doesn't have stuck status
    }
    
    return statusMap[state]
  }
  
  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): QueueMetrics {
    return {
      name: this.name,
      broker: 'redis',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      processingRate: 0,
      errorRate: 0,
      avgProcessingTime: 0,
      minProcessingTime: 0,
      maxProcessingTime: 0,
      isPaused: false,
      errorCount24h: 0
    }
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(event: 'completed' | 'failed'): void {
    const now = Date.now()
    
    if (event === 'completed') {
      this.metricsData.completed++
    } else if (event === 'failed') {
      this.metricsData.failed++
      this.metricsData.errorCount24h++
    }
    
    this.metricsData.lastActivity = new Date(now)
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(interval: number): void {
    this.metricsCollector = setInterval(async () => {
      try {
        const counts = await this.getJobCounts()
        Object.assign(this.metricsData, counts)
        
        // Calculate rates (simplified)
        // In production, you'd want to track these over time windows
        this.metricsData.processingRate = counts.active / (interval / 1000)
        this.metricsData.errorRate = counts.failed / (interval / 1000)
      } catch (error) {
        console.error('Failed to collect metrics:', error)
      }
    }, interval)
  }
}