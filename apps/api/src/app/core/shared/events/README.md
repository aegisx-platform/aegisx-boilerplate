# Event Bus System

A flexible and scalable event-driven architecture system for AegisX Boilerplate supporting multiple adapters and middleware.

## Features

- 🔌 **Multiple Adapters**: Memory, Redis Pub/Sub, RabbitMQ
- 🎯 **Type-Safe Events**: TypeScript interfaces for event definitions
- 🔄 **Middleware Support**: Logging, retry, and metrics middleware
- 📊 **Monitoring**: Built-in health checks and metrics
- ⚡ **Performance**: Optimized for high-throughput scenarios
- 🛡️ **Reliability**: Retry mechanisms and dead letter queues

## Quick Start

### 1. Initialize Event Bus

```typescript
// In your Fastify app
await fastify.register(eventBusPlugin, {
  config: {
    adapter: 'redis', // or 'memory', 'rabbitmq'
    redis: {
      url: 'redis://localhost:6379'
    }
  },
  middleware: {
    logging: { enabled: true },
    retry: { maxAttempts: 3 },
    metrics: { enabled: true }
  }
})
```

### 2. Publishing Events

```typescript
// Simple event
await fastify.eventBus.publish('user.created', {
  userId: '123',
  email: 'user@example.com'
})

// With options
await fastify.eventBus.publish('order.created', orderData, {
  persistent: true,
  ttl: 300000,
  retryAttempts: 3
})
```

### 3. Subscribing to Events

```typescript
await fastify.eventBus.subscribe('user.created', async (data, metadata) => {
  console.log(`User created: ${data.email}`)
  await sendWelcomeEmail(data.email)
})
```

## Adapters

### Memory Adapter
Best for development and testing.

```typescript
const eventBus = EventBusFactory.create({
  adapter: 'memory'
})
```

**Features:**
- In-process event handling
- Delayed event support
- TTL support
- No external dependencies

### Redis Adapter
Best for distributed real-time events.

```typescript
const eventBus = EventBusFactory.create({
  adapter: 'redis',
  redis: {
    url: 'redis://localhost:6379',
    keyPrefix: 'events:'
  }
})
```

**Features:**
- Pub/Sub messaging
- Cross-service communication
- High performance
- Redis connection pooling

### RabbitMQ Adapter
Best for reliable message delivery.

```typescript
const eventBus = EventBusFactory.create({
  adapter: 'rabbitmq',
  rabbitmq: {
    url: 'amqp://localhost:5672',
    exchange: 'events',
    deadLetterExchange: 'events.dlx'
  }
})
```

**Features:**
- Persistent queues
- Dead letter queues
- Message acknowledgments
- Advanced routing

## Event Structure

### Domain Events

```typescript
interface DomainEvent {
  eventId: string          // Unique event ID
  eventType: string        // Event type (e.g., 'user.created')
  eventVersion: string     // Schema version
  aggregateId: string      // Entity ID
  aggregateType: string    // Entity type
  timestamp: Date          // Event timestamp
  data: Record<string, any> // Event payload
  metadata: EventMetadata  // Additional metadata
}
```

### Using Event Factory

```typescript
const event = EventFactory.createDomainEvent(
  'user.created',
  'user-123',
  'User',
  {
    email: 'john@example.com',
    firstName: 'John'
  },
  {
    correlationId: 'req-456',
    userId: 'admin-789'
  }
)
```

### Using Event Builder

```typescript
const event = new EventBuilder()
  .eventType('order.completed')
  .aggregate('order-123', 'Order')
  .data({ amount: 99.99, status: 'completed' })
  .correlationId('req-789')
  .build()
```

## Middleware

### Logging Middleware

```typescript
eventBus.withLogging({
  enabled: true,
  logLevel: 'info',
  includeData: true,
  maxDataLength: 1000
})
```

### Retry Middleware

```typescript
eventBus.withRetry({
  enabled: true,
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2
})
```

### Metrics Middleware

```typescript
eventBus.withMetrics({
  enabled: true,
  maxRecentEvents: 100,
  trackErrorTypes: true
})
```

## Configuration

### Environment Variables

```env
# Event Bus Configuration
EVENT_BUS_ADAPTER=redis
EVENT_BUS_REDIS_URL=redis://localhost:6379
EVENT_BUS_RABBITMQ_URL=amqp://localhost:5672

# Redis Configuration
EVENT_BUS_REDIS_HOST=localhost
EVENT_BUS_REDIS_PORT=6379
EVENT_BUS_REDIS_PASSWORD=
EVENT_BUS_REDIS_DB=0
EVENT_BUS_REDIS_KEY_PREFIX=events:

# RabbitMQ Configuration
EVENT_BUS_RABBITMQ_HOST=localhost
EVENT_BUS_RABBITMQ_PORT=5672
EVENT_BUS_RABBITMQ_USERNAME=guest
EVENT_BUS_RABBITMQ_PASSWORD=guest
EVENT_BUS_RABBITMQ_EXCHANGE=events
EVENT_BUS_RABBITMQ_DLX=events.dlx
```

## Health Monitoring

### Health Check Endpoint

```
GET /api/v1/health/event-bus
```

Response:
```json
{
  "health": {
    "status": "healthy",
    "adapter": "redis",
    "uptime": 123456,
    "lastCheck": "2024-01-01T00:00:00.000Z"
  },
  "stats": {
    "adapter": "redis",
    "publishedCount": 1000,
    "consumedCount": 950,
    "errorCount": 5,
    "activeSubscriptions": 10,
    "uptime": 123456
  },
  "metrics": {
    "summary": {
      "totalEvents": 1000,
      "successRate": "95.00%",
      "averageDuration": "45.32ms",
      "errorCount": 5
    }
  }
}
```

### Programmatic Health Check

```typescript
const health = await fastify.eventBus.health()
const stats = fastify.eventBus.getStats()
const metrics = fastify.eventBus.getMiddlewareMetrics()
```

## Common Patterns

### Event-Driven Workflow

```typescript
// Step 1: User registers
await eventBus.subscribe('user.registered', async (data) => {
  const profileId = await createUserProfile(data.userId)
  await eventBus.publish('profile.created', { userId: data.userId, profileId })
})

// Step 2: Profile created
await eventBus.subscribe('profile.created', async (data) => {
  await setupDefaultPreferences(data.userId)
  await eventBus.publish('user.onboarding.complete', { userId: data.userId })
})
```

### Cross-Service Communication

```typescript
// Service A: Publishes user update
await eventBus.publish('user.updated', {
  userId: '123',
  changes: ['email', 'firstName']
}, { persistent: true })

// Service B: Invalidates cache
await eventBus.subscribe('user.updated', async (data) => {
  await invalidateUserCache(data.userId)
})
```

### Scheduled Events

```typescript
// Schedule reminder
await eventBus.publish('appointment.reminder', {
  appointmentId: 'apt-123',
  patientId: 'patient-456'
}, {
  delay: 60 * 60 * 1000 // 1 hour delay
})
```

## Error Handling

### Retry Configuration

```typescript
await eventBus.withRetry({
  maxAttempts: 3,
  baseDelay: 1000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
  nonRetryableErrors: ['ValidationError']
})
```

### Dead Letter Queues (RabbitMQ)

Failed messages are automatically sent to the dead letter exchange for manual inspection and reprocessing.

## Best Practices

1. **Event Naming**: Use dot notation (e.g., `user.created`, `order.completed`)
2. **Event Versioning**: Include version in event type for schema evolution
3. **Correlation IDs**: Always include correlation IDs for tracing
4. **Idempotency**: Design handlers to be idempotent
5. **Error Handling**: Implement proper error handling and retry logic
6. **Monitoring**: Use health checks and metrics for observability

## Examples

See [usage-examples.ts](./examples/usage-examples.ts) for comprehensive examples of:
- Basic publishing and subscribing
- Event factories and builders
- Middleware usage
- Error handling
- Monitoring
- Cross-service communication