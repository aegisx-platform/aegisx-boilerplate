# Enterprise Infrastructure Services Catalog

Complete suite of 20+ production-ready services with healthcare compliance features.

## Core Communication & Processing

### HTTP Client Service
**Location**: `apps/api/src/app/core/shared/services/http-client.service.ts`  
**Access**: `fastify.httpClient`

Enterprise-grade HTTP client with:
- Automatic retry with exponential backoff
- Circuit breaker integration
- Request/response caching
- Comprehensive monitoring and metrics
- Timeout handling

### Event Bus System
**Location**: `apps/api/src/app/core/shared/events/`  
**Access**: `fastify.eventBus`

Cross-service communication with:
- Multi-adapter support (Memory, Redis, RabbitMQ)
- Middleware pipeline
- Event replay capability
- Dead letter queue support
- Performance monitoring

### Bull + RabbitMQ Queue System
**Location**: `apps/api/src/app/core/shared/services/`  
**Access**: `QueueFactory.create()`

Production-ready queue system featuring:
- **Bull Queue** (Redis): High-performance job processing
- **RabbitMQ**: Enterprise message broker with exchanges
- Unified interface for consistent API
- Job scheduling and recurring tasks
- Priority queues and dead letter handling
- Comprehensive monitoring dashboard

**Documentation**: `docs/bull-rabbitmq-queue-system.md`

## Security & Configuration

### Secrets Manager Service
**Location**: `apps/api/src/app/core/shared/services/secrets-manager.service.ts`  
**Access**: `fastify.secrets`

Secure credential management with:
- Encryption at rest
- Environment-based storage
- Automatic rotation support
- Audit trail for access
- HashiCorp Vault integration ready

### Config Validator Service
**Location**: `apps/api/src/app/core/shared/services/config-validator.service.ts`  
**Access**: `fastify.configValidator`

Runtime configuration validation with:
- Schema-based validation
- Environment variable checking
- Default value management
- Configuration hot-reload support
- Comprehensive error reporting

## Resilience & Monitoring

### Circuit Breaker Service
**Location**: `apps/api/src/app/core/shared/services/circuit-breaker.service.ts`  
**Access**: `fastify.circuitBreaker`

Prevent cascade failures with:
- Automatic failure detection
- Service isolation
- Fallback mechanisms
- Real-time state monitoring
- Configurable thresholds

### Error Tracker Service
**Location**: `apps/api/src/app/core/shared/services/error-tracker.service.ts`  
**Access**: `fastify.errorTracker`

Centralized error handling featuring:
- Error categorization
- Stack trace capture
- User context preservation
- Integration with monitoring tools
- Error trend analysis

### Health Check Service
**Location**: `apps/api/src/app/core/shared/services/health-check.service.ts`  
**Access**: `fastify.healthCheck`

Comprehensive system monitoring with:
- Dependency health checks
- Custom check registration
- Graceful degradation support
- Health score calculation
- Kubernetes liveness/readiness probes

### Retry Service
**Location**: `apps/api/src/app/core/shared/services/retry.service.ts`  
**Access**: `fastify.retry`

Advanced retry mechanism with:
- Exponential backoff
- Jitter for distributed systems
- Circuit breaker integration
- Retry budget management
- Detailed retry metrics

## Performance & Storage

### Cache Manager Service
**Location**: `apps/api/src/app/core/shared/services/cache-manager.service.ts`  
**Access**: `fastify.cache`

Multi-level caching strategy with:
- Redis integration
- TTL management
- Cache invalidation patterns
- Compression support
- Cache statistics

### Connection Pool Manager
**Location**: `apps/api/src/app/core/shared/services/connection-pool-manager.service.ts`  
**Access**: `fastify.connectionPool`

Database/Redis connection optimization with:
- Connection pooling
- Health monitoring
- Automatic reconnection
- Pool statistics
- Resource leak detection

### Storage Service
**Location**: `apps/api/src/app/core/shared/services/storage.service.ts`  
**Access**: `fastify.storage`

Multi-provider file storage with:
- Local and MinIO (S3-compatible) support
- HIPAA compliance features
- Encryption at rest
- Automatic thumbnail generation
- Virus scanning integration

**Documentation**: `docs/storage-service.md`

### Image Processing Service
**Location**: `apps/api/src/app/core/shared/services/image-processing.service.ts`  
**Access**: `fastify.imageProcessing`

Comprehensive Sharp.js integration with:
- Resize, crop, rotate operations
- Format conversion (JPEG, PNG, WebP, AVIF)
- Watermarking and filters
- Metadata handling
- HIPAA-compliant processing

**Documentation**: `docs/image-processing-service.md`

## Business Features

### Template Engine Service
**Location**: `apps/api/src/app/core/shared/services/template-engine.service.ts`  
**Access**: `fastify.templates`

Email and document templating with:
- Handlebars integration
- Healthcare-specific helpers
- Multi-language support
- Template caching
- PDF generation support

### Custom Metrics Service
**Location**: `apps/api/src/app/core/shared/services/custom-metrics.service.ts`  
**Access**: `fastify.metrics`

Business metrics collection with:
- Custom metric types
- Real-time dashboards
- Alert thresholds
- Prometheus export
- Healthcare-specific metrics

### Queue Notification Service
**Location**: `apps/api/src/app/domains/notification/services/queue-notification-service.ts`  
**Access**: Through notification domain

Enterprise notification system with:
- Multi-channel support (Email, SMS, Push, Slack, Webhook, In-App)
- Automatic processing every 30 seconds
- Priority-based queue processing
- Bull + RabbitMQ integration
- Gmail SMTP support
- HIPAA compliance features

**Documentation**: `docs/notification-service.md`

### WebSocket Service
**Location**: `apps/api/src/app/core/shared/services/websocket.service.ts`  
**Access**: `fastify.websocketManager`

Real-time communication with:
- Connection management
- Channel subscriptions
- Authentication integration
- Auto-reconnection
- Message history

**Documentation**: `docs/websocket-service.md`

## Usage Examples

### Basic Service Usage
```typescript
// HTTP Client
const response = await fastify.httpClient.get('https://api.example.com/data');

// Event Bus
await fastify.eventBus.publish('user.created', { userId: 123 });

// Cache
await fastify.cache.set('user:123', userData, 3600);
const cached = await fastify.cache.get('user:123');

// Storage
const file = await fastify.storage.upload({
  file: buffer,
  filename: 'document.pdf',
  mimeType: 'application/pdf'
});

// Metrics
await fastify.metrics.recordEvent('user_registration', {
  userId: 123,
  plan: 'premium'
});
```

### Advanced Patterns
```typescript
// Circuit Breaker + Retry
const result = await fastify.circuitBreaker.execute(
  'external-api',
  async () => {
    return await fastify.retry.execute(
      () => fastify.httpClient.get('https://api.example.com/data'),
      { maxAttempts: 3, delay: 1000 }
    );
  }
);

// Queue Processing
const queue = await QueueFactory.create({
  broker: 'redis',
  name: 'notifications'
});

await queue.add('send-email', {
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'John' }
});

// Health Check Registration
fastify.healthCheck.register('database', async () => {
  const isHealthy = await checkDatabaseConnection();
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    message: isHealthy ? 'Database connected' : 'Database disconnected'
  };
});
```

## Service Dependencies

Most services have dependencies on other core services:

- **HTTP Client** → Circuit Breaker, Retry, Cache
- **Storage** → Image Processing, Audit, Cache
- **Notification** → Queue System, Template Engine, Audit
- **Queue System** → Redis/RabbitMQ, Health Check, Metrics
- **All Services** → Structured Logging, Error Tracker, Metrics

## Best Practices

1. **Always use existing services** instead of creating new ones
2. **Check service health** before critical operations
3. **Use circuit breakers** for external service calls
4. **Implement proper error handling** with the Error Tracker
5. **Add metrics** for business-critical operations
6. **Cache appropriately** to reduce load
7. **Use queues** for long-running operations
8. **Monitor service performance** through metrics