import winston from 'winston'
import Transport from 'winston-transport'
import correlator from 'correlation-id'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

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
  enableSeq?: boolean
  seqUrl?: string
  seqApiKey?: string
}

// Custom Seq transport using HTTP
class CustomSeqTransport extends Transport {
  private seqUrl: string
  private apiKey?: string

  constructor(options: { serverUrl: string; apiKey?: string }) {
    super()
    this.seqUrl = options.serverUrl
    this.apiKey = options.apiKey
  }

  override log(info: any, callback: () => void) {
    // Convert Winston log to Seq format
    const seqEvent = {
      '@t': new Date().toISOString(),
      '@l': this.mapLogLevel(info.level),
      '@m': info.message,
      ...Object.keys(info).reduce((acc, key) => {
        if (!['level', 'message', 'timestamp'].includes(key)) {
          acc[key] = info[key]
        }
        return acc
      }, {} as any)
    }

    // Send to Seq
    this.sendToSeq(seqEvent)
      .catch(error => {
        console.error('[Seq Transport Error]', error.message)
      })
      .finally(() => callback())
  }

  private mapLogLevel(level: string): string {
    const mapping: { [key: string]: string } = {
      'error': 'Error',
      'warn': 'Warning', 
      'info': 'Information',
      'debug': 'Debug',
      'verbose': 'Verbose'
    }
    return mapping[level] || 'Information'
  }

  private async sendToSeq(event: any): Promise<void> {
    const headers: any = {
      'Content-Type': 'application/vnd.serilog.clef'
    }
    
    if (this.apiKey) {
      headers['X-Seq-ApiKey'] = this.apiKey
    }

    try {
      await axios.post(
        `${this.seqUrl}/api/events/raw?clef`,
        JSON.stringify(event),
        { 
          headers, 
          timeout: 2000,
          validateStatus: () => true // Accept any HTTP status
        }
      )
    } catch (error: any) {
      // Silently ignore Seq errors when disabled
    }
  }
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

    // Console transport - clean format without special characters
    if (this.options.enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.printf((info) => {
            // Create clean JSON output without ANSI codes or special characters
            const cleanInfo = { ...info }
            delete cleanInfo.timestamp // Remove to avoid duplication
            
            // Clean message from any ANSI codes or special characters
            if (cleanInfo.message && typeof cleanInfo.message === 'string') {
              cleanInfo.message = cleanInfo.message.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
            }
            
            return JSON.stringify(cleanInfo, null, 0)
          })
        )
      }))
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

    // Seq transport for log monitoring
    if (this.options.enableSeq && this.options.seqUrl) {
      try {
        transports.push(new CustomSeqTransport({
          serverUrl: this.options.seqUrl,
          apiKey: this.options.seqApiKey || undefined
        }))
        // console.log(`📊 Seq transport enabled: ${this.options.seqUrl}`)
      } catch (error) {
        console.error('Failed to initialize Seq transport:', error)
      }
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