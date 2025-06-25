import winston from 'winston'
import correlator from 'correlation-id'
import { v4 as uuidv4 } from 'uuid'

export interface LogContext {
  correlationId?: string
  userId?: string
  requestId?: string
  operation?: string
  duration?: number
  statusCode?: number
  method?: string
  url?: string
  ip?: string
  userAgent?: string
  errorName?: string
  errorMessage?: string
  responseTime?: number
  resource?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  auditAction?: string
  complianceLevel?: string
  auditTimestamp?: string
  metricName?: string
  metricValue?: number | Record<string, any>
  metricType?: string
  securityEvent?: string
  severity?: string
  requiresInvestigation?: boolean
  businessEvent?: string
  trackable?: boolean
  component?: string
  healthStatus?: string
  healthCheck?: boolean
  metadata?: Record<string, any>
}

export interface StructuredLoggerOptions {
  level: string
  service: string
  environment: string
  enableConsole: boolean
  enableFile: boolean
  enableStructured: boolean
}

export class StructuredLogger {
  private logger: winston.Logger
  private options: StructuredLoggerOptions

  constructor(options: StructuredLoggerOptions) {
    this.options = options
    this.logger = this.createWinstonLogger()
  }

  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = []

    // Console transport
    if (this.options.enableConsole) {
      if (this.options.enableStructured) {
        transports.push(new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        }))
      } else {
        // Human-readable format for development
        transports.push(new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
              const correlationStr = correlationId ? `[${correlationId}]` : ''
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              return `${timestamp} ${level}: ${correlationStr} ${message} ${metaStr}`
            })
          )
        }))
      }
    }

    // File transport
    if (this.options.enableFile) {
      transports.push(new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }))

      transports.push(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }))
    }

    return winston.createLogger({
      level: this.options.level,
      defaultMeta: {
        service: this.options.service,
        environment: this.options.environment
      },
      transports,
      exceptionHandlers: this.options.enableFile ? [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ] : [],
      rejectionHandlers: this.options.enableFile ? [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ] : []
    })
  }

  generateCorrelationId(): string {
    return uuidv4()
  }

  private formatLogData(message: string, context: LogContext = {}): any {
    const correlationId = context.correlationId || correlator.getId()
    
    return {
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...context
    }
  }

  info(message: string, context: LogContext = {}): void {
    const logData = this.formatLogData(message, context)
    this.logger.info(logData)
  }

  error(message: string, error?: Error, context: LogContext = {}): void {
    const logData = this.formatLogData(message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    })
    this.logger.error(logData)
  }

  warn(message: string, context: LogContext = {}): void {
    const logData = this.formatLogData(message, context)
    this.logger.warn(logData)
  }

  debug(message: string, context: LogContext = {}): void {
    const logData = this.formatLogData(message, context)
    this.logger.debug(logData)
  }

  // Healthcare-specific audit logging
  audit(action: string, context: LogContext = {}): void {
    const auditData = this.formatLogData(`AUDIT: ${action}`, {
      ...context,
      auditAction: action,
      complianceLevel: 'HIPAA',
      auditTimestamp: new Date().toISOString()
    })
    this.logger.info(auditData)
  }

  // Performance metrics logging
  metrics(metricName: string, value: number | Record<string, any>, context: LogContext = {}): void {
    const metricsData = this.formatLogData(`METRICS: ${metricName}`, {
      ...context,
      metricName,
      metricValue: value,
      metricType: typeof value === 'number' ? 'gauge' : 'object'
    })
    this.logger.info(metricsData)
  }

  // Security event logging
  security(event: string, context: LogContext = {}): void {
    const securityData = this.formatLogData(`SECURITY: ${event}`, {
      ...context,
      securityEvent: event,
      severity: 'HIGH',
      requiresInvestigation: true
    })
    this.logger.warn(securityData)
  }

  // Business event logging
  business(event: string, context: LogContext = {}): void {
    const businessData = this.formatLogData(`BUSINESS: ${event}`, {
      ...context,
      businessEvent: event,
      trackable: true
    })
    this.logger.info(businessData)
  }

  // Health check logging
  health(component: string, status: 'healthy' | 'unhealthy' | 'degraded', context: LogContext = {}): void {
    const healthData = this.formatLogData(`HEALTH: ${component} is ${status}`, {
      ...context,
      component,
      healthStatus: status,
      healthCheck: true
    })
    
    if (status === 'healthy') {
      this.logger.info(healthData)
    } else {
      this.logger.warn(healthData)
    }
  }
}