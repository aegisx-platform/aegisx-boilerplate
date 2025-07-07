/**
 * Memory Job Queue Adapter
 * 
 * In-memory implementation for development and testing
 * Supports job persistence to disk and basic queue operations
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import {
  IJobQueue,
  Job,
  JobData,
  JobStatus,
  QueueStats,
  JobCounts,
  MemoryAdapterConfig,
  BackgroundJobsError
} from '../../types/background-jobs.types'

export class MemoryJobAdapter implements IJobQueue {
  public readonly name: string
  public readonly adapter = 'memory'
  
  private jobs: Map<string, Job> = new Map()
  private waitingJobs: string[] = []
  private config: MemoryAdapterConfig
  private isInitialized = false
  private jobCounter = 0
  
  private stats = {
    processed: 0,
    failed: 0,
    added: 0,
    removed: 0
  }

  constructor(name: string, config: MemoryAdapterConfig = {}) {
    this.name = name
    this.config = {
      maxJobs: 10000,
      persistToDisk: false,
      storageFile: path.join(process.cwd(), `queue-${name}.json`),
      ...config
    }
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Load jobs from disk if persistence is enabled
    if (this.config.persistToDisk && this.config.storageFile) {
      await this.loadFromDisk()
    }

    this.isInitialized = true
  }

  /**
   * Add a single job to the queue
   */
  async add(jobData: JobData): Promise<Job> {
    this.ensureInitialized()
    
    // Check job limit
    if (this.jobs.size >= this.config.maxJobs!) {
      throw new BackgroundJobsError(
        `Queue ${this.name} has reached maximum job limit: ${this.config.maxJobs}`,
        'QUEUE_FULL',
        this.name
      )
    }

    const job = this.createJob(jobData)
    
    // Set initial status based on delay
    if (job.delay && job.delay > 0) {
      job.status = 'delayed'
      // Schedule the job to become available
      setTimeout(() => {
        if (this.jobs.has(job.id) && job.status === 'delayed') {
          job.status = 'waiting'
          this.waitingJobs.push(job.id)
        }
      }, job.delay)
    } else {
      job.status = 'waiting'
      this.waitingJobs.push(job.id)
    }

    this.jobs.set(job.id, job)
    this.stats.added++

    // Persist to disk if enabled
    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }

    return job
  }

  /**
   * Add multiple jobs to the queue
   */
  async addBulk(jobsData: JobData[]): Promise<Job[]> {
    this.ensureInitialized()
    
    const jobs: Job[] = []
    
    for (const jobData of jobsData) {
      if (this.jobs.size >= this.config.maxJobs!) {
        throw new BackgroundJobsError(
          `Queue ${this.name} has reached maximum job limit: ${this.config.maxJobs}`,
          'QUEUE_FULL',
          this.name
        )
      }
      
      const job = this.createJob(jobData)
      
      if (job.delay && job.delay > 0) {
        job.status = 'delayed'
        setTimeout(() => {
          if (this.jobs.has(job.id) && job.status === 'delayed') {
            job.status = 'waiting'
            this.waitingJobs.push(job.id)
          }
        }, job.delay)
      } else {
        job.status = 'waiting'
        this.waitingJobs.push(job.id)
      }
      
      this.jobs.set(job.id, job)
      jobs.push(job)
    }
    
    this.stats.added += jobs.length

    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }

    return jobs
  }

  /**
   * Get the next available job from the queue
   */
  async getNext(): Promise<Job | null> {
    this.ensureInitialized()
    
    // Get jobs sorted by priority and creation time
    const availableJobs = this.waitingJobs
      .map(jobId => this.jobs.get(jobId))
      .filter((job): job is Job => job !== undefined && job.status === 'waiting')
      .sort((a, b) => {
        // Sort by priority first (critical > high > normal > low)
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
        const aPriority = priorityOrder[a.priority] || 2
        const bPriority = priorityOrder[b.priority] || 2
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // Then by creation time (FIFO)
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    if (availableJobs.length === 0) {
      return null
    }

    const job = availableJobs[0]
    job.status = 'active'
    job.processedAt = new Date()
    job.updatedAt = new Date()
    
    // Remove from waiting queue
    this.waitingJobs = this.waitingJobs.filter(id => id !== job.id)

    return job
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    this.ensureInitialized()
    return this.jobs.get(jobId) || null
  }

  /**
   * Get jobs by status with optional limit
   */
  async getJobs(status?: JobStatus, limit: number = 100): Promise<Job[]> {
    this.ensureInitialized()
    
    let jobs = Array.from(this.jobs.values())
    
    if (status) {
      jobs = jobs.filter(job => job.status === status)
    }
    
    // Sort by creation time (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    return jobs.slice(0, limit)
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<boolean> {
    this.ensureInitialized()
    
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    // Remove from jobs map
    this.jobs.delete(jobId)
    
    // Remove from waiting queue if present
    this.waitingJobs = this.waitingJobs.filter(id => id !== jobId)
    
    this.stats.removed++

    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }

    return true
  }

  /**
   * Update a job
   */
  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    this.ensureInitialized()
    
    const job = this.jobs.get(jobId)
    if (!job) {
      return null
    }

    // Apply updates
    Object.assign(job, updates, { 
      updatedAt: new Date(),
      id: job.id // Prevent ID changes
    })

    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }

    return job
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.ensureInitialized()
    // For memory adapter, we'll implement this by marking queue as paused
    // and not returning jobs from getNext()
    // This would typically be implemented with a flag
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.ensureInitialized()
    // Resume queue operations
  }

  /**
   * Empty the queue
   */
  async empty(): Promise<void> {
    this.ensureInitialized()
    
    this.jobs.clear()
    this.waitingJobs = []
    
    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    this.ensureInitialized()
    
    const counts = this.getJobCounts()
    
    // Calculate throughput (simplified for memory adapter)
    // const totalProcessed = this.stats.processed + this.stats.failed
    
    // Get average processing time
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'completed' && job.processedAt && job.completedAt)
    
    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.processedAt!.getTime()
          return sum + duration
        }, 0) / completedJobs.length
      : 0

    const lastProcessedJob = completedJobs
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0]

    return {
      name: this.name,
      jobs: counts,
      workers: 0, // Memory adapter doesn't track workers
      processing: counts.active,
      throughput: {
        completed: this.stats.processed,
        failed: this.stats.failed,
        perMinute: 0, // Would need time tracking for accurate calculation
        perHour: 0
      },
      avgProcessingTime,
      lastProcessed: lastProcessedJob?.completedAt
    }
  }

  /**
   * Shutdown the adapter
   */
  async shutdown(): Promise<void> {
    if (this.config.persistToDisk) {
      await this.saveToDisk()
    }
    
    this.jobs.clear()
    this.waitingJobs = []
    this.isInitialized = false
  }

  /**
   * Get job counts by status
   */
  private getJobCounts(): JobCounts {
    const counts: JobCounts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      stuck: 0,
      total: this.jobs.size
    }

    for (const job of Array.from(this.jobs.values())) {
      counts[job.status]++
    }

    return counts
  }

  /**
   * Create a new job from job data
   */
  private createJob(jobData: JobData): Job {
    const now = new Date()
    const jobId = jobData.options?.jobId || `${this.name}-${++this.jobCounter}-${Date.now()}`

    return {
      id: jobId,
      name: jobData.name,
      data: jobData.data || {},
      options: jobData.options || {},
      status: 'waiting',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      maxAttempts: jobData.options?.attempts || 3,
      delay: jobData.options?.delay,
      queue: this.name,
      priority: jobData.options?.priority || 'normal',
      tags: jobData.options?.tags,
      parentJobId: jobData.options?.parentJobId,
      patientId: jobData.options?.patientId,
      facilityId: jobData.options?.facilityId,
      operationType: jobData.options?.operationType
    }
  }

  /**
   * Load jobs from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.config.storageFile) return

    try {
      const data = await fs.readFile(this.config.storageFile, 'utf-8')
      const { jobs, waitingJobs, stats, jobCounter } = JSON.parse(data)

      // Restore jobs (convert date strings back to Date objects)
      this.jobs = new Map()
      for (const [id, jobData] of jobs) {
        const job = {
          ...jobData,
          createdAt: new Date(jobData.createdAt),
          updatedAt: new Date(jobData.updatedAt),
          processedAt: jobData.processedAt ? new Date(jobData.processedAt) : undefined,
          completedAt: jobData.completedAt ? new Date(jobData.completedAt) : undefined,
          failedAt: jobData.failedAt ? new Date(jobData.failedAt) : undefined
        }
        this.jobs.set(id, job)
      }

      this.waitingJobs = waitingJobs || []
      this.stats = { ...this.stats, ...stats }
      this.jobCounter = jobCounter || 0
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      if ((error as any).code !== 'ENOENT') {
        console.warn(`Failed to load jobs from disk: ${error}`)
      }
    }
  }

  /**
   * Save jobs to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.config.storageFile) return

    try {
      const data = {
        jobs: Array.from(this.jobs.entries()),
        waitingJobs: this.waitingJobs,
        stats: this.stats,
        jobCounter: this.jobCounter
      }

      await fs.writeFile(this.config.storageFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`Failed to save jobs to disk: ${error}`)
    }
  }

  /**
   * Ensure adapter is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new BackgroundJobsError(
        `Memory adapter for queue ${this.name} is not initialized`,
        'ADAPTER_NOT_INITIALIZED',
        this.name
      )
    }
  }

  /**
   * Clean up completed and failed jobs based on options
   */
  async cleanup(): Promise<number> {
    this.ensureInitialized()
    
    let removedCount = 0
    const now = Date.now()
    
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      let shouldRemove = false
      
      // Remove completed jobs if configured
      if (job.status === 'completed' && job.options.removeOnComplete) {
        if (typeof job.options.removeOnComplete === 'boolean') {
          shouldRemove = true
        } else if (typeof job.options.removeOnComplete === 'number') {
          const completedTime = job.completedAt?.getTime() || now
          const ageInMs = now - completedTime
          shouldRemove = ageInMs > job.options.removeOnComplete
        }
      }
      
      // Remove failed jobs if configured
      if (job.status === 'failed' && job.options.removeOnFail) {
        if (typeof job.options.removeOnFail === 'boolean') {
          shouldRemove = true
        } else if (typeof job.options.removeOnFail === 'number') {
          const failedTime = job.failedAt?.getTime() || now
          const ageInMs = now - failedTime
          shouldRemove = ageInMs > job.options.removeOnFail
        }
      }
      
      if (shouldRemove) {
        await this.removeJob(jobId)
        removedCount++
      }
    }
    
    return removedCount
  }
}