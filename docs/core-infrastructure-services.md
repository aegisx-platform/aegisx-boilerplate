# Core Infrastructure Services

This document provides an overview of the comprehensive core infrastructure services implemented in the AegisX Boilerplate.

## Overview

The core infrastructure includes enterprise-grade services for connection management, configuration validation, health monitoring, and retry mechanisms with healthcare compliance considerations.

## Services

### 1. Connection Pool Manager

**Location**: `apps/api/src/app/core/shared/services/connection-pool-manager.service.ts`

Manages database and Redis connection pools with monitoring and optimization.

#### Features
- Real-time connection pool monitoring
- Health checks for database and Redis
- Connection optimization and warm-up
- Event-driven monitoring
- Graceful shutdown handling

#### Usage
```typescript
// Get pool statistics
const stats = await fastify.connectionPool.getPoolStats();

// Perform health check
const health = await fastify.connectionPool.performHealthCheck();

// Optimize connections
await fastify.connectionPool.optimizeConnections();
```

#### Configuration
```typescript
interface ConnectionPoolConfig {
  database: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    // ... more options
  };
  redis: {
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    connectTimeout: number;
    // ... more options
  };
}
```

#### API Endpoints
- `GET /health/connections` - Connection health status
- `GET /stats/connections` - Detailed connection statistics

---

### 2. Config Validator Service

**Location**: `apps/api/src/app/core/shared/services/config-validator.service.ts`

Runtime configuration validation with comprehensive rule checking.

#### Features
- Multi-category validation (database, redis, security, environment)
- Connection testing
- Threshold monitoring
- Detailed reporting
- Event-driven validation

#### Usage
```typescript
// Validate all configuration
const result = await fastify.configValidator.validateConfiguration();

// Quick validation (errors only)
const isValid = await fastify.configValidator.validateConfigurationQuick();

// Generate human-readable report
const report = fastify.configValidator.generateConfigurationReport();
```

#### Validation Categories
- **Database**: Connection parameters, pool settings
- **Redis**: Connection settings, TTL configuration  
- **Security**: JWT secrets, password requirements, rate limiting
- **Environment**: NODE_ENV, port ranges, log levels

#### API Endpoints
- `GET /health/config` - Configuration health status
- `GET /validate/config` - Full configuration validation
- `GET /config/metrics` - Configuration metrics

---

### 3. Health Check Service

**Location**: `apps/api/src/app/core/shared/services/health-check.service.ts`

Comprehensive system health monitoring with metrics collection.

#### Features
- Multi-service health checking
- System metrics collection (CPU, memory, disk)
- Dependency monitoring
- Threshold-based alerting
- Caching for performance

#### Usage
```typescript
// Perform comprehensive health check
const health = await fastify.healthChecker.performHealthCheck();

// Get quick health status
const status = await fastify.healthChecker.getQuickHealthStatus();

// Generate health report
const report = fastify.healthChecker.generateHealthReport();
```

#### Monitored Services
- Database connection and response time
- Redis connection and response time
- Event Bus functionality
- HTTP Client availability
- Config Validator status
- Connection Pool health

#### API Endpoints
- `GET /health` - Simple health check
- `GET /health/comprehensive` - Full health with metrics
- `GET /health/report` - Human-readable health report
- `GET /ready` - Kubernetes readiness probe

---

### 4. Retry Service

**Location**: `apps/api/src/app/core/shared/services/retry.service.ts`

Enterprise-grade retry mechanism with exponential backoff and jitter.

#### Features
- Multiple retry strategies
- Exponential backoff with jitter
- Operation context tracking
- Metrics collection
- Concurrent retry limits
- Timeout handling
- Abort signal support

#### Usage
```typescript
// Simple retry with default strategy
const result = await fastify.retry(async () => {
  return await someOperation();
});

// Retry with context and custom strategy
const result = await fastify.retryWithContext(
  async () => await databaseQuery(),
  'user-lookup',
  'database',
  { userId: 123 }
);

// Direct service usage
const result = await fastify.retryService.execute({
  operation: async () => await apiCall(),
  strategy: 'api',
  context: { operationName: 'external-api-call' }
});
```

#### Built-in Strategies
- `aggressive` - 5 attempts, 500ms base delay (critical operations)
- `standard` - 3 attempts, 1s base delay (most operations)
- `conservative` - 2 attempts, 2s base delay (less critical)
- `quick` - 2 attempts, 200ms base delay (real-time operations)
- `database` - Optimized for database operations
- `api` - Optimized for API calls
- `external` - For external service integrations
- `critical` - 10 attempts for must-succeed operations
- `none` - No retry, fail fast

#### API Endpoints
- `GET /retry/strategies` - Available retry strategies
- `GET /retry/metrics` - Retry operation metrics
- `GET /retry/executions/:id` - Specific execution details
- `POST /retry/test` - Test retry operations
- `DELETE /retry/metrics` - Clear metrics

---

## Configuration

### Environment Variables

All services can be configured through environment variables:

```bash
# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=50
REDIS_TTL=900

# Config Validator
CONFIG_VALIDATION_ON_STARTUP=true
CONFIG_EXIT_ON_ERROR=true

# Health Check
HEALTH_CHECK_CACHE_TIMEOUT=5000
HEALTH_CHECK_ENABLE_DETAILED=true

# Retry Service
RETRY_DEFAULT_STRATEGY=standard
RETRY_MAX_CONCURRENT=100
RETRY_ENABLE_METRICS=true
```

### Plugin Options

Each service can be configured during plugin registration:

```typescript
// Connection Pool
await fastify.register(connectionPool, {
  config: {
    database: { min: 5, max: 20 },
    redis: { connectTimeout: 5000 }
  },
  monitoring: { enabled: true, interval: 30000 },
  warmUp: true
});

// Config Validator
await fastify.register(configValidator, {
  validateOnStartup: true,
  logResults: true,
  exitOnValidationError: false
});

// Health Check
await fastify.register(healthCheck, {
  enableAdvancedEndpoints: true,
  enableMetrics: true,
  config: {
    thresholds: {
      memory: { warning: 80, critical: 95 },
      cpu: { warning: 75, critical: 90 }
    }
  }
});

// Retry Service
await fastify.register(retryService, {
  config: {
    defaultStrategy: 'standard',
    maxConcurrentRetries: 50
  },
  enableRoutes: true,
  enableMetrics: true
});
```

---

## Integration

### Event System

All services emit events for monitoring and integration:

```typescript
// Connection Pool events
fastify.connectionPool.on('health-check-failed', (result) => {
  console.log('Connection health check failed:', result);
});

// Config Validator events
fastify.configValidator.on('validation-completed', (event) => {
  console.log('Configuration validated:', event.data.result.valid);
});

// Health Check events
fastify.healthChecker.on('threshold-exceeded', (event) => {
  console.log('Health thresholds exceeded:', event.data);
});

// Retry Service events
fastify.retryService.on('retry-failure', (event) => {
  console.log('Retry operation failed:', event.data);
});
```

### Logging Integration

All services integrate with the structured logging system:

```typescript
// Automatic logging of health checks, validations, and retry operations
// Logs include correlation IDs and structured data for monitoring
```

### Metrics Integration

Services provide metrics for monitoring dashboards:

```typescript
// Connection pool metrics
const poolStats = await fastify.connectionPool.getPoolStats();

// Config validation metrics  
const configMetrics = fastify.configValidator.getEnvironmentMetrics();

// Health check metrics
const healthMetrics = fastify.healthChecker.getLastHealthCheck();

// Retry metrics
const retryMetrics = fastify.retryService.getMetrics();
```

---

## Monitoring and Alerting

### Health Monitoring

The services provide comprehensive monitoring endpoints:

- **Liveness**: `/health` - Basic application health
- **Readiness**: `/ready` - Service readiness for traffic
- **Deep Health**: `/health/comprehensive` - Full system health with metrics

### Metrics Collection

Metrics are collected for:
- Connection pool utilization
- Configuration validation results
- System resource usage
- Retry operation success rates
- Service response times

### Alerting Integration

Services emit events that can be used for alerting:
- Health check failures
- Configuration validation errors
- Resource threshold violations
- Retry operation failures

---

## Healthcare Compliance

### HIPAA Considerations

The services include healthcare-specific features:
- Audit logging for configuration changes
- Secure connection handling
- Data sanitization in logs
- Compliance-ready monitoring

### Security Features

- Configuration validation for production security
- Connection pool security monitoring
- Health check access controls
- Retry operation audit trails

---

## Performance Optimization

### Caching Strategies

- Health check result caching (5-second TTL)
- Configuration validation caching
- Connection pool statistics caching

### Resource Management

- Connection pool optimization
- Concurrent retry limits
- Memory usage monitoring
- CPU usage monitoring

### Scalability Features

- Horizontal scaling support
- Load balancing considerations
- Resource threshold monitoring
- Graceful degradation

---

## Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   - Monitor `/stats/connections`
   - Check pool configuration
   - Review connection leaks

2. **Configuration Validation Failures**
   - Review `/validate/config` output
   - Check environment variables
   - Validate configuration syntax

3. **Health Check Failures**
   - Check `/health/comprehensive`
   - Review dependency status
   - Monitor system resources

4. **Retry Operation Failures**
   - Review `/retry/metrics`
   - Check retry strategies
   - Monitor concurrent limits

### Debug Endpoints

- `/health/connections` - Connection status
- `/health/config` - Configuration health
- `/health/comprehensive` - Full system health
- `/retry/metrics` - Retry operation metrics
- `/stats/connections` - Connection statistics

---

## Migration Guide

When upgrading from basic health checks to the comprehensive infrastructure:

1. Update plugin registrations
2. Configure new environment variables
3. Update monitoring dashboards
4. Implement new alert rules
5. Test health check endpoints
6. Validate configuration validation
7. Test retry operations

---

## Best Practices

1. **Configuration**
   - Validate configuration on startup
   - Use environment-specific settings
   - Monitor configuration changes

2. **Health Monitoring**
   - Implement proper health check endpoints
   - Monitor resource thresholds
   - Set up alerting

3. **Retry Operations**
   - Choose appropriate retry strategies
   - Monitor retry metrics
   - Implement circuit breakers

4. **Connection Management**
   - Monitor pool utilization
   - Implement connection warming
   - Handle graceful shutdowns

5. **Security**
   - Validate security configurations
   - Monitor access patterns
   - Implement audit logging