import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { CustomMetricsService } from '../shared/services/custom-metrics.service';
import { 
  CustomMetricsConfig, 
  MetricDefinition, 
  BusinessMetric, 
  PerformanceMetric, 
  HealthcareMetric,
  MetricQuery,
  TimeRange,
  MetricTags 
} from '../shared/types/custom-metrics.types';

declare module 'fastify' {
  interface FastifyInstance {
    metrics: CustomMetricsService;
  }
}

export interface CustomMetricsPluginOptions {
  config?: Partial<CustomMetricsConfig>;
  enableRoutes?: boolean;
  enableHttpTracking?: boolean;
  enableHealthcareMetrics?: boolean;
}

export default fp<CustomMetricsPluginOptions>(
  async function customMetricsPlugin(
    fastify: FastifyInstance,
    options: CustomMetricsPluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: CustomMetricsPluginOptions = {
      config: {
        enableCollection: true,
        collectionInterval: 60000, // 1 minute
        retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxMetrics: 10000,
        enableAggregation: true,
        aggregationWindow: 300000, // 5 minutes
        enableAlerts: true,
        exportFormats: ['json', 'csv', 'prometheus'],
      },
      enableRoutes: true,
      enableHttpTracking: true,
      enableHealthcareMetrics: true,
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create custom metrics service
    const metricsService = new CustomMetricsService(fastify, pluginOptions.config);

    // Register the metrics service with Fastify
    fastify.decorate('metrics', metricsService);

    // Set up event listeners
    metricsService.on('alert-triggered', (event) => {
      fastify.log.warn('Metrics alert triggered:', {
        alertName: event.data.alertName,
        metric: event.data.metric,
        currentValue: event.data.currentValue,
        threshold: event.data.threshold,
        severity: event.data.severity,
      });
    });

    metricsService.on('metric-collected', (event) => {
      fastify.log.debug('Metric collected:', {
        metric: event.metric,
        value: event.data?.value,
      });
    });

    metricsService.on('export-completed', (event) => {
      fastify.log.info('Metrics export completed:', event.data);
    });

    // Add HTTP request tracking if enabled
    if (pluginOptions.enableHttpTracking) {
      fastify.addHook('onRequest', async (request) => {
        (request as any).startTime = Date.now();
      });

      fastify.addHook('onResponse', async (request, reply) => {
        const startTime = (request as any).startTime;
        if (startTime) {
          const duration = Date.now() - startTime;
          
          metricsService.trackHttpRequest(
            request.method,
            (request as any).routerPath || request.url,
            reply.statusCode,
            duration
          );
        }
      });
    }

    // Add management routes if enabled
    if (pluginOptions.enableRoutes) {
      // Get all metrics definitions
      fastify.get('/metrics/definitions', async (request, reply) => {
        try {
          const metricNames = metricsService.getMetrics();
          const definitions = metricNames.map(name => 
            metricsService.getMetricDefinition(name)
          ).filter(def => def !== undefined);

          return reply.send({
            definitions,
            total: definitions.length,
          });
        } catch (error) {
          fastify.log.error('Failed to get metric definitions:', error);
          return reply.status(500).send({
            error: 'Failed to get metric definitions',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Create new metric definition
      fastify.post('/metrics/definitions', async (request, reply) => {
        try {
          const definition = request.body as MetricDefinition;
          
          if (!definition.name || !definition.type) {
            return reply.status(400).send({
              error: 'Invalid metric definition',
              message: 'Metric must have name and type',
            });
          }

          metricsService.defineMetric(definition);
          
          return reply.status(201).send({
            message: `Metric '${definition.name}' defined successfully`,
            definition,
          });
        } catch (error) {
          fastify.log.error('Failed to define metric:', error);
          return reply.status(500).send({
            error: 'Failed to define metric',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Query metrics data
      fastify.post('/metrics/query', async (request, reply) => {
        try {
          const query = request.body as MetricQuery;
          
          if (!query.metrics || !query.timeRange) {
            return reply.status(400).send({
              error: 'Invalid query',
              message: 'Query must have metrics and timeRange',
            });
          }

          const result = await metricsService.queryMetrics(query);
          return reply.send(result);
        } catch (error) {
          fastify.log.error('Failed to query metrics:', error);
          return reply.status(500).send({
            error: 'Failed to query metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Export metrics
      fastify.post('/metrics/export', async (request, reply) => {
        try {
          const { metrics, timeRange, format = 'json' } = request.body as {
            metrics: string[];
            timeRange: TimeRange;
            format?: string;
          };

          if (!metrics || !timeRange) {
            return reply.status(400).send({
              error: 'Invalid export request',
              message: 'Export must specify metrics and timeRange',
            });
          }

          const exportData = await metricsService.exportMetrics(metrics, timeRange, format);
          
          // Set appropriate content type
          const contentTypes: Record<string, string> = {
            json: 'application/json',
            csv: 'text/csv',
            prometheus: 'text/plain',
          };

          reply.type(contentTypes[format] || 'text/plain');
          return reply.send(exportData);
        } catch (error) {
          fastify.log.error('Failed to export metrics:', error);
          return reply.status(500).send({
            error: 'Failed to export metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Record business metric
      fastify.post('/metrics/business', async (request, reply) => {
        try {
          const metric = request.body as BusinessMetric;
          
          if (!metric.category || !metric.name || metric.value === undefined) {
            return reply.status(400).send({
              error: 'Invalid business metric',
              message: 'Business metric must have category, name, and value',
            });
          }

          metricsService.recordBusinessMetric(metric);
          
          return reply.send({
            message: 'Business metric recorded successfully',
            metric: {
              category: metric.category,
              name: metric.name,
              value: metric.value,
            },
          });
        } catch (error) {
          fastify.log.error('Failed to record business metric:', error);
          return reply.status(500).send({
            error: 'Failed to record business metric',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Record performance metric
      fastify.post('/metrics/performance', async (request, reply) => {
        try {
          const metric = request.body as PerformanceMetric;
          
          if (!metric.operation || metric.duration === undefined) {
            return reply.status(400).send({
              error: 'Invalid performance metric',
              message: 'Performance metric must have operation and duration',
            });
          }

          metricsService.recordPerformanceMetric(metric);
          
          return reply.send({
            message: 'Performance metric recorded successfully',
            metric: {
              operation: metric.operation,
              duration: metric.duration,
              success: metric.success,
            },
          });
        } catch (error) {
          fastify.log.error('Failed to record performance metric:', error);
          return reply.status(500).send({
            error: 'Failed to record performance metric',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Record healthcare metric
      if (pluginOptions.enableHealthcareMetrics) {
        fastify.post('/metrics/healthcare', async (request, reply) => {
          try {
            const metric = request.body as HealthcareMetric;
            
            if (!metric.category || metric.value === undefined) {
              return reply.status(400).send({
                error: 'Invalid healthcare metric',
                message: 'Healthcare metric must have category and value',
              });
            }

            metricsService.recordHealthcareMetric(metric);
            
            return reply.send({
              message: 'Healthcare metric recorded successfully',
              metric: {
                category: metric.category,
                value: metric.value,
                department: metric.metadata.department,
              },
            });
          } catch (error) {
            fastify.log.error('Failed to record healthcare metric:', error);
            return reply.status(500).send({
              error: 'Failed to record healthcare metric',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });
      }

      // Get metrics statistics
      fastify.get('/metrics/statistics', async (request, reply) => {
        try {
          const statistics = metricsService.getStatistics();
          return reply.send({ statistics });
        } catch (error) {
          fastify.log.error('Failed to get metrics statistics:', error);
          return reply.status(500).send({
            error: 'Failed to get metrics statistics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Alert management
      fastify.get('/metrics/alerts', async (request, reply) => {
        try {
          const alerts = metricsService.getAlerts();
          return reply.send({ alerts });
        } catch (error) {
          fastify.log.error('Failed to get alerts:', error);
          return reply.status(500).send({
            error: 'Failed to get alerts',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.post('/metrics/alerts', async (request, reply) => {
        try {
          const alert = request.body as any;
          
          if (!alert.name || !alert.metric || !alert.condition || alert.threshold === undefined) {
            return reply.status(400).send({
              error: 'Invalid alert definition',
              message: 'Alert must have name, metric, condition, and threshold',
            });
          }

          const alertId = metricsService.createAlert(alert);
          
          return reply.status(201).send({
            message: 'Alert created successfully',
            alertId,
            alert: { name: alert.name, metric: alert.metric },
          });
        } catch (error) {
          fastify.log.error('Failed to create alert:', error);
          return reply.status(500).send({
            error: 'Failed to create alert',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Enable/disable alerts
      fastify.patch('/metrics/alerts/:id/enable', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          metricsService.enableAlert(id);
          return reply.send({ message: 'Alert enabled' });
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to enable alert',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      fastify.patch('/metrics/alerts/:id/disable', async (request, reply) => {
        try {
          const { id } = request.params as { id: string };
          metricsService.disableAlert(id);
          return reply.send({ message: 'Alert disabled' });
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to disable alert',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Clear metrics data
      fastify.delete('/metrics/data', async (request, reply) => {
        try {
          const query = request.query as any;
          const metricName = query?.metric;
          
          metricsService.clearMetrics(metricName);
          
          return reply.send({
            message: metricName 
              ? `Data cleared for metric '${metricName}'`
              : 'All metrics data cleared',
          });
        } catch (error) {
          fastify.log.error('Failed to clear metrics data:', error);
          return reply.status(500).send({
            error: 'Failed to clear metrics data',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    }

    // Add utility methods to Fastify instance
    fastify.decorate('recordMetric', function(
      name: string,
      value: number,
      tags?: MetricTags
    ) {
      metricsService.recordCounter(name, value, tags || {});
    });

    fastify.decorate('recordGauge', function(
      name: string,
      value: number,
      tags?: MetricTags
    ) {
      metricsService.recordGauge(name, value, tags || {});
    });

    fastify.decorate('recordTimer', function(
      name: string,
      startTime: number,
      tags?: MetricTags
    ) {
      metricsService.recordTimer(name, startTime, tags || {});
    });

    fastify.decorate('recordBusinessMetric', function(metric: BusinessMetric) {
      metricsService.recordBusinessMetric(metric);
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      metricsService.shutdown();
    });

    fastify.log.info('✅ Custom Metrics plugin registered successfully', {
      enableCollection: pluginOptions.config?.enableCollection,
      enableRoutes: pluginOptions.enableRoutes,
      enableHttpTracking: pluginOptions.enableHttpTracking,
      enableHealthcareMetrics: pluginOptions.enableHealthcareMetrics,
      collectionInterval: pluginOptions.config?.collectionInterval,
    });
  },
  {
    name: 'custom-metrics-plugin',
    dependencies: ['env-plugin'],
  }
);

// Extend FastifyInstance interface for metrics methods
declare module 'fastify' {
  interface FastifyInstance {
    recordMetric: (name: string, value: number, tags?: MetricTags) => void;
    recordGauge: (name: string, value: number, tags?: MetricTags) => void;
    recordTimer: (name: string, startTime: number, tags?: MetricTags) => void;
    recordBusinessMetric: (metric: BusinessMetric) => void;
  }
}