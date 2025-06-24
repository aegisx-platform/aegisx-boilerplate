import { EventHandler, EventMetadata } from '../interfaces'

export interface MetricsData {
  eventName: string
  status: 'success' | 'failure'
  duration: number
  timestamp: Date
  retryCount?: number
  errorType?: string
}

export interface EventMetrics {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  recentEvents: MetricsData[]
  errorsByType: Record<string, number>
  eventsByName: Record<string, {
    count: number
    successCount: number
    failureCount: number
    totalDuration: number
    averageDuration: number
  }>
}

export interface MetricsOptions {
  enabled?: boolean
  maxRecentEvents?: number
  trackErrorTypes?: boolean
  trackPerEventMetrics?: boolean
}

export class MetricsMiddleware {
  private options: Required<MetricsOptions>
  private metrics: EventMetrics

  constructor(options: MetricsOptions = {}) {
    this.options = {
      enabled: true,
      maxRecentEvents: 100,
      trackErrorTypes: true,
      trackPerEventMetrics: true,
      ...options
    }

    this.metrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      recentEvents: [],
      errorsByType: {},
      eventsByName: {}
    }
  }

  wrap(eventName: string, handler: EventHandler): EventHandler {
    if (!this.options.enabled) {
      return handler
    }

    return async (data: any, metadata: EventMetadata) => {
      const startTime = Date.now()
      let status: 'success' | 'failure' = 'success'
      let errorType: string | undefined

      try {
        const result = await handler(data, metadata)
        return result
      } catch (error) {
        status = 'failure'
        errorType = this.getErrorType(error)
        throw error
      } finally {
        const duration = Date.now() - startTime
        this.recordMetric({
          eventName,
          status,
          duration,
          timestamp: new Date(),
          retryCount: metadata.retryCount,
          errorType
        })
      }
    }
  }

  getMetrics(): EventMetrics {
    return { ...this.metrics }
  }

  getEventMetrics(eventName: string): EventMetrics['eventsByName'][string] | undefined {
    return this.metrics.eventsByName[eventName]
  }

  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      recentEvents: [],
      errorsByType: {},
      eventsByName: {}
    }
  }

  getHealthSummary(): {
    successRate: number
    averageResponseTime: number
    totalEvents: number
    recentErrorRate: number
  } {
    const { totalEvents, successfulEvents, averageDuration, recentEvents } = this.metrics
    
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 100
    
    // Calculate recent error rate (last 10 events)
    const recentEventSample = recentEvents.slice(-10)
    const recentFailures = recentEventSample.filter(e => e.status === 'failure').length
    const recentErrorRate = recentEventSample.length > 0 
      ? (recentFailures / recentEventSample.length) * 100 
      : 0

    return {
      successRate: Number(successRate.toFixed(2)),
      averageResponseTime: Number(averageDuration.toFixed(2)),
      totalEvents,
      recentErrorRate: Number(recentErrorRate.toFixed(2))
    }
  }

  private recordMetric(data: MetricsData): void {
    // Update global metrics
    this.metrics.totalEvents++
    this.metrics.totalDuration += data.duration
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalEvents

    if (data.duration < this.metrics.minDuration) {
      this.metrics.minDuration = data.duration
    }
    if (data.duration > this.metrics.maxDuration) {
      this.metrics.maxDuration = data.duration
    }

    if (data.status === 'success') {
      this.metrics.successfulEvents++
    } else {
      this.metrics.failedEvents++
    }

    // Track error types
    if (this.options.trackErrorTypes && data.errorType) {
      this.metrics.errorsByType[data.errorType] = 
        (this.metrics.errorsByType[data.errorType] || 0) + 1
    }

    // Track per-event metrics
    if (this.options.trackPerEventMetrics) {
      if (!this.metrics.eventsByName[data.eventName]) {
        this.metrics.eventsByName[data.eventName] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          totalDuration: 0,
          averageDuration: 0
        }
      }

      const eventMetrics = this.metrics.eventsByName[data.eventName]
      eventMetrics.count++
      eventMetrics.totalDuration += data.duration
      eventMetrics.averageDuration = eventMetrics.totalDuration / eventMetrics.count

      if (data.status === 'success') {
        eventMetrics.successCount++
      } else {
        eventMetrics.failureCount++
      }
    }

    // Store recent events
    this.metrics.recentEvents.push(data)
    if (this.metrics.recentEvents.length > this.options.maxRecentEvents) {
      this.metrics.recentEvents.shift()
    }
  }

  private getErrorType(error: any): string {
    if (error.name) return error.name
    if (error.constructor?.name) return error.constructor.name
    if (error.code) return error.code
    return 'UnknownError'
  }
}