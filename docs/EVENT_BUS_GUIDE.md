# AegisX Event Bus System - คู่มือการใช้งานฉบับสมบูรณ์

## 📋 สารบัญ
1. [ภาพรวมและแนวคิด](#ภาพรวมและแนวคิด)
2. [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
3. [การติดตั้งและการกำหนดค่า](#การติดตั้งและการกำหนดค่า)
4. [การใช้งานเบื้องต้น](#การใช้งานเบื้องต้น)
5. [Adapter Types และการเลือกใช้](#adapter-types-และการเลือกใช้)
6. [Event Patterns และ Best Practices](#event-patterns-และ-best-practices)
7. [ตัวอย่างการใช้งานจริง](#ตัวอย่างการใช้งานจริง)
8. [Middleware และ Features](#middleware-และ-features)
9. [Monitoring และ Health Checks](#monitoring-และ-health-checks)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 ภาพรวมและแนวคิด

Event Bus ใน AegisX เป็นระบบสื่อสารแบบ asynchronous ที่ช่วยให้ส่วนต่างๆ ของแอปพลิเคชันสามารถสื่อสารกันได้โดยไม่ต้องมีการ coupling โดยตรง

### แนวคิดหลัก:
- **Decoupling**: ลดการผูกมัดระหว่าง services
- **Scalability**: รองรับการขยายระบบได้ง่าย
- **Reliability**: มีระบบ retry และ error handling
- **Monitoring**: ติดตามการทำงานแบบ real-time

### Event Flow Diagram:
```
┌─────────────┐    publish    ┌─────────────┐    route    ┌─────────────┐
│   Producer  │──────────────▶│ Event Bus   │────────────▶│  Consumer   │
│  (Service)  │               │  (Adapter)  │             │ (Handler)   │
└─────────────┘               └─────────────┘             └─────────────┘
                                     │
                              ┌─────────────┐
                              │ Middleware  │
                              │ - Logging   │
                              │ - Retry     │
                              │ - Metrics   │
                              └─────────────┘
```

---

## 🏗️ สถาปัตยกรรมระบบ

### โครงสร้างหลัก:
```
apps/api/src/app/core/shared/events/
├── interfaces/           # Type definitions และ contracts
│   ├── event-bus.interface.ts
│   ├── domain-event.interface.ts
│   └── auth-events.interface.ts
├── adapters/            # การเชื่อมต่อกับ message brokers
│   ├── base-adapter.ts
│   ├── memory-adapter.ts
│   ├── redis-adapter.ts
│   └── rabbitmq-adapter.ts
├── middleware/          # Event processing middleware
│   ├── logging.middleware.ts
│   ├── retry.middleware.ts
│   └── metrics.middleware.ts
├── utils/              # Utilities และ helpers
│   ├── event-factory.ts
│   └── event-validator.ts
├── factory/            # Factory pattern implementation
│   └── event-bus-factory.ts
├── plugins/            # Fastify plugin integration
│   └── event-bus.ts
└── examples/           # ตัวอย่างการใช้งาน
    └── usage-examples.ts
```

### Component Architecture:
```
┌──────────────────────────────────────────┐
│               Fastify Plugin             │
├──────────────────────────────────────────┤
│              Event Bus Factory           │
├──────────────────────────────────────────┤
│                Middleware                │
│  ┌────────────┬────────────┬───────────┐ │
│  │  Logging   │   Retry    │  Metrics  │ │
│  └────────────┴────────────┴───────────┘ │
├──────────────────────────────────────────┤
│               Base Adapter               │
├──────────────────────────────────────────┤
│           Concrete Adapters              │
│  ┌────────────┬────────────┬───────────┐ │
│  │   Memory   │   Redis    │ RabbitMQ  │ │
│  └────────────┴────────────┴───────────┘ │
└──────────────────────────────────────────┘
```

---

## ⚙️ การติดตั้งและการกำหนดค่า

### 1. Environment Variables

```bash
# .env
# Event Bus Configuration
EVENT_BUS_ADAPTER=memory  # memory | redis | rabbitmq

# Redis Configuration (เมื่อใช้ redis adapter)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ Configuration (เมื่อใช้ rabbitmq adapter)
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
```

### 2. Fastify Plugin Registration

Event Bus ถูกลงทะเบียนอัตโนมัติใน Fastify application:

```typescript
// apps/api/src/app/app.ts
export default fp(async function app(fastify) {
  // Event Bus จะถูกลงทะเบียนอัตโนมัติ
  await fastify.register(import('./core/plugins/event-bus'))
  
  // ตอนนี้สามารถใช้ fastify.eventBus ได้แล้ว
})
```

---

## 🚀 การใช้งานเบื้องต้น

### 1. การ Publish Event

```typescript
// ใน Service หรือ Controller
async function createUser(userData: CreateUserData) {
  // สร้าง user
  const user = await userRepository.create(userData)
  
  // Publish event
  await fastify.eventBus.publish('user.created', {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: new Date()
  })
  
  return user
}
```

### 2. การ Subscribe Event

```typescript
// ใน Plugin หรือ Service initialization
export default fp(async function setupEventHandlers(fastify: FastifyInstance) {
  
  // Subscribe to user creation events
  await fastify.eventBus.subscribe('user.created', async (data, metadata) => {
    // ส่งอีเมลต้อนรับ
    await emailService.sendWelcomeEmail({
      to: data.email,
      name: data.name,
      userId: data.userId
    })
    
    fastify.log.info('Welcome email sent', { 
      userId: data.userId,
      correlationId: metadata.correlationId 
    })
  })
  
  // Subscribe to multiple events
  await fastify.eventBus.subscribe('user.updated', async (data, metadata) => {
    // อัพเดท cache
    await cacheService.invalidateUser(data.userId)
  })
})
```

### 3. Event Options และ Advanced Usage

```typescript
// การ Publish พร้อม options
await fastify.eventBus.publish('order.created', orderData, {
  delay: 5000,        // ส่งหลังจาก 5 วินาที
  ttl: 60000,         // หมดอายุใน 1 นาที
  priority: 5,        // ความสำคัญสูง
  persistent: true,   // เก็บไว้ใน disk (RabbitMQ)
  retryAttempts: 3    // ลองใหม่ 3 ครั้งถ้าผิดพลาด
})
```

---

## 🔄 Adapter Types และการเลือกใช้

### 1. Memory Adapter
**เหมาะสำหรับ**: Development, Testing, Single Instance Applications

```typescript
// กำหนดค่าใน .env
EVENT_BUS_ADAPTER=memory
```

**คุณสมบัติ**:
- ✅ รวดเร็วที่สุด (in-memory)
- ✅ ไม่ต้องการ external dependencies
- ✅ เหมาะสำหรับ testing
- ❌ ข้อมูลหายเมื่อ restart
- ❌ ไม่รองรับ multiple instances

**ตัวอย่างการใช้งาน**:
```typescript
// Development environment
if (process.env.NODE_ENV === 'development') {
  // Memory adapter จะถูกใช้อัตโนมัติ
  console.log('Using Memory Event Bus for development')
}
```

### 2. Redis Adapter  
**เหมาะสำหรับ**: Distributed Applications, High Performance, Pub/Sub Patterns

```typescript
// กำหนดค่าใน .env
EVENT_BUS_ADAPTER=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

**คุณสมบัติ**:
- ✅ รองรับ multiple instances
- ✅ Performance สูง
- ✅ รองรับ clustering
- ✅ Built-in persistence
- ❌ ไม่รองรับ delivery guarantees
- ❌ Message อาจหายในบางกรณี

**Event Flow**:
```
Publisher ──publish──▶ Redis Channel ──subscribe──▶ Subscribers
                            │
                      [Event Routing]
                      events:user.created
                      events:order.processed
```

### 3. RabbitMQ Adapter
**เหมาะสำหรับ**: Enterprise Applications, Guaranteed Delivery, Complex Routing

```typescript
// กำหนดค่าใน .env  
EVENT_BUS_ADAPTER=rabbitmq
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
```

**คุณสมบัติ**:
- ✅ Guaranteed delivery (acknowledgments)
- ✅ Dead letter queues
- ✅ Message persistence
- ✅ Complex routing patterns
- ✅ Enterprise-grade reliability
- ❌ ซับซ้อนกว่า Redis
- ❌ ต้องการ RabbitMQ server

**Event Flow**:
```
Publisher ──▶ Exchange ──▶ Queue ──▶ Consumer
                │              │
            [Routing Key]   [Dead Letter]
            user.created    user.created.dlx
            order.*         order.failed.dlx
```

---

## 📋 Event Patterns และ Best Practices

### 1. Event Naming Convention

```typescript
// ✅ ดี: ใช้ domain.action format
'user.created'
'user.updated'  
'user.deleted'
'order.placed'
'order.shipped'
'payment.processed'

// ❌ ไม่ดี: ชื่อไม่ชัดเจน
'userEvent'
'doSomething'
'update'
```

### 2. Event Data Structure

```typescript
// ✅ Event data ที่ดี
await fastify.eventBus.publish('user.profile.updated', {
  userId: '123',
  changes: {
    email: { old: 'old@email.com', new: 'new@email.com' },
    name: { old: 'Old Name', new: 'New Name' }
  },
  updatedAt: new Date(),
  updatedBy: 'user-123'
})

// ❌ Event data ที่ไม่ดี - ข้อมูลไม่เพียงพอ
await fastify.eventBus.publish('user.updated', {
  id: '123'  // ไม่มีข้อมูลว่าอะไรเปลี่ยน
})
```

### 3. Error Handling Patterns

```typescript
// Handler ที่ handle error ได้ดี
await fastify.eventBus.subscribe('user.created', async (data, metadata) => {
  try {
    // ทำงานหลัก
    await emailService.sendWelcomeEmail(data)
    
    // ทำงานรอง (ไม่สำคัญ)
    try {
      await analyticsService.trackUserCreation(data)
    } catch (analyticsError) {
      // Log แต่ไม่ throw เพื่อไม่กระทบงานหลัก
      fastify.log.warn('Analytics tracking failed', { 
        error: analyticsError,
        userId: data.userId 
      })
    }
    
  } catch (error) {
    fastify.log.error('Critical: Welcome email failed', {
      error,
      userId: data.userId,
      correlationId: metadata.correlationId
    })
    
    // Re-throw เพื่อให้ retry middleware จัดการ
    throw error
  }
})
```

### 4. Event Versioning

```typescript
// การจัดการ Event Version
await fastify.eventBus.subscribe('user.created', async (data, metadata) => {
  const version = metadata.version || 1
  
  switch (version) {
    case 1:
      // รองรับ version 1
      await handleUserCreatedV1(data)
      break
    case 2:
      // รองรับ version 2 (มี field เพิ่ม)
      await handleUserCreatedV2(data)
      break
    default:
      fastify.log.warn('Unsupported event version', { version, eventType: 'user.created' })
  }
})
```

---

## 💡 ตัวอย่างการใช้งานจริง

### 1. E-commerce Order Processing

```typescript
// Order Service
export class OrderService {
  
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    // 1. สร้าง order
    const order = await this.orderRepository.create(orderData)
    
    // 2. Publish order created event
    await this.fastify.eventBus.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt
    })
    
    return order
  }
  
  async processPayment(orderId: string, paymentData: PaymentData): Promise<void> {
    try {
      // Process payment
      const result = await this.paymentService.charge(paymentData)
      
      // Publish success event
      await this.fastify.eventBus.publish('order.payment.succeeded', {
        orderId,
        paymentId: result.id,
        amount: result.amount,
        processedAt: new Date()
      })
      
    } catch (error) {
      // Publish failure event
      await this.fastify.eventBus.publish('order.payment.failed', {
        orderId,
        error: error.message,
        failedAt: new Date()
      })
      throw error
    }
  }
}
```

```typescript
// Event Handlers Setup
export default fp(async function setupOrderEventHandlers(fastify: FastifyInstance) {
  
  // เมื่อมี order ใหม่
  await fastify.eventBus.subscribe('order.created', async (data, metadata) => {
    // ส่งอีเมลยืนยัน order
    await emailService.sendOrderConfirmation({
      to: await getUserEmail(data.userId),
      orderId: data.orderId,
      items: data.items,
      totalAmount: data.totalAmount
    })
    
    // อัพเดท inventory
    await inventoryService.reserveItems(data.items)
    
    // แจ้งเตือน fulfillment team
    await fulfillmentService.notifyNewOrder(data.orderId)
  })
  
  // เมื่อ payment สำเร็จ
  await fastify.eventBus.subscribe('order.payment.succeeded', async (data, metadata) => {
    // อัพเดท order status
    await orderRepository.updateStatus(data.orderId, 'paid')
    
    // เริ่มกระบวนการจัดส่ง
    await fulfillmentService.startShipping(data.orderId)
    
    // อัพเดท customer loyalty points
    await loyaltyService.addPoints(data.userId, data.amount)
  })
  
  // เมื่อ payment ล้มเหลว
  await fastify.eventBus.subscribe('order.payment.failed', async (data, metadata) => {
    // อัพเดท order status
    await orderRepository.updateStatus(data.orderId, 'payment_failed')
    
    // คืน inventory
    const order = await orderRepository.findById(data.orderId)
    await inventoryService.releaseItems(order.items)
    
    // ส่งอีเมลแจ้งปัญหา
    await emailService.sendPaymentFailedNotification({
      orderId: data.orderId,
      userId: order.userId
    })
  })
})
```

### 2. User Management with RBAC

```typescript
// User Service
export class UserService {
  
  async updateUserRole(userId: string, newRoles: string[]): Promise<void> {
    // อัพเดท roles ใน database
    const oldRoles = await this.rbacService.getUserRoles(userId)
    await this.rbacService.updateUserRoles(userId, newRoles)
    
    // Publish role change event
    await this.fastify.eventBus.publish('user.roles.changed', {
      userId,
      oldRoles: oldRoles.map(r => r.name),
      newRoles,
      changedAt: new Date(),
      changedBy: 'admin'
    })
  }
}
```

```typescript
// RBAC Event Handlers
export default fp(async function setupRBACEventHandlers(fastify: FastifyInstance) {
  
  await fastify.eventBus.subscribe('user.roles.changed', async (data, metadata) => {
    // ล้าง RBAC cache
    await cacheService.delete(`rbac:user:${data.userId}:roles`)
    await cacheService.delete(`rbac:user:${data.userId}:permissions`)
    
    // Log security event
    fastify.log.info('User roles changed', {
      userId: data.userId,
      oldRoles: data.oldRoles,
      newRoles: data.newRoles,
      securityEvent: true
    })
    
    // แจ้งเตือน admin ถ้าเป็น sensitive roles
    const sensitiveRoles = ['admin', 'super_user']
    const hasSensitiveRole = data.newRoles.some(role => sensitiveRoles.includes(role))
    
    if (hasSensitiveRole) {
      await notificationService.notifyAdmins({
        type: 'security_alert',
        message: `User ${data.userId} was granted sensitive roles`,
        data: data
      })
    }
    
    // Force re-authentication on all devices
    await sessionService.invalidateAllUserSessions(data.userId)
  })
})
```

### 3. Audit Logging System

```typescript
// Audit Event Publisher (Middleware)
export const auditMiddleware = (action: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now()
    
    // รอให้ request เสร็จ
    await reply
    
    // Publish audit event
    await request.server.eventBus.publish('audit.action', {
      action,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: Date.now() - startTime,
      timestamp: new Date()
    })
  }
}
```

```typescript
// Audit Event Handler
await fastify.eventBus.subscribe('audit.action', async (data, metadata) => {
  // บันทึกลง audit log database
  await auditLogRepository.create({
    action: data.action,
    userId: data.userId,
    details: {
      ip: data.ip,
      userAgent: data.userAgent,
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      duration: data.duration
    },
    timestamp: data.timestamp
  })
  
  // ส่งไปยัง external monitoring system
  if (data.statusCode >= 400) {
    await monitoringService.sendAlert({
      type: 'http_error',
      severity: data.statusCode >= 500 ? 'high' : 'medium',
      details: data
    })
  }
})
```

---

## 🔧 Middleware และ Features

### 1. Logging Middleware

Event Bus มี logging middleware ที่ทำงานอัตโนมัติ:

```typescript
// การใช้งาน (ทำงานอัตโนมัติ)
await fastify.eventBus.publish('user.created', userData)

// Output log:
// {
//   "timestamp": "2024-01-15T10:30:00.000Z",
//   "level": "info",
//   "message": "Event published successfully",
//   "component": "event-bus-logging",
//   "event": "user.created",
//   "eventId": "evt_1234567890",
//   "correlationId": "corr_abcdefgh",
//   "dataSize": 156,
//   "adapter": "redis"
// }
```

### 2. Retry Middleware

ระบบ retry อัตโนมัติพร้อม exponential backoff:

```typescript
// กำหนดค่า retry (ใน plugin initialization)
const retryOptions = {
  enabled: true,
  maxAttempts: 3,
  baseDelay: 1000,        // 1 วินาที
  maxDelay: 30000,        // 30 วินาที
  backoffMultiplier: 2,   // เพิ่มเป็น 2 เท่า
  retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'],
  nonRetryableErrors: ['ValidationError', 'TypeError']
}
```

**Retry Flow**:
```
Event Handler Fails
        ↓
Is Error Retryable?
    ↙        ↘
   No        Yes
   ↓          ↓
Throw Error   Wait (backoff)
             ↓
        Retry Handler
             ↓
     Success or Max Attempts?
         ↙        ↘
    Success     Max Attempts
       ↓           ↓
   Complete   Dead Letter Queue
```

### 3. Metrics Middleware

ติดตามการทำงานแบบ real-time:

```typescript
// Metrics ที่เก็บอัตโนมัติ:
{
  "event_published_total": 1245,
  "event_consumed_total": 1240,
  "event_failed_total": 5,
  "event_retry_total": 12,
  "event_duration_seconds": {
    "user.created": 0.045,
    "order.processed": 0.123
  },
  "adapter_health": "healthy"
}
```

---

## 📊 Monitoring และ Health Checks

### 1. Health Check Endpoint

Event Bus มี health check endpoint built-in:

```bash
GET /api/v1/health/event-bus
```

**Response**:
```json
{
  "status": "healthy",
  "adapter": "redis",
  "uptime": 3600000,
  "lastCheck": "2024-01-15T10:30:00.000Z",
  "details": {
    "publisherStatus": "PONG",
    "subscriberStatus": "PONG", 
    "subscribedChannels": 5
  }
}
```

### 2. Stats และ Metrics

```typescript
// ดูสถิติการทำงาน
const stats = await fastify.eventBus.getStats()

console.log(stats)
// {
//   "adapter": "redis",
//   "publishedCount": 1245,
//   "consumedCount": 1240,
//   "errorCount": 5,
//   "activeSubscriptions": 8,
//   "uptime": 3600000,
//   "memoryUsage": 52428800
// }
```

### 3. การ Monitor Events

```typescript
// Monitor specific events
await fastify.eventBus.subscribe('*', async (data, metadata) => {
  // Log ทุก event (สำหรับ debugging)
  console.log(`Event: ${metadata.eventId}`, {
    source: metadata.source,
    timestamp: metadata.timestamp,
    correlationId: metadata.correlationId
  })
})

// Monitor failed events  
await fastify.eventBus.subscribe('event.handler.failed', async (data, metadata) => {
  // แจ้งเตือนเมื่อมี handler ล้มเหลว
  await alertingService.sendAlert({
    type: 'event_handler_failure',
    eventName: data.eventName,
    error: data.error,
    retryCount: data.retryCount
  })
})
```

---

## 🔍 Troubleshooting

### 1. ปัญหาทั่วไป

#### Event ไม่ถูกส่ง
```typescript
// เช็คการเชื่อมต่อ
const health = await fastify.eventBus.health()
console.log('Event Bus Health:', health)

// เช็ค adapter type
console.log('Current adapter:', fastify.eventBus.getType())

// เช็ค environment variables
console.log('EVENT_BUS_ADAPTER:', process.env.EVENT_BUS_ADAPTER)
```

#### Event Handler ไม่ทำงาน
```typescript
// เช็ค subscription
const stats = await fastify.eventBus.getStats()
console.log('Active subscriptions:', stats.activeSubscriptions)

// ทดสอบ handler
await fastify.eventBus.subscribe('test.event', async (data, metadata) => {
  console.log('Test handler received:', data)
})

await fastify.eventBus.publish('test.event', { test: true })
```

#### Memory Leak ใน Memory Adapter
```typescript
// เช็ค memory usage
const stats = await fastify.eventBus.getStats()
console.log('Memory usage:', stats.memoryUsage)

// ล้างข้อมูลเก่า (memory adapter มี auto-cleanup)
// แต่สามารถ force cleanup ได้
await fastify.eventBus.cleanup()
await fastify.eventBus.initialize()
```

### 2. Debug Tips

#### เปิด Debug Logs
```bash
# .env
LOG_LEVEL=debug
```

#### Monitor Event Flow
```typescript
// เพิ่ม global event monitor
await fastify.eventBus.subscribe('*', async (data, metadata) => {
  fastify.log.debug('Event Flow', {
    eventId: metadata.eventId,
    eventName: metadata.source,
    correlationId: metadata.correlationId,
    timestamp: metadata.timestamp,
    dataSize: JSON.stringify(data).length
  })
})
```

#### Performance Monitoring
```typescript
// วัดเวลาการทำงานของ handler
const originalHandler = myEventHandler
const timedHandler = async (data, metadata) => {
  const start = Date.now()
  try {
    await originalHandler(data, metadata)
    fastify.log.info('Handler completed', {
      duration: Date.now() - start,
      eventId: metadata.eventId
    })
  } catch (error) {
    fastify.log.error('Handler failed', {
      duration: Date.now() - start,
      eventId: metadata.eventId,
      error
    })
    throw error
  }
}
```

### 3. Production Considerations

#### การ Scale Event Bus
```typescript
// Redis Cluster Configuration
EVENT_BUS_ADAPTER=redis
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379

// RabbitMQ Cluster Configuration  
RABBITMQ_CLUSTER_NODES=rabbit1:5672,rabbit2:5672,rabbit3:5672
```

#### การจัดการ Dead Letter Events
```typescript
// Subscribe to dead letter events
await fastify.eventBus.subscribe('dlx.*', async (data, metadata) => {
  // บันทึก failed events
  await deadLetterRepository.create({
    originalEvent: data.originalEvent,
    error: data.error,
    retryCount: data.retryCount,
    failedAt: new Date()
  })
  
  // แจ้งเตือน ops team
  await alertingService.sendAlert({
    type: 'dead_letter_event',
    event: data.originalEvent,
    error: data.error
  })
})
```

#### การ Backup และ Recovery
```typescript
// Event Store Pattern (สำหรับ critical events)
await fastify.eventBus.subscribe('critical.*', async (data, metadata) => {
  // บันทึกลง persistent storage
  await eventStoreRepository.create({
    eventId: metadata.eventId,
    eventType: metadata.source,
    eventData: data,
    metadata: metadata,
    timestamp: metadata.timestamp
  })
  
  // ประมวลผล event
  await actualHandler(data, metadata)
})
```

---

## 🎉 สรุป

Event Bus System ใน AegisX ให้ความสามารถในการสร้าง event-driven architecture ที่มีประสิทธิภาพและน่าเชื่อถือ โดยมี features หลัก:

### ✅ **Core Features**
- **Multi-Adapter Support**: Memory, Redis, RabbitMQ
- **Middleware System**: Logging, Retry, Metrics
- **Type Safety**: TypeScript interfaces
- **Health Monitoring**: Built-in health checks
- **Production Ready**: Error handling, scaling support

### 🚀 **การใช้งาน**
1. **Development**: ใช้ Memory adapter สำหรับ testing
2. **Staging**: ใช้ Redis adapter สำหรับ performance testing  
3. **Production**: ใช้ RabbitMQ adapter สำหรับ enterprise reliability

### 📈 **Next Steps**
- เพิ่ม Event Sourcing patterns
- Integration กับ OpenTelemetry
- Event Schema Registry
- GraphQL Subscriptions integration

Event Bus System พร้อมใช้งานใน production environment และสามารถขยายได้ตามความต้องการของแอปพลิเคชัน! 🎯