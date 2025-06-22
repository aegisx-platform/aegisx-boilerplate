import { FastifyInstance } from 'fastify';
import {
  AdapterStatsSchema,
  AdapterHealthSchema,
  AdapterInfoSchema,
  AdapterQueueSchema
} from '../schemas/audit-adapter-schemas';

/**
 * Audit Adapter Routes
 *
 * Provides endpoints for monitoring and managing audit adapters:
 * - GET /adapter/stats - Get adapter statistics and performance metrics
 * - GET /adapter/health - Check adapter health status
 * - GET /adapter/info - Get adapter configuration information
 * - GET /adapter/queue - Get queue status (Redis adapter only)
 */
export async function auditAdapterRoutes(fastify: FastifyInstance) {

  // Routes

  // 1. GET /adapter/stats - Get adapter statistics
  fastify.get('/adapter/stats', {
    schema: AdapterStatsSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
  }, async (request, reply) => {
    try {
      const stats = await fastify.auditMiddleware.getAdapterStats();
      const adapterType = fastify.auditMiddleware.getAdapterType();

      return {
        success: true,
        data: {
          adapter_type: adapterType,
          ...stats
        }
      };
    } catch (error: any) {
      fastify.log.error('Failed to get audit adapter stats', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve adapter statistics'
      });
    }
  });

  // 2. GET /adapter/health - Check adapter health
  fastify.get('/adapter/health', {
    schema: AdapterHealthSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
  }, async (request, reply) => {
    try {
      const isHealthy = await fastify.auditMiddleware.isAdapterHealthy();
      const adapterType = fastify.auditMiddleware.getAdapterType();

      const response = {
        success: true,
        data: {
          adapter_type: adapterType,
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        }
      };

      if (!isHealthy) {
        // Check if we're using fallback mode
        if (adapterType.includes('fallback')) {
          return {
            success: true,
            data: {
              adapter_type: adapterType,
              healthy: true, // Report as healthy since fallback is working
              mode: 'fallback',
              timestamp: new Date().toISOString()
            }
          };
        }
        
        return reply.status(503).send({
          ...response,
          success: false,
          error: 'Audit adapter is not healthy'
        });
      }

      return response;
    } catch (error: any) {
      fastify.log.error('Failed to check audit adapter health', error);
      const adapterType = fastify.auditMiddleware.getAdapterType();

      return reply.status(503).send({
        success: false,
        error: 'Health check failed',
        data: {
          adapter_type: adapterType,
          healthy: false
        }
      });
    }
  });

  // 3. GET /adapter/info - Get adapter information
  fastify.get('/adapter/info', {
    schema: AdapterInfoSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
  }, async (request, reply) => {
    try {
      const adapterType = fastify.auditMiddleware.getAdapterType();

      // Get configuration from environment
      const configuration = {
        enabled: fastify.config.AUDIT_ENABLED === 'true',
        batch_size: parseInt(fastify.config.AUDIT_BATCH_SIZE, 10),
        batch_timeout: parseInt(fastify.config.AUDIT_BATCH_TIMEOUT, 10),
        queue_name: fastify.config.AUDIT_QUEUE_NAME,
        max_retries: parseInt(fastify.config.AUDIT_MAX_RETRIES, 10)
      };

      // Define capabilities based on adapter type
      const capabilities = getAdapterCapabilities(adapterType);

      return {
        success: true,
        data: {
          adapter_type: adapterType,
          configuration,
          capabilities,
          environment: fastify.config.NODE_ENV
        }
      };
    } catch (error: any) {
      fastify.log.error('Failed to get audit adapter info', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve adapter information'
      });
    }
  });

  // 4. GET /adapter/queue - Get queue status (Redis/RabbitMQ adapters)
  fastify.get('/adapter/queue', {
    schema: AdapterQueueSchema,
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])]
  }, async (request, reply) => {
    try {
      const adapterType = fastify.auditMiddleware.getAdapterType();

      if (adapterType === 'redis') {
        // Check if Redis worker exists
        const auditWorker = (fastify as any).auditWorker;
        if (!auditWorker) {
          return {
            success: true,
            data: {
              adapter_type: adapterType,
              queue_healthy: false,
              worker_running: false,
              error: 'Audit worker not initialized',
              timestamp: new Date().toISOString()
            }
          };
        }

        const queueStatus = await auditWorker.getQueueStatus();

        return {
          success: true,
          data: {
            adapter_type: adapterType,
            ...queueStatus,
            timestamp: new Date().toISOString()
          }
        };

      } else if (adapterType === 'rabbitmq') {
        // Check if RabbitMQ worker exists
        const rabbitMQWorker = (fastify as any).rabbitMQWorker;
        if (!rabbitMQWorker) {
          return {
            success: true,
            data: {
              adapter_type: adapterType,
              queue_healthy: false,
              worker_running: false,
              error: 'RabbitMQ worker not initialized',
              timestamp: new Date().toISOString()
            }
          };
        }

        const queueStatus = await rabbitMQWorker.getQueueStatus();

        return {
          success: true,
          data: {
            adapter_type: adapterType,
            ...queueStatus,
            timestamp: new Date().toISOString()
          }
        };

      } else {
        return reply.status(400).send({
          success: false,
          error: `Queue status is not available for ${adapterType} adapter`
        });
      }
    } catch (error: any) {
      fastify.log.error('Failed to get queue status', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve queue status'
      });
    }
  });
}

/**
 * Get capabilities for each adapter type
 */
function getAdapterCapabilities(adapterType: string): string[] {
  switch (adapterType) {
    case 'direct':
      return [
        'immediate_persistence',
        'strong_consistency',
        'simple_configuration'
      ];
    case 'redis':
      return [
        'queue_processing',
        'batch_operations',
        'retry_mechanism',
        'dead_letter_queue',
        'async_processing'
      ];
    case 'rabbitmq':
      return [
        'message_queuing',
        'topic_exchange',
        'priority_queues',
        'durable_messages',
        'horizontal_scaling',
        'routing_patterns',
        'dead_letter_exchange',
        'publisher_confirms',
        'clustering_support'
      ];
    case 'hybrid':
      return [
        'fallback_mechanism',
        'high_availability',
        'flexible_processing',
        'fault_tolerance'
      ];
    default:
      return ['unknown'];
  }
}
