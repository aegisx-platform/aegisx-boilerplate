# Notification Automatic Processing - Complete Guide

## 📋 Overview

The AegisX Notification System features enterprise-grade automatic processing through the **QueueNotificationService**, which extends the basic DatabaseNotificationService with Bull + RabbitMQ queue integration for reliable, scalable, and priority-based notification delivery.

## 🚀 Key Features

### **✅ Automatic Processing**
- **Background Processing**: Notifications processed automatically every 30 seconds (configurable)
- **Priority-Based Queue**: Critical → Urgent → High → Normal → Low processing order
- **Dual Broker Support**: Redis (Bull) and RabbitMQ adapters available
- **Retry Logic**: Exponential backoff with configurable attempts
- **Graceful Shutdown**: Proper resource cleanup and job completion

### **✅ Enterprise Features**
- **Horizontal Scaling**: Multiple service instances can process the same queue
- **Persistent Queues**: Notifications survive server restarts
- **Rate Limiting**: Built-in rate limiting with Redis support
- **Health Monitoring**: Queue metrics and health checks
- **Audit Integration**: Full audit logging for compliance

## 🏗️ Architecture

### **Service Hierarchy**
```
QueueNotificationService (Enterprise)
    ↓ extends
DatabaseNotificationService (Database + Basic Features)
    ↓ extends
BaseNotificationService (Core Interface)
```

### **Queue Processing Flow**
```
1. Notification Created → Database
2. Auto-Process Job Runs Every 30s → Queue Service
3. Priority-Based Selection → Critical First
4. Individual Processing Jobs → Worker Threads
5. Retry on Failure → Exponential Backoff
6. Success/Failure → Audit + Metrics
```

### **Core Components**
- **QueueNotificationService**: `apps/api/src/app/domains/notification/services/queue-notification-service.ts`
- **Queue Factory**: `apps/api/src/app/core/shared/factories/queue.factory.ts`
- **Bull Queue Service**: `apps/api/src/app/core/shared/services/bull-queue.service.ts`
- **RabbitMQ Queue Service**: `apps/api/src/app/core/shared/services/rabbitmq-queue.service.ts`

## 🔧 Configuration

### **Environment Variables**

#### **Essential Configuration**
```bash
# Enable automatic processing
NOTIFICATION_AUTO_PROCESS_ENABLED=true

# Processing interval (30s, 1m, 5m, etc.)
NOTIFICATION_PROCESS_INTERVAL=30s

# Queue broker selection
QUEUE_BROKER=redis                    # or 'rabbitmq'
```

#### **Redis Configuration (Bull Queue)**
```bash
# Redis settings for Bull queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                       # Optional
QUEUE_REDIS_DB=1                      # Separate DB for queues

# Bull queue settings
QUEUE_PREFIX=bull
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_BACKOFF_TYPE=exponential
QUEUE_BACKOFF_DELAY=2000
QUEUE_REMOVE_ON_COMPLETE=true
QUEUE_REMOVE_ON_FAIL=false
```

#### **RabbitMQ Configuration**
```bash
# RabbitMQ settings
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=notifications
RABBITMQ_EXCHANGE_TYPE=topic
RABBITMQ_EXCHANGE_DURABLE=true
RABBITMQ_PREFETCH=10
```

#### **Processing Options**
```bash
# Concurrency settings
NOTIFICATION_PROCESSING_CONCURRENCY=5    # Concurrent notifications per worker
NOTIFICATION_MAX_RETRY_ATTEMPTS=3        # Max retry attempts per notification
NOTIFICATION_REDIS_DB=1                  # Redis DB for notification processing
```

### **Service Configuration**

#### **Basic Setup**
```typescript
import { QueueNotificationService } from './queue-notification-service'
import { NotificationRepository } from '../repositories/notification-repository'

// Configuration object
const queueConfig = {
  autoProcessEnabled: true,
  processInterval: '30s',
  queueBroker: 'redis' as 'redis' | 'rabbitmq',
  redisDb: 1,
  processingConcurrency: 5,
  maxRetryAttempts: 3
}

// Initialize service
const repository = new NotificationRepository(fastify.knex)
const notificationService = new QueueNotificationService(fastify, repository, queueConfig)
```

#### **Advanced Configuration**
```typescript
// High-throughput setup
const highThroughputConfig = {
  autoProcessEnabled: true,
  processInterval: '10s',           // Faster processing
  queueBroker: 'redis' as const,
  redisDb: 1,
  processingConcurrency: 10,        // More concurrent processing
  maxRetryAttempts: 5               // More retry attempts
}

// Healthcare compliance setup
const hipaaConfig = {
  autoProcessEnabled: true,
  processInterval: '30s',
  queueBroker: 'rabbitmq' as const, // Enterprise messaging
  processingConcurrency: 3,         // Conservative concurrency
  maxRetryAttempts: 3,
  auditLogging: true,               // Full audit trails
  encryption: true                  // Encrypt sensitive data
}
```

## 📊 Priority-Based Processing

### **Priority Levels**
The automatic processing system handles notifications based on priority:

| Priority | Value | Delay | Use Cases |
|----------|-------|-------|-----------|
| **Critical** | 1 | 0ms | Emergency alerts, system failures |
| **Urgent** | 2 | 100ms | Security alerts, urgent medical |
| **High** | 3 | 1s | Appointment reminders, important updates |
| **Normal** | 4 | 5s | General notifications, newsletters |
| **Low** | 5 | 30s | Marketing, non-urgent updates |

### **Processing Order**
```bash
# Each 30-second cycle processes in this order:
1. Critical priority notifications (immediate)
2. Urgent priority notifications (100ms delay)
3. High priority notifications (1s delay)
4. Normal priority notifications (5s delay)
5. Low priority notifications (30s delay)
```

### **Priority Configuration**
```typescript
// Create high-priority notification for immediate processing
await notificationService.createNotification(
  'emergency-alert',
  'email',
  { email: 'doctor@hospital.com' },
  { text: 'Patient emergency in Room 205' },
  {
    priority: 'critical',           // Processed immediately
    processImmediately: true        // Skip normal queue delay
  }
)

// Create normal notification for regular processing
await notificationService.createNotification(
  'appointment-reminder',
  'email',
  { email: 'patient@example.com' },
  { text: 'Appointment reminder' },
  {
    priority: 'normal'              // Processed in next 30s cycle
  }
)
```

## 🔄 Automatic Processing Cycle

### **Processing Flow**

#### **1. Auto-Process Job (Every 30 seconds)**
```typescript
// Automatic job runs every 30 seconds
await queueService.add('auto-process-notifications', {}, {
  repeat: { interval: '30s' },
  removeOnComplete: true,
  removeOnFail: false,
})
```

#### **2. Priority-Based Selection**
```typescript
// Process notifications by priority
const priorities = ['critical', 'urgent', 'high', 'normal', 'low']

for (const priority of priorities) {
  const notifications = await this.getQueuedNotifications(priority, 100)
  
  for (const notification of notifications) {
    // Queue individual processing job
    await queueService.add('process-notification', 
      { notificationId: notification.id },
      {
        priority: getPriorityValue(notification.priority),
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        delay: getDelayForPriority(notification.priority)
      }
    )
  }
}
```

#### **3. Individual Processing**
```typescript
// Process individual notification
queueService.process('process-notification', 5, async (job) => {
  const { notificationId } = job.data
  return await this.processNotification(notificationId)
})
```

### **Retry Logic**

#### **Exponential Backoff**
```typescript
// Retry configuration
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000                     // Base delay: 2 seconds
  }
}

// Retry delays:
// 1st retry: 2 seconds
// 2nd retry: 4 seconds  
// 3rd retry: 8 seconds
// After 3 failures: Move to failed state
```

#### **Retry Handling**
```typescript
// Automatic retry on failure
try {
  await emailService.send(notification)
  // Success: Mark as sent
} catch (error) {
  if (attempts < maxAttempts) {
    // Retry with exponential backoff
    throw error  // Bull will handle retry
  } else {
    // Max attempts reached: Mark as failed
    await this.markNotificationFailed(notificationId, error)
  }
}
```

## 🔧 Usage Examples

### **1. Basic Automatic Processing**

#### **Setup**
```typescript
// Enable automatic processing in your service
const queueConfig = {
  autoProcessEnabled: true,
  processInterval: '30s',
  queueBroker: 'redis'
}

const notificationService = new QueueNotificationService(fastify, repository, queueConfig)
```

#### **Create Notifications**
```bash
# Create notification - automatically processed within 30 seconds
curl -X POST "http://localhost:3000/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "channel": "email",
    "recipient": {"email": "user@example.com"},
    "content": {"text": "Welcome to AegisX!"},
    "priority": "normal"
  }'
```

### **2. Immediate Processing**

#### **Process Right Away**
```typescript
// Create notification with immediate processing
await notificationService.createNotification(
  'security-alert',
  'email',
  { email: 'admin@company.com' },
  { text: 'Suspicious login detected' },
  {
    priority: 'urgent',
    processImmediately: true        // Bypass normal 30s cycle
  }
)
```

#### **Manual Queue Job**
```typescript
// Manually queue notification for immediate processing
await notificationService.queueNotificationForProcessing(
  notificationId,
  {
    delay: 0,                       // No delay
    priority: 'critical',
    attempts: 5
  }
)
```

### **3. Batch Processing**

#### **High-Volume Processing**
```bash
# Create multiple notifications - all processed automatically
for i in {1..100}; do
  curl -X POST "http://localhost:3000/api/v1/notifications" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"newsletter\",
      \"channel\": \"email\",
      \"recipient\": {\"email\": \"user$i@example.com\"},
      \"content\": {\"text\": \"Monthly newsletter #$i\"},
      \"priority\": \"low\"
    }"
done

# All 100 notifications will be automatically processed
# Low priority = 30s delay between each
```

### **4. Scheduled Processing**

#### **Future Notifications**
```typescript
// Create notification scheduled for future processing
await notificationService.createNotification(
  'appointment-reminder',
  'email',
  { email: 'patient@example.com' },
  { text: 'Appointment tomorrow at 2 PM' },
  {
    priority: 'high',
    scheduledAt: new Date('2024-01-15T13:00:00Z')  // 1 hour before appointment
  }
)

// The scheduled notification will be automatically processed at the specified time
```

## 📈 Monitoring & Management

### **Queue Metrics**

#### **Get Queue Status**
```bash
# Check queue health
curl http://localhost:3000/api/v1/admin/queues/health

# Get queue metrics
curl http://localhost:3000/api/v1/admin/queues/redis/notifications/metrics

# Check notification statistics
curl http://localhost:3000/api/v1/notifications/analytics/stats
```

#### **Queue Metrics Response**
```json
{
  "name": "notifications",
  "broker": "redis",
  "waiting": 25,
  "active": 5,
  "completed": 1247,
  "failed": 12,
  "delayed": 8,
  "paused": 0,
  "processingRate": 45.2,
  "errorRate": 0.96,
  "avgProcessingTime": 1234,
  "isPaused": false,
  "lastActivity": "2024-01-15T10:30:00Z"
}
```

### **Manual Queue Control**

#### **Pause/Resume Processing**
```typescript
// Pause automatic processing
await notificationService.pauseAutomaticProcessing()

// Resume automatic processing
await notificationService.resumeAutomaticProcessing()
```

#### **Manual Processing**
```bash
# Manually trigger processing of queued notifications
curl -X POST "http://localhost:3000/api/v1/notifications/queue/process" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

#### **Queue Management**
```bash
# Get pending notifications
curl "http://localhost:3000/api/v1/notifications/queue/pending?limit=100"

# Get scheduled notifications
curl "http://localhost:3000/api/v1/notifications/queue/scheduled"

# Retry failed notifications
curl -X POST "http://localhost:3000/api/v1/admin/queues/redis/notifications/retry" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### **Health Monitoring**

#### **Service Health Check**
```typescript
// Check if queue service is ready
const isReady = await queueService.isReady()

// Get comprehensive queue metrics
const metrics = await notificationService.getQueueMetrics()

// Monitor processing errors
queueService.on('job:failed', (job, error) => {
  console.error(`Notification ${job.data.notificationId} failed:`, error)
})
```

## 🔍 Troubleshooting

### **Common Issues**

#### **1. Notifications Not Processing**
```bash
# Check if automatic processing is enabled
echo $NOTIFICATION_AUTO_PROCESS_ENABLED  # Should be 'true'

# Check queue service status
curl http://localhost:3000/api/v1/admin/queues/health

# Check Redis connection
redis-cli ping

# Check notification queue
curl "http://localhost:3000/api/v1/notifications/queue/pending"
```

#### **2. High Error Rates**
```bash
# Check failed notifications
curl "http://localhost:3000/api/v1/notifications?status=failed&limit=10"

# Check queue error metrics
curl http://localhost:3000/api/v1/admin/queues/redis/notifications/metrics

# Check logs for error details
tail -f logs/app.log | grep "notification.*error"
```

#### **3. Slow Processing**
```bash
# Check queue metrics for bottlenecks
curl http://localhost:3000/api/v1/admin/queues/redis/notifications/metrics

# Check Redis memory usage
redis-cli info memory

# Check processing concurrency settings
echo $NOTIFICATION_PROCESSING_CONCURRENCY
```

### **Performance Tuning**

#### **High-Throughput Setup**
```bash
# Increase processing frequency and concurrency
NOTIFICATION_PROCESS_INTERVAL=10s
NOTIFICATION_PROCESSING_CONCURRENCY=10
QUEUE_DEFAULT_ATTEMPTS=5

# Use Redis for better performance
QUEUE_BROKER=redis
QUEUE_REDIS_DB=1
```

#### **Memory Optimization**
```bash
# Enable job cleanup
QUEUE_REMOVE_ON_COMPLETE=true
QUEUE_REMOVE_ON_FAIL=false

# Limit job retention
NOTIFICATION_RETENTION_PERIOD=2592000000  # 30 days
```

#### **Monitoring Setup**
```bash
# Enable comprehensive monitoring
NOTIFICATION_MONITORING_ENABLED=true
NOTIFICATION_METRICS_INTERVAL=60000       # 1 minute
NOTIFICATION_HEALTH_CHECK_INTERVAL=30000  # 30 seconds
```

## 🔐 Security & Compliance

### **HIPAA Compliance**
```bash
# Enable healthcare compliance features
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_AUDIT_JOBS=true
NOTIFICATION_ENCRYPT_SENSITIVE=true
```

### **Security Features**
- **Rate Limiting**: Built-in rate limiting prevents abuse
- **Audit Logging**: All processing activities logged
- **Data Encryption**: Optional encryption for sensitive notifications
- **Access Control**: Integration with RBAC system
- **Secure Transmission**: HTTPS/TLS for all communications

### **Compliance Monitoring**
```typescript
// Audit all notification processing
fastify.auditLog.log({
  action: 'notification.processed',
  resource: 'notifications',
  resourceId: notificationId,
  details: {
    type: notification.type,
    channel: notification.channel,
    status: 'sent',
    processingTime: endTime - startTime
  }
})
```

## 🚀 Advanced Usage

### **Custom Processing Logic**
```typescript
// Extend QueueNotificationService for custom processing
class CustomQueueNotificationService extends QueueNotificationService {
  protected async processNotification(notificationId: string): Promise<any> {
    // Custom pre-processing
    await this.validateNotification(notificationId)
    
    // Call parent processing
    const result = await super.processNotification(notificationId)
    
    // Custom post-processing
    await this.logProcessingResult(notificationId, result)
    
    return result
  }
  
  private async validateNotification(notificationId: string): Promise<void> {
    // Custom validation logic
  }
  
  private async logProcessingResult(notificationId: string, result: any): Promise<void> {
    // Custom logging logic
  }
}
```

### **Multi-Channel Processing**
```typescript
// Process different channels with different priorities
const channelConfig = {
  email: { concurrency: 10, priority: 'normal' },
  sms: { concurrency: 5, priority: 'high' },
  push: { concurrency: 15, priority: 'normal' },
  slack: { concurrency: 3, priority: 'low' }
}

// Configure processing based on channel
for (const [channel, config] of Object.entries(channelConfig)) {
  queueService.process(`process-${channel}`, config.concurrency, async (job) => {
    return await this.processChannelNotification(channel, job.data.notificationId)
  })
}
```

### **Healthcare-Specific Processing**
```typescript
// Healthcare notification processing with compliance
class HealthcareNotificationService extends QueueNotificationService {
  protected async processNotification(notificationId: string): Promise<any> {
    const notification = await this.getNotification(notificationId)
    
    // HIPAA compliance checks
    if (notification.metadata?.healthcare?.patientId) {
      await this.validateHIPAACompliance(notification)
    }
    
    // Process with audit trail
    const result = await super.processNotification(notificationId)
    
    // Healthcare-specific logging
    await this.logHealthcareActivity(notification, result)
    
    return result
  }
}
```

## 📚 Related Documentation

- **Main Notification Service**: `docs/notification-service.md`
- **Bull + RabbitMQ Queue System**: `docs/bull-rabbitmq-queue-system.md`
- **Database Schema**: `docs/notification-database-schema.md`
- **API Documentation**: Available at `/docs` when server is running

## 💡 Best Practices

### **Performance**
1. **Use appropriate processing intervals** - 30s for normal load, 10s for high volume
2. **Set proper concurrency** - Balance throughput with resource usage
3. **Enable job cleanup** - Prevent memory bloat with completed job removal
4. **Monitor queue depth** - Scale workers based on pending job count

### **Reliability**
1. **Configure retry logic** - Use exponential backoff for failed jobs
2. **Set appropriate timeouts** - Prevent hanging jobs from blocking queues
3. **Monitor error rates** - Set up alerts for high failure rates
4. **Use persistent queues** - Ensure notifications survive service restarts

### **Security**
1. **Enable audit logging** - Track all notification processing activities
2. **Use rate limiting** - Prevent abuse and resource exhaustion
3. **Encrypt sensitive data** - Protect patient and user information
4. **Validate all inputs** - Never trust notification data without validation

The automatic processing system provides enterprise-grade reliability and scalability for high-volume notification delivery while maintaining healthcare compliance and security standards.