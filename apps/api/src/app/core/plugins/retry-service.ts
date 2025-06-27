import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { RetryService } from '../shared/services/retry.service';
import { RetryServiceConfig, RetryStrategy } from '../shared/types/retry-service.types';

declare module 'fastify' {
  interface FastifyInstance {
    retryService: RetryService;
  }
}

export interface RetryServicePluginOptions {
  config?: Partial<RetryServiceConfig>;
  enableRoutes?: boolean;
  enableMetrics?: boolean;
}

export default fp<RetryServicePluginOptions>(
  async function retryServicePlugin(
    fastify: FastifyInstance,
    options: RetryServicePluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: RetryServicePluginOptions = {
      config: {
        defaultStrategy: 'standard',
        enableMetrics: true,
        enableLogging: process.env.NODE_ENV === 'development',
        maxConcurrentRetries: 100,
      },
      enableRoutes: true,
      enableMetrics: true,
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create retry service
    const retryService = new RetryService(pluginOptions.config);

    // Register the retry service with Fastify
    fastify.decorate('retryService', retryService);

    // Set up event listeners
    retryService.on('retry-failure', (event) => {
      fastify.log.warn('Retry operation failed:', {
        executionId: event.executionId,
        error: event.data?.error,
        attempts: event.data?.attempts,
      });
    });

    retryService.on('retry-aborted', (event) => {
      fastify.log.info('Retry operation aborted:', {
        executionId: event.executionId,
        attempts: event.data?.attempts,
      });
    });

    retryService.on('metrics-updated', (event) => {
      fastify.log.debug('Retry metrics updated:', event.data?.metrics);
    });

    // Add management routes if enabled
    if (pluginOptions.enableRoutes) {
      // Get retry strategies
      fastify.get('/retry/strategies', async (request, reply) => {
        try {
          const strategies = retryService.getStrategies();
          return reply.send({
            strategies: strategies.map(s => ({
              name: s.name,
              description: s.description,
              attempts: s.attempts,
              delay: s.delay,
              backoff: s.backoff,
              jitter: s.jitter,
              maxDelay: s.maxDelay,
              timeoutMs: s.timeoutMs,
            })),
          });
        } catch (error) {
          fastify.log.error('Failed to get retry strategies:', error);
          return reply.status(500).send({
            error: 'Failed to get retry strategies',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get retry metrics
      fastify.get('/retry/metrics', async (request, reply) => {
        try {
          const metrics = retryService.getMetrics();
          return reply.send({
            metrics: {
              ...metrics,
              activeRetries: retryService.getActiveRetries(),
            },
          });
        } catch (error) {
          fastify.log.error('Failed to get retry metrics:', error);
          return reply.status(500).send({
            error: 'Failed to get retry metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get specific execution details
      fastify.get('/retry/executions/:id', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          const execution = retryService.getExecution(id);
          
          if (!execution) {
            return reply.status(404).send({
              error: 'Execution not found',
              message: `No retry execution found with ID: ${id}`,
            });
          }

          return reply.send({ execution });
        } catch (error) {
          fastify.log.error('Failed to get retry execution:', error);
          return reply.status(500).send({
            error: 'Failed to get retry execution',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Clear metrics
      fastify.delete('/retry/metrics', async (request, reply) => {
        try {
          retryService.clearMetrics();
          return reply.send({ message: 'Metrics cleared successfully' });
        } catch (error) {
          fastify.log.error('Failed to clear retry metrics:', error);
          return reply.status(500).send({
            error: 'Failed to clear retry metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Test retry operation endpoint
      fastify.post('/retry/test', async (request, reply) => {
        try {
          const { 
            strategy = 'standard', 
            shouldFail = false, 
            failureRate = 0.5 
          } = request.body as any;

          let attemptCount = 0;
          const testOperation = async () => {
            attemptCount++;
            if (shouldFail && Math.random() < failureRate) {
              throw new Error(`Test failure on attempt ${attemptCount}`);
            }
            return { success: true, attemptCount };
          };

          const result = await retryService.retryWithContext(
            testOperation,
            'test-operation',
            strategy as RetryStrategy
          );

          return reply.send({
            message: 'Test operation completed successfully',
            result,
            strategy,
          });
        } catch (error) {
          return reply.status(500).send({
            error: 'Test operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            strategy: (request.body as any)?.strategy || 'standard',
          });
        }
      });
    }

    // Add utility methods to Fastify instance
    fastify.decorate('retry', async function<T>(
      operation: () => Promise<T>,
      strategy: RetryStrategy = 'standard'
    ): Promise<T> {
      return retryService.retryOperation(operation, strategy);
    });

    fastify.decorate('retryWithContext', async function<T>(
      operation: () => Promise<T>,
      operationName: string,
      strategy: RetryStrategy = 'standard',
      metadata?: Record<string, any>
    ): Promise<T> {
      return retryService.retryWithContext(operation, operationName, strategy, metadata);
    });

    // Add hook for automatic retry on plugin registration errors
    fastify.addHook('onError', async (request, reply, error) => {
      // Only auto-retry certain types of errors
      if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
        fastify.log.warn('Potential network error detected, consider using retry service for this operation');
      }
    });

    fastify.log.info('✅ Retry Service plugin registered successfully', {
      defaultStrategy: pluginOptions.config?.defaultStrategy,
      enableMetrics: pluginOptions.enableMetrics,
      enableRoutes: pluginOptions.enableRoutes,
      maxConcurrentRetries: pluginOptions.config?.maxConcurrentRetries,
    });
  },
  {
    name: 'retry-service-plugin',
    dependencies: ['env-plugin'],
  }
);

// Extend FastifyInstance interface for retry methods
declare module 'fastify' {
  interface FastifyInstance {
    retry: <T>(operation: () => Promise<T>, strategy?: RetryStrategy) => Promise<T>;
    retryWithContext: <T>(
      operation: () => Promise<T>,
      operationName: string,
      strategy?: RetryStrategy,
      metadata?: Record<string, any>
    ) => Promise<T>;
  }
}