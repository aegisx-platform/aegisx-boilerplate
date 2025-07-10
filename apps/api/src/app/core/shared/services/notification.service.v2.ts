/**
 * Notification Service V2
 * 
 * Updated notification service using Bull/RabbitMQ queue system
 * Provides multi-channel notifications with queue-based processing
 */

import { EventEmitter } from 'events'
import { FastifyInstance } from 'fastify'
import {
  NotificationConfig,
  Notification,
  NotificationRecipient,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
  NotificationEvents,
  NotificationStatistics,
  NotificationQueue,
  NotificationTemplate,
  NotificationError,
  NotificationEventData,
} from '../types/notification.types'
import { IQueueService, Job, JobOptions } from '../interfaces/queue.interface'
import { QueueFactory } from '../factories/queue.factory'

interface NotificationJobData {
  notificationId: string
  notification: Notification
}

export class NotificationServiceV2 extends EventEmitter {
  private fastify: FastifyInstance
  private config: NotificationConfig
  private notifications: Map<string, Notification> = new Map()
  private queues: Map<NotificationPriority, IQueueService> = new Map()
  private templates: Map<string, NotificationTemplate> = new Map()
  private statistics: NotificationStatistics
  private rateLimitCounts: Map<string, { count: number; window: Date }> = new Map()
  private mainQueue?: IQueueService
  
  constructor(fastify: FastifyInstance, config?: Partial<NotificationConfig>) {
    super()
    this.fastify = fastify
    this.config = this.buildConfig(config)
    this.statistics = this.initializeStatistics()
  }
  
  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    try {
      // Create main notification queue
      this.mainQueue = await QueueFactory.create({
        broker: (process.env.QUEUE_BROKER || 'redis') as any,
        name: 'notifications',
        redis: {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.NOTIFICATION_REDIS_DB || '1')
          },
          defaultJobOptions: {
            attempts: this.config.retryAttempts,
            backoff: {
              type: 'exponential',
              delay: this.config.retryDelay
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        },
        rabbitmq: {
          url: process.env.RABBITMQ_URL,
          exchange: {
            name: 'notifications',
            type: 'topic'
          },
          prefetch: 10
        }
      })
      
      // Set up job processors
      this.setupJobProcessors()
      
      // Set up automatic processing if enabled
      if (process.env.NOTIFICATION_AUTO_PROCESS_ENABLED === 'true') {
        await this.setupAutomaticProcessing()
      }
      
      this.fastify.log.info('Notification service initialized', {
        broker: process.env.QUEUE_BROKER || 'redis',
        autoProcess: process.env.NOTIFICATION_AUTO_PROCESS_ENABLED === 'true'
      })
    } catch (error) {
      this.fastify.log.error('Failed to initialize notification service:', error)
      throw error
    }
  }
  
  /**
   * Setup job processors
   */
  private setupJobProcessors(): void {
    if (!this.mainQueue) return
    
    // Process notification jobs
    this.mainQueue.process('send-notification', async (job: Job<NotificationJobData>) => {
      const { notificationId, notification } = job.data
      
      await job.progress(10)
      
      // Process the notification
      await this.processNotification(notification)
      
      await job.progress(100)
      
      return { success: true, notificationId }
    })
    
    // Process batch notifications
    this.mainQueue.process('send-batch', async (job: Job<{ notifications: NotificationJobData[] }>) => {
      const { notifications } = job.data
      const results: any[] = []
      
      for (let i = 0; i < notifications.length; i++) {
        const { notification } = notifications[i]
        await this.processNotification(notification)
        await job.progress((i + 1) / notifications.length * 100)
        results.push({ id: notification.id, status: notification.status })
      }
      
      return { success: true, results }
    })
  }
  
  /**
   * Setup automatic processing
   */
  private async setupAutomaticProcessing(): Promise<void> {
    if (!this.mainQueue) return
    
    const interval = process.env.NOTIFICATION_PROCESS_INTERVAL || '30s'
    
    // Add repeating job to process queue
    await this.mainQueue.add('process-queue', {}, {
      repeat: {
        interval,
        immediately: true
      },
      priority: 10
    })
    
    // Process the queue processing job
    this.mainQueue.process('process-queue', async () => {
      await this.processNotificationQueue()
      return { success: true, timestamp: new Date() }
    })
  }
  
  /**
   * Send a notification
   */
  async send(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: any,
    options?: any
  ): Promise<string> {
    // Create notification
    const notification = this.createNotification(type, channel, recipient, content, options)
    
    // Store notification
    this.notifications.set(notification.id, notification)
    
    // Add to queue if enabled
    if (this.config.queueEnabled && this.mainQueue) {
      const jobOptions: JobOptions = {
        priority: this.getPriorityValue(notification.priority),
        delay: notification.scheduledAt ? notification.scheduledAt.getTime() - Date.now() : undefined,
        attempts: this.config.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: this.config.retryDelay
        }
      }
      
      await this.mainQueue.add('send-notification', {
        notificationId: notification.id,
        notification
      }, jobOptions)
      
      this.emit('notification-queued', this.createEventData('notification-queued', notification.id))
    } else {
      // Process immediately
      await this.processNotification(notification)
    }
    
    return notification.id
  }
  
  /**
   * Send notification asynchronously (queue only)
   */
  async sendNotificationAsync(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: any,
    options?: any
  ): Promise<string> {
    const notification = this.createNotification(type, channel, recipient, content, options)
    
    // Update statistics
    this.statistics.total++
    this.statistics.pending++
    this.statistics.byPriority[notification.priority]++
    
    // Store notification
    this.notifications.set(notification.id, notification)
    
    // Add to queue
    if (this.mainQueue) {
      const jobOptions: JobOptions = {
        priority: this.getPriorityValue(notification.priority),
        delay: notification.scheduledAt ? notification.scheduledAt.getTime() - Date.now() : undefined,
        attempts: this.config.retryAttempts
      }
      
      await this.mainQueue.add('send-notification', {
        notificationId: notification.id,
        notification
      }, jobOptions)
    }
    
    this.emit('notification-queued', this.createEventData('notification-queued', notification.id))
    
    return notification.id
  }
  
  /**
   * Send batch notifications
   */
  async sendBatch(notifications: Array<{
    type: NotificationType
    channel: NotificationChannel
    recipient: NotificationRecipient
    content: any
    options?: any
  }>): Promise<string> {
    const batchId = this.generateBatchId()
    const notificationData: NotificationJobData[] = []
    
    for (const notif of notifications) {
      const notification = this.createNotification(
        notif.type,
        notif.channel,
        notif.recipient,
        notif.content,
        notif.options
      )
      
      this.notifications.set(notification.id, notification)
      notificationData.push({
        notificationId: notification.id,
        notification
      })
    }
    
    if (this.mainQueue) {
      await this.mainQueue.add('send-batch', {
        batchId,
        notifications: notificationData
      }, {
        priority: 5
      })
    }
    
    this.emit('batch-created', this.createEventData('batch-created', batchId))
    
    return batchId
  }
  
  /**
   * Process queued notifications
   */
  async processNotificationQueue(): Promise<void> {
    try {
      const pendingNotifications = Array.from(this.notifications.values())
        .filter(n => n.status === 'queued')
        .sort((a, b) => {
          // Sort by priority first, then by created date
          const priorityOrder = { critical: 1, urgent: 2, high: 3, normal: 4, low: 5 }
          const aPriority = priorityOrder[a.priority] || 5
          const bPriority = priorityOrder[b.priority] || 5
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority
          }
          
          const aTime = a.scheduledAt || new Date()
          const bTime = b.scheduledAt || new Date()
          return aTime.getTime() - bTime.getTime()
        })
      
      const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50')
      const batch = pendingNotifications.slice(0, batchSize)
      
      for (const notification of batch) {
        await this.processNotification(notification)
      }
      
      this.fastify.log.info('Processed notification queue', {
        total: pendingNotifications.length,
        processed: batch.length
      })
    } catch (error) {
      this.fastify.log.error('Error processing notification queue:', error)
    }
  }
  
  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id)
  }
  
  /**
   * Get notification status
   */
  getNotificationStatus(id: string): NotificationStatus | undefined {
    return this.notifications.get(id)?.status
  }
  
  /**
   * Get statistics
   */
  getStatistics(): NotificationStatistics {
    return { ...this.statistics }
  }
  
  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<any> {
    if (!this.mainQueue) {
      return null
    }
    
    return await this.mainQueue.getMetrics()
  }
  
  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<void> {
    if (this.mainQueue) {
      await this.mainQueue.pause()
      this.emit('queue-paused', this.createEventData('queue-paused'))
    }
  }
  
  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<void> {
    if (this.mainQueue) {
      await this.mainQueue.resume()
      this.emit('queue-resumed', this.createEventData('queue-resumed'))
    }
  }
  
  /**
   * Clean old notifications
   */
  async cleanOldNotifications(olderThan: number): Promise<number> {
    const now = Date.now()
    let cleaned = 0
    
    for (const [id, notification] of this.notifications) {
      const age = now - notification.sentAt.getTime()
      if (age > olderThan) {
        this.notifications.delete(id)
        cleaned++
      }
    }
    
    // Clean queue jobs
    if (this.mainQueue) {
      await this.mainQueue.clean(olderThan, 'completed')
      await this.mainQueue.clean(olderThan, 'failed')
    }
    
    return cleaned
  }
  
  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    // Close queue
    if (this.mainQueue) {
      await this.mainQueue.close()
    }
    
    // Clear data
    this.notifications.clear()
    this.templates.clear()
    this.rateLimitCounts.clear()
    
    this.emit('service-shutdown', this.createEventData('service-shutdown'))
  }
  
  /**
   * Build configuration
   */
  private buildConfig(config?: Partial<NotificationConfig>): NotificationConfig {
    return {
      enabledChannels: config?.enabledChannels ?? ['email', 'sms', 'push'],
      defaultChannel: config?.defaultChannel ?? 'email',
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 5000,
      queueEnabled: config?.queueEnabled ?? true,
      queueMaxSize: config?.queueMaxSize ?? 10000,
      rateLimiting: {
        enabled: config?.rateLimiting?.enabled ?? true,
        perMinute: config?.rateLimiting?.perMinute ?? 60,
        perHour: config?.rateLimiting?.perHour ?? 1000,
        perDay: config?.rateLimiting?.perDay ?? 10000,
      },
      templates: config?.templates ?? {},
      channels: config?.channels ?? {},
    }
  }
  
  /**
   * Initialize statistics
   */
  private initializeStatistics(): NotificationStatistics {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byChannel: {
        email: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        push: { sent: 0, delivered: 0, failed: 0 },
        slack: { sent: 0, delivered: 0, failed: 0 },
        webhook: { sent: 0, delivered: 0, failed: 0 },
        'in-app': { sent: 0, delivered: 0, failed: 0 },
      },
      byPriority: {
        critical: 0,
        urgent: 0,
        high: 0,
        normal: 0,
        low: 0,
      },
      avgDeliveryTime: 0,
    }
  }
  
  /**
   * Create a notification object
   */
  private createNotification(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: any,
    options?: any
  ): Notification {
    const now = new Date()
    
    return {
      id: this.generateNotificationId(),
      type,
      channel,
      status: 'queued',
      priority: options?.priority || 'normal',
      recipient,
      content,
      metadata: options?.metadata || {},
      attempts: 0,
      maxAttempts: this.config.retryAttempts,
      sentAt: now,
      scheduledAt: options?.scheduledAt,
      expiresAt: options?.expiresAt,
      tags: options?.tags || [],
      errors: [],
    }
  }
  
  /**
   * Process a notification
   */
  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Check rate limits
      if (!(await this.checkRateLimit(notification))) {
        this.fastify.log.warn('Rate limit exceeded for notification', {
          notificationId: notification.id,
          channel: notification.channel,
        })
        return
      }
      
      // Update status
      notification.status = 'sending'
      notification.attempts++
      
      // Send through appropriate channel
      await this.sendThroughChannel(notification)
      
      // Update status
      notification.status = 'sent'
      notification.deliveredAt = new Date()
      
      // Update statistics
      this.statistics.sent++
      this.statistics.pending--
      this.statistics.byChannel[notification.channel].sent++
      
      this.emit('notification-sent', this.createEventData('notification-sent', notification.id))
    } catch (error) {
      await this.handleNotificationError(notification, error as Error)
    }
  }
  
  /**
   * Send notification through channel
   */
  private async sendThroughChannel(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case 'email':
        await this.sendEmail(notification)
        break
      case 'sms':
        await this.sendSMS(notification)
        break
      case 'push':
        await this.sendPush(notification)
        break
      case 'slack':
        await this.sendSlack(notification)
        break
      case 'webhook':
        await this.sendWebhook(notification)
        break
      case 'in-app':
        await this.sendInApp(notification)
        break
      default:
        throw new Error(`Unsupported channel: ${notification.channel}`)
    }
  }
  
  /**
   * Channel implementations (simplified)
   */
  private async sendEmail(notification: Notification): Promise<void> {
    // Implementation would use email service
    this.fastify.log.info('Sending email notification', {
      id: notification.id,
      to: notification.recipient.email
    })
  }
  
  private async sendSMS(notification: Notification): Promise<void> {
    // Implementation would use SMS service
    this.fastify.log.info('Sending SMS notification', {
      id: notification.id,
      to: notification.recipient.phone
    })
  }
  
  private async sendPush(notification: Notification): Promise<void> {
    // Implementation would use push notification service
    this.fastify.log.info('Sending push notification', {
      id: notification.id,
      to: notification.recipient.deviceToken
    })
  }
  
  private async sendSlack(notification: Notification): Promise<void> {
    // Implementation would use Slack API
    this.fastify.log.info('Sending Slack notification', {
      id: notification.id,
      to: notification.recipient.slackChannel
    })
  }
  
  private async sendWebhook(notification: Notification): Promise<void> {
    // Implementation would use HTTP client
    this.fastify.log.info('Sending webhook notification', {
      id: notification.id,
      to: notification.recipient.webhookUrl
    })
  }
  
  private async sendInApp(notification: Notification): Promise<void> {
    // Implementation would use WebSocket or database
    this.fastify.log.info('Sending in-app notification', {
      id: notification.id,
      to: notification.recipient.userId
    })
  }
  
  /**
   * Handle notification error
   */
  private async handleNotificationError(notification: Notification, error: Error): Promise<void> {
    notification.errors.push({
      message: error.message,
      timestamp: new Date(),
      attempt: notification.attempts,
    })
    
    if (notification.attempts < notification.maxAttempts) {
      // Retry later
      notification.status = 'queued'
      this.emit('notification-retry', this.createEventData('notification-retry', notification.id))
    } else {
      // Mark as failed
      notification.status = 'failed'
      notification.failedAt = new Date()
      
      // Update statistics
      this.statistics.failed++
      this.statistics.pending--
      this.statistics.byChannel[notification.channel].failed++
      
      this.emit('notification-failed', this.createEventData('notification-failed', notification.id))
    }
    
    this.fastify.log.error('Notification processing error', {
      notificationId: notification.id,
      error: error.message,
      attempts: notification.attempts,
    })
  }
  
  /**
   * Check rate limit
   */
  private async checkRateLimit(notification: Notification): Promise<boolean> {
    if (!this.config.rateLimiting.enabled) {
      return true
    }
    
    // Check Redis-based rate limiting if available
    if (process.env.NOTIFICATION_REDIS_RATE_LIMIT === 'true' && this.mainQueue?.broker === 'redis') {
      // Implementation would use Redis for distributed rate limiting
      return true
    }
    
    // Fallback to in-memory rate limiting
    const key = `${notification.channel}:${notification.recipient.email || notification.recipient.userId}`
    const now = new Date()
    const limit = this.rateLimitCounts.get(key)
    
    if (!limit || now.getTime() - limit.window.getTime() > 60000) {
      // Reset window
      this.rateLimitCounts.set(key, { count: 1, window: now })
      return true
    }
    
    if (limit.count >= this.config.rateLimiting.perMinute) {
      return false
    }
    
    limit.count++
    return true
  }
  
  /**
   * Get priority value
   */
  private getPriorityValue(priority: NotificationPriority): number {
    const values = {
      critical: 10,
      urgent: 8,
      high: 6,
      normal: 4,
      low: 2
    }
    return values[priority] || 4
  }
  
  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Create event data
   */
  private createEventData(event: string, data?: any): NotificationEventData {
    return {
      event,
      timestamp: new Date(),
      data,
    }
  }
}