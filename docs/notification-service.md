# Notification Service - Complete Implementation Guide

## 📋 Overview

The AegisX Notification Service is a comprehensive, production-ready notification system designed for healthcare applications. It provides database persistence, real-time WebSocket integration, and healthcare-specific features with HIPAA compliance.

## 🏗️ Architecture

### **Implemented Components**

#### **1. Core Service Layer**
- **Primary Service**: `apps/api/src/app/domains/notification/services/queue-notification-service.ts` ⭐ **Main Service**
- **Base Service**: `apps/api/src/app/domains/notification/services/notification-database-service.ts`
- **Legacy Service**: `apps/api/src/app/core/shared/services/notification.service.ts` (V1 - basic features)
- **Repository**: `apps/api/src/app/domains/notification/repositories/notification-repository.ts`

#### **🚀 QueueNotificationService - Enterprise Features**
- **Automatic Processing**: Bull + RabbitMQ queue integration
- **Priority-Based Processing**: Critical → Urgent → High → Normal → Low
- **Configurable Intervals**: Default 30-second processing cycles
- **Retry Logic**: Exponential backoff with smart failure handling
- **Queue Monitoring**: Real-time metrics and health checks
- **Graceful Shutdown**: Proper resource cleanup and job completion
- **🆕 Batch Processing**: Dedicated BatchWorkerService for high-volume bulk operations

#### **⚡ BatchWorkerService - High-Volume Processing**
- **Dedicated Batch Queue**: Separate Redis DB (DB=2) for batch operations
- **4 Batch Types**: bulk_notification, user_batch, scheduled_batch, priority_batch
- **Automatic Collection**: Collects notifications every 60 seconds for bulk processing
- **Channel Optimization**: Email(10), SMS(5), Push(15), Slack(3) concurrent processing
- **Priority Batching**: High-priority notifications get dedicated fast-track processing
- **User-Aware Batching**: Respects user quiet hours and notification preferences
- **Comprehensive API**: 10 REST endpoints for batch management with Swagger documentation

#### **2. Domain Layer - Standard Architecture**

**Core Notification Components:**
- **Controller**: `apps/api/src/app/domains/notification/controllers/notification-controller.ts`
- **Routes**: `apps/api/src/app/domains/notification/routes/notification-routes.ts`
- **Schemas**: `apps/api/src/app/domains/notification/schemas/notification.schemas.ts`
- **Types**: `apps/api/src/app/domains/notification/types/notification-domain.types.ts`

**Batch Processing Components:**
- **Batch Controller**: `apps/api/src/app/domains/notification/controllers/batch-controller.ts`
- **Batch Routes**: `apps/api/src/app/domains/notification/routes/batch.routes.ts`
- **Batch Schemas**: `apps/api/src/app/domains/notification/schemas/batch.schemas.ts`
- **Batch Types**: `apps/api/src/app/domains/notification/types/batch.types.ts`
- **Batch Service**: `apps/api/src/app/domains/notification/services/batch-worker.service.ts`

#### **3. Plugin Integration**
- **Notification Plugin**: `apps/api/src/app/core/plugins/notification.ts`
- **WebSocket Plugin**: `apps/api/src/app/core/plugins/websocket.ts` (Real-time integration)

#### **4. Database Schema**
- **Migration**: `apps/api/src/app/infrastructure/database/migrations/20241227000001_create_notifications_tables.ts`
- **Seed Data**: `apps/api/src/app/infrastructure/database/seeds/007_notification_seeds.ts`
- **8 Tables**: Complete healthcare-compliant schema

## 🎯 Features Implemented

### **✅ Core Features**
- ✅ **Multi-Channel Support**: email, sms, push, webhook, slack, in-app
- ✅ **Priority-Based Queue System**: critical, urgent, high, normal, low
- ✅ **Automatic Processing**: Bull + RabbitMQ queue-based processing every 30 seconds
- ✅ **Database Persistence**: Full CRUD operations with 8-table schema
- ✅ **Template System**: Database-stored templates with variable substitution
- ✅ **Retry Logic**: Configurable retry attempts with exponential backoff
- ✅ **Real-Time WebSocket Integration**: Live notification delivery
- ✅ **Event Bus Integration**: Cross-domain communication
- ✅ **User Preferences**: Channel preferences, quiet hours, digest settings
- ✅ **🆕 Batch Processing System**: Dedicated high-volume bulk processing with 4 batch types

### **⚡ Batch Processing Features (Enterprise Architecture)**
- ✅ **Standard Domain Structure**: Separated controller, routes, schemas, types following domain patterns
- ✅ **Clean Separation**: Batch operations isolated from core notification controller
- ✅ **Type-Safe Implementation**: Complete TypeScript interfaces and schema validation
- ✅ **Automatic Batch Collection**: Collects notifications every 60 seconds for optimal processing
- ✅ **Channel-Optimized Concurrency**: Different processing rates per channel type
- ✅ **Priority Batch Processing**: Fast-track for critical/urgent notifications
- ✅ **User-Specific Batches**: Respects individual user preferences and quiet hours
- ✅ **Scheduled Batch Processing**: Handles time-based notification delivery
- ✅ **Comprehensive Batch API**: 10 REST endpoints with full Swagger documentation
- ✅ **Batch Monitoring**: Real-time metrics, health checks, and performance monitoring
- ✅ **Graceful Error Handling**: Retry logic, dead letter queue, and failure recovery
- ✅ **Batch Operations**: Group notifications for efficient processing
- ✅ **Error Tracking**: Detailed error logging and recovery
- ✅ **Analytics & Statistics**: Comprehensive reporting and metrics
- ✅ **Gmail SMTP Integration**: Production-ready email sending with App Password support
- ✅ **Queue Processing**: Automatic retry and failure handling with priority delays
- ✅ **Comprehensive API**: Full REST API with OpenAPI documentation
- ✅ **Broker Selection**: Support for both Redis (Bull) and RabbitMQ brokers

### **✅ Healthcare Features**
- ✅ **HIPAA Compliance**: Audit trails, encryption, data sanitization
- ✅ **Healthcare Metadata**: Patient, provider, appointment, facility tracking
- ✅ **Emergency Notifications**: Critical alert system with escalation
- ✅ **Appointment Reminders**: Automated patient appointment notifications
- ✅ **Lab Results**: Secure lab result delivery with urgency flags

### **✅ Email Service Features**
- ✅ **Gmail SMTP Support**: Production-ready with App Password authentication
- ✅ **Connection Verification**: SMTP connection testing and validation
- ✅ **HTML Email Support**: Rich email formatting with templates
- ✅ **Error Handling**: Comprehensive error tracking and retry logic
- ✅ **Environment Configuration**: Easy SMTP provider switching
- ✅ **Mock Email Mode**: Development testing without actual email sending
- ✅ **Prescription Notifications**: Pharmacy pickup alerts
- ✅ **Audit Integration**: Full audit logging for compliance

### **✅ Technical Features**
- ✅ **TypeScript**: Full type safety with comprehensive interfaces
- ✅ **Swagger Documentation**: Complete API documentation
- ✅ **Rate Limiting**: Per-user, per-channel rate limiting
- ✅ **Caching**: Performance optimization with Redis integration
- ✅ **Monitoring**: Health checks and performance metrics
- ✅ **Structured Logging**: Correlation ID tracking and audit trails

## 🏢 Domain Architecture

### **📚 Standard Domain Structure**

**Notification domain follows enterprise domain pattern:**

```
notification/
├── controllers/
│   ├── notification-controller.ts   # Core notification operations
│   └── batch-controller.ts          # Batch processing operations
├── routes/
│   ├── notification-routes.ts       # Core notification routes
│   └── batch.routes.ts              # Batch processing routes
├── schemas/
│   ├── notification.schemas.ts      # TypeBox schemas for notifications
│   └── batch.schemas.ts             # TypeBox schemas for batch operations
├── services/
│   ├── notification-database-service.ts  # Core notification service
│   ├── queue-notification-service.ts     # Queue-based processing
│   └── batch-worker.service.ts           # Batch processing service
├── types/
│   ├── notification-domain.types.ts # Core notification types
│   └── batch.types.ts               # Batch processing types
└── repositories/
    └── notification-repository.ts   # Data access layer
```

### **✨ Benefits of This Structure**
- **✅ Single Responsibility**: Each component has a clear, focused purpose
- **✅ Maintainable**: Easy to locate and modify specific functionality
- **✅ Scalable**: Simple to extend with new features
- **✅ Type-Safe**: Complete TypeScript coverage with proper interfaces
- **✅ Testable**: Clean separation enables focused unit testing
- **✅ Consistent**: Follows same pattern as other domains (auth, storage, rbac)

### **🔄 Clean Architecture Principles**
- **Separation of Concerns**: Batch operations completely isolated from core notifications
- **Dependency Inversion**: Controllers depend on services, not implementations
- **Interface Segregation**: Each component exposes only necessary interfaces
- **Open/Closed Principle**: Easy to extend without modifying existing code

## 📊 Database Schema

### **8 Tables Implementation**

#### **1. `notifications` - Core Notifications**
```sql
- id (Primary Key)
- type, channel, status, priority
- recipient_* (email, phone, device_token, etc.)
- content_text, content_html, template_name, template_data
- metadata (JSON), tags (JSON)
- attempts, max_attempts
- scheduled_at, sent_at, delivered_at, failed_at
- created_at, updated_at, created_by
```

#### **2. `notification_templates` - Template Management**
```sql
- id, name, type, channels (JSON)
- subject, content_text, content_html
- variables (JSON), version, active
- created_at, updated_at, created_by
```

#### **3. `notification_preferences` - User Settings**
```sql
- id, user_id (Unique)
- channels (JSON), quiet_hours_start/end, timezone
- immediate, digest, digest_interval
- type_preferences (JSON)
- created_at, updated_at
```

#### **4. `notification_batches` - Batch Operations**
```sql
- id, name, status
- total_count, success_count, failure_count
- errors (JSON)
- created_at, started_at, completed_at, created_by
```

#### **5. `notification_batch_items` - Batch-Notification Link**
```sql
- id, batch_id, notification_id
- added_at
- Foreign keys to batches and notifications
```

#### **6. `notification_errors` - Error Tracking**
```sql
- id, notification_id, channel
- error_message, error_code, retryable
- occurred_at
```

#### **7. `notification_statistics` - Analytics**
```sql
- id, metric_name, channel, type, priority
- count, average_delivery_time, error_rate
- date, created_at
```

#### **8. `healthcare_notifications` - Healthcare Specific**
```sql
- id, notification_id
- patient_id, provider_id, appointment_id, facility_id
- department, urgency
- hipaa_compliant, encryption_enabled, encryption_algorithm
- encryption_key_id, created_at
```

## 🔌 API Endpoints

### **Core Notification Operations**
```
POST   /api/v1/notifications                    # Create notification
GET    /api/v1/notifications/:id                # Get notification by ID
GET    /api/v1/notifications                    # List notifications with filters
PATCH  /api/v1/notifications/:id/status         # Update notification status
PATCH  /api/v1/notifications/:id/cancel         # Cancel notification
DELETE /api/v1/notifications/:id                # Delete notification
```

### **Queue Management**
```
GET    /api/v1/notifications/queue/pending      # Get queued notifications
POST   /api/v1/notifications/queue/process      # Process queued notifications
GET    /api/v1/notifications/queue/scheduled    # Get scheduled notifications
```

### **Template Management**
```
POST   /api/v1/notifications/templates          # Create template
GET    /api/v1/notifications/templates/:id      # Get template by ID
GET    /api/v1/notifications/templates          # List templates
PATCH  /api/v1/notifications/templates/:id      # Update template
DELETE /api/v1/notifications/templates/:id      # Delete template
```

### **User Preferences**
```
GET    /api/v1/notifications/preferences/:userId    # Get user preferences
POST   /api/v1/notifications/preferences/:userId    # Set user preferences
PATCH  /api/v1/notifications/preferences/:userId    # Update user preferences
```

### **Batch Operations (Traditional)**
```
POST   /api/v1/notifications/batches             # Create batch
POST   /api/v1/notifications/batches/:id/notifications  # Add notifications to batch
POST   /api/v1/notifications/batches/:id/process  # Process batch
GET    /api/v1/notifications/batches/:id         # Get batch details
GET    /api/v1/notifications/batches/:id/notifications  # Get batch notifications
```

### **⚡ Batch Processing (High-Volume)**
```
POST   /api/v1/notifications/batch/bulk          # Create bulk notification batch
GET    /api/v1/notifications/batch/:batchId/status  # Get batch status
GET    /api/v1/notifications/batch/              # List batch jobs
GET    /api/v1/notifications/batch/metrics       # Get batch metrics
POST   /api/v1/notifications/batch/pause         # Pause batch processing
POST   /api/v1/notifications/batch/resume        # Resume batch processing
POST   /api/v1/notifications/batch/:batchId/retry  # Retry failed batch
DELETE /api/v1/notifications/batch/:batchId     # Cancel batch
GET    /api/v1/notifications/batch/health        # Batch health check
```

### **Analytics & Statistics**
```
GET    /api/v1/notifications/analytics/stats           # Get notification statistics
GET    /api/v1/notifications/analytics/delivery-metrics  # Get delivery metrics
GET    /api/v1/notifications/analytics/channel-stats   # Get channel statistics
```

### **Healthcare Specific**
```
POST   /api/v1/notifications/healthcare                  # Create healthcare notification
POST   /api/v1/notifications/healthcare/appointment-reminder  # Send appointment reminder
POST   /api/v1/notifications/healthcare/lab-results     # Send lab results notification
POST   /api/v1/notifications/healthcare/emergency       # Send emergency notification
```

### **Error Tracking**
```
GET    /api/v1/notifications/:id/errors         # Get notification errors
```

## 🚀 Usage Examples

### **1. Create Basic Notification**
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "channel": "email",
    "recipient": {
      "email": "user@example.com",
      "id": "user123"
    },
    "content": {
      "template": "welcome-email",
      "templateData": {
        "name": "John Doe",
        "email": "user@example.com"
      }
    },
    "priority": "normal",
    "tags": ["welcome", "onboarding"]
  }'
```

### **2. Create Healthcare Notification**
```bash
curl -X POST http://localhost:3000/api/v1/notifications/healthcare/appointment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P12345",
    "providerId": "DR001",
    "appointmentId": "APT789",
    "recipient": {
      "email": "patient@example.com",
      "name": "John Doe"
    },
    "appointmentDate": "2024-01-15",
    "appointmentTime": "14:00",
    "department": "Cardiology",
    "doctorName": "Dr. Smith"
  }'
```

### **3. Create Emergency Notification**
```bash
curl -X POST http://localhost:3000/api/v1/notifications/healthcare/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P12345",
    "facilityId": "HOSP001",
    "emergencyType": "Cardiac Arrest",
    "location": "Room 205",
    "description": "Patient experiencing cardiac arrest",
    "recipients": [
      {"email": "doctor@hospital.com", "role": "doctor"},
      {"email": "nurse@hospital.com", "role": "nurse"},
      {"phone": "+1234567890", "role": "emergency_contact"}
    ]
  }'
```

### **4. Get Notification Statistics**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/analytics/stats?dateFrom=2024-01-01&dateTo=2024-01-31"
```

### **5. Set User Notification Preferences**
```bash
curl -X POST http://localhost:3000/api/v1/notifications/preferences/user123 \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["email", "sms"],
    "quietHours": {
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Bangkok"
    },
    "frequency": {
      "immediate": true,
      "digest": false,
      "digestInterval": "daily"
    },
    "typePreferences": {
      "appointment-reminder": {
        "enabled": true,
        "channels": ["email", "sms"]
      },
      "lab-results": {
        "enabled": true,
        "channels": ["email"]
      }
    }
  }'
```

## 🔄 Real-Time Integration

### **WebSocket Events**
The notification system automatically publishes real-time events via WebSocket:

#### **Available Channels**
- `system:notifications` - System-wide notification events
- `user:alerts` - User-specific notification alerts

#### **Event Types**
```typescript
// Notification created
{
  type: 'notification_created',
  data: {
    notificationId: 'notif_123',
    type: 'appointment-reminder',
    channel: 'email',
    priority: 'high',
    timestamp: '2024-01-15T10:00:00Z'
  }
}

// Status updated
{
  type: 'notification_status_updated',
  data: {
    notificationId: 'notif_123',
    status: 'delivered',
    timestamp: '2024-01-15T10:01:00Z'
  }
}
```

#### **WebSocket Client Example**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Subscribe to notification events
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'system:notifications'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'notification_created') {
    console.log('New notification:', message.data);
  }
};
```

## 🔧 Environment Configuration

### **🚀 Automatic Processing Configuration**

The QueueNotificationService provides enterprise-grade automatic processing:

#### **Queue Broker Selection**
```bash
# Choose between Redis (Bull) or RabbitMQ
QUEUE_BROKER=redis                    # or 'rabbitmq'
```

#### **Automatic Processing Settings**
```bash
# Enable automatic processing (recommended)
NOTIFICATION_AUTO_PROCESS_ENABLED=true

# Processing interval (30s, 1m, 5m, etc.)
NOTIFICATION_PROCESS_INTERVAL=30s

# Queue configuration
NOTIFICATION_REDIS_DB=1
NOTIFICATION_RETRY_ATTEMPTS=3
```

#### **Priority-Based Processing**
The system processes notifications based on priority:
- **Critical**: Immediate processing (0ms delay)
- **Urgent**: 100ms delay
- **High**: 1 second delay  
- **Normal**: 5 seconds delay
- **Low**: 30 seconds delay

#### **Bull Queue Configuration (Redis)**
```bash
# Redis Queue Settings
QUEUE_REDIS_DB=1
QUEUE_PREFIX=bull
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_BACKOFF_TYPE=exponential
QUEUE_BACKOFF_DELAY=2000
QUEUE_REMOVE_ON_COMPLETE=true
QUEUE_REMOVE_ON_FAIL=false
```

#### **RabbitMQ Configuration**
```bash
# RabbitMQ Settings
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=notifications
RABBITMQ_EXCHANGE_TYPE=topic
RABBITMQ_PREFETCH=10
RABBITMQ_RECONNECT_INTERVAL=5000
```

### **⚡ Batch Processing Configuration**

The BatchWorkerService provides dedicated high-volume bulk processing:

#### **Core Batch Settings**
```bash
# Enable dedicated batch processing workers
BATCH_WORKER_ENABLED=true
BATCH_WORKER_CONCURRENCY=5
BATCH_SIZE=50
BATCH_PROCESSING_INTERVAL=60s
BATCH_QUEUE_BROKER=redis
BATCH_REDIS_DB=2
BATCH_MAX_RETRY_ATTEMPTS=3
```

#### **Channel-Specific Concurrency**
```bash
# Optimize processing rates per notification channel
BATCH_EMAIL_CONCURRENCY=10         # Concurrent email notifications per batch
BATCH_SMS_CONCURRENCY=5             # Concurrent SMS notifications per batch  
BATCH_PUSH_CONCURRENCY=15           # Concurrent push notifications per batch
BATCH_SLACK_CONCURRENCY=3           # Concurrent Slack notifications per batch
```

#### **Batch Monitoring & Health**
```bash
# Enable batch processing monitoring
BATCH_MONITORING_ENABLED=true
BATCH_HEALTH_CHECK_INTERVAL=30000   # Health check interval (30 seconds)
BATCH_METRICS_INTERVAL=60000        # Metrics collection interval (1 minute)
```

#### **Batch Optimization**
```bash
# Automatic batch collection and optimization
BATCH_AUTO_COLLECTION_ENABLED=true     # Automatically collect and batch notifications
BATCH_USER_BATCH_MIN_SIZE=3            # Minimum notifications to create user-specific batch
BATCH_PRIORITY_THRESHOLD=100           # Queue depth threshold for priority batch processing
```

#### **4 Batch Types Processing**
- **bulk_notification**: Channel-optimized bulk processing (50 notifications per batch)
- **user_batch**: User-specific batches with quiet hours respect (3+ notifications per user)
- **scheduled_batch**: Time-based batch processing for scheduled notifications
- **priority_batch**: Fast-track processing for critical/urgent notifications (100+ queue depth trigger)

### **Required Environment Variables**
```bash
# Core notification settings
NOTIFICATION_ENABLED_CHANNELS=email,sms,push,slack
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
NOTIFICATION_QUEUE_ENABLED=true
NOTIFICATION_QUEUE_MAX_SIZE=10000

# Rate limiting
NOTIFICATION_RATE_LIMIT_ENABLED=true
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100
NOTIFICATION_RATE_LIMIT_PER_HOUR=1000
NOTIFICATION_RATE_LIMIT_PER_DAY=10000

# Healthcare compliance
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_ENCRYPTION_ENABLED=true
NOTIFICATION_AUDIT_LOGGING=true

# Email provider (SMTP)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@aegisx.com
FROM_NAME=AegisX Healthcare System

# SMS provider (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

# Push notifications (FCM)
FCM_SERVER_KEY=
FCM_PROJECT_ID=

# Slack integration
SLACK_BOT_TOKEN=
SLACK_DEFAULT_CHANNEL=#general

# Real-time WebSocket
NOTIFICATION_WEBSOCKET_ENABLED=true
NOTIFICATION_WEBSOCKET_CHANNEL=notifications

# Bull + RabbitMQ Queue System Configuration
JOBS_ADAPTER_TYPE=redis                       # Enable Redis job queue
JOBS_REDIS_HOST=localhost                     # Redis host
JOBS_REDIS_PORT=6379                          # Redis port
JOBS_REDIS_PASSWORD=                          # Redis password (optional)
JOBS_REDIS_DB=2                               # Redis database for jobs
JOBS_REDIS_PREFIX=jobs:                       # Redis key prefix
JOBS_MAX_JOBS=10000                           # Maximum jobs per queue
JOBS_TTL=86400000                             # 24 hours - Job data TTL
JOBS_ENABLE_ENCRYPTION=false                  # Enable job data encryption
JOBS_HEALTH_CHECK_INTERVAL=30000              # 30 seconds - Health check interval
JOBS_RETRY_ATTEMPTS=3                         # Redis operation retry attempts
JOBS_RETRY_DELAY=1000                         # 1 second - Retry delay

# Automatic Notification Processing
NOTIFICATION_AUTO_PROCESS_ENABLED=true        # Enable automatic notification processing
NOTIFICATION_PROCESS_INTERVAL=30s             # Process notifications every 30 seconds
NOTIFICATION_BATCH_SIZE=50                    # Process 50 notifications at once
NOTIFICATION_WORKERS=2                        # Number of notification workers
NOTIFICATION_CONCURRENCY=10                   # Concurrent notifications per worker
NOTIFICATION_MAX_CONCURRENCY=50               # Global max concurrent notifications
NOTIFICATION_JOB_TIMEOUT=300000               # 5 minutes - Notification job timeout
NOTIFICATION_JOB_TTL=86400000                 # 24 hours - Notification job TTL
NOTIFICATION_MAX_ATTEMPTS=3                   # Maximum retry attempts for failed notifications
NOTIFICATION_CLEANUP_INTERVAL=3600000         # 1 hour - Cleanup interval for old notifications
NOTIFICATION_STALLED_INTERVAL=30000           # 30 seconds - Stalled notification check interval
NOTIFICATION_MAX_STALLED=1                    # Max stalled count before failure

# Notification Monitoring
NOTIFICATION_MONITORING_ENABLED=true          # Enable notification monitoring
NOTIFICATION_METRICS_INTERVAL=60000           # 1 minute - Metrics collection interval
NOTIFICATION_HEALTH_CHECK_INTERVAL=30000      # 30 seconds - Health check interval

# Notification Healthcare/Compliance
NOTIFICATION_AUDIT_JOBS=true                  # Enable notification job auditing
NOTIFICATION_ENCRYPT_SENSITIVE=false          # Encrypt sensitive notification data
NOTIFICATION_RETENTION_PERIOD=2592000000      # 30 days - Notification retention period
NOTIFICATION_HIPAA_COMPLIANCE=true            # Enable HIPAA compliance mode

# Redis-based Rate Limiting for Notifications
NOTIFICATION_REDIS_RATE_LIMIT=true            # Use Redis for distributed rate limiting
NOTIFICATION_RATE_LIMIT_WINDOW=60000          # 1 minute rate limit window
NOTIFICATION_RATE_LIMIT_MAX=100               # Max notifications per window
```

## 📈 Monitoring & Analytics

### **Available Metrics**
- **Total Notifications**: Count by status, channel, type, priority
- **Delivery Metrics**: Success rate, average delivery time, failure rate
- **Channel Performance**: Per-channel statistics and trends
- **User Engagement**: Notification preference analysis
- **Healthcare Compliance**: HIPAA audit metrics

### **Health Checks**
The notification system integrates with the health check system:
```bash
curl http://localhost:3000/health
```

### **Logging Integration**
- **Structured Logging**: All notification activities logged with correlation IDs
- **Audit Trail**: Healthcare-compliant audit logging
- **Error Tracking**: Detailed error logging with retry information
- **Performance Monitoring**: Queue processing times and throughput

## 🛠️ Integration with Existing Services

### **Event Bus Integration**
The notification service automatically listens for system events:

```typescript
// User registration → Welcome notification
fastify.eventBus.subscribe('user.registered', async (event) => {
  await notificationService.createNotification('welcome', 'email', ...);
});

// Password reset → Security notification
fastify.eventBus.subscribe('user.password_reset_requested', async (event) => {
  await notificationService.createNotification('password-reset', 'email', ...);
});

// Security alerts → Immediate notification
fastify.eventBus.subscribe('security.suspicious_activity', async (event) => {
  await notificationService.createNotification('security-alert', 'email', ...);
});
```

## 🔄 Redis Automatic Processing

### **Overview**
The notification system now supports Bull + RabbitMQ queue system for automatic processing, providing:
- **Persistent queues** that survive server restarts
- **Distributed processing** across multiple service instances
- **Automatic retry logic** with exponential backoff
- **Redis-based rate limiting** for scalable deployments
- **Scheduled processing** with configurable intervals

### **Setup Redis Automatic Processing**

#### **1. Enable Bull + RabbitMQ Queue System**
```bash
# Set environment variables
JOBS_ADAPTER_TYPE=redis
JOBS_REDIS_HOST=localhost
JOBS_REDIS_PORT=6379
JOBS_REDIS_DB=2
NOTIFICATION_AUTO_PROCESS_ENABLED=true
NOTIFICATION_PROCESS_INTERVAL=30s
NOTIFICATION_REDIS_RATE_LIMIT=true
```

#### **2. Start Redis Server**
```bash
# Using Docker
docker run -d --name redis-notifications -p 6379:6379 redis:7-alpine

# Or use existing Redis from docker-compose
docker-compose up -d aegisx-redis
```

#### **3. Test Automatic Processing**
```bash
# Create notification - it will be automatically processed
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"email": "test@example.com"},
    "type": "custom",
    "channel": "email",
    "content": {
      "text": "This notification will be automatically processed by Redis queue!"
    },
    "priority": "high"
  }'
```

#### **4. Monitor Redis Queue**
```bash
# Check Redis keys for notification jobs
redis-cli -p 6379 -n 2 KEYS "jobs:notifications:*"

# Check waiting jobs
redis-cli -p 6379 -n 2 ZRANGE "jobs:notifications:waiting" 0 -1

# Check job status
redis-cli -p 6379 -n 2 SMEMBERS "jobs:notifications:status:waiting"
```

### **Configuration Examples**

#### **High-Throughput Setup**
```bash
# For high-volume notification processing
NOTIFICATION_WORKERS=5
NOTIFICATION_CONCURRENCY=20
NOTIFICATION_MAX_CONCURRENCY=100
NOTIFICATION_BATCH_SIZE=100
NOTIFICATION_PROCESS_INTERVAL=10s
```

#### **Healthcare Compliance Setup**
```bash
# HIPAA-compliant notification processing
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_AUDIT_JOBS=true
NOTIFICATION_ENCRYPT_SENSITIVE=true
JOBS_ENABLE_ENCRYPTION=true
NOTIFICATION_RETENTION_PERIOD=2592000000  # 30 days
```

#### **Development Setup**
```bash
# Faster processing for development
NOTIFICATION_PROCESS_INTERVAL=5s
NOTIFICATION_BATCH_SIZE=10
NOTIFICATION_WORKERS=1
NOTIFICATION_CONCURRENCY=5
```

### **Advanced Features**

#### **Scheduled Notifications**
```bash
# Create notification scheduled for future processing
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"email": "patient@hospital.com"},
    "type": "appointment-reminder",
    "channel": "email",
    "content": {
      "text": "Reminder: Your appointment is tomorrow at 2:00 PM"
    },
    "priority": "high",
    "scheduledAt": "2024-01-15T13:00:00Z"
  }'
```

#### **Priority-Based Processing**
```bash
# Critical notifications are processed first
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"email": "doctor@hospital.com"},
    "type": "emergency",
    "channel": "email",
    "content": {
      "text": "CRITICAL: Patient emergency in Room 205"
    },
    "priority": "critical"
  }'
```

#### **Batch Processing with Redis**
```bash
# Create multiple notifications - all processed automatically
for i in {1..10}; do
  curl -X POST "http://localhost:3000/api/v1/notifications" \
    -H "Content-Type: application/json" \
    -d "{
      \"recipient\": {\"email\": \"user$i@example.com\"},
      \"type\": \"welcome\",
      \"channel\": \"email\",
      \"content\": {\"text\": \"Welcome to AegisX Healthcare System!\"},
      \"priority\": \"normal\"
    }"
done

# All notifications will be automatically processed by Redis workers
```

### **Redis Rate Limiting**

#### **Distributed Rate Limiting**
```bash
# Redis-based rate limiting works across multiple service instances
NOTIFICATION_REDIS_RATE_LIMIT=true
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100
NOTIFICATION_RATE_LIMIT_PER_HOUR=1000
NOTIFICATION_RATE_LIMIT_PER_DAY=10000
```

#### **Test Rate Limiting**
```bash
# Send rapid notifications to test rate limiting
for i in {1..150}; do
  curl -X POST "http://localhost:3000/api/v1/notifications" \
    -H "Content-Type: application/json" \
    -d "{
      \"recipient\": {\"email\": \"test@example.com\"},
      \"type\": \"custom\",
      \"channel\": \"email\",
      \"content\": {\"text\": \"Rate limit test $i\"},
      \"priority\": \"normal\"
    }"
done

# Check logs for rate limiting messages
```

### **Monitoring Redis Processing**

#### **Check Queue Health**
```bash
# Get queue statistics
curl -X GET "http://localhost:3000/api/v1/notifications/analytics"
```

#### **Monitor Redis Directly**
```bash
# Check Redis memory usage
redis-cli -p 6379 INFO memory

# Check active jobs
redis-cli -p 6379 -n 2 ZCARD "jobs:notifications:waiting"

# Check processing stats
redis-cli -p 6379 -n 2 GET "jobs:notifications:stats:processed"
```

### **Troubleshooting**

#### **Common Issues**
1. **Redis Connection Failed**: Check Redis server is running and accessible
2. **Jobs Not Processing**: Verify `NOTIFICATION_AUTO_PROCESS_ENABLED=true`
3. **Rate Limiting Issues**: Check Redis rate limiting keys and configuration
4. **Memory Issues**: Monitor Redis memory usage and set appropriate limits

#### **Debug Commands**
```bash
# Check background jobs status
curl -X GET "http://localhost:3000/health"

# Check Redis connectivity
redis-cli -p 6379 ping

# Check notification queue
curl -X GET "http://localhost:3000/api/v1/notifications/queue/pending"

# Check scheduled notifications
curl -X GET "http://localhost:3000/api/v1/notifications/queue/scheduled"
```

## 🧪 Testing Examples

### **🚀 Automatic Processing Testing**

#### **Test Automatic Processing**
```bash
# Create a notification - it will be automatically processed within 30 seconds
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "channel": "email",
    "recipient": {
      "id": "test-user-123",
      "email": "test@example.com"
    },
    "content": {
      "text": "Testing automatic processing",
      "html": "<p>This notification will be processed automatically!</p>"
    },
    "priority": "normal"
  }'

# Wait 30+ seconds, then check status
# Status should change from "queued" → "sent"
curl http://localhost:3000/api/v1/notifications/{notification-id}
```

#### **Test Priority Processing**
```bash
# Create high priority notification (processed faster)
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "security-alert",
    "channel": "email",
    "recipient": {"email": "urgent@example.com"},
    "content": {"text": "High priority test"},
    "priority": "high"
  }'

# High priority notifications are processed before normal priority
```

#### **Monitor Queue Processing**
```bash
# Check queue metrics
curl http://localhost:3000/admin/queue/dashboard

# Get processing statistics
curl http://localhost:3000/api/v1/notifications/analytics/stats
```

### **1. Basic Email Notification Test**
```bash
# Create a simple email notification
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "email": "user@example.com"
    },
    "type": "custom",
    "channel": "email",
    "content": {
      "text": "Hello from AegisX Healthcare System!",
      "html": "<h2>Welcome!</h2><p>Your account has been created successfully.</p>"
    },
    "priority": "high",
    "metadata": {
      "source": "manual_test"
    }
  }'
```

### **2. Process Notification Queue**
```bash
# Process all pending notifications
curl -X POST "http://localhost:3000/api/v1/notifications/queue/process" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### **3. Check Notification Status**
```bash
# Get notification details
curl -X GET "http://localhost:3000/api/v1/notifications/NOTIFICATION_ID"
```

### **4. List Notifications with Filters**
```bash
# Get all high priority email notifications
curl -X GET "http://localhost:3000/api/v1/notifications?priority=high&channel=email&limit=10"
```

### **5. Healthcare-Specific Notification**
```bash
# Create appointment reminder
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "email": "patient@example.com"
    },
    "type": "appointment-reminder",
    "channel": "email",
    "content": {
      "text": "Reminder: You have an appointment with Dr. Smith tomorrow at 2:00 PM",
      "html": "<div><strong>Appointment Reminder</strong><br>Doctor: Dr. Smith<br>Date: Tomorrow<br>Time: 2:00 PM</div>"
    },
    "priority": "high",
    "metadata": {
      "healthcare": {
        "patientId": "P123456",
        "providerId": "DR_SMITH",
        "appointmentId": "APT789",
        "facilityId": "CLINIC_001"
      }
    }
  }'
```

### **6. Batch Processing Test**
```bash
# Create multiple notifications
for i in {1..5}; do
  curl -X POST "http://localhost:3000/api/v1/notifications" \
    -H "Content-Type: application/json" \
    -d "{
      \"recipient\": {\"email\": \"test$i@example.com\"},
      \"type\": \"custom\",
      \"channel\": \"email\",
      \"content\": {\"text\": \"Test message $i\"},
      \"priority\": \"normal\"
    }"
done

# Process all at once
curl -X POST "http://localhost:3000/api/v1/notifications/queue/process" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### **7. Error Handling Test**
```bash
# Test with invalid email
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "email": "invalid-email"
    },
    "type": "custom",
    "channel": "email",
    "content": {
      "text": "This should fail validation"
    },
    "priority": "normal"
  }'
```

### **8. Gmail SMTP Configuration Test**
```bash
# Test SMTP connection (requires proper Gmail App Password in .env)
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "email": "your-email@gmail.com"
    },
    "type": "custom",
    "channel": "email",
    "content": {
      "text": "Testing Gmail SMTP integration",
      "html": "<p><strong>Success!</strong> Gmail SMTP is working correctly.</p>"
    },
    "priority": "high",
    "metadata": {
      "test": "gmail_smtp"
    }
  }'
```

### **9. Queue Status Check**
```bash
# Get queue statistics
curl -X GET "http://localhost:3000/api/v1/notifications/queue/pending?limit=50"
```

### **10. Notification Analytics**
```bash
# Get notification statistics
curl -X GET "http://localhost:3000/api/v1/notifications/analytics"
```

### **Template Engine Integration**
Notifications automatically use the template engine for rendering:
```typescript
// Template-based notification
const notification = await notificationService.createNotification(
  'appointment-reminder',
  'email',
  recipient,
  {
    template: 'appointment-reminder',
    templateData: {
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      appointmentDate: '2024-01-15',
      appointmentTime: '14:00'
    }
  }
);
```

### **Audit Integration**
All notification activities are automatically audited:
```typescript
// Automatic audit logging
await fastify.auditLog.log({
  action: 'notification.created',
  resource: 'notifications',
  resourceId: notificationId,
  details: { type, channel, priority }
});
```

## 🔐 Security & Compliance

### **HIPAA Compliance Features**
- ✅ **Audit Trails**: All notification activities logged
- ✅ **Data Encryption**: Optional encryption for sensitive notifications
- ✅ **Access Controls**: User preferences and permissions
- ✅ **Data Retention**: Configurable retention policies
- ✅ **Secure Transmission**: Encrypted channels for sensitive data

### **Security Features**
- ✅ **Rate Limiting**: Prevent notification abuse
- ✅ **Input Validation**: TypeBox schema validation
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **XSS Prevention**: Content sanitization
- ✅ **Authentication**: JWT/API key integration

## 🎯 Testing

### **Manual Testing**
1. **Start the server**: `npx nx serve api`
2. **Create a notification**: Use curl examples above
3. **Check database**: Verify notification was stored
4. **Test WebSocket**: Connect to `/ws` and subscribe to channels
5. **Test templates**: Create and use custom templates

### **Integration Testing**
```bash
# Test notification creation
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{"type":"custom","channel":"email","recipient":{"email":"test@example.com"},"content":{"text":"Test notification"}}'

# Test queue processing
curl -X POST http://localhost:3000/api/v1/notifications/queue/process \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'

# Test analytics
curl http://localhost:3000/api/v1/notifications/analytics/stats
```

## 🚀 Next Steps

### **Ready for Implementation**
The notification system is **production-ready** with:
- ✅ Complete database schema
- ✅ Full REST API
- ✅ Real-time WebSocket integration
- ✅ Healthcare compliance features
- ✅ Comprehensive documentation

### **Provider Integration (Phase 2)**
To enable actual notification delivery, implement:
1. **SMTP Email Provider**: Integrate with SendGrid, Mailgun, or AWS SES
2. **SMS Provider**: Integrate with Twilio or AWS SNS
3. **Push Notifications**: Integrate with Firebase Cloud Messaging
4. **Slack Integration**: Use Slack API or webhooks

### **Advanced Features (Phase 3)**
1. **Machine Learning**: Smart notification timing and preferences
2. **A/B Testing**: Template and delivery optimization
3. **Advanced Analytics**: Predictive analytics and insights
4. **Mobile Apps**: Native push notification support

## 📞 Support

For questions or issues with the notification system:
1. Check the API documentation at `/docs` when server is running
2. Review the database schema in `docs/notification-database-schema.md`
3. Check the error logs for detailed debugging information
4. Use the health check endpoint for system status

The notification system is now fully integrated and ready for use! 🎉