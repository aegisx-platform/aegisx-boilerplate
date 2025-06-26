/**
 * Job Worker
 * 
 * Handles job processing with concurrency control, error handling,
 * and comprehensive monitoring
 */

import { EventEmitter } from 'events'
import {
  IJobWorker,
  IJobQueue,
  Job,
  JobResult,
  JobHandler,
  WorkerStats,
  JobError,
  JobMiddleware,
  BackgroundJobsError,
  JobTimeoutError,
  WorkerError
} from '../types/background-jobs.types'

export class JobWorker extends EventEmitter implements IJobWorker {
  public readonly id: string
  public readonly queueName: string
  public readonly concurrency: number
  public isRunning = false

  private queue: IJobQueue
  private handlers: Map<string, JobHandler> = new Map()
  private middleware: JobMiddleware[] = []
  private activeJobs: Map<string, ActiveJob> = new Map()
  private stats: WorkerStats
  private pollInterval: NodeJS.Timeout | null = null
  private pollDelay: number = 1000 // 1 second
  private gracefulShutdown = false

  constructor(
    queue: IJobQueue,
    concurrency: number = 1,
    options: WorkerOptions = {}
  ) {
    super()
    
    this.id = options.id || `worker-${queue.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.queueName = queue.name
    this.queue = queue
    this.concurrency = Math.max(1, concurrency)
    this.pollDelay = options.pollDelay || 1000

    this.stats = {
      id: this.id,
      queueName: this.queueName,
      status: 'idle',
      processed: 0,
      failed: 0,
      avgProcessingTime: 0,
      uptime: 0
    }
  }

  /**
   * Register a job handler
   */
  registerHandler(jobName: string, handler: JobHandler): void {
    this.handlers.set(jobName, handler)
  }

  /**
   * Add middleware
   */
  use(middleware: JobMiddleware): void {
    this.middleware.push(middleware)
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new WorkerError(this.id, 'Worker is already running')
    }

    this.isRunning = true
    this.gracefulShutdown = false
    this.stats.status = 'idle'
    this.stats.uptime = Date.now()

    // Start polling for jobs
    this.startPolling()

    this.emit('worker.started', { workerId: this.id, queueName: this.queueName })
  }

  /**
   * Stop the worker
   */
  async stop(graceful: boolean = true): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.gracefulShutdown = graceful
    this.isRunning = false

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (graceful) {
      // Wait for active jobs to complete
      await this.waitForActiveJobs()
    } else {
      // Cancel active jobs
      await this.cancelActiveJobs()
    }

    this.stats.status = 'stopped'
    this.emit('worker.stopped', { workerId: this.id, queueName: this.queueName })
  }

  /**
   * Process a single job
   */
  async process(job: Job): Promise<JobResult> {
    const startTime = Date.now()
    
    try {
      // Check if we have a handler for this job
      const handler = this.handlers.get(job.name)
      if (!handler) {
        throw new BackgroundJobsError(
          `No handler registered for job type: ${job.name}`,
          'NO_HANDLER',
          this.queueName,
          job.id
        )
      }

      // Add to active jobs
      const activeJob: ActiveJob = {
        job,
        startTime,
        timeout: null
      }
      this.activeJobs.set(job.id, activeJob)

      // Set job timeout if specified
      if (job.options.timeout) {
        activeJob.timeout = setTimeout(() => {
          this.handleJobTimeout(job)
        }, job.options.timeout)
      }

      // Run beforeProcess middleware
      for (const middleware of this.middleware) {
        if (middleware.beforeProcess) {
          await middleware.beforeProcess(job)
        }
      }

      // Update job status
      job.status = 'active'
      job.processedAt = new Date()
      job.attempts++

      // Execute the handler
      const result = await handler(job)

      // Clear timeout
      if (activeJob.timeout) {
        clearTimeout(activeJob.timeout)
      }

      // Update job
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
      job.progress = 100

      const jobResult: JobResult = {
        success: true,
        result
      }

      // Run afterProcess middleware
      for (const middleware of this.middleware) {
        if (middleware.afterProcess) {
          await middleware.afterProcess(job, jobResult)
        }
      }

      // Update stats
      const duration = Date.now() - startTime
      this.updateStats(true, duration)

      // Remove from active jobs
      this.activeJobs.delete(job.id)

      this.emit('job.completed', { job, result, duration })

      return jobResult

    } catch (error) {
      return this.handleJobError(job, error, startTime)
    }
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    const now = Date.now()
    return {
      ...this.stats,
      uptime: this.isRunning ? now - this.stats.uptime : 0,
      status: this.activeJobs.size > 0 ? 'busy' : 'idle'
    }
  }

  /**
   * Start polling for jobs
   */
  private startPolling(): void {
    const poll = async () => {
      if (!this.isRunning || this.gracefulShutdown) {
        return
      }

      try {
        // Check if we can process more jobs
        if (this.activeJobs.size >= this.concurrency) {
          return
        }

        // Get next job
        const job = await this.queue.getNext()
        if (!job) {
          return
        }

        // Process job without waiting
        this.process(job).catch(error => {
          console.error(`Unhandled error in job processing:`, error)
        })

      } catch (error) {
        console.error(`Error polling for jobs:`, error)
        this.emit('worker.error', { workerId: this.id, error })
      }
    }

    // Initial poll
    poll()

    // Set up polling interval
    this.pollInterval = setInterval(poll, this.pollDelay)
  }

  /**
   * Handle job error
   */
  private async handleJobError(job: Job, error: any, startTime: number): Promise<JobResult> {
    const jobError: JobError = {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      isRetryable: this.isRetryableError(error),
      attempts: job.attempts
    }

    // Clear timeout if set
    const activeJob = this.activeJobs.get(job.id)
    if (activeJob?.timeout) {
      clearTimeout(activeJob.timeout)
    }

    // Check if we should retry
    const shouldRetry = this.shouldRetryJob(job, jobError)
    
    if (shouldRetry) {
      // Calculate retry delay
      const retryDelay = this.calculateRetryDelay(job)
      
      // Update job for retry
      job.status = 'waiting'
      job.delay = retryDelay
      job.error = jobError
      job.updatedAt = new Date()

      // Add back to queue with delay
      // This would typically be handled by the queue adapter
      
      this.emit('job.retry', { job, error: jobError, retryDelay })
    } else {
      // Job failed permanently
      job.status = 'failed'
      job.failedAt = new Date()
      job.error = jobError

      this.emit('job.failed', { job, error: jobError })
    }

    const jobResult: JobResult = {
      success: false,
      error: jobError
    }

    // Run error middleware
    for (const middleware of this.middleware) {
      if (middleware.onError) {
        try {
          await middleware.onError(job, jobError)
        } catch (middlewareError) {
          console.error(`Middleware error:`, middlewareError)
        }
      }
    }

    // Update stats
    const duration = Date.now() - startTime
    this.updateStats(false, duration)

    // Remove from active jobs
    this.activeJobs.delete(job.id)

    return jobResult
  }

  /**
   * Handle job timeout
   */
  private handleJobTimeout(job: Job): void {
    const error = new JobTimeoutError(job.id, job.options.timeout!)
    this.emit('job.timeout', { job, error })
    
    // The job will be handled as an error in the main processing flow
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Don't retry timeout errors by default
    if (error instanceof JobTimeoutError) {
      return false
    }

    // Don't retry validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return false
    }

    // Don't retry missing handler errors
    if (error.code === 'NO_HANDLER') {
      return false
    }

    // Default to retryable for other errors
    return true
  }

  /**
   * Check if job should be retried
   */
  private shouldRetryJob(job: Job, error: JobError): boolean {
    // Check if error is retryable
    if (!error.isRetryable) {
      return false
    }

    // Check retry filter if provided
    if (job.options.retryFilter && !job.options.retryFilter(error)) {
      return false
    }

    // Check max attempts
    if (job.attempts >= job.maxAttempts) {
      return false
    }

    return true
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(job: Job): number {
    const baseDelay = job.options.retryDelay || 1000
    const backoff = job.options.retryBackoff || 'exponential'
    const attempt = job.attempts

    switch (backoff) {
      case 'fixed':
        return baseDelay

      case 'linear':
        return baseDelay * attempt

      case 'exponential':
      default:
        return baseDelay * Math.pow(2, attempt - 1)
    }
  }

  /**
   * Update worker statistics
   */
  private updateStats(success: boolean, duration: number): void {
    if (success) {
      this.stats.processed++
    } else {
      this.stats.failed++
    }

    // Update average processing time
    const totalJobs = this.stats.processed + this.stats.failed
    this.stats.avgProcessingTime = (
      (this.stats.avgProcessingTime * (totalJobs - 1)) + duration
    ) / totalJobs

    // Update last job info
    this.stats.lastJob = {
      name: '', // Would need to pass job name
      completedAt: new Date(),
      duration
    }
  }

  /**
   * Wait for active jobs to complete
   */
  private async waitForActiveJobs(timeout: number = 30000): Promise<void> {
    if (this.activeJobs.size === 0) {
      return
    }

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.activeJobs.size === 0) {
          clearInterval(checkInterval)
          clearTimeout(timeoutTimer)
          resolve()
        }
      }, 100)

      const timeoutTimer = setTimeout(() => {
        clearInterval(checkInterval)
        reject(new WorkerError(this.id, `Timeout waiting for ${this.activeJobs.size} active jobs to complete`))
      }, timeout)
    })
  }

  /**
   * Cancel active jobs
   */
  private async cancelActiveJobs(): Promise<void> {
    for (const [, activeJob] of this.activeJobs.entries()) {
      if (activeJob.timeout) {
        clearTimeout(activeJob.timeout)
      }
      
      // Update job status
      activeJob.job.status = 'failed'
      activeJob.job.failedAt = new Date()
      activeJob.job.error = {
        name: 'WorkerShutdownError',
        message: 'Job cancelled due to worker shutdown',
        isRetryable: true,
        attempts: activeJob.job.attempts
      }

      this.emit('job.cancelled', { job: activeJob.job })
    }

    this.activeJobs.clear()
  }
}

// Supporting types
interface ActiveJob {
  job: Job
  startTime: number
  timeout: NodeJS.Timeout | null
}

export interface WorkerOptions {
  id?: string
  pollDelay?: number
}

// Built-in middleware
export class LoggingMiddleware implements JobMiddleware {
  name = 'logging'

  async beforeProcess(job: Job): Promise<void> {
    console.log(`[Job ${job.id}] Starting ${job.name}`, {
      jobId: job.id,
      jobName: job.name,
      attempts: job.attempts,
      data: job.data
    })
  }

  async afterProcess(job: Job, result: JobResult): Promise<void> {
    if (result.success) {
      console.log(`[Job ${job.id}] Completed successfully`, {
        jobId: job.id,
        jobName: job.name,
        duration: job.completedAt!.getTime() - job.processedAt!.getTime()
      })
    }
  }

  async onError(job: Job, error: JobError): Promise<void> {
    console.error(`[Job ${job.id}] Failed`, {
      jobId: job.id,
      jobName: job.name,
      attempts: job.attempts,
      error: error.message,
      isRetryable: error.isRetryable
    })
  }
}

export class MetricsMiddleware implements JobMiddleware {
  name = 'metrics'
  private metrics: Map<string, JobMetrics> = new Map()

  async beforeProcess(job: Job): Promise<void> {
    const metric = this.getOrCreateMetric(job.name)
    metric.started++
  }

  async afterProcess(job: Job, result: JobResult): Promise<void> {
    const metric = this.getOrCreateMetric(job.name)
    const duration = job.completedAt!.getTime() - job.processedAt!.getTime()
    
    if (result.success) {
      metric.completed++
      metric.totalDuration += duration
      metric.avgDuration = metric.totalDuration / metric.completed
    }
  }

  async onError(job: Job, error: JobError): Promise<void> {
    const metric = this.getOrCreateMetric(job.name)
    metric.failed++
  }

  getMetrics(): Map<string, JobMetrics> {
    return new Map(this.metrics)
  }

  private getOrCreateMetric(jobName: string): JobMetrics {
    if (!this.metrics.has(jobName)) {
      this.metrics.set(jobName, {
        jobName,
        started: 0,
        completed: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0
      })
    }
    return this.metrics.get(jobName)!
  }
}

export interface JobMetrics {
  jobName: string
  started: number
  completed: number
  failed: number
  totalDuration: number
  avgDuration: number
}