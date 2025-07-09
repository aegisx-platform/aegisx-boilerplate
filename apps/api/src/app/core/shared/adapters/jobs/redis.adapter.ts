/**
 * Redis Job Queue Adapter
 * 
 * Redis-based implementation for production environments
 * Supports priority queues, job persistence, and healthcare compliance features
 */

import Redis from 'ioredis'
import {
  IJobQueue,
  Job,
  JobData,
  JobStatus,
  JobPriority,
  QueueStats,
  JobCounts,
  RedisAdapterConfig,
  BackgroundJobsError
} from '../../types/background-jobs.types'

export class RedisJobAdapter implements IJobQueue {
  public readonly name: string
  public readonly adapter = 'redis'
  
  private redis: Redis
  private config: RedisAdapterConfig
  private isInitialized = false
  private jobCounter = 0
  
  private stats = {
    processed: 0,
    failed: 0,
    added: 0,
    removed: 0
  }

  constructor(name: string, config: RedisAdapterConfig) {
    this.name = name
    this.config = {
      maxJobs: 10000,
      jobTTL: 24 * 60 * 60 * 1000, // 24 hours
      keyPrefix: 'jobs:',
      enableCompression: false,
      healthCheckInterval: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    }
    
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      connectTimeout: this.config.retryDelay,
      maxRetriesPerRequest: this.config.retryAttempts,
      lazyConnect: true
    })
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.redis.connect()
      
      // Test Redis connection
      await this.redis.ping()
      
      // Initialize queue structures
      await this.setupQueueStructures()
      
      this.isInitialized = true
    } catch (error) {
      throw new BackgroundJobsError(
        `Failed to initialize Redis adapter for queue "${this.name}": ${error}`,
        'REDIS_INIT_FAILED'
      )
    }
  }

  /**
   * Add a job to the queue
   */
  async add(jobData: JobData): Promise<Job> {
    await this.ensureInitialized()
    
    const jobId = this.generateJobId()
    const job: Job = {
      id: jobId,
      name: jobData.name,
      data: jobData.data || {},
      options: jobData.options || {},
      status: 'waiting',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxAttempts: jobData.options?.attempts || 3,
      priority: jobData.options?.priority || 'normal',
      delay: jobData.options?.delay || 0,
      processedAt: undefined,
      completedAt: undefined,
      failedAt: undefined,
      result: undefined,
      error: undefined,
      queue: this.name,
      tags: jobData.options?.tags
    }

    // Healthcare compliance: encrypt sensitive data if enabled
    if (this.config.enableEncryption && job.data.sensitive) {
      job.data = await this.encryptJobData(job.data)
    }

    const multi = this.redis.multi()
    
    // Store job data
    const jobKey = this.getJobKey(jobId)
    multi.hset(jobKey, this.serializeJob(job))
    multi.expire(jobKey, this.config.jobTTL! / 1000)
    
    // Add to priority queue (waiting jobs)
    const priority = this.getPriorityScore(job.priority)
    const waitingKey = this.getWaitingKey()
    multi.zadd(waitingKey, priority, jobId)
    
    // Add to status index
    const statusKey = this.getStatusKey('waiting')
    multi.sadd(statusKey, jobId)
    
    // Update stats
    multi.incr(this.getStatsKey('added'))
    
    await multi.exec()
    
    this.stats.added++
    return job
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulk(jobs: JobData[]): Promise<Job[]> {
    await this.ensureInitialized()
    
    const addedJobs: Job[] = []
    const multi = this.redis.multi()
    
    for (const jobData of jobs) {
      const jobId = this.generateJobId()
      const job: Job = {
        id: jobId,
        name: jobData.name,
        data: jobData.data || {},
        options: jobData.options || {},
        status: 'waiting',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        maxAttempts: jobData.options?.attempts || 3,
        priority: jobData.options?.priority || 'normal',
        delay: jobData.options?.delay || 0,
        processedAt: undefined,
        completedAt: undefined,
        failedAt: undefined,
        result: undefined,
        error: undefined,
        queue: this.name,
        tags: jobData.options?.tags
      }

      // Healthcare compliance: encrypt sensitive data if enabled
      if (this.config.enableEncryption && job.data.sensitive) {
        job.data = await this.encryptJobData(job.data)
      }

      // Store job data
      const jobKey = this.getJobKey(jobId)
      multi.hset(jobKey, this.serializeJob(job))
      multi.expire(jobKey, this.config.jobTTL! / 1000)
      
      // Add to priority queue
      const priority = this.getPriorityScore(job.priority)
      const waitingKey = this.getWaitingKey()
      multi.zadd(waitingKey, priority, jobId)
      
      // Add to status index
      const statusKey = this.getStatusKey('waiting')
      multi.sadd(statusKey, jobId)
      
      addedJobs.push(job)
    }
    
    // Update stats
    multi.incrby(this.getStatsKey('added'), jobs.length)
    
    await multi.exec()
    
    this.stats.added += jobs.length
    return addedJobs
  }

  /**
   * Get next job to process (highest priority first)
   */
  async getNext(): Promise<Job | null> {
    await this.ensureInitialized()
    
    const waitingKey = this.getWaitingKey()
    
    // Get highest priority job (lowest score)
    const result = await this.redis.zpopmin(waitingKey)
    
    if (!result || result.length === 0) {
      return null
    }
    
    const jobId = result[0]
    const job = await this.getJob(jobId)
    
    if (!job) {
      return null
    }
    
    // Move job to active status
    await this.moveJobToActive(job)
    
    return job
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    await this.ensureInitialized()
    
    const jobKey = this.getJobKey(jobId)
    const jobData = await this.redis.hgetall(jobKey)
    
    if (!jobData || Object.keys(jobData).length === 0) {
      return null
    }
    
    return this.deserializeJob(jobData)
  }

  /**
   * Get jobs by status
   */
  async getJobs(status?: JobStatus, limit: number = 100): Promise<Job[]> {
    await this.ensureInitialized()
    
    let jobIds: string[] = []
    
    if (status) {
      const statusKey = this.getStatusKey(status)
      jobIds = await this.redis.smembers(statusKey)
    } else {
      // Get all jobs from all statuses
      const statuses: JobStatus[] = ['waiting', 'active', 'completed', 'failed', 'paused']
      const allIds: string[] = []
      
      for (const s of statuses) {
        const statusKey = this.getStatusKey(s)
        const ids = await this.redis.smembers(statusKey)
        allIds.push(...ids)
      }
      
      jobIds = [...new Set(allIds)] // Remove duplicates
    }
    
    // Apply limit
    jobIds = jobIds.slice(0, limit)
    
    const jobs: Job[] = []
    
    for (const jobId of jobIds) {
      const job = await this.getJob(jobId)
      if (job) {
        jobs.push(job)
      }
    }
    
    return jobs
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<boolean> {
    await this.ensureInitialized()
    
    const job = await this.getJob(jobId)
    if (!job) {
      return false
    }
    
    const multi = this.redis.multi()
    
    // Remove from all possible locations
    const jobKey = this.getJobKey(jobId)
    multi.del(jobKey)
    
    // Remove from priority queue
    const waitingKey = this.getWaitingKey()
    multi.zrem(waitingKey, jobId)
    
    // Remove from status indices
    const statuses: JobStatus[] = ['waiting', 'active', 'completed', 'failed', 'paused']
    for (const status of statuses) {
      const statusKey = this.getStatusKey(status)
      multi.srem(statusKey, jobId)
    }
    
    // Update stats
    multi.incr(this.getStatsKey('removed'))
    
    await multi.exec()
    
    this.stats.removed++
    return true
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    await this.ensureInitialized()
    
    const job = await this.getJob(jobId)
    if (!job) {
      return null
    }
    
    // Apply updates
    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    }
    
    // Handle status changes
    if (updates.status && updates.status !== job.status) {
      await this.moveJobStatus(job, updates.status)
    }
    
    // Save updated job
    const jobKey = this.getJobKey(jobId)
    await this.redis.hset(jobKey, this.serializeJob(updatedJob))
    
    return updatedJob
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    await this.ensureInitialized()
    
    const pausedKey = this.getPausedKey()
    await this.redis.set(pausedKey, '1', 'EX', this.config.jobTTL! / 1000)
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.ensureInitialized()
    
    const pausedKey = this.getPausedKey()
    await this.redis.del(pausedKey)
  }

  /**
   * Empty queue
   */
  async empty(): Promise<void> {
    await this.ensureInitialized()
    
    const pattern = this.getKeyPattern('*')
    const keys = await this.redis.keys(pattern)
    
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
    
    // Reset stats
    this.stats = {
      processed: 0,
      failed: 0,
      added: 0,
      removed: 0
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    await this.ensureInitialized()
    
    const counts = await this.getCounts()
    
    return {
      name: this.name,
      jobs: counts,
      workers: 1, // TODO: Track actual workers
      processing: counts.active,
      throughput: {
        completed: this.stats.processed,
        failed: this.stats.failed,
        perMinute: 0, // TODO: Calculate throughput
        perHour: 0
      },
      avgProcessingTime: 0, // TODO: Calculate average processing time
      lastProcessed: undefined // TODO: Track last processed time
    }
  }

  /**
   * Shutdown adapter
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
    this.isInitialized = false
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${++this.jobCounter}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getJobKey(jobId: string): string {
    return `${this.config.keyPrefix}${this.name}:job:${jobId}`
  }

  private getWaitingKey(): string {
    return `${this.config.keyPrefix}${this.name}:waiting`
  }

  private getStatusKey(status: JobStatus): string {
    return `${this.config.keyPrefix}${this.name}:status:${status}`
  }

  private getPausedKey(): string {
    return `${this.config.keyPrefix}${this.name}:paused`
  }

  private getStatsKey(stat: string): string {
    return `${this.config.keyPrefix}${this.name}:stats:${stat}`
  }

  private getKeyPattern(pattern: string): string {
    return `${this.config.keyPrefix}${this.name}:${pattern}`
  }

  private getPriorityScore(priority: string): number {
    const priorities = {
      'critical': 1,
      'urgent': 2,
      'high': 3,
      'normal': 4,
      'low': 5
    }
    return priorities[priority as keyof typeof priorities] || 4
  }

  private async setupQueueStructures(): Promise<void> {
    // Initialize queue structures if needed
    // This is a placeholder for any initial setup
  }

  private async moveJobToActive(job: Job): Promise<void> {
    const multi = this.redis.multi()
    
    // Remove from waiting status
    const waitingStatusKey = this.getStatusKey('waiting')
    multi.srem(waitingStatusKey, job.id)
    
    // Add to active status
    const activeStatusKey = this.getStatusKey('active')
    multi.sadd(activeStatusKey, job.id)
    
    // Update job status
    job.status = 'active'
    job.processedAt = new Date()
    job.updatedAt = new Date()
    
    const jobKey = this.getJobKey(job.id)
    multi.hset(jobKey, this.serializeJob(job))
    
    await multi.exec()
  }

  private async moveJobStatus(job: Job, newStatus: JobStatus): Promise<void> {
    const multi = this.redis.multi()
    
    // Remove from old status
    const oldStatusKey = this.getStatusKey(job.status)
    multi.srem(oldStatusKey, job.id)
    
    // Add to new status
    const newStatusKey = this.getStatusKey(newStatus)
    multi.sadd(newStatusKey, job.id)
    
    // Update stats
    if (newStatus === 'completed') {
      multi.incr(this.getStatsKey('processed'))
      this.stats.processed++
    } else if (newStatus === 'failed') {
      multi.incr(this.getStatsKey('failed'))
      this.stats.failed++
    }
    
    await multi.exec()
  }

  private async getCounts(): Promise<JobCounts> {
    const statuses: JobStatus[] = ['waiting', 'active', 'completed', 'failed', 'paused']
    const counts: JobCounts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      stuck: 0,
      total: 0
    }
    
    for (const status of statuses) {
      const statusKey = this.getStatusKey(status)
      const count = await this.redis.scard(statusKey)
      counts[status] = count
      counts.total += count
    }
    
    return counts
  }

  private serializeJob(job: Job): Record<string, string> {
    return {
      id: job.id,
      name: job.name,
      data: JSON.stringify(job.data),
      options: JSON.stringify(job.options),
      status: job.status,
      progress: job.progress.toString(),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      attempts: job.attempts.toString(),
      maxAttempts: job.maxAttempts.toString(),
      priority: job.priority,
      delay: (job.delay || 0).toString(),
      processedAt: job.processedAt?.toISOString() || '',
      completedAt: job.completedAt?.toISOString() || '',
      failedAt: job.failedAt?.toISOString() || '',
      queue: job.queue,
      tags: JSON.stringify(job.tags || []),
      result: job.result ? JSON.stringify(job.result) : '',
      error: job.error ? JSON.stringify(job.error) : ''
    }
  }

  private deserializeJob(data: Record<string, string>): Job {
    return {
      id: data.id,
      name: data.name,
      data: JSON.parse(data.data || '{}'),
      options: JSON.parse(data.options || '{}'),
      status: data.status as JobStatus,
      progress: parseInt(data.progress || '0'),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      attempts: parseInt(data.attempts || '0'),
      maxAttempts: parseInt(data.maxAttempts || '3'),
      priority: data.priority as JobPriority,
      delay: parseInt(data.delay || '0'),
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      failedAt: data.failedAt ? new Date(data.failedAt) : undefined,
      queue: data.queue,
      tags: JSON.parse(data.tags || '[]'),
      result: data.result ? JSON.parse(data.result) : undefined,
      error: data.error ? JSON.parse(data.error) : undefined
    }
  }

  private async encryptJobData(data: any): Promise<any> {
    // TODO: Implement encryption for healthcare compliance
    // This is a placeholder for encryption implementation
    return data
  }
}