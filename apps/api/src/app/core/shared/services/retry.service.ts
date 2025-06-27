import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  RetryServiceConfig,
  RetryStrategyConfig,
  RetryContext,
  RetryAttempt,
  RetryExecution,
  RetryMetrics,
  RetryServiceOptions,
  RetryStrategy,
  RetryServiceEventData,
} from '../types/retry-service.types';

export class RetryService extends EventEmitter {
  private config: RetryServiceConfig;
  private strategies: Map<string, RetryStrategyConfig> = new Map();
  private executions: Map<string, RetryExecution> = new Map();
  private metrics: RetryMetrics;
  private activeRetries = 0;

  constructor(config?: Partial<RetryServiceConfig>) {
    super();
    this.config = this.buildConfig(config);
    this.metrics = this.initializeMetrics();
    this.initializeDefaultStrategies();
  }

  private buildConfig(config?: Partial<RetryServiceConfig>): RetryServiceConfig {
    return {
      defaultStrategy: config?.defaultStrategy ?? 'standard',
      enableMetrics: config?.enableMetrics ?? true,
      enableLogging: config?.enableLogging ?? true,
      maxConcurrentRetries: config?.maxConcurrentRetries ?? 100,
      strategies: config?.strategies ?? {},
    };
  }

  private initializeMetrics(): RetryMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      abortedExecutions: 0,
      averageAttempts: 0,
      averageDuration: 0,
      byStrategy: {},
      recentExecutions: [],
    };
  }

  private initializeDefaultStrategies(): void {
    const defaultStrategies: Record<RetryStrategy, RetryStrategyConfig> = {
      aggressive: {
        name: 'aggressive',
        description: 'Aggressive retry for critical operations',
        attempts: 5,
        delay: 500,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 15000,
        timeoutMs: 60000,
      },
      standard: {
        name: 'standard',
        description: 'Standard retry for most operations',
        attempts: 3,
        delay: 1000,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 10000,
        timeoutMs: 30000,
      },
      conservative: {
        name: 'conservative',
        description: 'Conservative retry for less critical operations',
        attempts: 2,
        delay: 2000,
        backoff: 'linear',
        jitter: false,
        maxDelay: 8000,
        timeoutMs: 20000,
      },
      quick: {
        name: 'quick',
        description: 'Quick retry for real-time operations',
        attempts: 2,
        delay: 200,
        backoff: 'fixed',
        jitter: true,
        maxDelay: 1000,
        timeoutMs: 5000,
      },
      database: {
        name: 'database',
        description: 'Optimized for database operations',
        attempts: 3,
        delay: 100,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 5000,
        timeoutMs: 15000,
        retryCondition: (error: any) => {
          // Retry on connection errors, timeouts, and deadlocks
          const retryableErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ER_LOCK_DEADLOCK',
            'ER_LOCK_WAIT_TIMEOUT',
          ];
          return retryableErrors.some(err => error.code === err || error.message?.includes(err));
        },
      },
      api: {
        name: 'api',
        description: 'Optimized for API calls',
        attempts: 3,
        delay: 1000,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 8000,
        timeoutMs: 25000,
        retryCondition: (error: any) => {
          // Retry on network errors and 5xx status codes
          if (!error.status) return true;
          return error.status >= 500 && error.status < 600;
        },
      },
      external: {
        name: 'external',
        description: 'For external service integrations',
        attempts: 4,
        delay: 2000,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 20000,
        timeoutMs: 45000,
      },
      critical: {
        name: 'critical',
        description: 'For critical operations that must succeed',
        attempts: 10,
        delay: 1000,
        backoff: 'exponential',
        jitter: true,
        maxDelay: 30000,
        timeoutMs: 120000,
      },
      none: {
        name: 'none',
        description: 'No retry - fail fast',
        attempts: 0,
        delay: 0,
        backoff: 'fixed',
        jitter: false,
        timeoutMs: 5000,
      },
    };

    Object.values(defaultStrategies).forEach(strategy => {
      this.addStrategy(strategy);
    });
  }

  addStrategy(strategy: RetryStrategyConfig): void {
    this.validateStrategy(strategy);
    this.strategies.set(strategy.name, strategy);
    
    if (this.config.enableMetrics && !this.metrics.byStrategy[strategy.name]) {
      this.metrics.byStrategy[strategy.name] = {
        executions: 0,
        successRate: 0,
        averageAttempts: 0,
        averageDuration: 0,
      };
    }

    this.emit('strategy-added', {
      type: 'strategy-added',
      timestamp: new Date(),
      data: { strategy: strategy.name },
    } as RetryServiceEventData);
  }

  private validateStrategy(strategy: RetryStrategyConfig): void {
    if (!strategy.name) {
      throw new Error('Strategy must have a name');
    }
    if (strategy.attempts < 0) {
      throw new Error('Attempts must be non-negative');
    }
    if (strategy.delay < 0) {
      throw new Error('Delay must be non-negative');
    }
    if (strategy.maxDelay && strategy.maxDelay < strategy.delay) {
      throw new Error('Max delay must be greater than or equal to base delay');
    }
  }

  async execute<T>(options: RetryServiceOptions): Promise<T> {
    if (this.activeRetries >= this.config.maxConcurrentRetries) {
      throw new Error('Maximum concurrent retries exceeded');
    }

    const strategy = this.resolveStrategy(options.strategy);
    const executionId = randomUUID();
    const context: RetryContext = {
      operationId: executionId,
      operationName: options.context?.operationName ?? 'unknown',
      strategy: strategy.name,
      startTime: new Date(),
      metadata: options.context?.metadata,
    };

    const execution: RetryExecution = {
      id: executionId,
      context,
      attempts: [],
      totalDuration: 0,
      status: 'running',
      createdAt: new Date(),
    };

    this.executions.set(executionId, execution);
    this.activeRetries++;

    this.emit('retry-started', {
      type: 'retry-started',
      timestamp: new Date(),
      executionId,
      data: { context, strategy: strategy.name },
    } as RetryServiceEventData);

    try {
      const result = await this.executeWithRetry<T>(options.operation, strategy, execution, options.abortSignal);
      execution.finalResult = result;
      execution.status = 'success';
      execution.completedAt = new Date();
      execution.totalDuration = execution.completedAt.getTime() - execution.createdAt.getTime();

      if (strategy.onSuccess) {
        strategy.onSuccess(result, execution.attempts.length, context);
      }

      this.updateMetrics(execution, 'success');
      this.logExecution(execution, 'success');

      this.emit('retry-success', {
        type: 'retry-success',
        timestamp: new Date(),
        executionId,
        data: { attempts: execution.attempts.length, duration: execution.totalDuration },
      } as RetryServiceEventData);

      return result;
    } catch (error) {
      execution.finalError = error as Error;
      execution.status = options.abortSignal?.aborted ? 'aborted' : 'failure';
      execution.completedAt = new Date();
      execution.totalDuration = execution.completedAt.getTime() - execution.createdAt.getTime();

      if (strategy.onFailure) {
        strategy.onFailure(error, execution.attempts.length, context);
      }

      this.updateMetrics(execution, execution.status);
      this.logExecution(execution, execution.status);

      this.emit(execution.status === 'aborted' ? 'retry-aborted' : 'retry-failure', {
        type: execution.status === 'aborted' ? 'retry-aborted' : 'retry-failure',
        timestamp: new Date(),
        executionId,
        data: { error: (error as Error).message, attempts: execution.attempts.length },
      } as RetryServiceEventData);

      throw error;
    } finally {
      this.activeRetries--;
      this.cleanupExecution(executionId);
    }
  }

  private resolveStrategy(strategy: string | RetryStrategyConfig): RetryStrategyConfig {
    if (typeof strategy === 'string') {
      const resolvedStrategy = this.strategies.get(strategy);
      if (!resolvedStrategy) {
        throw new Error(`Unknown retry strategy: ${strategy}`);
      }
      return resolvedStrategy;
    }
    return strategy;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategyConfig,
    execution: RetryExecution,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: any;
    let attemptNumber = 0;

    // Set up timeout if specified
    const timeoutPromise = strategy.timeoutMs 
      ? this.createTimeoutPromise(strategy.timeoutMs)
      : null;

    while (attemptNumber <= strategy.attempts) {
      if (abortSignal?.aborted) {
        throw new Error('Operation was aborted');
      }

      const attemptStartTime = Date.now();
      let attempt: RetryAttempt = {
        attemptNumber: attemptNumber + 1,
        timestamp: new Date(),
        delay: 0,
        success: false,
        duration: 0,
      };

      try {
        const operationPromise = operation();
        const result = timeoutPromise 
          ? await Promise.race([operationPromise, timeoutPromise])
          : await operationPromise;

        attempt.success = true;
        attempt.duration = Date.now() - attemptStartTime;
        execution.attempts.push(attempt);

        // Log successful retry if this wasn't the first attempt
        if (attemptNumber > 0 && this.config.enableLogging) {
          console.log(`[RetryService] ${execution.context.operationName} succeeded on attempt ${attemptNumber + 1}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        attempt.error = error as Error;
        attempt.duration = Date.now() - attemptStartTime;
        execution.attempts.push(attempt);

        attemptNumber++;

        // Check if we should retry this error
        const shouldRetry = strategy.retryCondition 
          ? strategy.retryCondition(error)
          : this.defaultRetryCondition(error);

        if (!shouldRetry) {
          throw error;
        }

        // Check if we've exhausted all attempts
        if (attemptNumber > strategy.attempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attemptNumber, strategy);
        attempt.delay = delay;

        // Call retry callback
        if (strategy.onRetry) {
          strategy.onRetry(error, attemptNumber, execution.context);
        }

        this.emit('retry-attempt', {
          type: 'retry-attempt',
          timestamp: new Date(),
          executionId: execution.id,
          data: { 
            attempt: attemptNumber, 
            delay, 
            error: (error as Error).message,
            nextAttemptIn: delay,
          },
        } as RetryServiceEventData);

        if (this.config.enableLogging) {
          console.log(`[RetryService] ${execution.context.operationName} retrying in ${delay}ms (attempt ${attemptNumber}/${strategy.attempts})`);
        }

        // Wait before retrying
        await this.sleep(delay, abortSignal);
      }
    }

    throw lastError;
  }

  private calculateDelay(attemptNumber: number, strategy: RetryStrategyConfig): number {
    let delay: number;

    switch (strategy.backoff) {
      case 'linear':
        delay = strategy.delay * attemptNumber;
        break;
      case 'exponential':
        delay = strategy.delay * Math.pow(2, attemptNumber - 1);
        break;
      case 'polynomial':
        delay = (strategy.delay || 1000) * Math.pow(attemptNumber, 2);
        break;
      case 'fixed':
      default:
        delay = strategy.delay || 1000;
        break;
    }

    // Apply jitter to prevent thundering herd
    if (strategy.jitter) {
      delay = this.addJitter(delay);
    }

    // Apply maximum delay cap
    if (strategy.maxDelay) {
      delay = Math.min(delay, strategy.maxDelay);
    }

    return Math.floor(delay);
  }

  private addJitter(delay: number): number {
    // Add random jitter up to ±25% of the delay
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.max(0, delay + jitter);
  }

  private sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (abortSignal) {
        const abortHandler = () => {
          clearTimeout(timeout);
          reject(new Error('Operation was aborted'));
        };
        
        if (abortSignal.aborted) {
          abortHandler();
        } else {
          abortSignal.addEventListener('abort', abortHandler, { once: true });
        }
      }
    });
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  private defaultRetryCondition(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx status codes
    if (!error.status) {
      return true; // Network error or timeout
    }
    return error.status >= 500 && error.status < 600;
  }

  private updateMetrics(execution: RetryExecution, result: 'success' | 'failure' | 'aborted'): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalExecutions++;
    
    switch (result) {
      case 'success':
        this.metrics.successfulExecutions++;
        break;
      case 'failure':
        this.metrics.failedExecutions++;
        break;
      case 'aborted':
        this.metrics.abortedExecutions++;
        break;
    }

    // Update strategy-specific metrics
    const strategyMetrics = this.metrics.byStrategy[execution.context.strategy];
    if (strategyMetrics) {
      strategyMetrics.executions++;
      strategyMetrics.successRate = (this.metrics.successfulExecutions / strategyMetrics.executions) * 100;
      
      // Calculate running averages
      const totalAttempts = Object.values(this.metrics.byStrategy).reduce((sum, s) => sum + s.averageAttempts * s.executions, 0);
      const totalDuration = Object.values(this.metrics.byStrategy).reduce((sum, s) => sum + s.averageDuration * s.executions, 0);
      
      strategyMetrics.averageAttempts = (strategyMetrics.averageAttempts * (strategyMetrics.executions - 1) + execution.attempts.length) / strategyMetrics.executions;
      strategyMetrics.averageDuration = (strategyMetrics.averageDuration * (strategyMetrics.executions - 1) + execution.totalDuration) / strategyMetrics.executions;
      
      this.metrics.averageAttempts = (totalAttempts + execution.attempts.length) / this.metrics.totalExecutions;
      this.metrics.averageDuration = (totalDuration + execution.totalDuration) / this.metrics.totalExecutions;
    }

    // Keep recent executions (last 100)
    this.metrics.recentExecutions.push(execution);
    if (this.metrics.recentExecutions.length > 100) {
      this.metrics.recentExecutions.shift();
    }

    this.emit('metrics-updated', {
      type: 'metrics-updated',
      timestamp: new Date(),
      executionId: execution.id,
      data: { metrics: this.getMetrics() },
    } as RetryServiceEventData);
  }

  private logExecution(execution: RetryExecution, result: string): void {
    if (!this.config.enableLogging) return;

    const { context, attempts, totalDuration } = execution;
    console.log(`[RetryService] ${context.operationName} ${result} after ${attempts.length} attempts in ${totalDuration}ms`);
  }

  private cleanupExecution(executionId: string): void {
    // Keep execution for metrics but remove from active tracking after some time
    setTimeout(() => {
      this.executions.delete(executionId);
    }, 300000); // 5 minutes
  }

  // Public API methods
  getStrategy(name: string): RetryStrategyConfig | undefined {
    return this.strategies.get(name);
  }

  getStrategies(): RetryStrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  getActiveRetries(): number {
    return this.activeRetries;
  }

  getExecution(id: string): RetryExecution | undefined {
    return this.executions.get(id);
  }

  clearMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.strategies.forEach(strategy => {
      if (!this.metrics.byStrategy[strategy.name]) {
        this.metrics.byStrategy[strategy.name] = {
          executions: 0,
          successRate: 0,
          averageAttempts: 0,
          averageDuration: 0,
        };
      }
    });
  }

  // Convenience methods
  async retryOperation<T>(operation: () => Promise<T>, strategy: RetryStrategy = 'standard'): Promise<T> {
    return this.execute<T>({ operation, strategy });
  }

  async retryWithContext<T>(
    operation: () => Promise<T>, 
    operationName: string, 
    strategy: RetryStrategy = 'standard',
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.execute<T>({ 
      operation, 
      strategy, 
      context: { operationName, metadata } 
    });
  }
}