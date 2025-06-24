import { EventHandler, EventMetadata } from '../interfaces'

export interface LoggingOptions {
  enabled?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  includeData?: boolean
  includeMetadata?: boolean
  maxDataLength?: number
}

export class LoggingMiddleware {
  private options: Required<LoggingOptions>

  constructor(options: LoggingOptions = {}) {
    this.options = {
      enabled: true,
      logLevel: 'info',
      includeData: true,
      includeMetadata: true,
      maxDataLength: 1000,
      ...options
    }
  }

  wrap(eventName: string, handler: EventHandler): EventHandler {
    if (!this.options.enabled) {
      return handler
    }

    return async (data: any, metadata: EventMetadata) => {
      const startTime = Date.now()
      
      try {
        this.logEventStart(eventName, data, metadata)
        
        const result = await handler(data, metadata)
        
        const duration = Date.now() - startTime
        this.logEventSuccess(eventName, metadata, duration)
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        this.logEventError(eventName, metadata, error, duration)
        throw error
      }
    }
  }

  private logEventStart(eventName: string, data: any, metadata: EventMetadata): void {
    const logData: any = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      source: metadata.source,
      timestamp: metadata.timestamp
    }

    if (this.options.includeMetadata) {
      logData.metadata = metadata
    }

    if (this.options.includeData) {
      logData.data = this.truncateData(data)
    }

    this.log('info', 'Event processing started', logData)
  }

  private logEventSuccess(eventName: string, metadata: EventMetadata, duration: number): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      duration: `${duration}ms`,
      status: 'success'
    }

    this.log('info', 'Event processed successfully', logData)
  }

  private logEventError(eventName: string, metadata: EventMetadata, error: any, duration: number): void {
    const logData = {
      event: eventName,
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      duration: `${duration}ms`,
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }

    this.log('error', 'Event processing failed', logData)
  }

  private truncateData(data: any): any {
    const serialized = JSON.stringify(data)
    if (serialized.length <= this.options.maxDataLength) {
      return data
    }

    return {
      __truncated: true,
      __originalLength: serialized.length,
      __preview: serialized.substring(0, this.options.maxDataLength) + '...'
    }
  }

  private log(level: string, message: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: 'event-bus',
      ...data
    }

    // In production, you might want to use a proper logger like Pino
    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logEntry))
        break
      case 'info':
        console.info(JSON.stringify(logEntry))
        break
      case 'warn':
        console.warn(JSON.stringify(logEntry))
        break
      case 'error':
        console.error(JSON.stringify(logEntry))
        break
      default:
        console.log(JSON.stringify(logEntry))
    }
  }
}