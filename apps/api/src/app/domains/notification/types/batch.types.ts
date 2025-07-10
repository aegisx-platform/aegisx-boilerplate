import { NotificationChannel, NotificationPriority } from '../../../core/shared/types/notification.types';

export interface BatchCreateRequest {
  notifications: string[];
  options?: {
    channel?: NotificationChannel;
    priority?: NotificationPriority;
    delayBetweenItems?: number;
    maxConcurrency?: number;
  };
}

export interface BatchCreateResponse {
  success: boolean;
  data: {
    batchId: string;
    notificationCount: number;
    estimatedProcessingTime: number;
  };
  message: string;
}

export interface BatchStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  attempts: number;
  data: {
    type: string;
    notifications: string[];
    channel?: string;
    priority: string;
  };
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface BatchStatusResponse {
  success: boolean;
  data: BatchStatus;
  message: string;
}

export interface BatchMetrics {
  name: string;
  broker: 'redis' | 'rabbitmq';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  processingRate: number;
  errorRate: number;
  avgProcessingTime: number;
  isPaused: boolean;
  lastActivity?: string;
}

export interface BatchMetricsResponse {
  success: boolean;
  data: BatchMetrics;
  message: string;
}

export interface BatchListQuery {
  status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  limit?: number;
  offset?: number;
}

export interface BatchListResponse {
  success: boolean;
  data: {
    batches: BatchStatus[];
    total: number;
    limit: number;
    offset: number;
  };
  message: string;
}

export interface BatchOperationResponse {
  success: boolean;
  data: any;
  message?: string;
}

export interface BatchRetryResponse {
  success: boolean;
  data: {
    batchId: string;
    newBatchId: string;
  };
  message: string;
}

export interface BatchCancelResponse {
  success: boolean;
  data: {
    batchId: string;
    cancelled: boolean;
  };
  message: string;
}

export interface BatchHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  batchQueue: {
    connected: boolean;
    broker: string;
    queueDepth: number;
  };
  workers: {
    active: number;
    total: number;
  };
  lastActivity?: string;
}

export interface BatchHealthResponse {
  success: boolean;
  data: BatchHealth;
  message: string;
}

export interface BatchParams {
  batchId: string;
}

export interface BatchErrorResponse {
  success: boolean;
  error: string;
  message: string;
}