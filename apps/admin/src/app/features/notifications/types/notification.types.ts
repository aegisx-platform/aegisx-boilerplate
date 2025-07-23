export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  content: NotificationContent;
  priority: NotificationPriority;
  status: NotificationStatus;
  attempts: number;
  maxRetries: number;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  error?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  // Flat properties from API response
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  subject?: string;
}

export interface NotificationRecipient {
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  deviceToken?: string;
  webhookUrl?: string;
  slackChannel?: string;
}

export interface NotificationContent {
  subject?: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  filename: string;
  content?: string;
  path?: string;
  contentType?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channels: NotificationChannel[];
  subject: string;
  content: {
    text: string;
    html?: string;
  };
  variables: TemplateVariable[];
  metadata?: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface UserPreferences {
  userId: string;
  channels: NotificationChannel[];
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    digest: boolean;
    digestInterval: 'hourly' | 'daily' | 'weekly';
  };
  typePreferences: Record<string, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;
  lastUpdated: string;
}

export interface NotificationBatch {
  id: string;
  name?: string;
  status: BatchStatus;
  totalCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  errors: string[];
  // API response fields
  progress?: number;
  attempts?: number;
  data?: {
    type: string;
    notifications: string[];
    priority: string;
    channel?: string;
  };
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface NotificationStats {
  period: {
    from: string;
    to: string;
  };
  totalCount: number;
  deliveryMetrics: {
    averageDeliveryTime: number;
    successRate: number;
    totalDelivered: number;
    totalFailed: number;
    totalSent: number;
  };
  channelStats: {
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }[];
  channelBreakdown?: ChannelStats[];
  typeBreakdown?: TypeStats[];
  priorityBreakdown?: PriorityStats[];
  trendsData?: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface ChannelStats {
  channel: NotificationChannel;
  count: number;
  successRate: number;
}

export interface TypeStats {
  type: string;
  count: number;
  successRate: number;
}

export interface PriorityStats {
  priority: NotificationPriority;
  count: number;
}

export interface QueueStatus {
  queueName: string;
  priority: string;
  size: number;
  processing: boolean;
  paused: boolean;
  lastProcessed?: string;
  averageProcessingTime: number;
  throughput: number;
  errorRate: number;
}

// Enums
export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'in-app';
export type NotificationType = 
  | 'welcome' 
  | 'verification' 
  | 'password-reset' 
  | 'security-alert' 
  | 'appointment-reminder' 
  | 'lab-results' 
  | 'emergency' 
  | 'medication-reminder'
  | 'billing'
  | 'marketing'
  | 'system'
  | 'custom';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
export type BatchStatus = 'created' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'waiting' | 'active';

// API Request/Response types
export interface CreateNotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  content: NotificationContent;
  priority?: NotificationPriority;
  scheduledAt?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  type?: NotificationType;
  priority?: NotificationPriority;
  recipientId?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateTemplateRequest {
  name: string;
  type: string;
  channels: NotificationChannel[];
  subject: string;
  content: {
    text: string;
    html?: string;
  };
  variables: TemplateVariable[];
  metadata?: Record<string, any>;
}

export interface CreateBatchRequest {
  name?: string;
  notifications: CreateNotificationRequest[];
  metadata?: Record<string, any>;
}