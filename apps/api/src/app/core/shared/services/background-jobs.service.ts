/**
 * Background Jobs Service
 * 
 * Main job manager that orchestrates queues, workers, and scheduling
 * with comprehensive monitoring and healthcare-specific features
 */

import { EventEmitter } from 'events'
import {
  IJobManager,
  IJobQueue,
  IJobWorker,
  Job,
  JobData,
  BulkJobData,
  JobOptions,
  JobStatus,
  JobCounts,
  JobHandler,
  Schedule,
  ScheduleOptions,
  QueueHealth,
  WorkerStats,
  BackgroundJobsConfig,
  QueueAdapterConfig,
  BackgroundJobsError,
  JobNotFoundError,
  QueueNotFoundError,
  DefaultBackgroundJobsConfig
} from '../types/background-jobs.types'
import { JobScheduler } from '../utils/job-scheduler'
import { JobWorker, LoggingMiddleware, MetricsMiddleware } from '../workers/job-worker'
import { MemoryJobAdapter } from '../adapters/jobs/memory.adapter'

export class BackgroundJobsService extends EventEmitter implements IJobManager {
  private config: BackgroundJobsConfig
  private queues: Map<string, IJobQueue> = new Map()
  private workers: Map<string, IJobWorker[]> = new Map()
  private scheduler: JobScheduler = new JobScheduler()
  private isStarted = false
  private cleanupInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<BackgroundJobsConfig> = {}) {
    super()
    
    this.config = {
      ...DefaultBackgroundJobsConfig,
      ...config
    } as BackgroundJobsConfig

    // Ensure default queue exists
    if (!this.config.queues) {
      this.config.queues = {}
    }
    
    if (!this.config.queues[this.config.defaultQueue]) {
      this.config.queues[this.config.defaultQueue] = {
        adapter: { type: 'memory' },
        workers: 1,
        concurrency: 1
      }
    }
  }

  /**
   * Add a job to the queue
   */
  async add(name: string, data?: any, options?: JobOptions): Promise<Job> {
    const queueName = options?.queue || this.config.defaultQueue
    const queue = this.getQueue(queueName)
    
    const jobData: JobData = {
      name,
      data,
      options: {
        ...options,
        attempts: options?.attempts || this.config.settings?.defaultMaxAttempts || 3,
        timeout: options?.timeout || this.config.settings?.defaultJobTimeout || 300000,
        ttl: options?.ttl || this.config.settings?.defaultJobTTL || 86400000
      }
    }

    const job = await queue.add(jobData)
    
    this.emit('job.added', { job })
    
    return job
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulk(jobs: BulkJobData[]): Promise<Job[]> {
    // Group jobs by queue
    const jobsByQueue = new Map<string, BulkJobData[]>()
    
    for (const jobData of jobs) {
      const queueName = jobData.options?.queue || this.config.defaultQueue
      if (!jobsByQueue.has(queueName)) {
        jobsByQueue.set(queueName, [])
      }
      jobsByQueue.get(queueName)!.push(jobData)
    }

    // Add to respective queues
    const allJobs: Job[] = []
    
    for (const [queueName, queueJobs] of jobsByQueue.entries()) {
      const queue = this.getQueue(queueName)
      const jobs = await queue.addBulk(queueJobs.map(job => ({
        name: job.name,
        data: job.data,
        options: {
          ...job.options,
          attempts: job.options?.attempts || this.config.settings?.defaultMaxAttempts || 3,
          timeout: job.options?.timeout || this.config.settings?.defaultJobTimeout || 300000,
          ttl: job.options?.ttl || this.config.settings?.defaultJobTTL || 86400000
        }
      })))
      
      allJobs.push(...jobs)
    }

    this.emit('jobs.bulk-added', { jobs: allJobs, count: allJobs.length })

    return allJobs
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    // Search across all queues
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId)
      if (job) {
        return job
      }
    }
    
    return null
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string): Promise<boolean> {
    // Search across all queues
    for (const queue of this.queues.values()) {
      const removed = await queue.removeJob(jobId)
      if (removed) {
        this.emit('job.removed', { jobId })
        return true
      }
    }
    
    return false
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<Job> {
    const job = await this.getJob(jobId)
    if (!job) {
      throw new JobNotFoundError(jobId)
    }

    if (job.status !== 'failed') {
      throw new BackgroundJobsError(
        `Job ${jobId} is not in failed state (current: ${job.status})`,
        'INVALID_JOB_STATE',
        job.queue,
        jobId
      )
    }

    // Reset job for retry
    job.status = 'waiting'
    job.attempts = 0
    job.error = undefined
    job.updatedAt = new Date()

    // Update in queue
    const queue = this.getQueue(job.queue)
    const updatedJob = await queue.updateJob(jobId, job)
    
    if (!updatedJob) {
      throw new JobNotFoundError(jobId)
    }

    this.emit('job.retried', { job: updatedJob })

    return updatedJob
  }

  /**
   * Get jobs by status
   */
  async getJobs(status?: JobStatus, limit: number = 100): Promise<Job[]> {
    const allJobs: Job[] = []
    
    for (const queue of this.queues.values()) {
      const jobs = await queue.getJobs(status, limit)
      allJobs.push(...jobs)
    }

    // Sort by creation time (newest first) and apply limit
    allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    return allJobs.slice(0, limit)
  }

  /**
   * Get job counts across all queues
   */
  async getJobCounts(): Promise<JobCounts> {
    const totalCounts: JobCounts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      stuck: 0,
      total: 0
    }

    for (const queue of this.queues.values()) {
      const stats = await queue.getStats()
      totalCounts.waiting += stats.jobs.waiting
      totalCounts.active += stats.jobs.active
      totalCounts.completed += stats.jobs.completed
      totalCounts.failed += stats.jobs.failed
      totalCounts.delayed += stats.jobs.delayed
      totalCounts.paused += stats.jobs.paused
      totalCounts.stuck += stats.jobs.stuck
      totalCounts.total += stats.jobs.total
    }

    return totalCounts
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName?: string): Promise<void> {
    if (queueName) {
      const queue = this.getQueue(queueName)
      await queue.pause()
      this.emit('queue.paused', { queueName })
    } else {
      // Pause all queues
      for (const [name, queue] of this.queues.entries()) {
        await queue.pause()
        this.emit('queue.paused', { queueName: name })
      }
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName?: string): Promise<void> {
    if (queueName) {
      const queue = this.getQueue(queueName)
      await queue.resume()
      this.emit('queue.resumed', { queueName })
    } else {
      // Resume all queues
      for (const [name, queue] of this.queues.entries()) {
        await queue.resume()
        this.emit('queue.resumed', { queueName: name })
      }
    }
  }

  /**
   * Empty a queue
   */
  async emptyQueue(queueName?: string): Promise<void> {
    if (queueName) {
      const queue = this.getQueue(queueName)
      await queue.empty()
      this.emit('queue.emptied', { queueName })
    } else {
      // Empty all queues
      for (const [name, queue] of this.queues.entries()) {
        await queue.empty()
        this.emit('queue.emptied', { queueName: name })
      }
    }
  }

  /**
   * Schedule a recurring job
   */
  async schedule(
    name: string,
    cronExpression: string,
    data?: any,
    options?: ScheduleOptions
  ): Promise<string> {
    const scheduleId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const schedule = this.scheduler.addSchedule(
      scheduleId,
      name,
      cronExpression,
      data,
      options,
      async (schedule) => {
        // Add job to queue when scheduled
        await this.add(schedule.name, schedule.data, {
          ...schedule.options,
          tags: [...(schedule.options?.tags || []), 'scheduled'],
          metadata: {
            ...(schedule.options?.metadata || {}),
            scheduleId: schedule.id,
            scheduledAt: new Date()
          }
        })
      }
    )

    this.emit('schedule.added', { schedule })

    return scheduleId
  }

  /**
   * Remove a schedule
   */
  async unschedule(scheduleId: string): Promise<boolean> {
    const removed = this.scheduler.removeSchedule(scheduleId)
    
    if (removed) {
      this.emit('schedule.removed', { scheduleId })
    }
    
    return removed
  }

  /**
   * Get all schedules
   */
  async getSchedules(): Promise<Schedule[]> {
    return this.scheduler.getSchedules()
  }

  /**
   * Register a job processor
   */
  process(name: string, handler: JobHandler): void {
    this.processWithConcurrency(name, 1, handler)
  }

  /**
   * Register a job processor with concurrency
   */
  processWithConcurrency(name: string, concurrency: number, handler: JobHandler): void {
    // Register handler with all workers that process this queue
    for (const workers of this.workers.values()) {
      for (const worker of workers) {
        if (worker instanceof JobWorker) {
          worker.registerHandler(name, handler)
        }
      }
    }

    this.emit('handler.registered', { jobName: name, concurrency })
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<QueueHealth> {
    const queues: QueueHealth['queues'] = {}
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    for (const [queueName, queue] of this.queues.entries()) {
      const stats = await queue.getStats()
      
      // Determine queue health
      let queueStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      const issues: string[] = []

      // Check for stuck jobs
      if (stats.jobs.stuck > 0) {
        queueStatus = 'degraded'
        issues.push(`${stats.jobs.stuck} stuck jobs`)
      }

      // Check failure rate
      const totalProcessed = stats.throughput.completed + stats.throughput.failed
      if (totalProcessed > 0) {
        const failureRate = stats.throughput.failed / totalProcessed
        if (failureRate > 0.5) {
          queueStatus = 'unhealthy'
          issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`)
        } else if (failureRate > 0.2) {
          queueStatus = 'degraded'
          issues.push(`Elevated failure rate: ${(failureRate * 100).toFixed(1)}%`)
        }
      }

      // Check processing lag
      if (stats.lastProcessed) {
        const lagMs = Date.now() - stats.lastProcessed.getTime()
        if (lagMs > 300000) { // 5 minutes
          queueStatus = 'degraded'
          issues.push(`Processing lag: ${Math.round(lagMs / 60000)} minutes`)
        }
      }

      queues[queueName] = {
        status: queueStatus,
        stats,
        issues: issues.length > 0 ? issues : undefined
      }

      // Update overall status
      if (queueStatus === 'unhealthy') {
        overallStatus = 'unhealthy'
      } else if (queueStatus === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }

    // Get worker stats
    const workers: WorkerStats[] = []
    for (const workerList of this.workers.values()) {
      for (const worker of workerList) {
        workers.push(worker.getStats())
      }
    }

    return {
      status: overallStatus,
      queues,
      workers,
      uptime: this.isStarted ? Date.now() - (this.startTime || 0) : 0,
      lastChecked: new Date()
    }
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<WorkerStats[]> {
    const stats: WorkerStats[] = []
    
    for (const workerList of this.workers.values()) {
      for (const worker of workerList) {
        stats.push(worker.getStats())
      }
    }

    return stats
  }

  /**
   * Start the job manager
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return
    }

    // Initialize queues
    await this.initializeQueues()

    // Start workers
    await this.startWorkers()

    // Start scheduler
    this.scheduler.start()

    // Start cleanup and monitoring
    this.startCleanup()
    this.startHealthCheck()

    this.isStarted = true
    this.startTime = Date.now()

    this.emit('manager.started')
  }

  /**
   * Stop the job manager
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return
    }

    // Stop scheduler
    this.scheduler.stop()

    // Stop workers
    await this.stopWorkers()

    // Stop cleanup and monitoring
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    this.isStarted = false

    this.emit('manager.stopped')
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.stop()

    // Shutdown queues
    for (const queue of this.queues.values()) {
      await queue.shutdown()
    }

    this.queues.clear()
    this.workers.clear()

    this.emit('manager.shutdown')
  }

  // Private members
  private startTime?: number

  /**
   * Get queue by name
   */
  private getQueue(queueName: string): IJobQueue {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new QueueNotFoundError(queueName)
    }
    return queue
  }

  /**
   * Initialize all configured queues
   */
  private async initializeQueues(): Promise<void> {
    for (const [queueName, queueConfig] of Object.entries(this.config.queues)) {
      const queue = await this.createQueue(queueName, queueConfig.adapter)
      await queue.initialize()
      this.queues.set(queueName, queue)
    }
  }

  /**
   * Create a queue adapter
   */
  private async createQueue(queueName: string, config: QueueAdapterConfig): Promise<IJobQueue> {
    switch (config.type) {
      case 'memory':
        return new MemoryJobAdapter(queueName, config.options)

      case 'redis':
        // Would create Redis adapter
        throw new BackgroundJobsError('Redis adapter not implemented yet', 'ADAPTER_NOT_IMPLEMENTED')

      case 'rabbitmq':
        // Would create RabbitMQ adapter
        throw new BackgroundJobsError('RabbitMQ adapter not implemented yet', 'ADAPTER_NOT_IMPLEMENTED')

      case 'database':
        // Would create Database adapter
        throw new BackgroundJobsError('Database adapter not implemented yet', 'ADAPTER_NOT_IMPLEMENTED')

      default:
        throw new BackgroundJobsError(
          `Unknown queue adapter type: ${config.type}`,
          'UNKNOWN_ADAPTER_TYPE'
        )
    }
  }

  /**
   * Start workers for all queues
   */
  private async startWorkers(): Promise<void> {
    for (const [queueName, queueConfig] of Object.entries(this.config.queues)) {
      const queue = this.getQueue(queueName)
      const workerCount = queueConfig.workers || 1
      const concurrency = queueConfig.concurrency || 1

      const workers: IJobWorker[] = []

      for (let i = 0; i < workerCount; i++) {
        const worker = new JobWorker(queue, concurrency, {
          id: `${queueName}-worker-${i + 1}`
        })

        // Add default middleware
        worker.use(new LoggingMiddleware())
        worker.use(new MetricsMiddleware())

        // Forward worker events
        worker.on('job.completed', (event) => this.emit('job.completed', event))
        worker.on('job.failed', (event) => this.emit('job.failed', event))
        worker.on('job.retry', (event) => this.emit('job.retry', event))

        await worker.start()
        workers.push(worker)
      }

      this.workers.set(queueName, workers)
    }
  }

  /**
   * Stop all workers
   */
  private async stopWorkers(): Promise<void> {
    for (const workerList of this.workers.values()) {
      await Promise.all(workerList.map(worker => worker.stop()))
    }
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    if (!this.config.settings?.cleanupInterval) {
      return
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.runCleanup()
      } catch (error) {
        this.emit('cleanup.error', { error })
      }
    }, this.config.settings.cleanupInterval)
  }

  /**
   * Run cleanup process
   */
  private async runCleanup(): Promise<void> {
    let totalCleaned = 0

    for (const queue of this.queues.values()) {
      if (queue instanceof MemoryJobAdapter) {
        const cleaned = await queue.cleanup()
        totalCleaned += cleaned
      }
    }

    if (totalCleaned > 0) {
      this.emit('cleanup.completed', { jobsCleaned: totalCleaned })
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    if (!this.config.monitoring?.enabled || !this.config.monitoring.healthCheckInterval) {
      return
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getQueueHealth()
        this.emit('health.check', { health })
      } catch (error) {
        this.emit('health.error', { error })
      }
    }, this.config.monitoring.healthCheckInterval)
  }
}

// Healthcare-specific job processors
export const HealthcareJobProcessors = {
  /**
   * Patient registration processor
   */
  PATIENT_REGISTRATION: async (job: Job) => {
    const { patientInfo, facilityId, registrationSource } = job.data
    
    // Simulate patient registration process
    console.log(`Registering patient: ${patientInfo.firstName} ${patientInfo.lastName}`)
    
    // Update progress
    job.progress = 50
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    job.progress = 100
    
    return {
      patientId: `PAT-${Date.now()}`,
      registrationDate: new Date(),
      facilityId,
      source: registrationSource
    }
  },

  /**
   * Appointment reminder processor
   */
  APPOINTMENT_REMINDER: async (job: Job) => {
    const { appointmentId, patientId, reminderType } = job.data
    
    console.log(`Sending ${reminderType} reminder for appointment ${appointmentId}`)
    
    // Simulate sending reminder
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      reminderSent: true,
      sentAt: new Date(),
      reminderType,
      appointmentId,
      patientId
    }
  },

  /**
   * Report generation processor
   */
  REPORT_GENERATION: async (job: Job) => {
    const { reportType, facilityId, outputFormat } = job.data
    
    console.log(`Generating ${reportType} report for facility ${facilityId}`)
    
    // Simulate report generation
    for (let i = 0; i <= 100; i += 10) {
      job.progress = i
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    return {
      reportId: `REP-${Date.now()}`,
      reportType,
      facilityId,
      generatedAt: new Date(),
      format: outputFormat,
      fileSize: Math.floor(Math.random() * 1000000) // Simulated file size
    }
  }
}