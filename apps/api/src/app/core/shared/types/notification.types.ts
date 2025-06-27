export interface NotificationConfig {
  enabledChannels: NotificationChannel[];
  defaultChannel: NotificationChannel;
  retryAttempts: number;
  retryDelay: number;
  queueEnabled: boolean;
  queueMaxSize: number;
  rateLimiting: RateLimitConfig;
  templates: NotificationTemplateConfig;
  providers: NotificationProviders;
}

export interface RateLimitConfig {
  enabled: boolean;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  burst: number;
}

export interface NotificationTemplateConfig {
  useTemplateEngine: boolean;
  defaultTemplates: Record<NotificationType, string>;
  customTemplates: Record<string, string>;
}

export interface NotificationProviders {
  email: EmailProviderConfig;
  sms: SmsProviderConfig;
  push: PushProviderConfig;
  webhook: WebhookProviderConfig;
  slack: SlackProviderConfig;
}

export interface EmailProviderConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark';
  smtp?: SmtpConfig;
  sendgrid?: { apiKey: string };
  mailgun?: { apiKey: string; domain: string };
  ses?: { region: string; accessKeyId: string; secretAccessKey: string };
  postmark?: { apiKey: string };
  from: EmailAddress;
  replyTo?: EmailAddress;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface SmsProviderConfig {
  provider: 'twilio' | 'vonage' | 'messagebird' | 'aws-sns';
  twilio?: { accountSid: string; authToken: string; from: string };
  vonage?: { apiKey: string; apiSecret: string; from: string };
  messagebird?: { apiKey: string; from: string };
  sns?: { region: string; accessKeyId: string; secretAccessKey: string };
}

export interface PushProviderConfig {
  provider: 'fcm' | 'apns' | 'web-push';
  fcm?: { serverKey: string; projectId: string };
  apns?: { keyId: string; teamId: string; bundleId: string; privateKey: string };
  webPush?: { vapidKeys: { publicKey: string; privateKey: string }; subject: string };
}

export interface WebhookProviderConfig {
  defaultTimeout: number;
  retryAttempts: number;
  headers: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key' | 'hmac';
    credentials: Record<string, string>;
  };
}

export interface SlackProviderConfig {
  botToken: string;
  defaultChannel: string;
  webhookUrl?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string;
  content: NotificationContent;
  metadata: NotificationMetadata;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  attempts: number;
  maxAttempts: number;
  errors: NotificationError[];
  tags: string[];
}

export interface NotificationRecipient {
  id?: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  slackUserId?: string;
  slackChannel?: string;
  webhookUrl?: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    digest: boolean;
    digestInterval: 'hourly' | 'daily' | 'weekly';
  };
}

export interface NotificationContent {
  text: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: NotificationAttachment[];
  actions?: NotificationAction[];
}

export interface NotificationAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  url?: string;
  contentType: string;
  size?: number;
}

export interface NotificationAction {
  id: string;
  text: string;
  url?: string;
  action?: string;
  style?: 'primary' | 'danger' | 'default';
}

export interface NotificationMetadata {
  source: string;
  userId?: string;
  organizationId?: string;
  correlationId?: string;
  context?: Record<string, any>;
  healthcare?: HealthcareNotificationMetadata;
}

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
}

export interface NotificationError {
  timestamp: Date;
  error: string;
  code?: string;
  retryable: boolean;
  channel: NotificationChannel;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channels: NotificationChannel[];
  subject: string;
  content: {
    text: string;
    html?: string;
  };
  variables: TemplateVariable[];
  metadata: {
    version: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface NotificationQueue {
  id: string;
  name: string;
  priority: NotificationPriority;
  maxSize: number;
  currentSize: number;
  processing: boolean;
  paused: boolean;
  lastProcessed?: Date;
  metrics: QueueMetrics;
}

export interface QueueMetrics {
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  currentThroughput: number;
  errorRate: number;
}

export interface NotificationBatch {
  id: string;
  notifications: string[]; // notification IDs
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalCount: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface NotificationStatistics {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: Record<NotificationChannel, ChannelStatistics>;
  byType: Record<NotificationType, TypeStatistics>;
  byPriority: Record<NotificationPriority, number>;
  recentTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  performance: {
    averageDeliveryTime: number;
    deliveryRate: number;
    errorRate: number;
  };
}

export interface ChannelStatistics {
  sent: number;
  delivered: number;
  failed: number;
  averageDeliveryTime: number;
  errorRate: number;
  lastUsed?: Date;
}

export interface TypeStatistics {
  sent: number;
  delivered: number;
  failed: number;
  mostUsedChannel: NotificationChannel;
}

export interface NotificationEventData {
  type: NotificationEvents;
  timestamp: Date;
  notificationId?: string;
  batchId?: string;
  data?: any;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SmsMessage {
  to: string;
  from?: string;
  body: string;
  mediaUrls?: string[];
}

export interface PushMessage {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  clickAction?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
  attachments?: SlackAttachment[];
  blocks?: any[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  titleLink?: string;
  text?: string;
  fields?: SlackField[];
  actions?: SlackAction[];
  footer?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackAction {
  type: string;
  text: string;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger';
}

export interface WebhookMessage {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  body: any;
  timeout: number;
  retries: number;
}

export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'push'
  | 'webhook'
  | 'slack'
  | 'in-app';

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

export type NotificationStatus = 
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

export type NotificationEvents = 
  | 'notification-queued'
  | 'notification-sent'
  | 'notification-delivered'
  | 'notification-failed'
  | 'notification-cancelled'
  | 'batch-created'
  | 'batch-completed'
  | 'queue-paused'
  | 'queue-resumed'
  | 'template-used'
  | 'rate-limit-exceeded';