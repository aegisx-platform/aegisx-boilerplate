export interface CustomMetricsConfig {
  enableCollection: boolean;
  collectionInterval: number;
  retentionPeriod: number;
  maxMetrics: number;
  enableAggregation: boolean;
  aggregationWindow: number;
  enableAlerts: boolean;
  exportFormats: MetricExportFormat[];
  storage: MetricStorageConfig;
}

export interface MetricStorageConfig {
  type: 'memory' | 'redis' | 'database' | 'file';
  connection?: any;
  options?: {
    compression?: boolean;
    encryption?: boolean;
    batchSize?: number;
    flushInterval?: number;
  };
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  tags: string[];
  help: string;
  buckets?: number[]; // For histograms
  percentiles?: number[]; // For summaries
  aggregations?: AggregationType[];
}

export interface MetricValue {
  name: string;
  value: number;
  timestamp: Date;
  tags: MetricTags;
  labels?: MetricLabels;
}

export interface MetricTags {
  [key: string]: string;
}

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  tags: MetricTags;
  labels?: MetricLabels;
}

export interface MetricSeries {
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  dataPoints: MetricDataPoint[];
  aggregations?: MetricAggregation[];
}

export interface MetricAggregation {
  type: AggregationType;
  value: number;
  window: number;
  timestamp: Date;
}

export interface BusinessMetric {
  category: BusinessMetricCategory;
  name: string;
  value: number;
  timestamp: Date;
  context: BusinessContext;
  metadata?: Record<string, any>;
}

export interface BusinessContext {
  userId?: string;
  organizationId?: string;
  departmentId?: string;
  sessionId?: string;
  requestId?: string;
  feature?: string;
  action?: string;
  resource?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorType?: string;
  tags: MetricTags;
  context?: PerformanceContext;
}

export interface PerformanceContext {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  responseSize?: number;
  requestSize?: number;
}

export interface HealthcareMetric {
  category: HealthcareMetricCategory;
  patientId?: string;
  providerId?: string;
  facilityId?: string;
  value: number;
  timestamp: Date;
  metadata: HealthcareMetadata;
}

export interface HealthcareMetadata {
  department?: string;
  specialty?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  compliance?: {
    hipaa: boolean;
    gdpr: boolean;
    anonymized: boolean;
  };
  [key: string]: any;
}

export interface MetricAlert {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldown: number;
  lastTriggered?: Date;
  triggeredCount: number;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  window: number;
  aggregation: AggregationType;
}

export interface AlertEvent {
  alertId: string;
  alertName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  condition: AlertCondition;
  severity: AlertSeverity;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  duration?: number;
}

export interface MetricQuery {
  metrics: string[];
  timeRange: TimeRange;
  aggregation?: AggregationType;
  groupBy?: string[];
  filters?: MetricFilter[];
  limit?: number;
  offset?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricFilter {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'regex';
  value: string | string[];
}

export interface MetricQueryResult {
  metrics: MetricSeries[];
  totalCount: number;
  executionTime: number;
  query: MetricQuery;
  timestamp: Date;
}

export interface MetricExport {
  format: MetricExportFormat;
  timeRange: TimeRange;
  metrics: string[];
  compression?: boolean;
  filename?: string;
}

export interface CustomMetricsStatistics {
  totalMetrics: number;
  activeMetrics: number;
  collectionRate: number;
  storageSize: number;
  averageLatency: number;
  errorRate: number;
  alertsTriggered: number;
  byCategory: Record<string, {
    count: number;
    averageValue: number;
    lastUpdated: Date;
  }>;
  byType: Record<MetricType, {
    count: number;
    storageSize: number;
  }>;
  performance: {
    collectionTime: number;
    aggregationTime: number;
    queryTime: number;
  };
}

export interface MetricEventData {
  type: 'metric-collected' | 'metric-aggregated' | 'alert-triggered' | 'alert-resolved' | 'export-completed';
  timestamp: Date;
  metric?: string;
  data?: any;
}

export type MetricType = 
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'summary'
  | 'timer'
  | 'rate';

export type AggregationType = 
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | 'p50'
  | 'p90'
  | 'p95'
  | 'p99';

export type BusinessMetricCategory = 
  | 'user_engagement'
  | 'revenue'
  | 'conversion'
  | 'retention'
  | 'growth'
  | 'usage'
  | 'feature_adoption'
  | 'performance'
  | 'error_rate'
  | 'compliance'
  | 'security';

export type HealthcareMetricCategory = 
  | 'patient_volume'
  | 'appointment_metrics'
  | 'treatment_outcomes'
  | 'readmission_rates'
  | 'satisfaction_scores'
  | 'wait_times'
  | 'resource_utilization'
  | 'compliance_metrics'
  | 'quality_indicators'
  | 'financial_metrics';

export type AlertSeverity = 
  | 'info'
  | 'warning'
  | 'error'
  | 'critical';

export type AlertChannel = 
  | 'email'
  | 'sms'
  | 'webhook'
  | 'slack'
  | 'dashboard'
  | 'log';

export type MetricExportFormat = 
  | 'json'
  | 'csv'
  | 'prometheus'
  | 'influxdb'
  | 'grafana'
  | 'excel';

export type CustomMetricsEvents = 
  | 'metric-collected'
  | 'metric-aggregated'
  | 'alert-triggered'
  | 'alert-resolved'
  | 'export-completed'
  | 'storage-full'
  | 'collection-error'
  | 'query-executed';