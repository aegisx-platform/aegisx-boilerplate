import { Knex } from 'knex';
import {
  Notification,
  NotificationTemplate,
  NotificationPreferences,
  NotificationBatch,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationType,
  HealthcareNotificationMetadata,
} from '../../../core/shared/types/notification.types';

export interface NotificationFilters {
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  type?: NotificationType;
  recipientId?: string;
  recipientEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface NotificationRepository {
  // Notification CRUD
  create(notification: Omit<Notification, 'errors'>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findMany(filters: NotificationFilters): Promise<Notification[]>;
  update(id: string, updates: Partial<Notification>): Promise<Notification | null>;
  delete(id: string): Promise<boolean>;
  
  // Status management
  updateStatus(id: string, status: NotificationStatus, metadata?: any): Promise<boolean>;
  getQueuedNotifications(priority?: NotificationPriority, limit?: number): Promise<Notification[]>;
  getScheduledNotifications(beforeDate: Date): Promise<Notification[]>;
  
  // Error tracking
  addError(notificationId: string, error: {
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
  }): Promise<void>;
  getErrors(notificationId: string): Promise<Array<{
    id: number;
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
    occurredAt: Date;
  }>>;

  // Error management
  getAllErrorsWithDetails(filters: {
    channel?: string;
    type?: string;
    retryable?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ errors: any[]; total: number }>;
  getErrorStatistics(days: number, groupBy: string): Promise<any[]>;

  // Template management
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'metadata'>): Promise<NotificationTemplate>;
  findTemplateById(id: string): Promise<NotificationTemplate | null>;
  findTemplateByName(name: string): Promise<NotificationTemplate | null>;
  findTemplatesByType(type: NotificationType): Promise<NotificationTemplate[]>;
  updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null>;
  deleteTemplate(id: string): Promise<boolean>;
  listActiveTemplates(): Promise<NotificationTemplate[]>;

  // User preferences
  getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
  setUserPreferences(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferences>;
  updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | null>;

  // Batch operations
  createBatch(batch: Omit<NotificationBatch, 'createdAt' | 'startedAt' | 'completedAt'>): Promise<NotificationBatch>;
  addNotificationToBatch(batchId: string, notificationId: string): Promise<void>;
  getBatch(id: string): Promise<NotificationBatch | null>;
  updateBatchStatus(id: string, status: NotificationBatch['status'], metadata?: any): Promise<boolean>;
  getBatchNotifications(batchId: string): Promise<Notification[]>;
  createBatchRecord(batchId: string, metadata: any): Promise<boolean>;
  getBatchRecord(batchId: string): Promise<any>;
  listBatchRecords(filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]>;

  // Healthcare specific
  createHealthcareNotification(data: {
    notificationId: string;
    patientId?: string;
    providerId?: string;
    appointmentId?: string;
    facilityId?: string;
    department?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    hipaaCompliant?: boolean;
    encryptionEnabled?: boolean;
    encryptionAlgorithm?: string;
    encryptionKeyId?: string;
  }): Promise<void>;
  getHealthcareNotification(notificationId: string): Promise<HealthcareNotificationMetadata | null>;

  // Statistics
  recordStatistic(stat: {
    metricName: string;
    channel?: NotificationChannel;
    type?: NotificationType;
    priority?: NotificationPriority;
    count?: number;
    averageDeliveryTime?: number;
    errorRate?: number;
    date: Date;
  }): Promise<void>;
  getStatistics(filters: {
    metricName?: string;
    channel?: NotificationChannel;
    type?: NotificationType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    metricName: string;
    channel?: string;
    type?: string;
    priority?: string;
    count: number;
    averageDeliveryTime?: number;
    errorRate?: number;
    date: Date;
  }>>;

  // Analytics
  getNotificationCounts(filters: NotificationFilters): Promise<number>;
  getDeliveryMetrics(dateFrom: Date, dateTo: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
  }>;
  getChannelStats(dateFrom: Date, dateTo: Date): Promise<Array<{
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }>>;
}

export class KnexNotificationRepository implements NotificationRepository {
  constructor(
    private knex: Knex,
    private fastify?: any
  ) {}

  // Notification CRUD
  async create(notification: Omit<Notification, 'errors'>): Promise<Notification> {
    const dbNotification = {
      id: notification.id,
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      priority: notification.priority,
      recipient_id: notification.recipient.id,
      recipient_email: notification.recipient.email,
      recipient_phone: notification.recipient.phone,
      recipient_device_token: notification.recipient.deviceToken,
      recipient_slack_user_id: notification.recipient.slackUserId,
      recipient_slack_channel: notification.recipient.slackChannel,
      recipient_webhook_url: notification.recipient.webhookUrl,
      subject: notification.subject,
      content_text: notification.content.text || `${notification.type} notification`,
      content_html: notification.content.html,
      template_name: notification.content.template,
      template_data: notification.content.templateData ? JSON.stringify(notification.content.templateData) : null,
      metadata: JSON.stringify(notification.metadata || { source: 'api' }),
      tags: JSON.stringify(notification.tags || []),
      attempts: notification.attempts,
      max_attempts: notification.maxAttempts,
      scheduled_at: notification.scheduledAt,
      sent_at: notification.sentAt,
      delivered_at: notification.deliveredAt,
      failed_at: notification.failedAt,
      created_by: 'system'
    };

    await this.knex('notifications').insert(dbNotification);

    // Create healthcare notification if metadata exists
    if (notification.metadata.healthcare) {
      await this.createHealthcareNotification({
        notificationId: notification.id,
        ...notification.metadata.healthcare,
      });
    }

    return this.findById(notification.id) as Promise<Notification>;
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await this.knex('notifications')
      .leftJoin('healthcare_notifications', 'notifications.id', 'healthcare_notifications.notification_id')
      .select(
        'notifications.*',
        'healthcare_notifications.patient_id',
        'healthcare_notifications.provider_id',
        'healthcare_notifications.appointment_id',
        'healthcare_notifications.facility_id',
        'healthcare_notifications.department as hc_department',
        'healthcare_notifications.urgency',
        'healthcare_notifications.hipaa_compliant',
        'healthcare_notifications.encryption_enabled',
        'healthcare_notifications.encryption_algorithm',
        'healthcare_notifications.encryption_key_id'
      )
      .where('notifications.id', id)
      .first();

    if (!result) return null;

    return this.mapToNotification(result);
  }

  async findMany(filters: NotificationFilters): Promise<Notification[]> {
    let query = this.knex('notifications')
      .leftJoin('healthcare_notifications', 'notifications.id', 'healthcare_notifications.notification_id')
      .select(
        'notifications.*',
        'healthcare_notifications.patient_id',
        'healthcare_notifications.provider_id',
        'healthcare_notifications.appointment_id',
        'healthcare_notifications.facility_id',
        'healthcare_notifications.department as hc_department',
        'healthcare_notifications.urgency',
        'healthcare_notifications.hipaa_compliant',
        'healthcare_notifications.encryption_enabled',
        'healthcare_notifications.encryption_algorithm',
        'healthcare_notifications.encryption_key_id'
      );

    if (filters.status) query = query.where('notifications.status', filters.status);
    if (filters.priority) query = query.where('notifications.priority', filters.priority);
    if (filters.channel) query = query.where('notifications.channel', filters.channel);
    if (filters.type) query = query.where('notifications.type', filters.type);
    if (filters.recipientId) query = query.where('notifications.recipient_id', filters.recipientId);
    if (filters.recipientEmail) query = query.where('notifications.recipient_email', filters.recipientEmail);
    if (filters.dateFrom) query = query.where('notifications.created_at', '>=', filters.dateFrom);
    if (filters.dateTo) query = query.where('notifications.created_at', '<=', filters.dateTo);

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.offset(filters.offset);

    query = query.orderBy('notifications.created_at', 'desc');

    const results = await query;
    return results.map(result => this.mapToNotification(result));
  }

  async update(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    const dbUpdates: any = {};
    
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.attempts !== undefined) dbUpdates.attempts = updates.attempts;
    if (updates.sentAt !== undefined) dbUpdates.sent_at = updates.sentAt;
    if (updates.deliveredAt !== undefined) dbUpdates.delivered_at = updates.deliveredAt;
    if (updates.failedAt !== undefined) dbUpdates.failed_at = updates.failedAt;
    if (updates.metadata !== undefined) dbUpdates.metadata = JSON.stringify(updates.metadata);
    
    dbUpdates.updated_at = new Date();

    const updated = await this.knex('notifications')
      .where('id', id)
      .update(dbUpdates);

    return updated > 0 ? this.findById(id) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.knex('notifications')
      .where('id', id)
      .delete();

    return deleted > 0;
  }

  async updateStatus(id: string, status: NotificationStatus, metadata?: any): Promise<boolean> {
    const updates: any = { status, updated_at: new Date() };
    
    if (status === 'sent') updates.sent_at = new Date();
    if (status === 'delivered') updates.delivered_at = new Date();
    if (status === 'failed') updates.failed_at = new Date();

    const updated = await this.knex('notifications')
      .where('id', id)
      .update(updates);

    return updated > 0;
  }

  async getQueuedNotifications(priority?: NotificationPriority, limit = 100): Promise<Notification[]> {
    let query = this.knex('notifications')
      .leftJoin('healthcare_notifications', 'notifications.id', 'healthcare_notifications.notification_id')
      .select(
        'notifications.*',
        'healthcare_notifications.patient_id',
        'healthcare_notifications.provider_id',
        'healthcare_notifications.appointment_id',
        'healthcare_notifications.facility_id',
        'healthcare_notifications.department as hc_department',
        'healthcare_notifications.urgency',
        'healthcare_notifications.hipaa_compliant',
        'healthcare_notifications.encryption_enabled',
        'healthcare_notifications.encryption_algorithm',
        'healthcare_notifications.encryption_key_id'
      )
      .where('notifications.status', 'queued')
      .where(function() {
        this.whereNull('notifications.scheduled_at')
          .orWhere('notifications.scheduled_at', '<=', new Date());
      });

    if (priority) query = query.where('notifications.priority', priority);

    const results = await query
      .orderBy([
        { column: 'notifications.priority', order: 'asc' },
        { column: 'notifications.created_at', order: 'asc' }
      ])
      .limit(limit);

    return results.map(result => this.mapToNotification(result));
  }

  async getScheduledNotifications(beforeDate: Date): Promise<Notification[]> {
    const results = await this.knex('notifications')
      .leftJoin('healthcare_notifications', 'notifications.id', 'healthcare_notifications.notification_id')
      .select(
        'notifications.*',
        'healthcare_notifications.patient_id',
        'healthcare_notifications.provider_id',
        'healthcare_notifications.appointment_id',
        'healthcare_notifications.facility_id',
        'healthcare_notifications.department as hc_department',
        'healthcare_notifications.urgency',
        'healthcare_notifications.hipaa_compliant',
        'healthcare_notifications.encryption_enabled',
        'healthcare_notifications.encryption_algorithm',
        'healthcare_notifications.encryption_key_id'
      )
      .where('notifications.status', 'queued')
      .where('notifications.scheduled_at', '<=', beforeDate)
      .orderBy('notifications.scheduled_at', 'asc');

    return results.map(result => this.mapToNotification(result));
  }

  // Error tracking
  async addError(notificationId: string, error: {
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
  }): Promise<void> {
    await this.knex('notification_errors').insert({
      notification_id: notificationId,
      channel: error.channel,
      error_message: error.errorMessage,
      error_code: error.errorCode,
      retryable: error.retryable,
    });
  }

  async getErrors(notificationId: string): Promise<Array<{
    id: number;
    channel: NotificationChannel;
    errorMessage: string;
    errorCode?: string;
    retryable: boolean;
    occurredAt: Date;
  }>> {
    const results = await this.knex('notification_errors')
      .where('notification_id', notificationId)
      .orderBy('occurred_at', 'desc');

    return results.map(row => ({
      id: row.id,
      channel: row.channel,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      retryable: row.retryable,
      occurredAt: row.occurred_at,
    }));
  }

  // Error management methods
  async getAllErrorsWithDetails(filters: {
    channel?: string;
    type?: string;
    retryable?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ errors: any[]; total: number }> {
    try {
      console.log('🔍 Repository getAllErrorsWithDetails called with filters:', filters);
      
      let query = this.knex('notification_errors as ne')
        .join('notifications as n', 'ne.notification_id', 'n.id')
        .select(
          'ne.id',
          'ne.notification_id as notificationId',
          'ne.channel',
          'ne.error_message as errorMessage',
          'ne.error_code as errorCode',
          'ne.retryable',
          'ne.occurred_at as occurredAt',
          'n.type',
          'n.subject',
          'n.recipient_email as recipientEmail',
          'n.priority',
          'n.attempts'
        );

      // Apply filters
      if (filters.channel) {
        query = query.where('ne.channel', filters.channel);
      }
      if (filters.type) {
        query = query.where('n.type', filters.type);
      }
      if (filters.retryable !== undefined) {
        query = query.where('ne.retryable', filters.retryable);
      }
      if (filters.dateFrom) {
        query = query.where('ne.occurred_at', '>=', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.where('ne.occurred_at', '<=', filters.dateTo);
      }

      // Get total count - create a separate clean query for counting
      let countQuery = this.knex('notification_errors as ne')
        .join('notifications as n', 'ne.notification_id', 'n.id');

      // Apply same filters to count query
      if (filters.channel) {
        countQuery = countQuery.where('ne.channel', filters.channel);
      }
      if (filters.type) {
        countQuery = countQuery.where('n.type', filters.type);
      }
      if (filters.retryable !== undefined) {
        countQuery = countQuery.where('ne.retryable', filters.retryable);
      }
      if (filters.dateFrom) {
        countQuery = countQuery.where('ne.occurred_at', '>=', filters.dateFrom);
      }
      if (filters.dateTo) {
        countQuery = countQuery.where('ne.occurred_at', '<=', filters.dateTo);
      }

      const countResult = await countQuery.count('* as total').first();
      console.log('🔍 Count result:', countResult);
      const total = parseInt(countResult?.total?.toString() || '0');
      console.log('🔍 Parsed total:', total);

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      // Order by most recent first
      query = query.orderBy('ne.occurred_at', 'desc');

      console.log('🔍 Main query SQL:', query.toString());
      const errors = await query;
      console.log('🔍 Errors result:', errors);

      return { errors, total };
    } catch (error) {
      console.error('🔴 Repository getAllErrorsWithDetails error:', error);
      throw error;
    }
  }

  async getErrorStatistics(days: number = 7, groupBy: string = 'date'): Promise<any[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    let query = this.knex('notification_errors as ne')
      .join('notifications as n', 'ne.notification_id', 'n.id')
      .where('ne.occurred_at', '>=', dateFrom);

    if (groupBy === 'date') {
      return await query
        .select(this.knex.raw('DATE(ne.occurred_at) as date'))
        .count('* as errorCount')
        .groupBy(this.knex.raw('DATE(ne.occurred_at)'))
        .orderBy('date', 'desc');
    } else if (groupBy === 'channel') {
      return await query
        .select('ne.channel')
        .count('* as errorCount')
        .groupBy('ne.channel')
        .orderBy('errorCount', 'desc');
    } else if (groupBy === 'type') {
      return await query
        .select('n.type')
        .count('* as errorCount')
        .groupBy('n.type')
        .orderBy('errorCount', 'desc');
    } else if (groupBy === 'retryable') {
      return await query
        .select('ne.retryable')
        .count('* as errorCount')
        .groupBy('ne.retryable')
        .orderBy('ne.retryable', 'desc');
    }

    // Default to date grouping
    return await query
      .select(this.knex.raw('DATE(ne.occurred_at) as date'))
      .count('* as errorCount')
      .groupBy(this.knex.raw('DATE(ne.occurred_at)'))
      .orderBy('date', 'desc');
  }

  // Template management
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'metadata'>): Promise<NotificationTemplate> {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dbTemplate = {
      id,
      name: template.name,
      type: template.type,
      channels: JSON.stringify(template.channels),
      subject: template.subject,
      content_text: template.content.text,
      content_html: template.content.html,
      variables: JSON.stringify(template.variables),
      created_by: 'system'
    };

    await this.knex('notification_templates').insert(dbTemplate);
    return this.findTemplateById(id) as Promise<NotificationTemplate>;
  }

  async findTemplateById(id: string): Promise<NotificationTemplate | null> {
    const result = await this.knex('notification_templates')
      .where('id', id)
      .first();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      type: result.type,
      channels: typeof result.channels === 'string' ? JSON.parse(result.channels) : result.channels,
      subject: result.subject,
      content: {
        text: result.content_text,
        html: result.content_html,
      },
      variables: typeof result.variables === 'string' ? JSON.parse(result.variables || '[]') : result.variables || [],
      active: result.active,
      metadata: {
        version: result.version,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        createdBy: result.created_by,
      },
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async findTemplateByName(name: string): Promise<NotificationTemplate | null> {
    const result = await this.knex('notification_templates')
      .where('name', name)
      .where('active', true)
      .first();

    if (!result) return null;

    return this.findTemplateById(result.id);
  }

  async findTemplatesByType(type: NotificationType): Promise<NotificationTemplate[]> {
    const results = await this.knex('notification_templates')
      .where('type', type)
      .where('active', true)
      .orderBy('created_at', 'desc');

    const templates = await Promise.all(
      results.map(result => this.findTemplateById(result.id))
    );

    return templates.filter(Boolean) as NotificationTemplate[];
  }

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
    const dbUpdates: any = { updated_at: new Date() };
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.content !== undefined) {
      dbUpdates.content_text = updates.content.text;
      dbUpdates.content_html = updates.content.html;
    }
    if (updates.variables !== undefined) dbUpdates.variables = JSON.stringify(updates.variables);
    if (updates.channels !== undefined) dbUpdates.channels = JSON.stringify(updates.channels);

    const updated = await this.knex('notification_templates')
      .where('id', id)
      .update(dbUpdates);

    return updated > 0 ? this.findTemplateById(id) : null;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = await this.knex('notification_templates')
      .where('id', id)
      .update({ active: false, updated_at: new Date() });

    return deleted > 0;
  }

  async listActiveTemplates(): Promise<NotificationTemplate[]> {
    const results = await this.knex('notification_templates')
      .where('active', true)
      .orderBy('name', 'asc');

    const templates = await Promise.all(
      results.map(result => this.findTemplateById(result.id))
    );

    return templates.filter(Boolean) as NotificationTemplate[];
  }

  // Batch operations support
  async createBatchRecord(batchId: string, metadata: any): Promise<boolean> {
    try {
      console.error('🔵 createBatchRecord - attempting database insert');
      console.error('🔵 batchId:', batchId);
      console.error('🔵 metadata:', metadata);
      
      const insertData = {
        id: batchId,
        name: metadata.name || `Batch #${batchId.slice(-8)}`,
        status: 'pending',
        total_count: metadata.notificationCount || 0,
        created_by: 'api',
        created_at: new Date()
      };
      
      console.error('🔵 insertData:', insertData);
      
      const result = await this.knex('notification_batches').insert(insertData);
      console.error('🔵 Insert result:', result);
      
      if (this.fastify?.log) {
        this.fastify.log.info('Batch record created successfully', { batchId, metadata });
      }
      
      return true;
    } catch (error) {
      console.error('🔴 Database insert error:', error);
      
      if (this.fastify?.log) {
        this.fastify.log.error('Failed to create batch record', { batchId, error });
      }
      return false;
    }
  }

  async updateBatchStatus(batchId: string, status: string, metadata?: any): Promise<boolean> {
    try {
      console.error('🔧 updateBatchStatus called');
      console.error('🔧 batchId:', batchId);
      console.error('🔧 status:', status);
      console.error('🔧 metadata:', metadata);
      
      const updateData: any = {
        status
      };

      // Only update metadata if provided
      if (metadata) {
        updateData.errors = JSON.stringify(metadata);
      }

      // Update timestamps based on status
      if (status === 'processing') {
        updateData.started_at = new Date();
      } else if (['completed', 'failed'].includes(status)) {
        updateData.completed_at = new Date();
        if (metadata) {
          updateData.success_count = metadata.processed || 0;
          updateData.failure_count = metadata.failed || 0;
        }
      }

      console.error('🔧 updateData:', updateData);

      const updated = await this.knex('notification_batches')
        .where('id', batchId)
        .update(updateData);

      console.error('🔧 Update result:', updated);

      return updated > 0;
    } catch (error) {
      console.error('🔧 Update error:', error);
      if (this.fastify?.log) {
        this.fastify.log.error('Failed to update batch status', { batchId, status, error });
      }
      return false;
    }
  }

  async getBatchRecord(batchId: string): Promise<any> {
    try {
      const result = await this.knex('notification_batches')
        .where('id', batchId)
        .first();

      if (!result) return null;

      return {
        id: result.id,
        status: result.status,
        metadata: result.metadata ? JSON.parse(result.metadata) : {},
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        updatedAt: result.updated_at
      };
    } catch (error) {
      if (this.fastify?.log) {
        this.fastify.log.error('Failed to get batch record', { batchId, error });
      }
      return null;
    }
  }

  async listBatchRecords(filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]> {
    try {
      let query = this.knex('notification_batches');

      if (filters?.status) {
        query = query.where('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query.orderBy('created_at', 'desc');

      return results.map(result => ({
        id: result.id,
        status: result.status,
        metadata: result.metadata ? JSON.parse(result.metadata) : {},
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        updatedAt: result.updated_at
      }));
    } catch (error) {
      if (this.fastify?.log) {
        this.fastify.log.error('Failed to list batch records', { error });
      }
      return [];
    }
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    const result = await this.knex('notification_preferences')
      .where('user_id', userId)
      .first();

    if (!result) return null;

    return {
      userId: result.user_id,
      channels: typeof result.channels === 'string' ? JSON.parse(result.channels) : result.channels,
      quietHours: result.quiet_hours_start && result.quiet_hours_end ? {
        start: result.quiet_hours_start,
        end: result.quiet_hours_end,
        timezone: result.timezone,
      } : undefined,
      frequency: {
        immediate: result.immediate,
        digest: result.digest,
        digestInterval: result.digest_interval,
      },
      typePreferences: result.type_preferences ? (typeof result.type_preferences === 'string' ? JSON.parse(result.type_preferences) : result.type_preferences) : {},
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async setUserPreferences(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferences> {
    const dbPreferences = {
      user_id: preferences.userId,
      channels: JSON.stringify(preferences.channels),
      quiet_hours_start: preferences.quietHours?.start,
      quiet_hours_end: preferences.quietHours?.end,
      timezone: preferences.quietHours?.timezone || 'Asia/Bangkok',
      immediate: preferences.frequency.immediate,
      digest: preferences.frequency.digest,
      digest_interval: preferences.frequency.digestInterval,
      type_preferences: JSON.stringify(preferences.typePreferences || {}),
    };

    await this.knex('notification_preferences')
      .insert(dbPreferences)
      .onConflict('user_id')
      .merge();

    return this.getUserPreferences(preferences.userId) as Promise<NotificationPreferences>;
  }

  async updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | null> {
    const dbUpdates: any = { updated_at: new Date() };
    
    if (updates.channels !== undefined) dbUpdates.channels = JSON.stringify(updates.channels);
    if (updates.quietHours !== undefined) {
      dbUpdates.quiet_hours_start = updates.quietHours.start;
      dbUpdates.quiet_hours_end = updates.quietHours.end;
      dbUpdates.timezone = updates.quietHours.timezone;
    }
    if (updates.frequency !== undefined) {
      dbUpdates.immediate = updates.frequency.immediate;
      dbUpdates.digest = updates.frequency.digest;
      dbUpdates.digest_interval = updates.frequency.digestInterval;
    }
    if (updates.typePreferences !== undefined) {
      dbUpdates.type_preferences = JSON.stringify(updates.typePreferences);
    }

    const updated = await this.knex('notification_preferences')
      .where('user_id', userId)
      .update(dbUpdates);

    return updated > 0 ? this.getUserPreferences(userId) : null;
  }

  // Batch operations
  async createBatch(batch: Omit<NotificationBatch, 'createdAt' | 'startedAt' | 'completedAt'>): Promise<NotificationBatch> {
    const dbBatch = {
      id: batch.id,
      name: batch.name,
      status: batch.status,
      total_count: batch.totalCount,
      success_count: batch.successCount,
      failure_count: batch.failureCount,
      errors: JSON.stringify(batch.errors),
      created_by: 'system'
    };

    await this.knex('notification_batches').insert(dbBatch);
    return this.getBatch(batch.id) as Promise<NotificationBatch>;
  }

  async addNotificationToBatch(batchId: string, notificationId: string): Promise<void> {
    await this.knex('notification_batch_items').insert({
      batch_id: batchId,
      notification_id: notificationId,
    });
  }

  async getBatch(id: string): Promise<NotificationBatch | null> {
    const result = await this.knex('notification_batches')
      .where('id', id)
      .first();

    if (!result) return null;

    return {
      id: result.id,
      notifications: [], // Will be populated separately if needed
      status: result.status,
      name: result.name,
      createdAt: result.created_at,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      totalCount: result.total_count,
      successCount: result.success_count,
      failureCount: result.failure_count,
      errors: typeof result.errors === 'string' ? JSON.parse(result.errors || '[]') : result.errors || [],
    };
  }


  async getBatchNotifications(batchId: string): Promise<Notification[]> {
    const notificationIds = await this.knex('notification_batch_items')
      .where('batch_id', batchId)
      .pluck('notification_id');

    if (notificationIds.length === 0) return [];

    return this.findMany({ 
      limit: notificationIds.length 
    }).then(notifications => 
      notifications.filter(n => notificationIds.includes(n.id))
    );
  }

  // Healthcare specific
  async createHealthcareNotification(data: {
    notificationId: string;
    patientId?: string;
    providerId?: string;
    appointmentId?: string;
    facilityId?: string;
    department?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    hipaaCompliant?: boolean;
    encryptionEnabled?: boolean;
    encryptionAlgorithm?: string;
    encryptionKeyId?: string;
  }): Promise<void> {
    await this.knex('healthcare_notifications').insert({
      notification_id: data.notificationId,
      patient_id: data.patientId,
      provider_id: data.providerId,
      appointment_id: data.appointmentId,
      facility_id: data.facilityId,
      department: data.department,
      urgency: data.urgency,
      hipaa_compliant: data.hipaaCompliant ?? true,
      encryption_enabled: data.encryptionEnabled ?? false,
      encryption_algorithm: data.encryptionAlgorithm,
      encryption_key_id: data.encryptionKeyId,
    });
  }

  async getHealthcareNotification(notificationId: string): Promise<HealthcareNotificationMetadata | null> {
    const result = await this.knex('healthcare_notifications')
      .where('notification_id', notificationId)
      .first();

    if (!result) return null;

    return {
      patientId: result.patient_id,
      providerId: result.provider_id,
      appointmentId: result.appointment_id,
      facilityId: result.facility_id,
      department: result.department,
      urgency: result.urgency,
      hipaaCompliant: result.hipaa_compliant,
      encryption: result.encryption_enabled ? {
        enabled: result.encryption_enabled,
        algorithm: result.encryption_algorithm,
        keyId: result.encryption_key_id,
      } : undefined,
    };
  }

  // Statistics
  async recordStatistic(stat: {
    metricName: string;
    channel?: NotificationChannel;
    type?: NotificationType;
    priority?: NotificationPriority;
    count?: number;
    averageDeliveryTime?: number;
    errorRate?: number;
    date: Date;
  }): Promise<void> {
    await this.knex('notification_statistics')
      .insert({
        metric_name: stat.metricName,
        channel: stat.channel,
        type: stat.type,
        priority: stat.priority,
        count: stat.count || 0,
        average_delivery_time: stat.averageDeliveryTime,
        error_rate: stat.errorRate,
        date: stat.date.toISOString().split('T')[0],
      })
      .onConflict(['metric_name', 'channel', 'type', 'priority', 'date'])
      .merge();
  }

  async getStatistics(filters: {
    metricName?: string;
    channel?: NotificationChannel;
    type?: NotificationType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    metricName: string;
    channel?: string;
    type?: string;
    priority?: string;
    count: number;
    averageDeliveryTime?: number;
    errorRate?: number;
    date: Date;
  }>> {
    let query = this.knex('notification_statistics');

    if (filters.metricName) query = query.where('metric_name', filters.metricName);
    if (filters.channel) query = query.where('channel', filters.channel);
    if (filters.type) query = query.where('type', filters.type);
    if (filters.dateFrom) query = query.where('date', '>=', filters.dateFrom.toISOString().split('T')[0]);
    if (filters.dateTo) query = query.where('date', '<=', filters.dateTo.toISOString().split('T')[0]);

    const results = await query.orderBy('date', 'desc');

    return results.map(row => ({
      metricName: row.metric_name,
      channel: row.channel,
      type: row.type,
      priority: row.priority,
      count: row.count,
      averageDeliveryTime: row.average_delivery_time,
      errorRate: row.error_rate,
      date: new Date(row.date),
    }));
  }

  // Analytics
  async getNotificationCounts(filters: NotificationFilters): Promise<number> {
    let query = this.knex('notifications');

    if (filters.status) query = query.where('status', filters.status);
    if (filters.priority) query = query.where('priority', filters.priority);
    if (filters.channel) query = query.where('channel', filters.channel);
    if (filters.type) query = query.where('type', filters.type);
    if (filters.recipientId) query = query.where('recipient_id', filters.recipientId);
    if (filters.dateFrom) query = query.where('created_at', '>=', filters.dateFrom);
    if (filters.dateTo) query = query.where('created_at', '<=', filters.dateTo);

    const result = await query.count('* as count').first();
    return parseInt(result?.count as string) || 0;
  }

  async getDeliveryMetrics(dateFrom: Date, dateTo: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
  }> {
    const result = await this.knex('notifications')
      .where('created_at', '>=', dateFrom)
      .where('created_at', '<=', dateTo)
      .select(
        this.knex.raw('COUNT(CASE WHEN status IN (?, ?) THEN 1 END) as total_sent', ['sent', 'delivered']),
        this.knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as total_delivered', ['delivered']),
        this.knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as total_failed', ['failed']),
        this.knex.raw('AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000) as avg_delivery_time')
      )
      .first();

    const totalSent = parseInt(result?.total_sent) || 0;
    const totalDelivered = parseInt(result?.total_delivered) || 0;
    const totalFailed = parseInt(result?.total_failed) || 0;
    const averageDeliveryTime = parseFloat(result?.avg_delivery_time) || 0;
    const successRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      averageDeliveryTime,
      successRate,
    };
  }

  async getChannelStats(dateFrom: Date, dateTo: Date): Promise<Array<{
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }>> {
    const results = await this.knex('notifications')
      .where('created_at', '>=', dateFrom)
      .where('created_at', '<=', dateTo)
      .groupBy('channel')
      .select(
        'channel',
        this.knex.raw('COUNT(CASE WHEN status IN (?, ?) THEN 1 END) as sent', ['sent', 'delivered']),
        this.knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as delivered', ['delivered']),
        this.knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed', ['failed'])
      );

    return results.map(row => {
      const sent = parseInt(row.sent) || 0;
      const delivered = parseInt(row.delivered) || 0;
      const failed = parseInt(row.failed) || 0;
      const successRate = sent > 0 ? (delivered / sent) * 100 : 0;

      return {
        channel: row.channel,
        sent,
        delivered,
        failed,
        successRate,
      };
    });
  }

  private safeParse(value: any): any {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        // If JSON parse fails, return the original string
        return value;
      }
    }
    // If already an object, return as is
    return value;
  }

  // Helper method to map database row to Notification object
  private mapToNotification(row: any): Notification {
    return {
      id: row.id,
      type: row.type,
      channel: row.channel,
      recipient: {
        id: row.recipient_id,
        email: row.recipient_email,
        phone: row.recipient_phone,
        deviceToken: row.recipient_device_token,
        slackUserId: row.recipient_slack_user_id,
        slackChannel: row.recipient_slack_channel,
        webhookUrl: row.recipient_webhook_url,
      },
      subject: row.subject,
      content: {
        text: row.content_text,
        html: row.content_html,
        template: row.template_name,
        templateData: row.template_data ? this.safeParse(row.template_data) : undefined,
      },
      metadata: {
        ...(this.safeParse(row.metadata) || {}),
        healthcare: row.patient_id ? {
          patientId: row.patient_id,
          providerId: row.provider_id,
          appointmentId: row.appointment_id,
          facilityId: row.facility_id,
          department: row.hc_department,
          urgency: row.urgency,
          hipaaCompliant: row.hipaa_compliant,
          encryption: row.encryption_enabled ? {
            enabled: row.encryption_enabled,
            algorithm: row.encryption_algorithm,
            keyId: row.encryption_key_id,
          } : undefined,
        } : undefined,
      },
      status: row.status,
      priority: row.priority,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      errors: [], // Will be populated separately if needed
      tags: this.safeParse(row.tags) || [],
    };
  }
}