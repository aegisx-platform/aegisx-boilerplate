/**
 * Background Jobs Plugin for Fastify
 * 
 * Integrates the Background Jobs system into Fastify applications
 * with admin routes, health checks, and monitoring endpoints
 */

import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Type, Static } from '@sinclair/typebox'
import {
  IJobManager,
  BackgroundJobsPluginConfig
} from '../shared/types/background-jobs.types'
import { BackgroundJobsFactory } from '../shared/services/background-jobs.factory'
import { HealthcareJobProcessors } from '../shared/services/background-jobs.service'
import { CronExpressions } from '../shared/utils/job-scheduler'

// Request schemas
const AddJobSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  data: Type.Optional(Type.Any()),
  queue: Type.Optional(Type.String()),
  priority: Type.Optional(Type.Union([
    Type.Literal('low'),
    Type.Literal('normal'), 
    Type.Literal('high'),
    Type.Literal('critical')
  ])),
  delay: Type.Optional(Type.Number({ minimum: 0 })),
  attempts: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
  timeout: Type.Optional(Type.Number({ minimum: 1000 })),
  tags: Type.Optional(Type.Array(Type.String())),
  patientId: Type.Optional(Type.String()),
  facilityId: Type.Optional(Type.String()),
  operationType: Type.Optional(Type.Union([
    Type.Literal('patient_registration'),
    Type.Literal('appointment_reminder'),
    Type.Literal('lab_result_processing'),
    Type.Literal('billing_generation'),
    Type.Literal('insurance_verification'),
    Type.Literal('medication_reminder'),
    Type.Literal('report_generation'),
    Type.Literal('data_export'),
    Type.Literal('audit_log_processing'),
    Type.Literal('backup_creation')
  ]))
})

const ScheduleJobSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  cronExpression: Type.String(),
  data: Type.Optional(Type.Any()),
  timezone: Type.Optional(Type.String()),
  startDate: Type.Optional(Type.String({ format: 'date-time' })),
  endDate: Type.Optional(Type.String({ format: 'date-time' })),
  maxRuns: Type.Optional(Type.Number({ minimum: 1 }))
})

const BulkJobSchema = Type.Object({
  jobs: Type.Array(AddJobSchema, { minItems: 1, maxItems: 100 })
})

const JobQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('waiting'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('delayed'),
    Type.Literal('paused'),
    Type.Literal('stuck')
  ])),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 100 })),
  queue: Type.Optional(Type.String())
})

const QueueOperationSchema = Type.Object({
  queueName: Type.Optional(Type.String())
})

// Request types
type AddJobRequest = Static<typeof AddJobSchema>
type ScheduleJobRequest = Static<typeof ScheduleJobSchema>
type BulkJobRequest = Static<typeof BulkJobSchema>
type JobQueryRequest = Static<typeof JobQuerySchema>
type QueueOperationRequest = Static<typeof QueueOperationSchema>

// Extend Fastify instance to include job manager
declare module 'fastify' {
  interface FastifyInstance {
    jobManager: IJobManager
    
    // Helper methods
    addJob(name: string, data?: any, options?: any): Promise<any>
    scheduleJob(name: string, cronExpression: string, data?: any, options?: any): Promise<string>
    getJob(jobId: string): Promise<any>
    retryJob(jobId: string): Promise<any>
  }
}

async function backgroundJobsPlugin(
  fastify: FastifyInstance,
  options: Partial<BackgroundJobsPluginConfig> = {}
) {
  // Default configuration
  const config: BackgroundJobsPluginConfig = {
    defaultQueue: 'default',
    queues: {
      default: {
        adapter: { type: 'memory' },
        workers: 1,
        concurrency: 2
      }
    },
    enableMetrics: true,
    enableAdminRoutes: false,
    adminRoutePrefix: '/admin/jobs',
    enableHealthCheck: true,
    ...options
  }

  // Create job manager based on environment or config
  let jobManager: IJobManager
  
  if (process.env.NODE_ENV === 'test') {
    jobManager = BackgroundJobsFactory.createForTesting()
  } else if (process.env.NODE_ENV === 'development') {
    jobManager = BackgroundJobsFactory.createForDevelopment()
  } else if (config.healthcare?.complianceMode) {
    jobManager = BackgroundJobsFactory.createForHealthcare()
  } else {
    jobManager = BackgroundJobsFactory.create(config)
  }

  // Register built-in healthcare job processors
  jobManager.processWithConcurrency('patient-registration', 2, HealthcareJobProcessors.PATIENT_REGISTRATION)
  jobManager.processWithConcurrency('appointment-reminder', 5, HealthcareJobProcessors.APPOINTMENT_REMINDER)
  jobManager.processWithConcurrency('report-generation', 1, HealthcareJobProcessors.REPORT_GENERATION)

  // Start the job manager
  await jobManager.start()

  // Register job manager with Fastify
  fastify.decorate('jobManager', jobManager)

  // Register health check endpoint
  if (config.enableHealthCheck) {
    fastify.get('/health/background-jobs', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await jobManager.getQueueHealth()
        
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503
        
        return reply.code(statusCode).send(health)
      } catch (error) {
        fastify.log.error('Background jobs health check failed:', error)
        return reply.code(503).send({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })
      }
    })
  }

  // Register metrics endpoint
  if (config.enableMetrics) {
    fastify.get('/metrics/background-jobs', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [jobCounts, workerStats] = await Promise.all([
          jobManager.getJobCounts(),
          jobManager.getWorkerStats()
        ])

        return reply.send({
          jobs: jobCounts,
          workers: workerStats,
          timestamp: new Date()
        })
      } catch (error) {
        fastify.log.error('Failed to get background jobs metrics:', error)
        return reply.code(500).send({
          error: 'Failed to retrieve metrics',
          timestamp: new Date()
        })
      }
    })

    // Queue-specific metrics
    fastify.get('/metrics/background-jobs/queues', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await jobManager.getQueueHealth()
        
        const queueMetrics = Object.entries(health.queues).map(([name, queueHealth]) => ({
          name,
          status: queueHealth.status,
          jobs: queueHealth.stats.jobs,
          throughput: queueHealth.stats.throughput,
          avgProcessingTime: queueHealth.stats.avgProcessingTime,
          issues: queueHealth.issues
        }))

        return reply.send({
          queues: queueMetrics,
          timestamp: new Date()
        })
      } catch (error) {
        fastify.log.error('Failed to get queue metrics:', error)
        return reply.code(500).send({
          error: 'Failed to retrieve queue metrics',
          timestamp: new Date()
        })
      }
    })
  }

  // Register admin routes if enabled
  if (config.enableAdminRoutes) {
    const adminPrefix = config.adminRoutePrefix || '/admin/jobs'

    // Add job endpoint
    fastify.post(`${adminPrefix}/add`, {
      schema: {
        body: AddJobSchema,
        response: {
          201: Type.Object({
            job: Type.Object({
              id: Type.String(),
              name: Type.String(),
              status: Type.String(),
              createdAt: Type.String(),
              queue: Type.String()
            })
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: AddJobRequest }>, reply: FastifyReply) => {
      try {
        const { name, data, ...options } = request.body
        
        const job = await jobManager.add(name, data, options)
        
        return reply.code(201).send({
          job: {
            id: job.id,
            name: job.name,
            status: job.status,
            createdAt: job.createdAt.toISOString(),
            queue: job.queue
          }
        })
      } catch (error) {
        fastify.log.error('Failed to add job:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'JOB_ADD_FAILED'
        })
      }
    })

    // Add bulk jobs endpoint
    fastify.post(`${adminPrefix}/bulk`, {
      schema: {
        body: BulkJobSchema,
        response: {
          201: Type.Object({
            jobs: Type.Array(Type.Object({
              id: Type.String(),
              name: Type.String(),
              status: Type.String()
            })),
            count: Type.Number()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: BulkJobRequest }>, reply: FastifyReply) => {
      try {
        const jobs = await jobManager.addBulk(request.body.jobs)
        
        return reply.code(201).send({
          jobs: jobs.map(job => ({
            id: job.id,
            name: job.name,
            status: job.status
          })),
          count: jobs.length
        })
      } catch (error) {
        fastify.log.error('Failed to add bulk jobs:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'BULK_ADD_FAILED'
        })
      }
    })

    // Schedule job endpoint
    fastify.post(`${adminPrefix}/schedule`, {
      schema: {
        body: ScheduleJobSchema,
        response: {
          201: Type.Object({
            scheduleId: Type.String(),
            nextRun: Type.String()
          })
        }
      }
    }, async (request: FastifyRequest<{ Body: ScheduleJobRequest }>, reply: FastifyReply) => {
      try {
        const { name, cronExpression, data, ...options } = request.body
        
        // Convert date strings to Date objects
        const scheduleOptions = {
          ...options,
          startDate: options.startDate ? new Date(options.startDate) : undefined,
          endDate: options.endDate ? new Date(options.endDate) : undefined
        }
        
        const scheduleId = await jobManager.schedule(name, cronExpression, data, scheduleOptions)
        
        // Get the schedule to return next run time
        const schedules = await jobManager.getSchedules()
        const schedule = schedules.find(s => s.id === scheduleId)
        
        return reply.code(201).send({
          scheduleId,
          nextRun: schedule?.nextRun.toISOString() || new Date().toISOString()
        })
      } catch (error) {
        fastify.log.error('Failed to schedule job:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'SCHEDULE_FAILED'
        })
      }
    })

    // Get job endpoint
    fastify.get(`${adminPrefix}/job/:jobId`, async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      try {
        const job = await jobManager.getJob(request.params.jobId)
        
        if (!job) {
          return reply.code(404).send({
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
          })
        }
        
        return reply.send({ job })
      } catch (error) {
        fastify.log.error('Failed to get job:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'GET_JOB_FAILED'
        })
      }
    })

    // Get jobs endpoint
    fastify.get(`${adminPrefix}/jobs`, {
      schema: {
        querystring: JobQuerySchema
      }
    }, async (request: FastifyRequest<{ Querystring: JobQueryRequest }>, reply: FastifyReply) => {
      try {
        const { status, limit = 100 } = request.query
        
        const jobs = await jobManager.getJobs(status, limit)
        
        return reply.send({
          jobs: jobs.map(job => ({
            id: job.id,
            name: job.name,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            queue: job.queue,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts
          })),
          count: jobs.length
        })
      } catch (error) {
        fastify.log.error('Failed to get jobs:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'GET_JOBS_FAILED'
        })
      }
    })

    // Retry job endpoint
    fastify.post(`${adminPrefix}/job/:jobId/retry`, async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      try {
        const job = await jobManager.retryJob(request.params.jobId)
        
        return reply.send({
          job: {
            id: job.id,
            name: job.name,
            status: job.status,
            attempts: job.attempts
          }
        })
      } catch (error) {
        fastify.log.error('Failed to retry job:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'RETRY_FAILED'
        })
      }
    })

    // Remove job endpoint
    fastify.delete(`${adminPrefix}/job/:jobId`, async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      try {
        const removed = await jobManager.removeJob(request.params.jobId)
        
        if (!removed) {
          return reply.code(404).send({
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
          })
        }
        
        return reply.send({
          success: true,
          message: 'Job removed successfully'
        })
      } catch (error) {
        fastify.log.error('Failed to remove job:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'REMOVE_FAILED'
        })
      }
    })

    // Queue management endpoints
    fastify.post(`${adminPrefix}/queue/pause`, {
      schema: { body: QueueOperationSchema }
    }, async (request: FastifyRequest<{ Body: QueueOperationRequest }>, reply: FastifyReply) => {
      try {
        await jobManager.pauseQueue(request.body.queueName)
        return reply.send({
          success: true,
          message: request.body.queueName ? `Queue ${request.body.queueName} paused` : 'All queues paused'
        })
      } catch (error) {
        fastify.log.error('Failed to pause queue:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'PAUSE_FAILED'
        })
      }
    })

    fastify.post(`${adminPrefix}/queue/resume`, {
      schema: { body: QueueOperationSchema }
    }, async (request: FastifyRequest<{ Body: QueueOperationRequest }>, reply: FastifyReply) => {
      try {
        await jobManager.resumeQueue(request.body.queueName)
        return reply.send({
          success: true,
          message: request.body.queueName ? `Queue ${request.body.queueName} resumed` : 'All queues resumed'
        })
      } catch (error) {
        fastify.log.error('Failed to resume queue:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'RESUME_FAILED'
        })
      }
    })

    // Get schedules endpoint
    fastify.get(`${adminPrefix}/schedules`, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const schedules = await jobManager.getSchedules()
        return reply.send({ schedules })
      } catch (error) {
        fastify.log.error('Failed to get schedules:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'GET_SCHEDULES_FAILED'
        })
      }
    })

    // Remove schedule endpoint
    fastify.delete(`${adminPrefix}/schedule/:scheduleId`, async (request: FastifyRequest<{ Params: { scheduleId: string } }>, reply: FastifyReply) => {
      try {
        const removed = await jobManager.unschedule(request.params.scheduleId)
        
        if (!removed) {
          return reply.code(404).send({
            error: 'Schedule not found',
            code: 'SCHEDULE_NOT_FOUND'
          })
        }
        
        return reply.send({
          success: true,
          message: 'Schedule removed successfully'
        })
      } catch (error) {
        fastify.log.error('Failed to remove schedule:', error)
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'UNSCHEDULE_FAILED'
        })
      }
    })
  }

  // Helper methods for easier access
  fastify.decorate('addJob', async (name: string, data?: any, options?: any) => {
    return jobManager.add(name, data, options)
  })

  fastify.decorate('scheduleJob', async (name: string, cronExpression: string, data?: any, options?: any) => {
    return jobManager.schedule(name, cronExpression, data, options)
  })

  fastify.decorate('getJob', async (jobId: string) => {
    return jobManager.getJob(jobId)
  })

  fastify.decorate('retryJob', async (jobId: string) => {
    return jobManager.retryJob(jobId)
  })

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await jobManager.shutdown()
  })

  fastify.log.info('✅ Background Jobs plugin loaded successfully')
}

export default fp(backgroundJobsPlugin, {
  name: 'background-jobs',
  dependencies: ['env-plugin']
})

// Export commonly used cron expressions
export { CronExpressions }

// Extend Fastify instance type for helper methods
declare module 'fastify' {
  interface FastifyInstance {
    addJob(name: string, data?: any, options?: any): Promise<any>
    scheduleJob(name: string, cronExpression: string, data?: any, options?: any): Promise<string>
    getJob(jobId: string): Promise<any>
    retryJob(jobId: string): Promise<any>
  }
}