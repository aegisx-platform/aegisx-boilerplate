
export interface RetryServiceConfig {
  defaultStrategy: RetryStrategy;
  enableMetrics: boolean;
  enableLogging: boolean;
  maxConcurrentRetries: number;
  strategies: Record<string, RetryStrategyConfig>;
}

export interface RetryStrategyConfig {
  name: string;
  description?: string;
  attempts: number;
  delay: number;
  backoff: 'fixed' | 'linear' | 'exponential' | 'polynomial';
  jitter?: boolean;
  maxDelay?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attemptNumber: number, context: RetryContext) => void;
  onSuccess?: (result: any, attempts: number, context: RetryContext) => void;
  onFailure?: (error: any, attempts: number, context: RetryContext) => void;
}

export interface RetryContext {
  operationId: string;
  operationName: string;
  strategy: string;
  startTime: Date;
  metadata?: Record<string, any>;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  delay: number;
  error?: Error;
  success: boolean;
  duration: number;
}

export interface RetryExecution {
  id: string;
  context: RetryContext;
  attempts: RetryAttempt[];
  finalResult?: any;
  finalError?: Error;
  totalDuration: number;
  status: 'running' | 'success' | 'failure' | 'aborted';
  createdAt: Date;
  completedAt?: Date;
}

export interface RetryMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  abortedExecutions: number;
  averageAttempts: number;
  averageDuration: number;
  byStrategy: Record<string, {
    executions: number;
    successRate: number;
    averageAttempts: number;
    averageDuration: number;
  }>;
  recentExecutions: RetryExecution[];
}

export interface RetryServiceOptions {
  operation: () => Promise<any>;
  strategy: string | RetryStrategyConfig;
  context?: Partial<RetryContext>;
  abortSignal?: AbortSignal;
  timeout?: number;
}

export type RetryStrategy = 
  | 'aggressive'
  | 'standard'
  | 'conservative'
  | 'quick'
  | 'database'
  | 'api'
  | 'external'
  | 'critical'
  | 'none';

export type RetryBackoffType = 'fixed' | 'linear' | 'exponential' | 'polynomial';

export interface RetryServiceEventData {
  type: 'retry-started' | 'retry-attempt' | 'retry-success' | 'retry-failure' | 'retry-aborted' | 'strategy-added' | 'metrics-updated';
  timestamp: Date;
  executionId?: string;
  data?: any;
}


export type RetryServiceEvents = 
  | 'retry-started'
  | 'retry-attempt'
  | 'retry-success' 
  | 'retry-failure'
  | 'retry-aborted'
  | 'strategy-added'
  | 'metrics-updated';