import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { StructuredLogger } from './structured-logger'
import * as correlator from 'correlation-id'

declare module 'fastify' {
  interface FastifyInstance {
    structuredLogger: StructuredLogger
  }
  
  interface FastifyRequest {
    correlationId: string
  }
}

async function structuredLoggingPlugin(fastify: FastifyInstance): Promise<void> {
  const config = fastify.config as any

  // Initialize structured logger
  const logger = new StructuredLogger({
    level: config.LOG_LEVEL || 'info',
    service: config.SERVICE_NAME || 'aegisx-api',
    environment: config.NODE_ENV || 'development',
    enableConsole: config.LOG_CONSOLE_ENABLED !== 'false',
    enableFile: config.LOG_FILE_ENABLED === 'true',
    enableStructured: config.STRUCTURED_LOGGING_ENABLED !== 'false',
    enableSeq: config.SEQ_ENABLED === 'true',
    seqUrl: config.SEQ_URL,
    seqApiKey: config.SEQ_API_KEY
  })

  // Decorate fastify instance
  fastify.decorate('structuredLogger', logger)

  // Add correlation ID middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string || 
                         correlator.getId() || 
                         logger.generateCorrelationId()
    
    request.correlationId = correlationId
    reply.header('x-correlation-id', correlationId)
    
    // Set correlation ID in correlator for Winston
    correlator.withId(correlationId, () => {
      // Context is now set for this request
    })
  })

  // Request logging middleware
  fastify.addHook('onRequest', async (request) => {
    fastify.structuredLogger.info('HTTP Request Started', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      correlationId: request.correlationId
    })
  })

  // Response logging middleware  
  fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime || 0
    
    fastify.structuredLogger.info('HTTP Request Completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: Math.round(responseTime),
      correlationId: request.correlationId
    })
  })

  // Error logging middleware
  fastify.addHook('onError', async (request, reply, error) => {
    fastify.structuredLogger.error('HTTP Request Error', error, {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      correlationId: request.correlationId,
      errorName: error.name,
      errorMessage: error.message
    })
  })

  fastify.log.info('Structured logging plugin registered successfully')
}

export default fp(structuredLoggingPlugin, {
  name: 'structured-logging',
  dependencies: ['env-plugin']
})