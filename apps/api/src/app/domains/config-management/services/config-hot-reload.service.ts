import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';
import {
  ConfigurationChangeEvent,
  ConfigurationReloadEvent,
  ConfigEnvironment,
} from '../types/config.types';

export interface HotReloadOptions {
  enableAutoReload?: boolean;
  reloadDebounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableHealthCheck?: boolean;
  healthCheckIntervalMs?: number;
}

export interface ServiceReloadHandler {
  serviceName: string;
  categories: string[];
  environments?: ConfigEnvironment[];
  handler: (config: Record<string, any>, event: ConfigurationChangeEvent) => Promise<void>;
  priority?: number; // Lower number = higher priority
  timeout?: number; // milliseconds
}

export class ConfigHotReloadService extends EventEmitter {
  private fastify: FastifyInstance;
  private options: Required<HotReloadOptions>;
  private reloadHandlers: Map<string, ServiceReloadHandler> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isReloading: Map<string, boolean> = new Map();
  private lastReloadTime: Map<string, Date> = new Map();
  private reloadStats: Map<string, {
    successCount: number;
    errorCount: number;
    lastError?: string;
    lastReloadDuration?: number;
  }> = new Map();

  constructor(
    fastify: FastifyInstance,
    options: HotReloadOptions = {}
  ) {
    super();
    this.fastify = fastify;
    this.options = {
      enableAutoReload: true,
      reloadDebounceMs: 1000, // 1 second
      maxRetries: 3,
      retryDelayMs: 1000,
      enableHealthCheck: true,
      healthCheckIntervalMs: 60000, // 1 minute
      ...options,
    };

    this.initialize();
  }

  /**
   * เริ่มต้นระบบ hot reload
   */
  private async initialize(): Promise<void> {
    if (!this.options.enableAutoReload) {
      this.fastify.log.info('Configuration hot reload is disabled');
      return;
    }

    // Subscribe to configuration change events
    await this.subscribeToConfigChanges();

    // Start health check if enabled
    if (this.options.enableHealthCheck) {
      this.startHealthCheck();
    }

    this.fastify.log.info('Configuration hot reload service initialized', {
      debounceMs: this.options.reloadDebounceMs,
      maxRetries: this.options.maxRetries,
      enableHealthCheck: this.options.enableHealthCheck,
    });
  }

  /**
   * ลงทะเบียน service handler สำหรับ hot reload
   */
  registerHandler(handler: ServiceReloadHandler): void {
    const existingHandler = this.reloadHandlers.get(handler.serviceName);
    if (existingHandler) {
      this.fastify.log.warn(`Replacing existing reload handler for service: ${handler.serviceName}`);
    }

    this.reloadHandlers.set(handler.serviceName, {
      priority: 100, // default priority
      timeout: 30000, // 30 seconds default timeout
      ...handler,
    });

    // Initialize stats for this service
    this.reloadStats.set(handler.serviceName, {
      successCount: 0,
      errorCount: 0,
    });

    this.fastify.log.info(`Registered hot reload handler for service: ${handler.serviceName}`, {
      categories: handler.categories,
      environments: handler.environments,
      priority: handler.priority,
    });
  }

  /**
   * ยกเลิกการลงทะเบียน service handler
   */
  unregisterHandler(serviceName: string): void {
    const removed = this.reloadHandlers.delete(serviceName);
    this.reloadStats.delete(serviceName);
    
    if (removed) {
      this.fastify.log.info(`Unregistered hot reload handler for service: ${serviceName}`);
    }
  }

  /**
   * Subscribe to configuration change events
   */
  private async subscribeToConfigChanges(): Promise<void> {
    try {
      // Subscribe to general config change events
      await this.fastify.eventBus.subscribe('config.changed', this.handleConfigChange.bind(this));
      
      // Subscribe to category-specific events
      const categories = new Set<string>();
      for (const handler of this.reloadHandlers.values()) {
        for (const category of handler.categories) {
          categories.add(category);
        }
      }

      for (const category of categories) {
        await this.fastify.eventBus.subscribe(
          `config.${category}.changed`,
          this.handleConfigChange.bind(this)
        );
      }

      this.fastify.log.info('Subscribed to configuration change events', {
        categories: Array.from(categories),
      });
    } catch (error) {
      this.fastify.log.error('Failed to subscribe to configuration change events:', error);
      throw error;
    }
  }

  /**
   * จัดการ configuration change event
   */
  private async handleConfigChange(event: ConfigurationChangeEvent): Promise<void> {
    const { category, environment } = event;
    const reloadKey = `${category}:${environment}`;

    this.fastify.log.debug('Configuration change detected', {
      category,
      environment,
      configKey: event.configKey,
      type: event.type,
    });

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(reloadKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        await this.reloadConfiguration(category, environment, event);
      } catch (error) {
        this.fastify.log.error('Configuration reload failed:', error);
        this.emit('reload-error', { category, environment, error });
      } finally {
        this.debounceTimers.delete(reloadKey);
      }
    }, this.options.reloadDebounceMs);

    this.debounceTimers.set(reloadKey, timer);
  }

  /**
   * Reload configuration สำหรับ category และ environment ที่ระบุ
   */
  private async reloadConfiguration(
    category: string,
    environment: ConfigEnvironment,
    changeEvent: ConfigurationChangeEvent
  ): Promise<void> {
    const reloadKey = `${category}:${environment}`;

    // ตรวจสอบว่ากำลัง reload อยู่หรือไม่
    if (this.isReloading.get(reloadKey)) {
      this.fastify.log.debug(`Configuration reload already in progress for ${reloadKey}`);
      return;
    }

    this.isReloading.set(reloadKey, true);
    const startTime = Date.now();

    try {
      // ดึง configuration ใหม่
      const configService = this.fastify.configService;
      if (!configService) {
        throw new Error('ConfigService not available');
      }

      const configValues = await configService.getConfigValues(category, environment);

      // หา handlers ที่เกี่ยวข้อง
      const relevantHandlers = this.getRelevantHandlers(category, environment);

      if (relevantHandlers.length === 0) {
        this.fastify.log.debug(`No handlers found for ${category}:${environment}`);
        return;
      }

      // Sort handlers by priority
      relevantHandlers.sort((a, b) => (a.priority || 100) - (b.priority || 100));

      // Execute handlers
      const reloadPromises = relevantHandlers.map(handler => 
        this.executeHandlerWithRetry(handler, configValues, changeEvent)
      );

      const results = await Promise.allSettled(reloadPromises);

      // Count successes and failures
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      results.forEach((result, index) => {
        const handler = relevantHandlers[index];
        if (result.status === 'fulfilled') {
          successCount++;
          this.updateStats(handler.serviceName, true);
        } else {
          errorCount++;
          const errorMessage = result.reason?.message || 'Unknown error';
          errors.push(`${handler.serviceName}: ${errorMessage}`);
          this.updateStats(handler.serviceName, false, errorMessage);
        }
      });

      const duration = Date.now() - startTime;
      this.lastReloadTime.set(reloadKey, new Date());

      // Emit reload completed event
      const reloadEvent: ConfigurationReloadEvent = {
        category,
        environment,
        configs: configValues,
        reloadedAt: new Date(),
        requestedBy: changeEvent.changedBy,
      };

      await this.fastify.eventBus.publish('config.reloaded', reloadEvent);
      await this.fastify.eventBus.publish(`config.${category}.reloaded`, reloadEvent);

      this.emit('reload-completed', {
        category,
        environment,
        successCount,
        errorCount,
        duration,
        errors,
      });

      this.fastify.log.info('Configuration reload completed', {
        category,
        environment,
        handlersExecuted: relevantHandlers.length,
        successCount,
        errorCount,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      });

    } catch (error) {
      this.fastify.log.error('Configuration reload failed:', error);
      this.emit('reload-error', { category, environment, error });
      throw error;
    } finally {
      this.isReloading.set(reloadKey, false);
    }
  }

  /**
   * หา handlers ที่เกี่ยวข้องกับ category และ environment
   */
  private getRelevantHandlers(
    category: string,
    environment: ConfigEnvironment
  ): ServiceReloadHandler[] {
    const relevantHandlers: ServiceReloadHandler[] = [];

    for (const handler of this.reloadHandlers.values()) {
      // ตรวจสอบ category
      if (!handler.categories.includes(category)) {
        continue;
      }

      // ตรวจสอบ environment (ถ้าไม่ระบุ environments หมายถึงทุก environment)
      if (handler.environments && !handler.environments.includes(environment)) {
        continue;
      }

      relevantHandlers.push(handler);
    }

    return relevantHandlers;
  }

  /**
   * Execute handler พร้อม retry mechanism
   */
  private async executeHandlerWithRetry(
    handler: ServiceReloadHandler,
    config: Record<string, any>,
    changeEvent: ConfigurationChangeEvent,
    attempt = 1
  ): Promise<void> {
    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Handler timeout after ${handler.timeout}ms`));
        }, handler.timeout || 30000);
      });

      const handlerPromise = handler.handler(config, changeEvent);

      await Promise.race([handlerPromise, timeoutPromise]);

      this.fastify.log.debug(`Handler executed successfully: ${handler.serviceName}`, {
        attempt,
        category: changeEvent.category,
        environment: changeEvent.environment,
      });

    } catch (error) {
      this.fastify.log.warn(`Handler execution failed: ${handler.serviceName}`, {
        attempt,
        maxRetries: this.options.maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
        category: changeEvent.category,
        environment: changeEvent.environment,
      });

      if (attempt < this.options.maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelayMs));
        
        // Retry
        return this.executeHandlerWithRetry(handler, config, changeEvent, attempt + 1);
      } else {
        // Max retries exceeded
        throw new Error(`Handler failed after ${this.options.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * อัพเดทสถิติของ handler
   */
  private updateStats(
    serviceName: string,
    success: boolean,
    error?: string,
    duration?: number
  ): void {
    const stats = this.reloadStats.get(serviceName);
    if (!stats) return;

    if (success) {
      stats.successCount++;
      delete stats.lastError;
    } else {
      stats.errorCount++;
      stats.lastError = error;
    }

    if (duration !== undefined) {
      stats.lastReloadDuration = duration;
    }
  }

  /**
   * เริ่ม health check
   */
  private startHealthCheck(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckIntervalMs);

    this.fastify.log.info('Configuration hot reload health check started', {
      intervalMs: this.options.healthCheckIntervalMs,
    });
  }

  /**
   * ทำ health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const now = new Date();
      const healthStatus = {
        timestamp: now,
        services: {} as Record<string, any>,
        overallHealth: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      };

      let unhealthyCount = 0;
      let degradedCount = 0;

      for (const [serviceName, handler] of this.reloadHandlers.entries()) {
        const stats = this.reloadStats.get(serviceName);
        const lastReload = this.lastReloadTime.get(`${handler.categories[0]}:development`); // Use first category for check

        let serviceHealth = 'healthy';
        if (stats && stats.errorCount > 0) {
          if (stats.errorCount > stats.successCount) {
            serviceHealth = 'unhealthy';
            unhealthyCount++;
          } else {
            serviceHealth = 'degraded';
            degradedCount++;
          }
        }

        healthStatus.services[serviceName] = {
          health: serviceHealth,
          categories: handler.categories,
          environments: handler.environments,
          stats,
          lastReload,
        };
      }

      // Determine overall health
      if (unhealthyCount > 0) {
        healthStatus.overallHealth = 'unhealthy';
      } else if (degradedCount > 0) {
        healthStatus.overallHealth = 'degraded';
      }

      this.emit('health-check', healthStatus);

      if (healthStatus.overallHealth !== 'healthy') {
        this.fastify.log.warn('Configuration hot reload health check found issues', {
          overallHealth: healthStatus.overallHealth,
          unhealthyServices: unhealthyCount,
          degradedServices: degradedCount,
        });
      }

    } catch (error) {
      this.fastify.log.error('Health check failed:', error);
      this.emit('health-check-error', error);
    }
  }

  /**
   * ดึงสถิติการ reload
   */
  getReloadStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [serviceName, serviceStats] of this.reloadStats.entries()) {
      const handler = this.reloadHandlers.get(serviceName);
      stats[serviceName] = {
        ...serviceStats,
        categories: handler?.categories,
        environments: handler?.environments,
        priority: handler?.priority,
      };
    }

    return stats;
  }

  /**
   * รีเซ็ตสถิติการ reload
   */
  resetStats(): void {
    for (const stats of this.reloadStats.values()) {
      stats.successCount = 0;
      stats.errorCount = 0;
      delete stats.lastError;
      delete stats.lastReloadDuration;
    }

    this.lastReloadTime.clear();
    this.fastify.log.info('Configuration hot reload stats reset');
  }

  /**
   * Force reload configuration
   */
  async forceReload(
    category: string,
    environment: ConfigEnvironment,
    changedBy: number
  ): Promise<void> {
    const changeEvent: ConfigurationChangeEvent = {
      type: 'updated',
      category,
      configKey: '*',
      environment,
      oldValue: undefined,
      newValue: undefined,
      changedBy,
      timestamp: new Date(),
      changeReason: 'Force reload',
    };

    await this.reloadConfiguration(category, environment, changeEvent);
  }

  /**
   * ปิดระบบ hot reload
   */
  async shutdown(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear reload handlers
    this.reloadHandlers.clear();
    this.reloadStats.clear();
    this.lastReloadTime.clear();
    this.isReloading.clear();

    this.fastify.log.info('Configuration hot reload service shutdown completed');
  }
}