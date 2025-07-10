/**
 * RabbitMQ Queue Service
 * 
 * RabbitMQ-based queue implementation using amqplib
 * Provides job management, scheduling, and processing capabilities
 */

import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  IQueueService,
  Job,
  JobOptions,
  JobState,
  ProcessFunction,
  QueueMetrics,
  QueueEvents,
  parseInterval
} from '../interfaces/queue.interface'

export interface RabbitMQConfig {
  url?: string // Full AMQP URL
  connection?: {
    protocol?: string
    hostname?: string
    port?: number
    username?: string
    password?: string
    vhost?: string
  }
  exchange?: {
    name: string
    type: 'direct' | 'topic' | 'fanout' | 'headers'
    durable?: boolean
  }
  queue?: {
    durable?: boolean
    exclusive?: boolean
    autoDelete?: boolean
    arguments?: any
  }
  prefetch?: number
  reconnectInterval?: number
  defaultJobOptions?: Partial<JobOptions>
}

interface RabbitMQJob<T = any> {
  id: string
  name: string
  data: T
  opts: JobOptions
  attempts: number
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
  stacktrace?: string[]
  progress: number
  state: JobState
}

export class RabbitMQQueueService extends EventEmitter implements IQueueService {
  public readonly name: string
  public readonly broker: 'redis' | 'rabbitmq' = 'rabbitmq'
  
  private config: RabbitMQConfig
  private connection?: Connection
  private channel?: Channel
  private exchange: string
  private consumers: Map<string, ProcessFunction> = new Map()
  private jobs: Map<string, RabbitMQJob> = new Map()
  private isPaused = false
  private reconnectTimer?: NodeJS.Timeout
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map()
  private metricsData: QueueMetrics
  
  constructor(name: string, config: RabbitMQConfig) {
    super()
    this.name = name
    this.config = config
    this.exchange = config.exchange?.name || `${name}.exchange`
    this.metricsData = this.createEmptyMetrics()
  }
  
  /**
   * Initialize connection
   */
  async initialize(): Promise<void> {
    try {
      // Create connection
      const url = this.buildConnectionUrl()
      this.connection = await amqp.connect(url)
      
      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this))
      this.connection.on('close', this.handleConnectionClose.bind(this))
      
      // Create channel
      this.channel = await this.connection.createChannel()
      
      // Set prefetch
      if (this.config.prefetch) {
        await this.channel.prefetch(this.config.prefetch)
      }
      
      // Setup exchange
      await this.channel.assertExchange(
        this.exchange,
        this.config.exchange?.type || 'direct',
        {
          durable: this.config.exchange?.durable !== false
        }
      )
      
      // Setup dead letter exchange
      await this.channel.assertExchange(`${this.exchange}.dlx`, 'direct', {
        durable: true
      })
      
      this.emit('queue:ready')
    } catch (error) {
      this.emit('queue:error', error)
      throw error
    }
  }
  
  /**
   * Add a job to the queue
   */
  async add<T = any>(name: string, data: T, opts?: JobOptions): Promise<Job<T>> {
    const job: RabbitMQJob<T> = {
      id: opts?.jobId || uuidv4(),
      name,
      data,
      opts: { ...this.config.defaultJobOptions, ...opts },
      attempts: 0,
      timestamp: Date.now(),
      progress: 0,
      state: 'waiting'
    }
    
    // Store job
    this.jobs.set(job.id, job)
    
    // Handle delayed jobs
    if (opts?.delay) {
      job.state = 'delayed'
      this.scheduleDelayedJob(job)
    } else if (opts?.repeat) {
      this.scheduleRepeatingJob(job)
    } else {
      await this.publishJob(job)
    }
    
    this.emit('job:added', this.mapToJob(job))
    return this.mapToJob(job)
  }
  
  /**
   * Add multiple jobs in bulk
   */
  async addBulk<T = any>(jobs: Array<{ name: string; data: T; opts?: JobOptions }>): Promise<Job<T>[]> {
    const results: Job<T>[] = []
    
    for (const jobData of jobs) {
      const job = await this.add(jobData.name, jobData.data, jobData.opts)
      results.push(job)
    }
    
    return results
  }
  
  /**
   * Process jobs
   */
  process<T = any, R = any>(
    name: string,
    concurrency: number | ProcessFunction<T, R>,
    processor?: ProcessFunction<T, R>
  ): void {
    const actualProcessor = typeof concurrency === 'function' ? concurrency : processor!
    
    this.consumers.set(name, actualProcessor)
    this.setupConsumer(name).catch(error => {
      this.emit('queue:error', error)
    })
  }
  
  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId)
    return job ? this.mapToJob(job) : null
  }
  
  /**
   * Get jobs by status
   */
  async getJobs(types: JobState[], start?: number, end?: number): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values())
      .filter(job => types.includes(job.state))
      .sort((a, b) => b.timestamp - a.timestamp)
    
    const startIdx = start || 0
    const endIdx = end || jobs.length
    
    return jobs.slice(startIdx, endIdx).map(job => this.mapToJob(job))
  }
  
  /**
   * Get job counts by status
   */
  async getJobCounts(): Promise<Record<JobState, number>> {
    const counts: Record<JobState, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      stuck: 0
    }
    
    for (const job of this.jobs.values()) {
      counts[job.state]++
    }
    
    return counts
  }
  
  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.isPaused = true
    this.emit('queue:paused')
  }
  
  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.isPaused = false
    this.emit('queue:resumed')
  }
  
  /**
   * Clean jobs
   */
  async clean(grace: number, status?: JobState, limit?: number): Promise<string[]> {
    const now = Date.now()
    const cleaned: string[] = []
    
    for (const [id, job] of this.jobs.entries()) {
      if (status && job.state !== status) continue
      if (!status && job.state !== 'completed' && job.state !== 'failed') continue
      
      const age = now - (job.finishedOn || job.timestamp)
      if (age > grace) {
        this.jobs.delete(id)
        cleaned.push(id)
        
        if (limit && cleaned.length >= limit) break
      }
    }
    
    this.emit('queue:cleaned', cleaned, status || 'completed')
    return cleaned
  }
  
  /**
   * Empty the queue
   */
  async empty(): Promise<void> {
    // Cancel all scheduled jobs
    for (const timer of this.scheduledJobs.values()) {
      clearTimeout(timer)
    }
    this.scheduledJobs.clear()
    
    // Clear job storage
    this.jobs.clear()
    
    // Purge RabbitMQ queues
    if (this.channel) {
      try {
        await this.channel.deleteQueue(`${this.name}.queue`)
      } catch (error) {
        // Queue might not exist
      }
    }
    
    this.emit('queue:emptied')
  }
  
  /**
   * Close the queue
   */
  async close(): Promise<void> {
    // Cancel scheduled jobs
    for (const timer of this.scheduledJobs.values()) {
      clearTimeout(timer)
    }
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    // Close channel and connection
    if (this.channel) {
      await this.channel.close()
    }
    
    if (this.connection) {
      await this.connection.close()
    }
    
    this.emit('queue:closed')
  }
  
  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const counts = await this.getJobCounts()
    
    return {
      ...this.metricsData,
      ...counts,
      isPaused: this.isPaused,
      lastActivity: new Date()
    }
  }
  
  /**
   * Get queue events
   */
  getQueueEvents(): QueueEvents {
    return this as any as QueueEvents
  }
  
  /**
   * Check if queue is ready
   */
  async isReady(): Promise<boolean> {
    return !!(this.connection && this.channel)
  }
  
  /**
   * Build connection URL
   */
  private buildConnectionUrl(): string {
    if (this.config.url) {
      return this.config.url
    }
    
    const conn = this.config.connection || {}
    const protocol = conn.protocol || 'amqp'
    const hostname = conn.hostname || 'localhost'
    const port = conn.port || 5672
    const username = conn.username || 'guest'
    const password = conn.password || 'guest'
    const vhost = conn.vhost || '/'
    
    return `${protocol}://${username}:${password}@${hostname}:${port}/${encodeURIComponent(vhost)}`
  }
  
  /**
   * Setup consumer for a job type
   */
  private async setupConsumer(name: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized')
    }
    
    const queueName = `${this.name}.${name}`
    
    // Assert queue with dead letter exchange
    await this.channel.assertQueue(queueName, {
      durable: this.config.queue?.durable !== false,
      exclusive: this.config.queue?.exclusive || false,
      autoDelete: this.config.queue?.autoDelete || false,
      arguments: {
        ...this.config.queue?.arguments,
        'x-dead-letter-exchange': `${this.exchange}.dlx`
      }
    })
    
    // Bind queue to exchange
    await this.channel.bindQueue(queueName, this.exchange, name)
    
    // Start consuming
    await this.channel.consume(queueName, async (msg) => {
      if (!msg || this.isPaused) return
      
      try {
        const job = JSON.parse(msg.content.toString()) as RabbitMQJob
        job.state = 'active'
        job.processedOn = Date.now()
        this.jobs.set(job.id, job)
        
        this.emit('job:active', this.mapToJob(job))
        
        // Process job
        const processor = this.consumers.get(name)
        if (!processor) {
          throw new Error(`No processor registered for ${name}`)
        }
        
        const result = await processor(this.mapToJob(job))
        
        // Job completed
        job.state = 'completed'
        job.finishedOn = Date.now()
        this.emit('job:completed', this.mapToJob(job), result)
        
        // Acknowledge message
        this.channel!.ack(msg)
        
        // Remove job if configured
        if (job.opts.removeOnComplete) {
          setTimeout(() => {
            this.jobs.delete(job.id)
          }, typeof job.opts.removeOnComplete === 'number' ? job.opts.removeOnComplete : 0)
        }
      } catch (error) {
        await this.handleJobError(msg, error as Error)
      }
    })
  }
  
  /**
   * Handle job error
   */
  private async handleJobError(msg: ConsumeMessage, error: Error): Promise<void> {
    if (!this.channel) return
    
    try {
      const job = JSON.parse(msg.content.toString()) as RabbitMQJob
      job.attempts++
      job.failedReason = error.message
      job.stacktrace = error.stack?.split('\n') || []
      
      // Check if should retry
      const maxAttempts = job.opts.attempts || this.config.defaultJobOptions?.attempts || 3
      
      if (job.attempts < maxAttempts) {
        // Retry with backoff
        const delay = this.calculateBackoff(job)
        
        this.channel.nack(msg, false, false)
        
        // Republish with delay
        setTimeout(() => {
          this.publishJob(job).catch(console.error)
        }, delay)
        
        this.emit('job:retry', this.mapToJob(job))
      } else {
        // Max attempts reached
        job.state = 'failed'
        job.finishedOn = Date.now()
        
        this.channel.nack(msg, false, false)
        this.emit('job:failed', this.mapToJob(job), error)
        
        // Remove job if configured
        if (job.opts.removeOnFail) {
          setTimeout(() => {
            this.jobs.delete(job.id)
          }, typeof job.opts.removeOnFail === 'number' ? job.opts.removeOnFail : 0)
        }
      }
    } catch (parseError) {
      // Invalid message format
      this.channel.nack(msg, false, false)
    }
  }
  
  /**
   * Publish job to queue
   */
  private async publishJob(job: RabbitMQJob): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized')
    }
    
    const content = Buffer.from(JSON.stringify(job))
    
    await this.channel.publish(
      this.exchange,
      job.name,
      content,
      {
        persistent: true,
        messageId: job.id
      }
    )
    
    job.state = 'waiting'
  }
  
  /**
   * Schedule delayed job
   */
  private scheduleDelayedJob(job: RabbitMQJob): void {
    const timer = setTimeout(() => {
      this.publishJob(job).catch(error => {
        this.emit('queue:error', error)
      })
      this.scheduledJobs.delete(job.id)
    }, job.opts.delay!)
    
    this.scheduledJobs.set(job.id, timer)
  }
  
  /**
   * Schedule repeating job
   */
  private scheduleRepeatingJob(job: RabbitMQJob): void {
    const repeat = job.opts.repeat!
    let runCount = 0
    
    const scheduleNext = () => {
      // Check limits
      if (repeat.limit && runCount >= repeat.limit) {
        this.scheduledJobs.delete(job.id)
        return
      }
      
      // Check end date
      if (repeat.endDate && new Date() > new Date(repeat.endDate)) {
        this.scheduledJobs.delete(job.id)
        return
      }
      
      runCount++
      
      // Create new job instance
      const newJob: RabbitMQJob = {
        ...job,
        id: uuidv4(),
        timestamp: Date.now()
      }
      
      this.jobs.set(newJob.id, newJob)
      this.publishJob(newJob).catch(error => {
        this.emit('queue:error', error)
      })
    }
    
    // Schedule based on interval or cron
    if (repeat.interval) {
      const interval = parseInterval(repeat.interval)
      const timer = setInterval(scheduleNext, interval)
      this.scheduledJobs.set(job.id, timer)
      
      // Run immediately if configured
      if (repeat.immediately) {
        scheduleNext()
      }
    } else if (repeat.cron) {
      // For cron, we'd need a cron parser library
      // For now, throw error
      throw new Error('Cron expressions not yet supported in RabbitMQ adapter')
    }
  }
  
  /**
   * Calculate backoff delay
   */
  private calculateBackoff(job: RabbitMQJob): number {
    const backoff = job.opts.backoff || { type: 'exponential', delay: 1000 }
    const attempt = job.attempts
    
    switch (backoff.type) {
      case 'fixed':
        return backoff.delay
      
      case 'linear':
        return backoff.delay * attempt
      
      case 'exponential':
      default:
        const delay = backoff.delay * Math.pow(2, attempt - 1)
        const maxDelay = backoff.maxDelay || 3600000 // 1 hour
        const jitter = backoff.jitter || 0
        const jitterAmount = delay * jitter * Math.random()
        
        return Math.min(delay + jitterAmount, maxDelay)
    }
  }
  
  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.emit('queue:error', error)
    this.scheduleReconnect()
  }
  
  /**
   * Handle connection close
   */
  private handleConnectionClose(): void {
    this.emit('queue:disconnected')
    this.scheduleReconnect()
  }
  
  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    const interval = this.config.reconnectInterval || 5000
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.initialize().catch(error => {
        this.emit('queue:error', error)
      })
    }, interval)
  }
  
  /**
   * Map internal job to interface
   */
  private mapToJob<T = any>(job: RabbitMQJob<T>): Job<T> {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      attemptsMade: job.attempts,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      delay: job.opts.delay || 0,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: undefined,
      
      // Methods
      getState: async () => job.state,
      update: async (data: T) => {
        job.data = data
        this.jobs.set(job.id, job)
      },
      progress: async (value: number | object) => {
        job.progress = typeof value === 'number' ? value : 0
        this.emit('job:progress', this.mapToJob(job), value)
      },
      log: async (message: string) => {
        console.log(`[Job ${job.id}] ${message}`)
      },
      remove: async () => {
        this.jobs.delete(job.id)
        this.emit('job:removed', job.id)
      },
      retry: async () => {
        job.attempts = 0
        job.state = 'waiting'
        await this.publishJob(job)
      },
      discard: async () => {
        job.state = 'failed'
        this.jobs.set(job.id, job)
      },
      promote: async () => {
        // Not applicable for RabbitMQ
      }
    }
  }
  
  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): QueueMetrics {
    return {
      name: this.name,
      broker: 'rabbitmq',
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
}