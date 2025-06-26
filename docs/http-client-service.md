# 🌐 HTTP Client Service - AegisX Boilerplate

## Overview

The HTTP Client Service is an enterprise-grade HTTP client built for the AegisX platform, providing robust external API communication with automatic retry, circuit breaker, caching, and comprehensive monitoring capabilities.

## 🚀 Features

### Reliability & Performance
- **Automatic Retry** with exponential backoff and jitter
- **Circuit Breaker** pattern to prevent cascade failures
- **Request/Response Caching** with TTL and tag-based invalidation
- **Connection Pooling** for optimal resource usage
- **Configurable Timeouts** per request or globally

### Observability & Monitoring
- **Comprehensive Logging** for requests, responses, and errors
- **Performance Metrics** tracking response times and success rates
- **Health Check Endpoints** for monitoring service health
- **Error Classification** with specific error types
- **Request/Response Interceptors** for custom processing

### Security & Authentication
- **Bearer Token Authentication** for JWT-based APIs
- **API Key Authentication** for service-to-service communication
- **Basic Authentication** for legacy systems
- **Request Sanitization** and validation

### Developer Experience
- **Fluent API** for easy configuration chaining
- **Pre-configured Factories** for common use cases
- **Full TypeScript Support** with comprehensive types
- **Extensive Examples** for real-world scenarios

## 📋 Quick Start

### Basic Usage

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'

export async function getUserData(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Use the default HTTP client
    const response = await request.server.httpClient.get('/users/123')
    
    return {
      user: response.data,
      cached: response.cached,
      duration: response.duration
    }
  } catch (error) {
    request.log.error('Failed to fetch user data:', error.message)
    throw error
  }
}
```

### Fluent API Configuration

```typescript
const response = await request.server.httpClient
  .withAuth('your-jwt-token', 'bearer')
  .withRetry({ attempts: 3, backoff: 'exponential' })
  .withTimeout(10000)
  .withCache({ ttl: 300000, tags: ['users'] })
  .get('/protected-resource')
```

## 🏭 Factory Methods

### Pre-configured Clients

#### External API Integration
```typescript
const externalClient = request.server.httpClientFactory.createForExternalAPI({
  baseURL: 'https://api.external.com',
  apiKey: process.env.EXTERNAL_API_KEY,
  timeout: 15000
})

const data = await externalClient.get('/endpoint')
```

#### Payment Operations
```typescript
const paymentClient = request.server.httpClientFactory.createForPayment({
  baseURL: 'https://payment-gateway.com',
  apiKey: process.env.PAYMENT_API_KEY
})

const payment = await paymentClient.post('/charges', {
  amount: 10000,
  currency: 'THB'
})
```

#### Healthcare/HIPAA Compliance
```typescript
const healthcareClient = request.server.httpClientFactory.createForHealthcare({
  baseURL: 'https://healthcare-api.com',
  bearerToken: process.env.HEALTHCARE_TOKEN
})

const patient = await healthcareClient.get('/patients/123', {
  headers: {
    'X-Audit-User': 'doctor_001',
    'X-Audit-Reason': 'treatment_review'
  }
})
```

#### Microservice Communication
```typescript
const userService = request.server.httpClientFactory.createForMicroservice({
  baseURL: 'http://user-service:3001',
  serviceName: 'user-service'
})

const user = await userService.get('/users/123')
```

## ⚙️ Configuration

### Environment Variables

```bash
# Basic Configuration
HTTP_CLIENT_TIMEOUT=30000                          # Request timeout in ms
HTTP_CLIENT_RETRY_ATTEMPTS=3                       # Number of retry attempts
HTTP_CLIENT_RETRY_DELAY=1000                      # Base retry delay in ms

# Circuit Breaker Configuration
HTTP_CLIENT_CIRCUIT_BREAKER_ENABLED=true          # Enable circuit breaker
HTTP_CLIENT_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5   # Failures before opening
HTTP_CLIENT_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3   # Successes to close
HTTP_CLIENT_CIRCUIT_BREAKER_TIMEOUT=60000         # Time before retry in ms

# Caching Configuration
HTTP_CLIENT_CACHE_ENABLED=false                   # Enable response caching
HTTP_CLIENT_CACHE_TTL=300000                      # Default cache TTL in ms

# Logging Configuration
HTTP_CLIENT_LOGGING_REQUESTS=false                # Log requests
HTTP_CLIENT_LOGGING_RESPONSES=false               # Log responses
HTTP_CLIENT_LOGGING_ERRORS=true                   # Log errors
```

### Plugin Configuration

```typescript
// In your application setup
await fastify.register(httpClientPlugin, {
  config: {
    timeout: 30000,
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential'
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      timeout: 60000
    }
  },
  
  // Named clients for specific use cases
  clients: {
    payment: {
      config: {
        baseURL: 'https://payment-api.com',
        auth: {
          type: 'api-key',
          apiKey: process.env.PAYMENT_API_KEY
        }
      },
      factory: 'createForPayment'
    },
    
    notifications: {
      config: {
        baseURL: 'https://notification-service.com',
        timeout: 5000
      }
    }
  },
  
  // Environment-specific settings
  environment: 'production',
  
  // Enable monitoring endpoints
  enableHealthCheck: true,
  enableMetrics: true
})
```

## 🔄 Retry Strategies

### Predefined Strategies

```typescript
import { RetryStrategies } from './http-client.types'

// Aggressive retry for critical operations
const client = request.server.httpClientFactory.createWithRetryStrategy(
  { baseURL: 'https://critical-api.com' },
  'AGGRESSIVE'  // 5 attempts, exponential backoff
)

// Conservative retry for less critical operations
const client = request.server.httpClientFactory.createWithRetryStrategy(
  { baseURL: 'https://optional-api.com' },
  'CONSERVATIVE'  // 2 attempts, linear backoff
)

// Quick retry for real-time operations
const client = request.server.httpClientFactory.createWithRetryStrategy(
  { baseURL: 'https://realtime-api.com' },
  'QUICK'  // 2 attempts, fixed delay
)
```

### Custom Retry Configuration

```typescript
const customClient = request.server.createHttpClient({
  baseURL: 'https://api.example.com',
  retry: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential',
    jitter: true,
    maxDelay: 30000,
    retryCondition: (error) => {
      // Custom retry logic
      if (!error.status) return true // Network error
      if (error.status === 429) return true // Rate limit
      if (error.status >= 500) return true // Server error
      return false
    },
    onRetry: (error, attempt) => {
      fastify.log.warn(`Retry attempt ${attempt}: ${error.message}`)
    }
  }
})
```

## 🔀 Circuit Breaker

### How It Works

The circuit breaker monitors the failure rate of requests and automatically:

1. **Closed State**: Normal operation, requests pass through
2. **Open State**: After threshold failures, block requests for timeout period
3. **Half-Open State**: Allow limited requests to test if service recovered

### Configuration

```typescript
const client = request.server.createHttpClient({
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,     // Open after 5 failures
    successThreshold: 3,     // Close after 3 successes
    timeout: 60000,          // Stay open for 1 minute
    monitoringPeriod: 10000  // Monitor failures over 10 seconds
  }
})
```

### Monitoring Circuit Breaker

```typescript
// Check circuit breaker status
const stats = client.getStats()
console.log('Circuit breaker states:', stats.circuitBreakerStats)

// Reset circuit breaker manually
client.resetCircuitBreaker('https://api.example.com')

// Check if endpoint is healthy
const isHealthy = client.isHealthy('https://api.example.com')
```

## 💾 Caching

### Basic Caching

```typescript
// Enable caching for GET requests
const response = await client.get('/data', {
  cache: {
    ttl: 600000,  // 10 minutes
    tags: ['users', 'public-data']
  }
})

console.log('From cache:', response.cached)
```

### Cache Management

```typescript
// Clear specific cache tags
await client.clearCache(['users'])

// Clear all cache
await client.clearCache()

// Cache with custom key
const response = await client.get('/user-profile', {
  cache: {
    key: `user-profile-${userId}`,
    ttl: 300000,
    tags: ['user-profiles']
  }
})
```

## 🔍 Error Handling

### Error Types

The HTTP client provides specific error types for better error handling:

```typescript
import {
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  CircuitBreakerOpenError
} from './http-client.types'

try {
  const response = await client.get('/api/data')
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network connectivity issues
    fastify.log.error('Network error:', error.message)
  } else if (error instanceof TimeoutError) {
    // Handle request timeouts
    fastify.log.warn('Request timeout:', error.message)
  } else if (error instanceof AuthenticationError) {
    // Handle authentication failures
    fastify.log.error('Authentication failed:', error.message)
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting with retry after
    const retryAfter = error.retryAfter
    fastify.log.warn(`Rate limited. Retry after: ${retryAfter}ms`)
  } else if (error instanceof CircuitBreakerOpenError) {
    // Handle circuit breaker open state
    fastify.log.warn('Circuit breaker open, using fallback')
  }
}
```

## 🎯 Interceptors

### Request Interceptors

```typescript
// Add authentication to all requests
client.addRequestInterceptor(async (config) => {
  const token = await getAuthToken()
  config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Add correlation ID
client.addRequestInterceptor(async (config) => {
  config.headers['X-Correlation-ID'] = generateCorrelationId()
  return config
})
```

### Response Interceptors

```typescript
// Log response times
client.addResponseInterceptor(async (response) => {
  if (response.duration > 5000) {
    fastify.log.warn(`Slow response: ${response.duration}ms`)
  }
  return response
})

// Transform response data
client.addResponseInterceptor(async (response) => {
  if (response.data && response.data.items) {
    response.data.items = response.data.items.map(transformItem)
  }
  return response
})
```

### Error Interceptors

```typescript
// Send errors to monitoring service
client.addErrorInterceptor(async (error) => {
  await sendErrorToMonitoring({
    message: error.message,
    status: error.status,
    url: error.config?.url,
    timestamp: new Date().toISOString()
  })
})
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
GET /health/http-clients
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "clients": {
    "default": {
      "healthy": true,
      "stats": {
        "totalRequests": 1000,
        "totalSuccesses": 950,
        "totalFailures": 50,
        "averageResponseTime": 250
      },
      "circuitBreakers": {
        "api.example.com:443": {
          "state": "closed",
          "failures": 0,
          "successes": 10
        }
      }
    }
  }
}
```

### Metrics Endpoint

```bash
GET /metrics/http-clients
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "clients": {
    "default": {
      "totalRequests": 1000,
      "totalSuccesses": 950,
      "totalFailures": 50,
      "totalRetries": 25,
      "averageResponseTime": 250,
      "cacheHitRate": 0.3,
      "errorsByType": {
        "NetworkError": 20,
        "TimeoutError": 15,
        "ServerError": 15
      }
    }
  },
  "aggregate": {
    "totalRequests": 1000,
    "totalSuccesses": 950,
    "totalFailures": 50,
    "averageResponseTime": 250
  }
}
```

### Admin Endpoints

#### Reset Circuit Breaker
```bash
POST /admin/http-clients/circuit-breaker/reset
Content-Type: application/json

{
  "client": "payment",  # Optional: specific client
  "url": "https://api.example.com"  # Optional: specific URL
}
```

#### Clear Cache
```bash
DELETE /admin/http-clients/cache
Content-Type: application/json

{
  "client": "default",  # Optional: specific client
  "tags": ["users", "profiles"]  # Optional: specific tags
}
```

## 🧪 Testing

### Mock HTTP Client for Testing

```typescript
import { jest } from '@jest/globals'

// Mock the HTTP client in tests
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  withAuth: jest.fn().mockReturnThis(),
  withRetry: jest.fn().mockReturnThis(),
  withTimeout: jest.fn().mockReturnThis()
}

// In your test
describe('User Service', () => {
  beforeEach(() => {
    // Mock successful response
    mockHttpClient.get.mockResolvedValue({
      data: { id: 1, name: 'John Doe' },
      status: 200,
      duration: 100,
      cached: false
    })
  })

  it('should fetch user data', async () => {
    const userData = await userService.getUser(1)
    
    expect(mockHttpClient.get).toHaveBeenCalledWith('/users/1')
    expect(userData.name).toBe('John Doe')
  })
})
```

### Integration Testing

```typescript
import { test } from 'tap'
import { build } from '../helper'

test('HTTP client integration', async (t) => {
  const app = await build()

  // Test health check endpoint
  const healthResponse = await app.inject({
    method: 'GET',
    url: '/health/http-clients'
  })

  t.equal(healthResponse.statusCode, 200)
  const health = JSON.parse(healthResponse.payload)
  t.equal(health.status, 'healthy')

  // Test metrics endpoint
  const metricsResponse = await app.inject({
    method: 'GET',
    url: '/metrics/http-clients'
  })

  t.equal(metricsResponse.statusCode, 200)
  const metrics = JSON.parse(metricsResponse.payload)
  t.ok(metrics.clients.default)
})
```

## 🚀 Use Cases & Examples

### Payment Processing

```typescript
async function processPayment(paymentData: PaymentRequest) {
  const paymentClient = request.server.paymentHttpClient

  try {
    const charge = await paymentClient
      .withRetry({ attempts: 2, retryCondition: RetryConditions.NETWORK_ONLY })
      .withTimeout(30000)
      .post('/charges', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        source: paymentData.cardToken,
        description: paymentData.description
      })

    return {
      success: true,
      chargeId: charge.data.id,
      status: charge.data.status
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Handle rate limiting
      throw new Error(`Payment service rate limited. Retry after ${error.retryAfter}ms`)
    }
    
    throw new Error(`Payment failed: ${error.message}`)
  }
}
```

### Healthcare Data Integration

```typescript
async function getPatientRecords(patientId: string, doctorId: string) {
  const healthcareClient = request.server.httpClientFactory.createForHealthcare({
    baseURL: process.env.HEALTHCARE_API_URL,
    bearerToken: await getHealthcareToken()
  })

  try {
    const records = await healthcareClient
      .withCache({ ttl: 300000, tags: ['patient-records'] })
      .get(`/patients/${patientId}/records`, {
        headers: {
          'X-Requesting-Doctor': doctorId,
          'X-HIPAA-Audit': 'true'
        }
      })

    // Automatically sanitized by Fluent Bit if enabled
    return records.data
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new Error('Doctor not authorized to access patient records')
    }
    throw error
  }
}
```

### Microservice Communication

```typescript
async function getUserWithOrders(userId: string) {
  const userService = request.server.httpClientFactory.createForMicroservice({
    baseURL: 'http://user-service:3001',
    serviceName: 'user-service'
  })

  const orderService = request.server.httpClientFactory.createForMicroservice({
    baseURL: 'http://order-service:3002',
    serviceName: 'order-service'
  })

  try {
    // Parallel requests with circuit breaker protection
    const [user, orders] = await Promise.all([
      userService.get(`/users/${userId}`),
      orderService.get(`/users/${userId}/orders`)
    ])

    return {
      user: user.data,
      orders: orders.data,
      metadata: {
        userCached: user.cached,
        ordersCached: orders.cached,
        totalDuration: user.duration + orders.duration
      }
    }
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      // Fallback to cached data or degraded service
      return await getFallbackUserData(userId)
    }
    throw error
  }
}
```

## 📈 Performance Optimization

### Connection Pooling

The HTTP client automatically manages connection pooling using axios built-in pooling:

```typescript
// Connection pooling is automatically configured
const client = request.server.createHttpClient({
  baseURL: 'https://api.example.com',
  // Axios automatically handles connection pooling
  // Keep-alive connections are reused
})
```

### Request Batching

```typescript
// Batch multiple requests efficiently
async function batchRequests() {
  const client = request.server.httpClient

  // Use Promise.all for parallel requests
  const [users, products, orders] = await Promise.all([
    client.get('/users'),
    client.get('/products'),
    client.get('/orders')
  ])

  return {
    users: users.data,
    products: products.data,
    orders: orders.data
  }
}
```

### Response Streaming

```typescript
// For large responses, consider streaming
async function downloadLargeFile() {
  const response = await client.get('/large-file', {
    transformResponse: [(data) => data] // Don't parse JSON
  })

  // Handle streaming response
  return response.data
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Circuit Breaker Always Open
```typescript
// Check circuit breaker configuration
const stats = client.getStats()
console.log('Circuit breaker stats:', stats.circuitBreakerStats)

// Reset if needed
client.resetCircuitBreaker()

// Verify failure threshold isn't too low
const client = request.server.createHttpClient({
  circuitBreaker: {
    failureThreshold: 10,  // Increase threshold
    timeout: 30000         // Reduce timeout
  }
})
```

#### 2. Cache Not Working
```typescript
// Verify cache is enabled and HTTP method is GET
const response = await client.get('/data', {
  cache: { 
    ttl: 300000,
    key: 'custom-key'  // Use custom key if needed
  }
})

// Check if response was cached
console.log('From cache:', response.cached)
```

#### 3. Retry Not Working
```typescript
// Verify retry condition
const client = request.server.createHttpClient({
  retry: {
    attempts: 3,
    retryCondition: (error) => {
      console.log('Error status:', error.status)
      return error.status >= 500  // Only retry server errors
    }
  }
})
```

#### 4. High Memory Usage
```typescript
// Clear cache periodically
setInterval(async () => {
  await client.clearCache()
}, 3600000)  // Clear every hour

// Reduce cache TTL
const client = request.server.createHttpClient({
  cache: {
    enabled: true,
    defaultTtl: 60000  // 1 minute instead of 5
  }
})
```

## 📚 Best Practices

### 1. Error Handling
- Always handle specific error types
- Implement fallback mechanisms for critical operations
- Log errors with sufficient context

### 2. Performance
- Use caching for frequently accessed data
- Implement proper retry strategies
- Monitor circuit breaker states

### 3. Security
- Never log sensitive data in requests/responses
- Use appropriate authentication methods
- Validate and sanitize all inputs

### 4. Monitoring
- Monitor success rates and response times
- Set up alerts for circuit breaker state changes
- Track cache hit rates

### 5. Configuration
- Use environment-specific configurations
- Start with conservative settings in production
- Tune based on actual usage patterns

---

## 🔗 Related Documentation

- [API Documentation](./api-documentation.md)
- [Security Guide](./security-guide.md)
- [Monitoring Guide](./monitoring-guide.md)
- [Error Handling](./error-handling.md)