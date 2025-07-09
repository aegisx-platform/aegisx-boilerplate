import { Type, Static } from '@sinclair/typebox';

// Enums as constants
export const NotificationTypeEnum = [
  'welcome', 'verification', 'password-reset', 'security-alert',
  'appointment-reminder', 'appointment-confirmation', 'lab-results',
  'prescription-ready', 'billing-statement', 'system-maintenance',
  'feature-announcement', 'compliance-alert', 'emergency', 'custom'
] as const;

export const NotificationChannelEnum = [
  'email', 'sms', 'push', 'webhook', 'slack', 'in-app'
] as const;

export const NotificationPriorityEnum = [
  'low', 'normal', 'high', 'urgent', 'critical'
] as const;

export const NotificationStatusEnum = [
  'queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled'
] as const;

// Recipient Schema
export const RecipientSchema = Type.Object({
  id: Type.Optional(Type.String({ 
    description: 'Unique identifier for the recipient',
    examples: ['user_123', 'patient_456'] 
  })),
  email: Type.String({ 
    format: 'email',
    description: 'Email address of the recipient (required for email channel)',
    examples: ['user@example.com', 'patient@hospital.com']
  }),
  phone: Type.Optional(Type.String({ 
    description: 'Phone number for SMS notifications (required for SMS channel)',
    examples: ['+66801234567', '+1234567890'] 
  })),
  deviceToken: Type.Optional(Type.String({ 
    description: 'Device token for push notifications (required for push channel)',
    examples: ['fcm_token_xyz', 'apns_token_abc'] 
  })),
  slackUserId: Type.Optional(Type.String({ 
    description: 'Slack user ID for direct messages (required for slack channel)',
    examples: ['U1234567890', 'USLACKUSER123'] 
  })),
  slackChannel: Type.Optional(Type.String({ 
    description: 'Slack channel name for channel messages (optional for slack)',
    examples: ['#general', '#alerts', '#healthcare'] 
  })),
  webhookUrl: Type.Optional(Type.String({ 
    format: 'uri',
    description: 'Webhook URL for HTTP notifications (required for webhook channel)',
    examples: ['https://api.example.com/webhook', 'https://hooks.slack.com/services/...'] 
  }))
});

// Content Schema
export const ContentSchema = Type.Object({
  text: Type.String({ 
    description: 'Plain text content of the notification (required)',
    examples: [
      'Welcome to AegisX Healthcare System!', 
      'Your appointment is scheduled for tomorrow at 2:00 PM',
      'Your lab results are ready for review'
    ]
  }),
  html: Type.Optional(Type.String({ 
    description: 'HTML content for rich formatting (optional, used for email)',
    examples: [
      '<h1>Welcome!</h1><p>Your account has been created.</p>',
      '<div><strong>Appointment Reminder:</strong><br>Date: 2025-07-10<br>Time: 2:00 PM</div>'
    ]
  })),
  template: Type.Optional(Type.String({ 
    description: 'Template name to use for content generation (optional)',
    examples: ['welcome-email', 'appointment-reminder', 'lab-results'] 
  })),
  templateData: Type.Optional(Type.Object({}, { 
    description: 'Data to populate template variables (object, not string)',
    examples: [
      { userName: 'John Doe', appointmentDate: '2025-07-10', doctorName: 'Dr. Smith' },
      { patientName: 'Jane Doe', testType: 'Blood Test', resultDate: '2025-07-09' }
    ]
  }))
});

// Create Notification Request Schema
export const CreateNotificationSchema = Type.Object({
  type: Type.Union(NotificationTypeEnum.map(t => Type.Literal(t)), {
    description: 'Type of notification to send',
    examples: ['welcome', 'appointment-reminder', 'lab-results', 'emergency']
  }),
  channel: Type.Union(NotificationChannelEnum.map(c => Type.Literal(c)), {
    description: 'Communication channel for delivery',
    examples: ['email', 'sms', 'push', 'slack']
  }),
  recipient: RecipientSchema,
  content: ContentSchema,
  priority: Type.Optional(Type.Union(NotificationPriorityEnum.map(p => Type.Literal(p)), {
    description: 'Priority level affects processing order and delivery speed',
    default: 'normal',
    examples: ['low', 'normal', 'high', 'urgent', 'critical']
  })),
  scheduledAt: Type.Optional(Type.String({ 
    format: 'date-time',
    description: 'Schedule notification for future delivery (ISO 8601 format)',
    examples: ['2025-07-10T14:00:00Z', '2025-07-09T09:30:00+07:00']
  })),
  metadata: Type.Optional(Type.Object({}, {
    description: 'Additional data for tracking and customization (object, not string)',
    examples: [
      { source: 'registration', campaign: 'welcome_series' },
      { patientId: 'P123', appointmentId: 'A456', department: 'Cardiology' }
    ]
  })),
  tags: Type.Optional(Type.Array(Type.String(), {
    description: 'Tags for categorization and filtering',
    examples: [['welcome', 'onboarding'], ['appointment', 'reminder', 'healthcare']]
  })),
  maxAttempts: Type.Optional(Type.Integer({ 
    minimum: 1, 
    maximum: 10,
    default: 3,
    description: 'Maximum retry attempts if delivery fails'
  }))
}, {
  description: 'Create a new notification for delivery',
  examples: [
    {
      type: 'welcome',
      channel: 'email',
      recipient: {
        id: 'user_123',
        email: 'dixonsatit@gmail.com'
      },
      content: {
        text: 'Welcome to AegisX Healthcare System! Your account has been created successfully.',
        html: '<h1>Welcome!</h1><p>Your account has been created successfully. We\'re excited to have you on board!</p>'
      },
      priority: 'normal',
      metadata: {
        source: 'registration',
        campaign: 'welcome_series'
      },
      tags: ['welcome', 'onboarding', 'healthcare']
    },
    {
      type: 'appointment-reminder',
      channel: 'email',
      recipient: {
        id: 'patient_456',
        email: 'dixonsatit@gmail.com'
      },
      content: {
        text: 'Reminder: You have an appointment with Dr. Smith tomorrow at 2:00 PM',
        html: '<div><strong>Appointment Reminder</strong><br>Doctor: Dr. Smith<br>Date: Tomorrow<br>Time: 2:00 PM<br>Department: Cardiology</div>',
        templateData: {
          patientName: 'Dixon Satit',
          doctorName: 'Dr. Smith',
          appointmentDate: '2025-07-10',
          appointmentTime: '14:00',
          department: 'Cardiology'
        }
      },
      priority: 'high',
      scheduledAt: '2025-07-09T18:00:00Z',
      metadata: {
        patientId: 'P456',
        appointmentId: 'A789',
        department: 'Cardiology'
      },
      tags: ['appointment', 'reminder', 'healthcare']
    }
  ]
});

// Create Notification Response Schema
export const CreateNotificationResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    notificationId: Type.String(),
    status: Type.String(),
    priority: Type.String(),
    createdAt: Type.String({ format: 'date-time' })
  })
});

// Get Notification Response Schema
export const GetNotificationResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    notification: Type.Object({
      id: Type.String(),
      type: Type.String(),
      channel: Type.String(),
      status: Type.String(),
      priority: Type.String(),
      recipient: Type.Object({
        id: Type.Optional(Type.String()),
        email: Type.String(),
        phone: Type.Optional(Type.String())
      }),
      subject: Type.String(),
      attempts: Type.Integer(),
      maxAttempts: Type.Integer(),
      scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
      sentAt: Type.Optional(Type.String({ format: 'date-time' })),
      deliveredAt: Type.Optional(Type.String({ format: 'date-time' })),
      failedAt: Type.Optional(Type.String({ format: 'date-time' })),
      tags: Type.Array(Type.String()),
      errors: Type.Optional(Type.Array(Type.Any())),
      metadata: Type.Any()
    })
  })
});

// List Notifications Query Schema
export const ListNotificationsQuerySchema = Type.Object({
  status: Type.Optional(Type.Union(NotificationStatusEnum.map(s => Type.Literal(s)))),
  priority: Type.Optional(Type.Union(NotificationPriorityEnum.map(p => Type.Literal(p)))),
  channel: Type.Optional(Type.Union(NotificationChannelEnum.map(c => Type.Literal(c)))),
  type: Type.Optional(Type.String()),
  recipientId: Type.Optional(Type.String()),
  recipientEmail: Type.Optional(Type.String()),
  dateFrom: Type.Optional(Type.String({ format: 'date-time' })),
  dateTo: Type.Optional(Type.String({ format: 'date-time' })),
  tags: Type.Optional(Type.String({ description: 'Comma-separated list of tags' })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 }))
});

// List Notifications Response Schema
export const ListNotificationsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    notifications: Type.Array(Type.Object({
      id: Type.String(),
      type: Type.String(),
      channel: Type.String(),
      status: Type.String(),
      priority: Type.String(),
      recipientEmail: Type.String(),
      subject: Type.String(),
      attempts: Type.Integer(),
      scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
      sentAt: Type.Optional(Type.String({ format: 'date-time' })),
      deliveredAt: Type.Optional(Type.String({ format: 'date-time' })),
      failedAt: Type.Optional(Type.String({ format: 'date-time' })),
      tags: Type.Array(Type.String())
    })),
    pagination: Type.Object({
      total: Type.Integer(),
      limit: Type.Integer(),
      offset: Type.Integer(),
      hasMore: Type.Boolean()
    })
  })
});

// Update Status Schema
export const UpdateStatusSchema = Type.Object({
  status: Type.Union(NotificationStatusEnum.map(s => Type.Literal(s))),
  metadata: Type.Optional(Type.Any())
});

// Error Response Schema
export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.String())
});

// Type exports
export type CreateNotificationRequest = Static<typeof CreateNotificationSchema>;
export type CreateNotificationResponse = Static<typeof CreateNotificationResponseSchema>;
export type GetNotificationResponse = Static<typeof GetNotificationResponseSchema>;
export type ListNotificationsQuery = Static<typeof ListNotificationsQuerySchema>;
export type ListNotificationsResponse = Static<typeof ListNotificationsResponseSchema>;
export type UpdateStatusRequest = Static<typeof UpdateStatusSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;