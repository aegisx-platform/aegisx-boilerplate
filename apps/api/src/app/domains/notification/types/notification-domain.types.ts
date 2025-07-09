// Re-export notification types from core for domain-specific usage
export * from '../../../core/shared/types/notification.types';

// Domain-specific types
export interface NotificationDomainConfig {
  enableDatabase: boolean;
  enableRealTime: boolean;
  enableEventBus: boolean;
  defaultRetries: number;
  batchSize: number;
  processingInterval: number;
}

export interface NotificationWebSocketMessage {
  type: 'notification_created' | 'notification_status_updated' | 'notification_delivered' | 'notification_failed';
  data: {
    notificationId: string;
    status?: string;
    timestamp: string;
    recipientId?: string;
    channel?: string;
    priority?: string;
  };
}

export interface NotificationEventPayload {
  notificationId: string;
  type: string;
  channel: string;
  recipientId?: string;
  priority: string;
  status?: string;
  timestamp: string;
  metadata?: any;
}

export interface HealthcareNotificationRequest {
  type: string;
  channel: string;
  recipient: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  content: {
    template?: string;
    templateData?: Record<string, any>;
    text?: string;
    html?: string;
  };
  healthcare: {
    patientId?: string;
    providerId?: string;
    appointmentId?: string;
    facilityId?: string;
    department?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    hipaaCompliant?: boolean;
    encryptionEnabled?: boolean;
  };
  priority?: string;
  scheduledAt?: string;
  tags?: string[];
}

export interface NotificationAnalytics {
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  successRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Array<{
    channel: string;
    count: number;
    successRate: number;
  }>;
  typeBreakdown: Array<{
    type: string;
    count: number;
    successRate: number;
  }>;
  priorityBreakdown: Array<{
    priority: string;
    count: number;
  }>;
  trendsData: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface NotificationQueueStatus {
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

export interface NotificationBatchSummary {
  id: string;
  name?: string;
  status: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  errors: string[];
}

export interface UserNotificationSettings {
  userId: string;
  channels: string[];
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
    channels: string[];
  }>;
  lastUpdated: string;
}

export interface NotificationTemplateRequest {
  name: string;
  type: string;
  channels: string[];
  subject: string;
  content: {
    text: string;
    html?: string;
  };
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object';
    required: boolean;
    description: string;
    defaultValue?: any;
  }>;
}

export interface NotificationErrorSummary {
  notificationId: string;
  totalErrors: number;
  retryableErrors: number;
  lastError: {
    message: string;
    code?: string;
    channel: string;
    occurredAt: string;
  };
  errorHistory: Array<{
    id: number;
    channel: string;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
    occurredAt: string;
  }>;
}

export interface NotificationDeliveryReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    successRate: number;
    averageDeliveryTime: number;
  };
  channelPerformance: Array<{
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
    averageDeliveryTime: number;
  }>;
  typePerformance: Array<{
    type: string;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
    mostUsedChannel: string;
  }>;
  priorityDistribution: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
  trends: {
    hourlyVolume: Array<{ hour: number; count: number }>;
    dailyVolume: Array<{ date: string; count: number }>;
    weeklyVolume: Array<{ week: string; count: number }>;
  };
}

// Healthcare-specific types
export interface HealthcareNotificationMetadata {
  patientId?: string;
  providerId?: string;
  appointmentId?: string;
  facilityId?: string;
  department?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  hipaaCompliant: boolean;
  encryption?: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
  auditRequired?: boolean;
  retentionPeriod?: number; // days
}

export interface HealthcareNotificationAudit {
  notificationId: string;
  action: 'created' | 'sent' | 'delivered' | 'failed' | 'viewed' | 'deleted';
  userId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: {
    previousStatus?: string;
    newStatus?: string;
    errorMessage?: string;
    deliveryMethod?: string;
  };
  compliance: {
    hipaaCompliant: boolean;
    auditTrail: boolean;
    dataEncrypted: boolean;
  };
}

export interface EmergencyNotificationRequest {
  emergencyType: string;
  patientId: string;
  facilityId: string;
  location: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recipients: Array<{
    id?: string;
    email?: string;
    phone?: string;
    role: string;
    department?: string;
  }>;
  escalationRules?: {
    autoEscalate: boolean;
    escalationDelay: number; // minutes
    escalationLevels: string[];
  };
}

export interface AppointmentReminderRequest {
  patientId: string;
  providerId: string;
  appointmentId: string;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
  };
  appointment: {
    date: string;
    time: string;
    duration?: number;
    location?: string;
    department: string;
    provider: {
      name: string;
      title?: string;
    };
    instructions?: string[];
  };
  reminderSettings: {
    sendDaysBefore: number[];
    sendHoursBefore: number[];
    channels: string[];
  };
}

export interface LabResultsNotificationRequest {
  patientId: string;
  providerId: string;
  labOrderId: string;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
  };
  results: {
    testType: string;
    status: 'completed' | 'pending' | 'cancelled';
    urgent: boolean;
    abnormalFlag: boolean;
    reviewRequired: boolean;
    providerInstructions?: string;
  };
  delivery: {
    securePortalUrl?: string;
    pickupLocation?: string;
    accessCode?: string;
  };
}