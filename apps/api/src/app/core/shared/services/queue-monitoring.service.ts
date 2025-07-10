/**
 * Queue Monitoring Service
 * 
 * Unified monitoring service for Bull and RabbitMQ queues
 * Provides aggregated metrics and health checks
 */

import { FastifyInstance } from 'fastify'
import { QueueFactory } from '../factories/queue.factory'
import { IQueueService, QueueMetrics, JobState } from '../interfaces/queue.interface'

export interface UnifiedQueueMetrics {
  name: string
  broker: 'redis' | 'rabbitmq'
  status: 'healthy' | 'degraded' | 'unhealthy'
  metrics: QueueMetrics
  health: {
    isConnected: boolean
    lastError?: string
    lastCheck: Date
  }
}

export interface QueueDashboard {
  summary: {
    totalQueues: number
    healthyQueues: number
    unhealthyQueues: number
    totalJobs: number
    activeJobs: number
    failedJobs: number
    processingRate: number
    errorRate: number
  }
  queues: UnifiedQueueMetrics[]
  timestamp: Date
}

export class QueueMonitoringService {
  private fastify: FastifyInstance
  private pollingInterval?: NodeJS.Timeout
  private metricsCache: Map<string, UnifiedQueueMetrics> = new Map()
  private isPolling = false
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
  }
  
  /**
   * Start monitoring
   */
  start(intervalMs: number = 30000): void {
    if (this.isPolling) return
    
    this.isPolling = true
    this.pollMetrics() // Initial poll
    
    this.pollingInterval = setInterval(() => {
      this.pollMetrics()
    }, intervalMs)
    
    this.fastify.log.info('Queue monitoring started', { interval: intervalMs })
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = undefined
    }
    
    this.isPolling = false
    this.metricsCache.clear()
    
    this.fastify.log.info('Queue monitoring stopped')
  }
  
  /**
   * Get current dashboard data
   */
  async getDashboard(): Promise<QueueDashboard> {
    // Ensure we have fresh data
    if (this.metricsCache.size === 0) {
      await this.pollMetrics()
    }
    
    const queues = Array.from(this.metricsCache.values())
    
    // Calculate summary
    const summary = {
      totalQueues: queues.length,
      healthyQueues: queues.filter(q => q.status === 'healthy').length,
      unhealthyQueues: queues.filter(q => q.status === 'unhealthy').length,
      totalJobs: 0,
      activeJobs: 0,
      failedJobs: 0,
      processingRate: 0,
      errorRate: 0
    }
    
    // Aggregate metrics
    for (const queue of queues) {
      const metrics = queue.metrics
      summary.totalJobs += metrics.waiting + metrics.active + metrics.completed + metrics.failed
      summary.activeJobs += metrics.active
      summary.failedJobs += metrics.failed
      summary.processingRate += metrics.processingRate
      summary.errorRate += metrics.errorRate
    }
    
    return {
      summary,
      queues,
      timestamp: new Date()
    }
  }
  
  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(broker: 'redis' | 'rabbitmq', name: string): Promise<UnifiedQueueMetrics | null> {
    const key = `${broker}:${name}`
    
    // Check cache first
    if (this.metricsCache.has(key)) {
      return this.metricsCache.get(key)!
    }
    
    // Fetch fresh metrics
    const queue = QueueFactory.getQueue(broker, name)
    if (!queue) {
      return null
    }
    
    const metrics = await this.fetchQueueMetrics(queue)
    this.metricsCache.set(key, metrics)
    
    return metrics
  }
  
  /**
   * Get job details for a queue
   */
  async getQueueJobs(
    broker: 'redis' | 'rabbitmq',
    name: string,
    states: JobState[],
    limit: number = 100
  ): Promise<any[]> {
    const queue = QueueFactory.getQueue(broker, name)
    if (!queue) {
      return []
    }
    
    return await queue.getJobs(states, 0, limit)
  }
  
  /**
   * Retry failed jobs
   */
  async retryFailedJobs(
    broker: 'redis' | 'rabbitmq',
    name: string,
    limit?: number
  ): Promise<{ retried: number; errors: string[] }> {
    const queue = QueueFactory.getQueue(broker, name)
    if (!queue) {
      return { retried: 0, errors: ['Queue not found'] }
    }
    
    const failedJobs = await queue.getJobs(['failed'], 0, limit || 100)
    let retried = 0
    const errors: string[] = []
    
    for (const job of failedJobs) {
      try {
        await job.retry()
        retried++
      } catch (error) {
        errors.push(`Failed to retry job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return { retried, errors }
  }
  
  /**
   * Clean old jobs
   */
  async cleanJobs(
    broker: 'redis' | 'rabbitmq',
    name: string,
    grace: number,
    status?: JobState
  ): Promise<number> {
    const queue = QueueFactory.getQueue(broker, name)
    if (!queue) {
      return 0
    }
    
    const cleaned = await queue.clean(grace, status)
    return cleaned.length
  }
  
  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: Record<string, any>
  }> {
    const dashboard = await this.getDashboard()
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const details: Record<string, any> = {
      totalQueues: dashboard.summary.totalQueues,
      healthyQueues: dashboard.summary.healthyQueues,
      unhealthyQueues: dashboard.summary.unhealthyQueues,
      queues: {}
    }
    
    // Check each queue
    for (const queue of dashboard.queues) {
      details.queues[`${queue.broker}:${queue.name}`] = {
        status: queue.status,
        activeJobs: queue.metrics.active,
        failedJobs: queue.metrics.failed,
        isConnected: queue.health.isConnected
      }
      
      if (queue.status === 'unhealthy') {
        status = 'unhealthy'
      } else if (queue.status === 'degraded' && status === 'healthy') {
        status = 'degraded'
      }
    }
    
    return { status, details }
  }
  
  /**
   * Poll metrics from all queues
   */
  private async pollMetrics(): Promise<void> {
    try {
      const allQueues = QueueFactory.getAllQueues()
      
      for (const [key, queue] of allQueues) {
        try {
          const metrics = await this.fetchQueueMetrics(queue)
          this.metricsCache.set(key, metrics)
        } catch (error) {
          this.fastify.log.error(`Failed to fetch metrics for queue ${key}:`, error)
        }
      }
    } catch (error) {
      this.fastify.log.error('Failed to poll queue metrics:', error)
    }
  }
  
  /**
   * Fetch metrics for a single queue
   */
  private async fetchQueueMetrics(queue: IQueueService): Promise<UnifiedQueueMetrics> {
    const now = new Date()
    
    try {
      const metrics = await queue.getMetrics()
      const isReady = await queue.isReady()
      
      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (!isReady) {
        status = 'unhealthy'
      } else if (metrics.errorRate > 0.1 || metrics.failed > 100) {
        status = 'degraded'
      }
      
      return {
        name: queue.name,
        broker: queue.broker,
        status,
        metrics,
        health: {
          isConnected: isReady,
          lastCheck: now
        }
      }
    } catch (error) {
      return {
        name: queue.name,
        broker: queue.broker,
        status: 'unhealthy',
        metrics: this.createEmptyMetrics(queue.name, queue.broker),
        health: {
          isConnected: false,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: now
        }
      }
    }
  }
  
  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(name: string, broker: 'redis' | 'rabbitmq'): QueueMetrics {
    return {
      name,
      broker,
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
   * Export metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const dashboard = await this.getDashboard()
    const lines: string[] = []
    
    // Summary metrics
    lines.push('# HELP queue_total_jobs Total number of jobs across all queues')
    lines.push('# TYPE queue_total_jobs gauge')
    lines.push(`queue_total_jobs ${dashboard.summary.totalJobs}`)
    
    lines.push('# HELP queue_active_jobs Number of active jobs')
    lines.push('# TYPE queue_active_jobs gauge')
    lines.push(`queue_active_jobs ${dashboard.summary.activeJobs}`)
    
    lines.push('# HELP queue_failed_jobs Number of failed jobs')
    lines.push('# TYPE queue_failed_jobs gauge')
    lines.push(`queue_failed_jobs ${dashboard.summary.failedJobs}`)
    
    // Per-queue metrics
    for (const queue of dashboard.queues) {
      const labels = `queue="${queue.name}",broker="${queue.broker}"`
      
      lines.push(`# HELP queue_jobs_waiting Jobs waiting in queue ${queue.name}`)
      lines.push('# TYPE queue_jobs_waiting gauge')
      lines.push(`queue_jobs_waiting{${labels}} ${queue.metrics.waiting}`)
      
      lines.push(`# HELP queue_jobs_active Active jobs in queue ${queue.name}`)
      lines.push('# TYPE queue_jobs_active gauge')
      lines.push(`queue_jobs_active{${labels}} ${queue.metrics.active}`)
      
      lines.push(`# HELP queue_jobs_completed Completed jobs in queue ${queue.name}`)
      lines.push('# TYPE queue_jobs_completed counter')
      lines.push(`queue_jobs_completed{${labels}} ${queue.metrics.completed}`)
      
      lines.push(`# HELP queue_jobs_failed Failed jobs in queue ${queue.name}`)
      lines.push('# TYPE queue_jobs_failed counter')
      lines.push(`queue_jobs_failed{${labels}} ${queue.metrics.failed}`)
      
      lines.push(`# HELP queue_processing_rate Jobs processed per second in queue ${queue.name}`)
      lines.push('# TYPE queue_processing_rate gauge')
      lines.push(`queue_processing_rate{${labels}} ${queue.metrics.processingRate}`)
      
      lines.push(`# HELP queue_error_rate Errors per second in queue ${queue.name}`)
      lines.push('# TYPE queue_error_rate gauge')
      lines.push(`queue_error_rate{${labels}} ${queue.metrics.errorRate}`)
      
      lines.push(`# HELP queue_health Queue health status (1=healthy, 0=unhealthy)`)
      lines.push('# TYPE queue_health gauge')
      lines.push(`queue_health{${labels}} ${queue.status === 'healthy' ? 1 : 0}`)
    }
    
    return lines.join('\n')
  }
}