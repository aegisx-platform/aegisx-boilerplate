# Circuit Breaker Service Documentation

## Overview

The Circuit Breaker Service implements the circuit breaker pattern to prevent cascade failures and provide fault tolerance in distributed systems. It automatically detects service failures and prevents the application from repeatedly trying to execute operations that are likely to fail, thereby improving system stability and response times.

## Features

### Core Features
- **Automatic Failure Detection**: Monitors operation success/failure rates
- **State Management**: CLOSED, OPEN, HALF_OPEN, FORCED_OPEN, FORCED_CLOSED states
- **Configurable Thresholds**: Customizable failure and success thresholds
- **Exponential Backoff**: Intelligent retry timing with exponential backoff
- **Real-time Monitoring**: Health checks, metrics, and performance tracking
- **Event-Driven Architecture**: Comprehensive event system for monitoring

### Healthcare-Specific Features
- **HIPAA Compliance**: Healthcare-compliant audit trails and data handling
- **Patient Safety Mode**: Extra safety checks for patient-critical operations
- **Emergency Bypass**: Emergency access for critical healthcare situations
- **Facility Isolation**: Isolate failures by healthcare facility

### Advanced Features
- **Multiple Circuit Breakers**: Central management of multiple breakers
- **Template-Based Configuration**: Pre-configured templates for common use cases
- **Bulk Operations**: Manage multiple circuit breakers simultaneously
- **Performance Metrics**: P95, P99 response times and throughput tracking
- **Global Health Monitoring**: System-wide health assessment

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Circuit Breaker     │    │ Circuit Breaker     │    │ Circuit Breaker     │
│ Manager             │────│ Service             │────│ Factory             │
│                     │    │                     │    │                     │
│ - Global Management │    │ - State Machine     │    │ - Pre-configurations│
│ - Health Monitoring │    │ - Failure Detection │    │ - Templates        │
│ - Bulk Operations   │    │ - Event Emission    │    │ - Environment Setup │
│ - Statistics        │    │ - Metrics Collection│    │ - Healthcare Setups │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Quick Start

### 1. Basic Setup

```typescript
import { CircuitBreakerFactory } from '@core/shared/services/circuit-breaker.factory'

// Create circuit breaker manager for development
const manager = CircuitBreakerFactory.createForDevelopment()

// Initialize the manager
await manager.initialize()

// Create a basic circuit breaker
const breaker = manager.create('api-service', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  resetTimeout: 60000
})
```

### 2. Execute Operations

```typescript
// Execute with circuit breaker protection
try {
  const result = await breaker.execute(async () => {
    // Your operation here
    return await apiService.getData()
  })
  
  console.log('Operation successful:', result)
} catch (error) {
  if (error.code === 'CIRCUIT_OPEN') {
    console.log('Circuit breaker is open - using fallback')
    // Handle fallback logic
  } else {
    console.error('Operation failed:', error)
  }
}
```

### 3. Monitor Health

```typescript
// Check circuit breaker health
const health = breaker.getHealth()
console.log(`Circuit breaker health: ${health.status}`)
console.log(`Health score: ${health.healthScore}`)

// Get statistics
const stats = breaker.getStats()
console.log(`Failure rate: ${stats.failureRate}%`)
console.log(`Average response time: ${stats.averageResponseTime}ms`)
```

## Configuration

### Basic Configuration

```typescript
const config = {
  // Failure detection
  failureThreshold: 5,        // Number of failures before opening
  successThreshold: 3,        // Number of successes to close from half-open
  timeout: 10000,             // Operation timeout (ms)
  
  // Timing
  resetTimeout: 60000,        // Time before attempting to close (ms)
  monitoringPeriod: 300000,   // Window for failure counting (ms)
  
  // Volume and percentage thresholds
  volumeThreshold: 10,        // Minimum calls before circuit can trip
  errorPercentageThreshold: 50, // Percentage of errors to trip circuit
  
  // Performance monitoring
  slowCallDurationThreshold: 5000, // Duration considered as slow call (ms)
  slowCallRateThreshold: 30,  // Percentage of slow calls to trip circuit
  
  // Exponential backoff
  exponentialBackoff: true,   // Enable exponential backoff
  maxResetTimeout: 300000,    // Maximum reset timeout (ms)
  backoffMultiplier: 2,       // Multiplier for exponential backoff
  
  // Metrics
  enableMetrics: true,        // Enable performance metrics
  metricsWindowSize: 100,     // Number of recent calls to track
  metricsInterval: 60000      // Metrics collection interval (ms)
}
```

### Healthcare Configuration

```typescript
const healthcareConfig = {
  ...basicConfig,
  healthcare: {
    patientSafetyMode: true,    // Extra safety for patient data
    emergencyBypass: true,      // Allow bypass in emergencies
    auditFailures: true         // Audit all failures
  }
}
```

## Usage Examples

### 1. Database Operations

```typescript
// Create database circuit breaker
const dbBreaker = CircuitBreakerFactory.createDatabaseBreaker(manager, 'user-database')

// Execute database operation
const user = await dbBreaker.execute(async () => {
  return await userRepository.findById(userId)
}, {
  operationName: 'findUserById',
  timeout: 30000,
  metadata: { userId }
})
```

### 2. External API Calls

```typescript
// Create API circuit breaker
const apiBreaker = CircuitBreakerFactory.createApiBreaker(manager, 'payment-gateway')

// Execute API call with context
const payment = await apiBreaker.execute(async () => {
  return await paymentGateway.processPayment(paymentData)
}, {
  operationName: 'processPayment',
  priority: 'high',
  requestId: correlationId,
  metadata: { amount: paymentData.amount }
})
```

### 3. Healthcare Operations

```typescript
// Create healthcare-specific circuit breaker
const patientBreaker = CircuitBreakerFactory.createHealthcareCriticalBreaker(
  manager, 
  'patient-records'
)

// Execute patient data operation
const patientRecord = await patientBreaker.execute(async () => {
  return await patientService.getRecord(patientId)
}, {
  operationName: 'getPatientRecord',
  patientId: 'PAT_001',
  facilityId: 'FACILITY_001',
  isEmergency: false
})
```

### 4. Bulk Operations

```typescript
// Execute multiple operations with circuit breaker
const bulkResults = await Promise.allSettled([
  manager.executeWithBreaker('api-service-1', () => api1.getData()),
  manager.executeWithBreaker('api-service-2', () => api2.getData()),
  manager.executeWithBreaker('database', () => db.query('SELECT * FROM users'))
])

bulkResults.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Operation ${index} succeeded:`, result.value)
  } else {
    console.log(`Operation ${index} failed:`, result.reason)
  }
})
```

## Templates and Pre-configurations

### Built-in Templates

```typescript
// Database operations template
const dbBreaker = manager.createFromTemplate('my-database', 'DATABASE')

// External API calls template
const apiBreaker = manager.createFromTemplate('external-api', 'API_CALL')

// Healthcare critical operations template
const healthcareBreaker = manager.createFromTemplate('patient-data', 'HEALTHCARE_CRITICAL')

// Payment processing template
const paymentBreaker = manager.createFromTemplate('payment-gateway', 'PAYMENT')

// Notification services template
const notificationBreaker = manager.createFromTemplate('email-service', 'NOTIFICATION')
```

### Environment-Based Setup

```typescript
// Development environment
const devManager = CircuitBreakerFactory.createForDevelopment()

// Production environment
const prodManager = CircuitBreakerFactory.createForProduction({
  maxBreakers: 200,
  healthCheckInterval: 30000,
  persistMetrics: true
})

// Healthcare environment
const healthcareManager = CircuitBreakerFactory.createForHealthcare({
  emergencyBypassCode: 'EMERGENCY_2024',
  facilityIsolation: true
})

// From environment variables
const envManager = CircuitBreakerFactory.createFromEnvironment()
```

## Monitoring and Health Checks

### Health Monitoring

```typescript
// Individual circuit breaker health
const health = breaker.getHealth()
console.log(`Status: ${health.status}`) // UP, DOWN, DEGRADED, UNKNOWN
console.log(`Health Score: ${health.healthScore}`) // 0-100
console.log(`Is Healthy: ${health.isHealthy}`)

// Health indicators
console.log('Failure Rate:', health.indicators.failureRate)
console.log('Response Time:', health.indicators.responseTime)
console.log('Availability:', health.indicators.availability)

// Issues and recommendations
if (health.issues) {
  console.log('Issues:', health.issues)
}
if (health.recommendations) {
  console.log('Recommendations:', health.recommendations)
}
```

### Global Health Monitoring

```typescript
// Global system health
const globalHealth = manager.getGlobalHealth()
console.log(`Overall Health: ${globalHealth.overallHealth}`) // HEALTHY, DEGRADED, CRITICAL
console.log(`Health Score: ${globalHealth.healthScore}`)
console.log(`Healthy Breakers: ${globalHealth.healthyBreakers}`)
console.log(`Unhealthy Breakers: ${globalHealth.unhealthyBreakers}`)

// Cascade failure risk assessment
console.log(`Cascade Failure Risk: ${globalHealth.systemStatus.cascadeFailureRisk}`)
globalHealth.systemStatus.recommendedActions.forEach(action => {
  console.log(`Recommended Action: ${action}`)
})
```

### Statistics and Metrics

```typescript
// Circuit breaker statistics
const stats = breaker.getStats()
console.log(`Total Calls: ${stats.totalCalls}`)
console.log(`Success Rate: ${stats.successRate}%`)
console.log(`Failure Rate: ${stats.failureRate}%`)
console.log(`Average Response Time: ${stats.averageResponseTime}ms`)
console.log(`Current State: ${stats.state}`)

// Global statistics
const globalStats = manager.getGlobalStats()
console.log(`Total Breakers: ${globalStats.totalBreakers}`)
console.log('Breakers by State:', globalStats.breakersByState)
console.log('Top Failing Breakers:', globalStats.topFailingBreakers)
```

## Event Handling

### Circuit Breaker Events

```typescript
// Listen to circuit breaker events
breaker.on('state-changed', (event) => {
  console.log(`Circuit breaker ${event.breakerName} state changed to ${event.state}`)
})

breaker.on('circuit-opened', (event) => {
  console.log(`Circuit breaker ${event.breakerName} opened due to failures`)
  // Trigger alerts, notifications, etc.
})

breaker.on('circuit-closed', (event) => {
  console.log(`Circuit breaker ${event.breakerName} closed - service recovered`)
})

breaker.on('call-failed', (event) => {
  console.log(`Operation failed in ${event.breakerName}:`, event.error)
})

breaker.on('emergency-bypass', (event) => {
  console.log(`Emergency bypass activated for ${event.breakerName}`)
  // Log for audit trail
})
```

### Manager Events

```typescript
// Listen to manager events
manager.on('breaker-created', (event) => {
  console.log(`New circuit breaker created: ${event.name}`)
})

manager.on('global-health-check', (health) => {
  if (health.overallHealth === 'CRITICAL') {
    // Send critical alert
    alertService.sendCriticalAlert('Circuit breaker system in critical state')
  }
})

manager.on('critical-health-alert', (health) => {
  // Handle critical health alerts
  console.log('CRITICAL: Circuit breaker system requires immediate attention')
})
```

## Error Handling

### Circuit Breaker Errors

```typescript
try {
  const result = await breaker.execute(operation)
} catch (error) {
  switch (error.code) {
    case 'CIRCUIT_OPEN':
      // Circuit is open - use fallback
      return fallbackResponse
      
    case 'OPERATION_TIMEOUT':
      // Operation timed out
      console.log('Operation timed out, circuit breaker prevented hanging')
      throw new ServiceUnavailableError('Service timeout')
      
    case 'OPERATION_FAILED':
      // Operation failed but circuit is still closed
      console.log('Operation failed:', error.originalError)
      throw error.originalError
      
    case 'RATE_LIMIT_EXCEEDED':
      // Too many requests
      throw new RateLimitError('Too many requests')
      
    default:
      throw error
  }
}
```

### Error Filtering

```typescript
const breaker = manager.create('api-service', {
  // Filter which errors should be counted as failures
  errorFilter: (error) => {
    // Don't count 4xx client errors as circuit breaker failures
    if (error.status >= 400 && error.status < 500) {
      return false
    }
    return true
  },
  
  // Ignore specific error types
  ignoreErrors: ['ValidationError', 'AuthenticationError'],
  
  // Only record specific error types
  recordErrors: ['TimeoutError', 'ConnectionError', 'ServiceUnavailableError']
})
```

## Healthcare Use Cases

### 1. Patient Data Access

```typescript
// Create patient data circuit breaker with safety checks
const patientBreaker = CircuitBreakerFactory.createPatientDataBreaker(
  manager, 
  'FACILITY_001'
)

// Access patient data with safety context
const patientData = await patientBreaker.execute(async () => {
  return await patientService.getFullRecord(patientId)
}, {
  operationName: 'getPatientFullRecord',
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  userId: 'DOC_001',
  priority: 'high'
})
```

### 2. Medical Device Integration

```typescript
// Create medical device circuit breaker
const deviceBreaker = CircuitBreakerFactory.createMedicalDeviceBreaker(
  manager,
  'vital-signs-monitor'
)

// Read vital signs with circuit breaker protection
const vitalSigns = await deviceBreaker.execute(async () => {
  return await medicalDevice.readVitalSigns(patientId)
}, {
  operationName: 'readVitalSigns',
  patientId: 'PAT_12345',
  facilityId: 'FACILITY_001',
  isEmergency: false
})
```

### 3. Emergency Bypass

```typescript
// Execute with emergency bypass capability
const emergencyData = await manager.executeWithEmergencyBypass(
  'patient-records',
  async () => {
    return await emergencyService.getPatientEmergencyInfo(patientId)
  },
  {
    operationName: 'getEmergencyInfo',
    patientId: 'PAT_12345',
    facilityId: 'FACILITY_001',
    isEmergency: true,
    userId: 'EMERGENCY_001'
  },
  'EMERGENCY_2024' // Emergency bypass code
)
```

### 4. Laboratory Integration

```typescript
// Create lab integration circuit breaker
const labBreaker = CircuitBreakerFactory.createLabIntegrationBreaker(
  manager,
  'main-laboratory'
)

// Submit lab order with extended timeout
const labOrder = await labBreaker.execute(async () => {
  return await labSystem.submitOrder(orderData)
}, {
  operationName: 'submitLabOrder',
  patientId: orderData.patientId,
  facilityId: 'FACILITY_001',
  timeout: 120000 // 2 minutes for lab operations
})
```

## Environment Variables

Add these environment variables to configure circuit breakers:

```bash
# Basic Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
CIRCUIT_BREAKER_TIMEOUT=10000
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
CIRCUIT_BREAKER_MONITORING_PERIOD=300000

# Thresholds
CIRCUIT_BREAKER_VOLUME_THRESHOLD=10
CIRCUIT_BREAKER_ERROR_PERCENTAGE=50
CIRCUIT_BREAKER_SLOW_CALL_THRESHOLD=5000
CIRCUIT_BREAKER_SLOW_CALL_RATE=30

# Exponential Backoff
CIRCUIT_BREAKER_EXPONENTIAL_BACKOFF=true
CIRCUIT_BREAKER_MAX_RESET_TIMEOUT=300000
CIRCUIT_BREAKER_BACKOFF_MULTIPLIER=2

# Metrics
CIRCUIT_BREAKER_ENABLE_METRICS=true
CIRCUIT_BREAKER_METRICS_WINDOW_SIZE=100
CIRCUIT_BREAKER_METRICS_INTERVAL=60000

# Manager Configuration
CIRCUIT_BREAKER_MAX_BREAKERS=100
CIRCUIT_BREAKER_GLOBAL_TIMEOUT=60000
CIRCUIT_BREAKER_GLOBAL_METRICS=true
CIRCUIT_BREAKER_HEALTH_CHECK_INTERVAL=30000
CIRCUIT_BREAKER_CLEANUP_INTERVAL=300000
CIRCUIT_BREAKER_PERSIST_METRICS=true
CIRCUIT_BREAKER_METRICS_RETENTION=86400000

# Healthcare Configuration
CIRCUIT_BREAKER_HEALTHCARE_MODE=true
CIRCUIT_BREAKER_HEALTHCARE_AUDIT=true
CIRCUIT_BREAKER_EMERGENCY_CODE=EMERGENCY_2024
CIRCUIT_BREAKER_PATIENT_SAFETY=true
CIRCUIT_BREAKER_FACILITY_ISOLATION=false
```

## Integration with Other Services

### HTTP Client Integration

```typescript
import { httpClient } from '@core/shared/services/http-client.service'

// Create circuit breaker for HTTP client
const httpBreaker = manager.create('external-api', {
  timeout: 15000,
  failureThreshold: 3
})

// Use with HTTP client
const response = await httpBreaker.execute(async () => {
  return await httpClient.get('https://api.example.com/data', {
    timeout: 10000,
    retries: 0 // Let circuit breaker handle retries
  })
})
```

### Bull + RabbitMQ Queue System Integration

```typescript
import { queueService } from '@core/shared/services/bull-rabbitmq-queue.service'

// Add job with circuit breaker protection
await queueService.add('process-data', {
  patientId: 'PAT_001',
  dataType: 'lab-results'
}, {
  processor: async (job) => {
    // Use circuit breaker within job processor
    return await labBreaker.execute(async () => {
      return await labService.processResults(job.data)
    })
  }
})
```

### Secrets Manager Integration

```typescript
import { secretsManager } from '@core/shared/services/secrets-manager.service'

// Create circuit breaker for secrets access
const secretsBreaker = manager.create('secrets-manager', {
  timeout: 5000,
  failureThreshold: 2
})

// Access secrets with circuit breaker protection
const apiKey = await secretsBreaker.execute(async () => {
  return await secretsManager.getSecret('payment-gateway-api-key')
})
```

## Performance Optimization

### Bulk Circuit Breaker Operations

```typescript
// Create multiple circuit breakers efficiently
CircuitBreakerFactory.createEnterpriseBreakers(manager)

// Or create healthcare-specific breakers
CircuitBreakerFactory.createHealthcareBreakers(manager)

// Bulk operations
manager.bulkOperation({
  operation: 'reset',
  breakerNames: ['api-service-1', 'api-service-2', 'database'],
  reason: 'Maintenance reset'
})
```

### Memory and Performance Considerations

```typescript
const optimizedConfig = {
  // Limit memory usage
  metricsWindowSize: 50,      // Smaller window for memory efficiency
  monitoringPeriod: 60000,    // Shorter monitoring period
  
  // Optimize cleanup
  cleanupInterval: 60000,     // More frequent cleanup
  
  // Disable metrics for non-critical breakers
  enableMetrics: false
}
```

## Testing

### Unit Testing Circuit Breakers

```typescript
import { CircuitBreakerFactory } from '../services/circuit-breaker.factory'

describe('Circuit Breaker', () => {
  let manager: ICircuitBreakerManager
  let breaker: ICircuitBreaker

  beforeEach(() => {
    manager = CircuitBreakerFactory.createForTesting()
    breaker = manager.create('test-service', {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 5000
    })
  })

  afterEach(async () => {
    await manager.shutdown()
  })

  it('should open circuit after failures', async () => {
    const failingOperation = () => Promise.reject(new Error('Service unavailable'))

    // Cause failures to open circuit
    await expect(breaker.execute(failingOperation)).rejects.toThrow()
    await expect(breaker.execute(failingOperation)).rejects.toThrow()

    // Circuit should now be open
    expect(breaker.getState()).toBe('OPEN')
    
    // Next call should be rejected immediately
    await expect(breaker.execute(() => Promise.resolve('success')))
      .rejects.toThrow('Circuit breaker')
  })

  it('should close circuit after successful calls', async () => {
    // Open the circuit
    const failingOperation = () => Promise.reject(new Error('Failure'))
    await expect(breaker.execute(failingOperation)).rejects.toThrow()
    await expect(breaker.execute(failingOperation)).rejects.toThrow()
    
    expect(breaker.getState()).toBe('OPEN')
    
    // Wait for reset timeout and transition to half-open
    await new Promise(resolve => setTimeout(resolve, 6000))
    
    // Successful calls should close the circuit
    const successfulOperation = () => Promise.resolve('success')
    await breaker.execute(successfulOperation)
    await breaker.execute(successfulOperation)
    
    expect(breaker.getState()).toBe('CLOSED')
  })
})
```

### Integration Testing

```typescript
describe('Circuit Breaker Integration', () => {
  it('should protect against slow external services', async () => {
    const slowService = () => new Promise(resolve => 
      setTimeout(() => resolve('slow response'), 2000)
    )

    const breaker = manager.create('slow-service', {
      timeout: 1000,
      slowCallDurationThreshold: 500
    })

    await expect(breaker.execute(slowService))
      .rejects.toThrow('timeout')
  })
})
```

## Best Practices

### 1. Circuit Breaker Design
- Use appropriate failure thresholds based on service criticality
- Set realistic timeouts based on expected response times
- Configure exponential backoff for external services
- Monitor slow calls in addition to failures

### 2. Error Handling
- Implement proper fallback mechanisms
- Distinguish between different types of errors
- Use error filtering to avoid false positives
- Log circuit breaker state changes for debugging

### 3. Monitoring
- Set up alerts for circuit breaker state changes
- Monitor failure rates and response times
- Track circuit breaker health in dashboards
- Use global health metrics for system overview

### 4. Healthcare Compliance
- Enable audit trails for all healthcare operations
- Use patient safety mode for critical operations
- Implement emergency bypass procedures
- Ensure proper data retention and cleanup

### 5. Performance
- Use bulk operations for managing multiple breakers
- Optimize metrics collection intervals
- Implement proper cleanup procedures
- Consider memory usage in high-traffic scenarios

## Troubleshooting

### Common Issues

1. **Circuit Opens Too Frequently**
   - Increase failure threshold
   - Adjust error percentage threshold
   - Check if errors are properly filtered
   - Review service health and dependencies

2. **Circuit Doesn't Open When Expected**
   - Check volume threshold settings
   - Verify error types are being recorded
   - Review monitoring period configuration
   - Ensure metrics are enabled

3. **Slow Recovery After Outages**
   - Adjust success threshold
   - Review reset timeout settings
   - Check exponential backoff configuration
   - Monitor half-open state transitions

4. **High Memory Usage**
   - Reduce metrics window size
   - Decrease monitoring period
   - Implement more frequent cleanup
   - Consider disabling metrics for non-critical breakers

### Debug Commands

```typescript
// Get detailed circuit breaker information
const debug = {
  state: breaker.getState(),
  stats: breaker.getStats(),
  health: breaker.getHealth(),
  config: breaker.getConfig()
}
console.log('Circuit Breaker Debug Info:', JSON.stringify(debug, null, 2))

// Global system debug
const globalDebug = {
  health: manager.getGlobalHealth(),
  stats: manager.getGlobalStats(),
  breakers: manager.listWithStates()
}
console.log('Global Debug Info:', JSON.stringify(globalDebug, null, 2))
```

This comprehensive Circuit Breaker Service provides robust fault tolerance and monitoring capabilities for healthcare and enterprise applications, with built-in compliance features and extensive monitoring capabilities.