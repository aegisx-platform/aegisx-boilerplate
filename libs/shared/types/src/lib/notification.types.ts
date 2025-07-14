// Shared types for Notification System
// These types should match the API server types

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'in-app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
export type NotificationType = 
  | 'welcome' 
  | 'verification' 
  | 'password-reset' 
  | 'security-alert'
  | 'appointment-reminder' 
  | 'appointment-confirmation' 
  | 'lab-results'
  | 'prescription-ready' 
  | 'billing-statement' 
  | 'system-maintenance'
  | 'feature-announcement' 
  | 'compliance-alert' 
  | 'emergency' 
  | 'custom';

export interface NotificationRecipient {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  userId?: string;
}

export interface Notification {
  id: string;
  recipient: NotificationRecipient;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  subject?: string;
  data: Record<string, any>;
  template?: string;
  metadata?: Record<string, any>;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  recipient: NotificationRecipient;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  subject?: string;
  data: Record<string, any>;
  template?: string;
  metadata?: Record<string, any>;
  scheduledAt?: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification;
  message: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    limit: number;
    offset: number;
  };
  message: string;
}

// Batch Processing Types
export interface BatchCreateRequest {
  notifications: string[];
  options?: {
    channel?: NotificationChannel;
    priority?: NotificationPriority;
    delayBetweenItems?: number;
    maxConcurrency?: number;
  };
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

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: boolean;
  error: string;
  message: string;
}