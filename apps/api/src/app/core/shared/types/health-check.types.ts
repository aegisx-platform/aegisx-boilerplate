export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime: number;
  lastChecked: Date;
  error?: string;
  details?: any;
}

export interface SystemMetrics {
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    usage: number; // percentage
  };
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
  };
  disk: {
    usage: number; // percentage
    free: number;
    total: number;
  };
  network: {
    connections: number;
    bytesReceived: number;
    bytesSent: number;
  };
}

export interface ApplicationHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  platform: string;
  pid: number;
}

export interface HealthCheckResult {
  overall: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: Date;
    duration: number;
  };
  application: ApplicationHealth;
  services: ServiceHealth[];
  metrics: SystemMetrics;
  dependencies: {
    database: ServiceHealth;
    redis: ServiceHealth;
    eventBus: ServiceHealth;
    httpClient: ServiceHealth;
    configValidator: ServiceHealth;
    connectionPool: ServiceHealth;
  };
  warnings: string[];
  errors: string[];
}

export interface HealthCheckOptions {
  includeMetrics?: boolean;
  includeDependencies?: boolean;
  includeServices?: boolean;
  timeout?: number;
  detailed?: boolean;
  checkConnections?: boolean;
}

export interface HealthThresholds {
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  cpu: {
    warning: number; // percentage
    critical: number; // percentage
  };
  disk: {
    warning: number; // percentage
    critical: number; // percentage
  };
  responseTime: {
    warning: number; // milliseconds
    critical: number; // milliseconds
  };
}

export interface HealthCheckConfig {
  cacheTimeout: number;
  thresholds: HealthThresholds;
  services: {
    [serviceName: string]: {
      enabled: boolean;
      timeout: number;
      retries: number;
    };
  };
  security: {
    enableDetailedEndpoint: boolean;
    allowedIPs: string[];
    requireAuth: boolean;
  };
}

export interface HealthCheckEventData {
  type: 'health-check-started' | 'health-check-completed' | 'health-check-failed' | 'service-unhealthy' | 'threshold-exceeded' | 'metrics-collected';
  timestamp: Date;
  data?: any;
}

export type HealthCheckEvents = 
  | 'health-check-started'
  | 'health-check-completed' 
  | 'health-check-failed'
  | 'service-unhealthy'
  | 'metrics-collected'
  | 'threshold-exceeded';