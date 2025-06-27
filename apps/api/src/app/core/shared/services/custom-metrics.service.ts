import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import {
  CustomMetricsConfig,
  MetricDefinition,
  MetricSeries,
  BusinessMetric,
  PerformanceMetric,
  HealthcareMetric,
  MetricAlert,
  AlertEvent,
  MetricQuery,
  MetricQueryResult,
  CustomMetricsStatistics,
  MetricEventData,
  AggregationType,
  MetricTags,
  MetricDataPoint,
  TimeRange,
} from '../types/custom-metrics.types';

export class CustomMetricsService extends EventEmitter {
  private fastify: FastifyInstance;
  private config: CustomMetricsConfig;
  private metrics: Map<string, MetricDefinition> = new Map();
  private metricData: Map<string, MetricDataPoint[]> = new Map();
  private alerts: Map<string, MetricAlert> = new Map();
  private statistics: CustomMetricsStatistics;
  private collectionInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  constructor(fastify: FastifyInstance, config?: Partial<CustomMetricsConfig>) {
    super();
    this.fastify = fastify;
    this.config = this.buildConfig(config);
    this.statistics = this.initializeStatistics();
    this.initializeDefaultMetrics();
    this.startCollection();
  }

  private buildConfig(config?: Partial<CustomMetricsConfig>): CustomMetricsConfig {
    return {
      enableCollection: config?.enableCollection ?? true,
      collectionInterval: config?.collectionInterval ?? 60000, // 1 minute
      retentionPeriod: config?.retentionPeriod ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      maxMetrics: config?.maxMetrics ?? 10000,
      enableAggregation: config?.enableAggregation ?? true,
      aggregationWindow: config?.aggregationWindow ?? 300000, // 5 minutes
      enableAlerts: config?.enableAlerts ?? true,
      exportFormats: config?.exportFormats ?? ['json', 'csv', 'prometheus'],
      storage: {
        type: 'memory',
        options: {
          compression: false,
          encryption: false,
          batchSize: 1000,
          flushInterval: 30000,
        },
        ...config?.storage,
      },
    };
  }

  private initializeStatistics(): CustomMetricsStatistics {
    return {
      totalMetrics: 0,
      activeMetrics: 0,
      collectionRate: 0,
      storageSize: 0,
      averageLatency: 0,
      errorRate: 0,
      alertsTriggered: 0,
      byCategory: {},
      byType: {
        counter: { count: 0, storageSize: 0 },
        gauge: { count: 0, storageSize: 0 },
        histogram: { count: 0, storageSize: 0 },
        summary: { count: 0, storageSize: 0 },
        timer: { count: 0, storageSize: 0 },
        rate: { count: 0, storageSize: 0 },
      },
      performance: {
        collectionTime: 0,
        aggregationTime: 0,
        queryTime: 0,
      },
    };
  }

  private initializeDefaultMetrics(): void {
    // System performance metrics
    this.defineMetric({
      name: 'http_requests_total',
      type: 'counter',
      description: 'Total number of HTTP requests',
      unit: 'requests',
      tags: ['method', 'status_code', 'endpoint'],
      help: 'Counter of HTTP requests grouped by method, status code, and endpoint',
      aggregations: ['sum', 'count'],
    });

    this.defineMetric({
      name: 'http_request_duration',
      type: 'histogram',
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
      tags: ['method', 'endpoint'],
      help: 'Histogram of HTTP request durations',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      aggregations: ['avg', 'p50', 'p90', 'p95', 'p99'],
    });

    this.defineMetric({
      name: 'database_connections_active',
      type: 'gauge',
      description: 'Number of active database connections',
      unit: 'connections',
      tags: ['pool'],
      help: 'Current number of active database connections',
      aggregations: ['avg', 'max'],
    });

    this.defineMetric({
      name: 'cache_hit_rate',
      type: 'gauge',
      description: 'Cache hit rate percentage',
      unit: 'percent',
      tags: ['cache_type'],
      help: 'Percentage of cache hits vs total cache requests',
      aggregations: ['avg'],
    });

    // Business metrics
    this.defineMetric({
      name: 'user_registrations',
      type: 'counter',
      description: 'Total user registrations',
      unit: 'users',
      tags: ['source', 'plan'],
      help: 'Counter of user registrations by source and plan',
      aggregations: ['sum'],
    });

    this.defineMetric({
      name: 'feature_usage',
      type: 'counter',
      description: 'Feature usage count',
      unit: 'uses',
      tags: ['feature', 'user_type'],
      help: 'Counter of feature usage by feature and user type',
      aggregations: ['sum', 'count'],
    });

    // Healthcare-specific metrics
    this.defineMetric({
      name: 'patient_appointments',
      type: 'counter',
      description: 'Patient appointments scheduled',
      unit: 'appointments',
      tags: ['department', 'provider', 'type'],
      help: 'Counter of patient appointments by department, provider, and type',
      aggregations: ['sum'],
    });

    this.defineMetric({
      name: 'appointment_wait_time',
      type: 'histogram',
      description: 'Patient appointment wait time',
      unit: 'minutes',
      tags: ['department', 'priority'],
      help: 'Histogram of patient wait times for appointments',
      buckets: [5, 10, 15, 30, 45, 60, 90, 120],
      aggregations: ['avg', 'p50', 'p90', 'p95'],
    });
  }

  private startCollection(): void {
    if (!this.config.enableCollection) return;

    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, this.config.collectionInterval);

    if (this.config.enableAggregation) {
      this.aggregationInterval = setInterval(async () => {
        await this.performAggregation();
      }, this.config.aggregationWindow);
    }

    this.fastify.log.info('Custom metrics collection started', {
      interval: this.config.collectionInterval,
      aggregation: this.config.enableAggregation,
    });
  }

  private async collectSystemMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      // Collect connection pool metrics
      if (this.fastify.connectionPool) {
        const poolStats = await this.fastify.connectionPool.getPoolStats();
        this.recordGauge('database_connections_active', poolStats.database.used, {
          pool: 'main',
        });
      }

      // Collect cache metrics
      if (this.fastify.redis) {
        try {
          const cacheStats = await this.fastify.getCacheStats();
          // Calculate hit rate if available
          if (cacheStats.keyspace_info) {
            // Parse keyspace info for hit rate calculation
            this.recordGauge('cache_hit_rate', 85.5, { cache_type: 'redis' }); // Placeholder
          }
        } catch (error) {
          // Redis might not be available
        }
      }

      // Update collection performance
      this.statistics.performance.collectionTime = Date.now() - startTime;
      this.statistics.collectionRate = this.statistics.totalMetrics / (Date.now() - startTime);

    } catch (error) {
      this.fastify.log.error('Error collecting system metrics:', error);
      this.statistics.errorRate++;
    }
  }

  private async performAggregation(): Promise<void> {
    const startTime = Date.now();

    try {
      for (const [metricName, dataPoints] of this.metricData) {
        if (dataPoints.length === 0) continue;

        const metric = this.metrics.get(metricName);
        if (!metric || !metric.aggregations) continue;

        // Aggregate data for the current window
        const windowStart = new Date(Date.now() - this.config.aggregationWindow);
        const windowData = dataPoints.filter(dp => dp.timestamp >= windowStart);

        if (windowData.length === 0) continue;

        // Perform aggregations
        for (const aggregationType of metric.aggregations) {
          const aggregatedValue = this.calculateAggregation(windowData, aggregationType);
          
          // Store aggregated metric (could be sent to external systems)
          this.emit('metric-aggregated', {
            type: 'metric-aggregated',
            timestamp: new Date(),
            metric: metricName,
            data: {
              aggregation: aggregationType,
              value: aggregatedValue,
              window: this.config.aggregationWindow,
              dataPoints: windowData.length,
            },
          } as MetricEventData);
        }
      }

      this.statistics.performance.aggregationTime = Date.now() - startTime;
    } catch (error) {
      this.fastify.log.error('Error performing aggregation:', error);
    }
  }

  private calculateAggregation(dataPoints: MetricDataPoint[], type: AggregationType): number {
    const values = dataPoints.map(dp => dp.value);

    switch (type) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.calculatePercentile(values, 50);
      case 'p90':
        return this.calculatePercentile(values, 90);
      case 'p95':
        return this.calculatePercentile(values, 95);
      case 'p99':
        return this.calculatePercentile(values, 99);
      default:
        return 0;
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }

  // Metric definition methods
  defineMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);
    this.metricData.set(definition.name, []);
    
    this.statistics.totalMetrics++;
    this.statistics.byType[definition.type].count++;
    
    this.fastify.log.debug(`Metric defined: ${definition.name} (${definition.type})`);
  }

  removeMetric(name: string): boolean {
    const metric = this.metrics.get(name);
    if (!metric) return false;

    this.metrics.delete(name);
    this.metricData.delete(name);
    
    this.statistics.totalMetrics--;
    this.statistics.byType[metric.type].count--;
    
    return true;
  }

  // Recording methods
  recordCounter(name: string, value: number = 1, tags: MetricTags = {}): void {
    this.recordMetric(name, value, tags);
  }

  recordGauge(name: string, value: number, tags: MetricTags = {}): void {
    this.recordMetric(name, value, tags);
  }

  recordTimer(name: string, startTime: number, tags: MetricTags = {}): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration, tags);
  }

  recordHistogram(name: string, value: number, tags: MetricTags = {}): void {
    this.recordMetric(name, value, tags);
  }

  private recordMetric(name: string, value: number, tags: MetricTags): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      this.fastify.log.warn(`Metric '${name}' not defined`);
      return;
    }

    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      tags,
    };

    const dataPoints = this.metricData.get(name) || [];
    dataPoints.push(dataPoint);

    // Enforce retention policy
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    const filtered = dataPoints.filter(dp => dp.timestamp >= cutoff);
    this.metricData.set(name, filtered);

    // Check alerts
    if (this.config.enableAlerts) {
      this.checkAlerts(name, value, tags);
    }

    this.emit('metric-collected', {
      type: 'metric-collected',
      timestamp: new Date(),
      metric: name,
      data: { value, tags },
    } as MetricEventData);
  }

  // Business metrics
  recordBusinessMetric(metric: BusinessMetric): void {
    const metricName = `business_${metric.category}_${metric.name}`;
    this.recordMetric(metricName, metric.value, {
      category: metric.category,
      userId: metric.context.userId || 'unknown',
      organizationId: metric.context.organizationId || 'unknown',
    });

    // Update category statistics
    if (!this.statistics.byCategory[metric.category]) {
      this.statistics.byCategory[metric.category] = {
        count: 0,
        averageValue: 0,
        lastUpdated: new Date(),
      };
    }

    const categoryStats = this.statistics.byCategory[metric.category];
    categoryStats.count++;
    categoryStats.averageValue = 
      (categoryStats.averageValue * (categoryStats.count - 1) + metric.value) / categoryStats.count;
    categoryStats.lastUpdated = new Date();
  }

  recordPerformanceMetric(metric: PerformanceMetric): void {
    const tags: MetricTags = {
      operation: metric.operation,
      success: metric.success.toString(),
    };

    if (metric.errorType) {
      tags.error_type = metric.errorType;
    }

    if (metric.context?.endpoint) {
      tags.endpoint = metric.context.endpoint;
    }

    if (metric.context?.method) {
      tags.method = metric.context.method;
    }

    this.recordTimer('performance_operation_duration', 
      metric.timestamp.getTime() - metric.duration, tags);
  }

  recordHealthcareMetric(metric: HealthcareMetric): void {
    const metricName = `healthcare_${metric.category}`;
    const tags: MetricTags = {
      category: metric.category,
      department: metric.metadata.department || 'unknown',
    };

    if (metric.providerId) tags.provider_id = metric.providerId;
    if (metric.facilityId) tags.facility_id = metric.facilityId;
    if (metric.metadata.priority) tags.priority = metric.metadata.priority;

    this.recordMetric(metricName, metric.value, tags);
  }

  // HTTP request tracking
  trackHttpRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): void {
    // Record request count
    this.recordCounter('http_requests_total', 1, {
      method,
      status_code: statusCode.toString(),
      endpoint,
    });

    // Record request duration
    this.recordHistogram('http_request_duration', duration, {
      method,
      endpoint,
    });
  }

  // Alert management
  createAlert(alert: Omit<MetricAlert, 'id' | 'triggeredCount' | 'lastTriggered'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAlert: MetricAlert = {
      ...alert,
      id,
      triggeredCount: 0,
    };

    this.alerts.set(id, fullAlert);
    this.fastify.log.info(`Alert created: ${alert.name} (${id})`);
    
    return id;
  }

  private checkAlerts(metricName: string, value: number, tags: MetricTags): void {
    for (const alert of this.alerts.values()) {
      if (alert.metric !== metricName || !alert.enabled) continue;

      const shouldTrigger = this.evaluateAlertCondition(alert, value);
      
      if (shouldTrigger) {
        const now = new Date();
        const cooldownExpired = !alert.lastTriggered || 
          (now.getTime() - alert.lastTriggered.getTime()) > alert.cooldown;

        if (cooldownExpired) {
          this.triggerAlert(alert, value, tags);
        }
      }
    }
  }

  private evaluateAlertCondition(alert: MetricAlert, value: number): boolean {
    const { condition, threshold } = alert;
    
    switch (condition.operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private triggerAlert(alert: MetricAlert, currentValue: number, tags: MetricTags): void {
    const alertEvent: AlertEvent = {
      alertId: alert.id,
      alertName: alert.name,
      metric: alert.metric,
      currentValue,
      threshold: alert.threshold,
      condition: alert.condition,
      severity: alert.severity,
      timestamp: new Date(),
      resolved: false,
    };

    alert.lastTriggered = new Date();
    alert.triggeredCount++;
    this.statistics.alertsTriggered++;

    this.emit('alert-triggered', {
      type: 'alert-triggered',
      timestamp: new Date(),
      data: alertEvent,
    } as MetricEventData);

    this.fastify.log.warn(`Alert triggered: ${alert.name}`, {
      metric: alert.metric,
      currentValue,
      threshold: alert.threshold,
      severity: alert.severity,
    });
  }

  // Query methods
  async queryMetrics(query: MetricQuery): Promise<MetricQueryResult> {
    const startTime = Date.now();

    try {
      const results: MetricSeries[] = [];

      for (const metricName of query.metrics) {
        const metric = this.metrics.get(metricName);
        if (!metric) continue;

        const dataPoints = this.metricData.get(metricName) || [];
        
        // Filter by time range
        const filteredData = dataPoints.filter(dp => 
          dp.timestamp >= query.timeRange.start && 
          dp.timestamp <= query.timeRange.end
        );

        // Apply additional filters
        let finalData = filteredData;
        if (query.filters) {
          finalData = this.applyFilters(filteredData, query.filters);
        }

        // Apply limit and offset
        if (query.offset) {
          finalData = finalData.slice(query.offset);
        }
        if (query.limit) {
          finalData = finalData.slice(0, query.limit);
        }

        const series: MetricSeries = {
          name: metricName,
          type: metric.type,
          description: metric.description,
          unit: metric.unit,
          dataPoints: finalData,
        };

        // Add aggregations if requested
        if (query.aggregation && finalData.length > 0) {
          series.aggregations = [{
            type: query.aggregation,
            value: this.calculateAggregation(finalData, query.aggregation),
            window: query.timeRange.end.getTime() - query.timeRange.start.getTime(),
            timestamp: new Date(),
          }];
        }

        results.push(series);
      }

      const executionTime = Date.now() - startTime;
      this.statistics.performance.queryTime = 
        (this.statistics.performance.queryTime + executionTime) / 2;

      return {
        metrics: results,
        totalCount: results.reduce((sum, series) => sum + series.dataPoints.length, 0),
        executionTime,
        query,
        timestamp: new Date(),
      };
    } catch (error) {
      this.fastify.log.error('Error querying metrics:', error);
      throw error;
    }
  }

  private applyFilters(dataPoints: MetricDataPoint[], filters: any[]): MetricDataPoint[] {
    // Simplified filter implementation
    return dataPoints; // TODO: Implement proper filtering
  }

  // Export methods
  async exportMetrics(metricNames: string[], timeRange: TimeRange, format: string): Promise<string> {
    const query: MetricQuery = {
      metrics: metricNames,
      timeRange,
    };

    const result = await this.queryMetrics(query);

    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'csv':
        return this.exportToCsv(result);
      case 'prometheus':
        return this.exportToPrometheus(result);
      default:
        throw new Error(`Export format '${format}' not supported`);
    }
  }

  private exportToCsv(result: MetricQueryResult): string {
    const lines: string[] = ['timestamp,metric,value,tags'];
    
    for (const series of result.metrics) {
      for (const dataPoint of series.dataPoints) {
        const tags = Object.entries(dataPoint.tags)
          .map(([key, value]) => `${key}=${value}`)
          .join(';');
        
        lines.push([
          dataPoint.timestamp.toISOString(),
          series.name,
          dataPoint.value.toString(),
          tags,
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  private exportToPrometheus(result: MetricQueryResult): string {
    const lines: string[] = [];
    
    for (const series of result.metrics) {
      lines.push(`# HELP ${series.name} ${series.description}`);
      lines.push(`# TYPE ${series.name} ${series.type}`);
      
      for (const dataPoint of series.dataPoints) {
        const labels = Object.entries(dataPoint.tags)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        
        const labelString = labels ? `{${labels}}` : '';
        lines.push(`${series.name}${labelString} ${dataPoint.value} ${dataPoint.timestamp.getTime()}`);
      }
    }

    return lines.join('\n');
  }

  // Management methods
  getMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetricDefinition(name: string): MetricDefinition | undefined {
    return this.metrics.get(name);
  }

  getStatistics(): CustomMetricsStatistics {
    return { ...this.statistics };
  }

  getAlerts(): MetricAlert[] {
    return Array.from(this.alerts.values());
  }

  enableAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.enabled = true;
    }
  }

  disableAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.enabled = false;
    }
  }

  removeAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  clearMetrics(metricName?: string): void {
    if (metricName) {
      this.metricData.set(metricName, []);
    } else {
      for (const key of this.metricData.keys()) {
        this.metricData.set(key, []);
      }
    }
  }

  getConfig(): CustomMetricsConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CustomMetricsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart collection if interval changed
    if (newConfig.collectionInterval && this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.startCollection();
    }
  }

  shutdown(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    
    this.removeAllListeners();
    this.fastify.log.info('Custom metrics service shutdown');
  }
}