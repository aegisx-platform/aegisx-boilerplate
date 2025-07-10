/**
 * Queue Admin Routes
 * 
 * Administrative routes for queue monitoring and management
 * Provides unified dashboard for Bull and RabbitMQ queues
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Type } from '@sinclair/typebox'
import { QueueMonitoringService } from '../services/queue-monitoring.service'
import { QueueFactory } from '../factories/queue.factory'

// Schema definitions
const QueueParamsSchema = Type.Object({
  broker: Type.Union([Type.Literal('redis'), Type.Literal('rabbitmq')]),
  name: Type.String()
})

const JobStatesSchema = Type.Array(
  Type.Union([
    Type.Literal('waiting'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('delayed'),
    Type.Literal('paused'),
    Type.Literal('stuck')
  ])
)

const CleanJobsSchema = Type.Object({
  grace: Type.Number({ minimum: 0 }),
  status: Type.Optional(Type.Union([
    Type.Literal('completed'),
    Type.Literal('failed')
  ])),
  limit: Type.Optional(Type.Number({ minimum: 1 }))
})

const RetryJobsSchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 }))
})

export async function queueAdminRoutes(fastify: FastifyInstance) {
  const monitoring = new QueueMonitoringService(fastify)
  
  // Start monitoring if enabled
  if (process.env.QUEUE_MONITORING_ENABLED === 'true') {
    const interval = parseInt(process.env.QUEUE_MONITORING_INTERVAL || '30000')
    monitoring.start(interval)
    
    // Cleanup on shutdown
    fastify.addHook('onClose', async () => {
      monitoring.stop()
    })
  }
  
  /**
   * Get queue dashboard
   */
  fastify.get('/dashboard', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Get queue dashboard with metrics',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            summary: Type.Object({
              totalQueues: Type.Number(),
              healthyQueues: Type.Number(),
              unhealthyQueues: Type.Number(),
              totalJobs: Type.Number(),
              activeJobs: Type.Number(),
              failedJobs: Type.Number(),
              processingRate: Type.Number(),
              errorRate: Type.Number()
            }),
            queues: Type.Array(Type.Object({
              name: Type.String(),
              broker: Type.Union([Type.Literal('redis'), Type.Literal('rabbitmq')]),
              status: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy')
              ]),
              metrics: Type.Object({
                waiting: Type.Number(),
                active: Type.Number(),
                completed: Type.Number(),
                failed: Type.Number(),
                delayed: Type.Number(),
                paused: Type.Number(),
                processingRate: Type.Number(),
                errorRate: Type.Number(),
                isPaused: Type.Boolean()
              })
            })),
            timestamp: Type.String({ format: 'date-time' })
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dashboard = await monitoring.getDashboard()
      
      return reply.send({
        success: true,
        data: dashboard
      })
    } catch (error) {
      fastify.log.error('Failed to get queue dashboard:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get queue dashboard'
      })
    }
  })
  
  /**
   * Get health status
   */
  fastify.get('/health', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Get overall queue health status',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            status: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy')
            ]),
            details: Type.Record(Type.String(), Type.Any())
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await monitoring.getHealthStatus()
      
      return reply.send({
        success: true,
        data: health
      })
    } catch (error) {
      fastify.log.error('Failed to get queue health:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get queue health'
      })
    }
  })
  
  /**
   * Get queue metrics
   */
  fastify.get('/queues/:broker/:name/metrics', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Get metrics for a specific queue',
      params: QueueParamsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Any()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          error: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { broker: 'redis' | 'rabbitmq'; name: string } }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const metrics = await monitoring.getQueueMetrics(broker, name)
      
      if (!metrics) {
        return reply.code(404).send({
          success: false,
          error: 'Queue not found'
        })
      }
      
      return reply.send({
        success: true,
        data: metrics
      })
    } catch (error) {
      fastify.log.error('Failed to get queue metrics:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get queue metrics'
      })
    }
  })
  
  /**
   * Get queue jobs
   */
  fastify.get('/queues/:broker/:name/jobs', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Get jobs from a specific queue',
      params: QueueParamsSchema,
      querystring: Type.Object({
        states: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 }))
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Any())
        })
      }
    }
  }, async (request: FastifyRequest<{
    Params: { broker: 'redis' | 'rabbitmq'; name: string }
    Querystring: { states?: string; limit?: number }
  }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const { states = 'waiting,active,failed', limit = 100 } = request.query
      
      const stateArray = states.split(',') as any[]
      const jobs = await monitoring.getQueueJobs(broker, name, stateArray, limit)
      
      return reply.send({
        success: true,
        data: jobs
      })
    } catch (error) {
      fastify.log.error('Failed to get queue jobs:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get queue jobs'
      })
    }
  })
  
  /**
   * Retry failed jobs
   */
  fastify.post('/queues/:broker/:name/retry', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Retry failed jobs in a queue',
      params: QueueParamsSchema,
      body: Type.Optional(RetryJobsSchema),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            retried: Type.Number(),
            errors: Type.Array(Type.String())
          })
        })
      }
    }
  }, async (request: FastifyRequest<{
    Params: { broker: 'redis' | 'rabbitmq'; name: string }
    Body: { limit?: number }
  }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const { limit } = request.body || {}
      
      const result = await monitoring.retryFailedJobs(broker, name, limit)
      
      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      fastify.log.error('Failed to retry jobs:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retry jobs'
      })
    }
  })
  
  /**
   * Clean old jobs
   */
  fastify.post('/queues/:broker/:name/clean', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Clean old jobs from a queue',
      params: QueueParamsSchema,
      body: CleanJobsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            cleaned: Type.Number()
          })
        })
      }
    }
  }, async (request: FastifyRequest<{
    Params: { broker: 'redis' | 'rabbitmq'; name: string }
    Body: { grace: number; status?: 'completed' | 'failed'; limit?: number }
  }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const { grace, status } = request.body
      
      const cleaned = await monitoring.cleanJobs(broker, name, grace, status)
      
      return reply.send({
        success: true,
        data: { cleaned }
      })
    } catch (error) {
      fastify.log.error('Failed to clean jobs:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to clean jobs'
      })
    }
  })
  
  /**
   * Pause queue
   */
  fastify.post('/queues/:broker/:name/pause', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Pause a queue',
      params: QueueParamsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { broker: 'redis' | 'rabbitmq'; name: string } }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const queue = QueueFactory.getQueue(broker, name)
      
      if (!queue) {
        return reply.code(404).send({
          success: false,
          error: 'Queue not found'
        })
      }
      
      await queue.pause()
      
      return reply.send({
        success: true,
        message: 'Queue paused successfully'
      })
    } catch (error) {
      fastify.log.error('Failed to pause queue:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to pause queue'
      })
    }
  })
  
  /**
   * Resume queue
   */
  fastify.post('/queues/:broker/:name/resume', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Resume a queue',
      params: QueueParamsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { broker: 'redis' | 'rabbitmq'; name: string } }>, reply: FastifyReply) => {
    try {
      const { broker, name } = request.params
      const queue = QueueFactory.getQueue(broker, name)
      
      if (!queue) {
        return reply.code(404).send({
          success: false,
          error: 'Queue not found'
        })
      }
      
      await queue.resume()
      
      return reply.send({
        success: true,
        message: 'Queue resumed successfully'
      })
    } catch (error) {
      fastify.log.error('Failed to resume queue:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to resume queue'
      })
    }
  })
  
  /**
   * Get Prometheus metrics
   */
  fastify.get('/metrics', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'Get Prometheus metrics for all queues',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await monitoring.getPrometheusMetrics()
      
      // Set content type for Prometheus
      reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      
      return reply.send(metrics)
    } catch (error) {
      fastify.log.error('Failed to get Prometheus metrics:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get metrics'
      })
    }
  })
  
  /**
   * Get all queue instances
   */
  fastify.get('/queues', {
    schema: {
      tags: ['Queue Admin'],
      summary: 'List all queue instances',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Object({
            key: Type.String(),
            name: Type.String(),
            broker: Type.Union([Type.Literal('redis'), Type.Literal('rabbitmq')]),
            isReady: Type.Boolean()
          }))
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allQueues = QueueFactory.getAllQueues()
      const queueList = []
      
      for (const [key, queue] of allQueues) {
        const isReady = await queue.isReady()
        queueList.push({
          key,
          name: queue.name,
          broker: queue.broker,
          isReady
        })
      }
      
      return reply.send({
        success: true,
        data: queueList
      })
    } catch (error) {
      fastify.log.error('Failed to list queues:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to list queues'
      })
    }
  })
}