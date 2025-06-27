import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import * as os from 'os';
import * as fs from 'fs/promises';
import {
  HealthCheckResult,
  ServiceHealth,
  SystemMetrics,
  ApplicationHealth,
  HealthCheckOptions,
  HealthCheckConfig,
  HealthCheckEventData,
} from '../types/health-check.types';

export class HealthCheckService extends EventEmitter {
  private fastify: FastifyInstance;
  private config: HealthCheckConfig;
  private lastHealthCheck?: HealthCheckResult;
  private healthCache?: HealthCheckResult;
  private lastCacheTime: number = 0;

  constructor(fastify: FastifyInstance, config?: Partial<HealthCheckConfig>) {
    super();
    this.fastify = fastify;
    this.config = this.buildConfig(config);
  }

  private buildConfig(config?: Partial<HealthCheckConfig>): HealthCheckConfig {
    return {
      cacheTimeout: config?.cacheTimeout ?? 5000,
      thresholds: {
        memory: {
          warning: config?.thresholds?.memory?.warning ?? 75,
          critical: config?.thresholds?.memory?.critical ?? 90,
        },
        cpu: {
          warning: config?.thresholds?.cpu?.warning ?? 70,
          critical: config?.thresholds?.cpu?.critical ?? 85,
        },
        disk: {
          warning: config?.thresholds?.disk?.warning ?? 80,
          critical: config?.thresholds?.disk?.critical ?? 95,
        },
        responseTime: {
          warning: config?.thresholds?.responseTime?.warning ?? 1000,
          critical: config?.thresholds?.responseTime?.critical ?? 3000,
        },
        ...config?.thresholds,
      },
      services: {
        database: { enabled: true, timeout: 5000, retries: 3 },
        redis: { enabled: true, timeout: 3000, retries: 2 },
        eventBus: { enabled: true, timeout: 2000, retries: 1 },
        httpClient: { enabled: true, timeout: 5000, retries: 2 },
        configValidator: { enabled: true, timeout: 2000, retries: 1 },
        connectionPool: { enabled: true, timeout: 3000, retries: 2 },
        ...config?.services,
      },
      security: {
        enableDetailedEndpoint: config?.security?.enableDetailedEndpoint ?? true,
        allowedIPs: config?.security?.allowedIPs ?? ['127.0.0.1', '::1'],
        requireAuth: config?.security?.requireAuth ?? false,
        ...config?.security,
      },
    };
  }

  async performHealthCheck(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Return cached result if still valid
    if (!options.detailed && this.shouldUseCachedResult()) {
      return this.healthCache!;
    }

    this.emit('health-check-started', {
      type: 'health-check-started',
      timestamp: new Date(),
      data: { options },
    } as HealthCheckEventData);

    const result: HealthCheckResult = {
      overall: {
        status: 'healthy',
        timestamp: new Date(),
        duration: 0,
      },
      application: await this.getApplicationHealth(),
      services: [],
      metrics: await this.getSystemMetrics(),
      dependencies: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        eventBus: await this.checkEventBus(),
        httpClient: await this.checkHttpClient(),
        configValidator: await this.checkConfigValidator(),
        connectionPool: await this.checkConnectionPool(),
      },
      warnings: [],
      errors: [],
    };

    // Check service dependencies
    const dependencyValues = Object.values(result.dependencies);
    const unhealthyServices = dependencyValues.filter(dep => dep.status === 'unhealthy');
    const degradedServices = dependencyValues.filter(dep => dep.status === 'degraded');

    // Determine overall status
    if (unhealthyServices.length > 0) {
      result.overall.status = 'unhealthy';
      result.errors = unhealthyServices.map(service => 
        `${service.name}: ${service.error || 'Service is unhealthy'}`
      );
    } else if (degradedServices.length > 0) {
      result.overall.status = 'degraded';
      result.warnings = degradedServices.map(service => 
        `${service.name}: Service performance is degraded`
      );
    }

    // Check thresholds
    this.checkThresholds(result);

    result.overall.duration = Date.now() - startTime;
    this.lastHealthCheck = result;

    // Cache the result if not detailed
    if (!options.detailed) {
      this.healthCache = result;
      this.lastCacheTime = Date.now();
    }

    this.emit('health-check-completed', {
      type: 'health-check-completed',
      timestamp: new Date(),
      data: { result },
    } as HealthCheckEventData);

    return result;
  }

  private shouldUseCachedResult(): boolean {
    return Boolean(this.healthCache && 
           (Date.now() - this.lastCacheTime) < this.config.cacheTimeout);
  }

  private async getApplicationHealth(): Promise<ApplicationHealth> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: this.fastify.config.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    };
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        usage: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        usage: await this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      disk: await this.getDiskUsage(),
      network: {
        connections: 0, // Would need external lib for accurate count
        bytesReceived: 0,
        bytesSent: 0,
      },
    };
  }

  private async getCpuUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    const totalTime = 100 * 1000; // 100ms in microseconds
    
    return Math.round((totalUsage / totalTime) * 100);
  }

  private async getDiskUsage(): Promise<{ usage: number; free: number; total: number }> {
    try {
      const stats = await fs.statfs(process.cwd());
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      
      return {
        usage: Math.round((used / total) * 100),
        free,
        total,
      };
    } catch (error) {
      return { usage: 0, free: 0, total: 0 };
    }
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.knex) {
        return {
          name: 'database',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'Database connection not available',
        };
      }

      await this.fastify.knex.raw('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime > this.config.thresholds.responseTime.critical ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.redis) {
        return {
          name: 'redis',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'Redis connection not available',
        };
      }

      const result = await this.fastify.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: result === 'PONG' && responseTime < this.config.thresholds.responseTime.critical ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  private async checkEventBus(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.eventBus) {
        return {
          name: 'eventBus',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'Event Bus not available',
        };
      }

      // Simple health check - try to publish a test event
      await this.fastify.eventBus.publish('health.check', { timestamp: new Date() });
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'eventBus',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'eventBus',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Event Bus failed',
      };
    }
  }

  private async checkHttpClient(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.httpClient) {
        return {
          name: 'httpClient',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'HTTP Client not available',
        };
      }

      // HTTP Client is available and configured
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'httpClient',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'httpClient',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'HTTP Client failed',
      };
    }
  }

  private async checkConfigValidator(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.configValidator) {
        return {
          name: 'configValidator',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'Config Validator not available',
        };
      }

      const isValid = await this.fastify.configValidator.validateConfigurationQuick();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'configValidator',
        status: isValid ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        error: isValid ? undefined : 'Configuration validation failed',
      };
    } catch (error) {
      return {
        name: 'configValidator',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Config Validator failed',
      };
    }
  }

  private async checkConnectionPool(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.fastify.connectionPool) {
        return {
          name: 'connectionPool',
          status: 'unknown',
          responseTime: 0,
          lastChecked: new Date(),
          error: 'Connection Pool not available',
        };
      }

      const healthCheck = await this.fastify.connectionPool.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'connectionPool',
        status: healthCheck.healthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: healthCheck.healthy ? undefined : 'Connection pool unhealthy',
        details: healthCheck,
      };
    } catch (error) {
      return {
        name: 'connectionPool',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection Pool failed',
      };
    }
  }

  private checkThresholds(result: HealthCheckResult): void {
    const { metrics } = result;
    const { thresholds } = this.config;

    // Memory threshold check
    if (metrics.memory.usage >= thresholds.memory.critical) {
      result.errors.push(`Memory usage critical: ${metrics.memory.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'unhealthy';
    } else if (metrics.memory.usage >= thresholds.memory.warning) {
      result.warnings.push(`Memory usage high: ${metrics.memory.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'degraded';
    }

    // CPU threshold check
    if (metrics.cpu.usage >= thresholds.cpu.critical) {
      result.errors.push(`CPU usage critical: ${metrics.cpu.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'unhealthy';
    } else if (metrics.cpu.usage >= thresholds.cpu.warning) {
      result.warnings.push(`CPU usage high: ${metrics.cpu.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'degraded';
    }

    // Disk threshold check
    if (metrics.disk.usage >= thresholds.disk.critical) {
      result.errors.push(`Disk usage critical: ${metrics.disk.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'unhealthy';
    } else if (metrics.disk.usage >= thresholds.disk.warning) {
      result.warnings.push(`Disk usage high: ${metrics.disk.usage}%`);
      if (result.overall.status === 'healthy') result.overall.status = 'degraded';
    }

    // Emit threshold events
    if (result.errors.length > 0 || result.warnings.length > 0) {
      this.emit('threshold-exceeded', {
        type: 'threshold-exceeded',
        timestamp: new Date(),
        data: { errors: result.errors, warnings: result.warnings },
      } as HealthCheckEventData);
    }
  }

  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = this.buildConfig(newConfig);
  }

  clearCache(): void {
    this.healthCache = undefined;
    this.lastCacheTime = 0;
  }

  async getQuickHealthStatus(): Promise<'healthy' | 'unhealthy' | 'degraded'> {
    try {
      const result = await this.performHealthCheck({ detailed: false });
      return result.overall.status;
    } catch (error) {
      return 'unhealthy';
    }
  }

  isHealthy(): boolean {
    if (!this.lastHealthCheck) return false;
    return this.lastHealthCheck.overall.status === 'healthy';
  }

  generateHealthReport(): string {
    if (!this.lastHealthCheck) {
      return 'No health check data available. Run a health check first.';
    }

    const result = this.lastHealthCheck;
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('SYSTEM HEALTH REPORT');
    lines.push('='.repeat(60));
    lines.push(`Overall Status: ${result.overall.status.toUpperCase()}`);
    lines.push(`Timestamp: ${result.overall.timestamp.toISOString()}`);
    lines.push(`Duration: ${result.overall.duration}ms`);
    lines.push('');
    
    lines.push('APPLICATION:');
    lines.push(`  Status: ${result.application.status}`);
    lines.push(`  Uptime: ${Math.floor(result.application.uptime)}s`);
    lines.push(`  Version: ${result.application.version}`);
    lines.push(`  Environment: ${result.application.environment}`);
    lines.push(`  Node: ${result.application.nodeVersion}`);
    lines.push('');
    
    lines.push('SYSTEM METRICS:');
    lines.push(`  Memory Usage: ${result.metrics.memory.usage}%`);
    lines.push(`  CPU Usage: ${result.metrics.cpu.usage}%`);
    lines.push(`  Disk Usage: ${result.metrics.disk.usage}%`);
    lines.push('');
    
    lines.push('DEPENDENCIES:');
    Object.values(result.dependencies).forEach(dep => {
      const icon = dep.status === 'healthy' ? '✅' : dep.status === 'degraded' ? '⚠️' : '❌';
      lines.push(`  ${icon} ${dep.name}: ${dep.status} (${dep.responseTime}ms)`);
      if (dep.error) {
        lines.push(`      Error: ${dep.error}`);
      }
    });
    lines.push('');
    
    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach(error => lines.push(`  ❌ ${error}`));
      lines.push('');
    }
    
    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
      lines.push('');
    }
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }
}