# 🔐 Secrets Manager Service - AegisX Boilerplate

## Overview

The Secrets Manager Service is an enterprise-grade solution for secure storage, retrieval, and management of sensitive configuration data including API keys, tokens, passwords, and other secrets. Built with healthcare-grade security standards and HIPAA compliance in mind.

## 🚀 Features

### Security & Encryption
- **AES-256-GCM Encryption** with authenticated encryption
- **Multiple Key Derivation Functions** (PBKDF2, Scrypt, Argon2)
- **Memory-Safe Operations** with automatic cleanup
- **Secure Random Generation** for keys and passwords
- **HMAC Integrity Verification** for data authenticity

### Multi-Backend Support
- **Environment Variables** - Simple, local development
- **Database Storage** - Encrypted, versioned, with metadata
- **Redis Cache** - High-performance distributed storage (planned)
- **HashiCorp Vault** - Enterprise secret management (planned)
- **AWS Secrets Manager** - Cloud-native AWS integration (planned)
- **Azure Key Vault** - Microsoft Azure integration (planned)

### High Availability & Performance
- **Primary/Fallback Adapters** - Automatic failover
- **Intelligent Caching** with TTL and tag-based invalidation
- **Circuit Breaker Pattern** - Prevents cascade failures
- **Connection Pooling** - Optimized resource usage
- **Health Monitoring** - Real-time adapter status

### Developer Experience
- **Fastify Plugin Integration** - Seamless framework integration
- **Namespace Support** - Organize secrets by context
- **Fluent Builder API** - Easy configuration
- **Comprehensive Examples** - Real-world usage patterns
- **TypeScript Support** - Full type safety

## 📋 Quick Start

### Basic Usage

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'

export async function getApiCredentials(request: FastifyRequest, reply: FastifyReply) {
  // Get secret using helper method
  const apiKey = await request.server.getSecret('PAYMENT_API_KEY')
  
  if (!apiKey) {
    return reply.code(500).send({
      error: 'Payment API key not configured'
    })
  }
  
  // Use the API key securely
  const paymentClient = request.server.httpClientFactory.createForPayment({
    baseURL: 'https://api.payment.com',
    apiKey
  })
  
  return { success: true }
}
```

### Namespaced Secrets

```typescript
// Organize secrets by context
const [databaseUrl, redisUrl, jwtSecret] = await Promise.all([
  request.server.getSecret('DATABASE_URL', 'database'),
  request.server.getSecret('CONNECTION_STRING', 'redis'), 
  request.server.getSecret('JWT_SECRET', 'auth')
])
```

### Setting Secrets with Metadata

```typescript
// Set secret with TTL and metadata
await request.server.setSecret(
  'TEMP_TOKEN',
  'temporary-access-token-123',
  'auth',
  {
    ttl: 3600000, // 1 hour
    metadata: {
      purpose: 'temporary_access',
      createdBy: 'admin',
      environment: 'staging'
    }
  }
)
```

## ⚙️ Configuration

### Environment Variables

```bash
# Secrets Manager Configuration
SECRETS_ADAPTER=environment                    # Primary adapter type
SECRETS_ENCRYPTION_KEY=your-encryption-key    # Encryption key for database adapter
SECRETS_ENV_PREFIX=SECRET_                     # Prefix for environment variables
SECRETS_CACHE_ENABLED=true                    # Enable response caching
SECRETS_CACHE_TTL=300000                      # Cache TTL in milliseconds
SECRETS_CACHE_MAX_SIZE=1000                   # Maximum cache entries
SECRETS_AUDIT_ACCESS=false                    # Audit secret access
SECRETS_REQUIRE_NAMESPACE=false               # Require namespace for all operations
SECRETS_DB_TABLE=secrets                      # Database table name
```

### Plugin Configuration

```typescript
// Register in your Fastify application
await fastify.register(secretsManagerPlugin, {
  // Primary adapter configuration
  adapter: 'database',
  fallbackAdapters: ['environment'],
  
  // Encryption settings
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyDerivation: {
      algorithm: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      keyLength: 32
    }
  },
  
  // Caching configuration
  cache: {
    enabled: true,
    ttl: 600000,  // 10 minutes
    maxSize: 2000,
    refreshThreshold: 0.9
  },
  
  // Security settings
  security: {
    maskLogging: true,
    auditAccess: true,
    requireNamespace: true,
    allowedNamespaces: ['api', 'database', 'external', 'payment']
  },
  
  // Adapter-specific configurations
  adapters: {
    database: {
      table: 'secrets',
      keyColumn: 'key',
      valueColumn: 'value',
      namespaceColumn: 'namespace',
      encryption: true
    },
    environment: {
      prefix: 'SECRET_',
      transformKeys: true,
      allowOverwrite: false
    }
  },
  
  // Enable monitoring endpoints
  enableHealthCheck: true,
  enableMetrics: true,
  enableAdminRoutes: false  // Enable only in development
})
```

## 🏭 Factory Methods

### Environment-Specific Configurations

#### Development Environment
```typescript
const secretsManager = await SecretsManagerFactory.createForDevelopment()
```

#### Testing Environment
```typescript
const secretsManager = await SecretsManagerFactory.createForTesting()
```

#### Production Environment
```typescript
const secretsManager = await SecretsManagerFactory.createForProduction(
  process.env.ENCRYPTION_KEY!,
  knexInstance
)
```

### Custom Configuration with Builder

```typescript
const secretsManager = await SecretsManagerFactory.builder()
  .withPrimaryAdapter('database', {
    table: 'application_secrets',
    encryption: true
  })
  .withFallbackAdapter('environment', {
    prefix: 'APP_SECRET_'
  })
  .withCaching(true, 600000, 2000)
  .withEncryption(process.env.ENCRYPTION_KEY!, 'aes-256-gcm')
  .withSecurity(true, true, true)
  .withDatabase(knexInstance)
  .withHealthCheck(true, 30000)
  .build()
```

### Database Integration

```typescript
const secretsManager = await SecretsManagerFactory.createWithDatabase(
  knexInstance,
  process.env.ENCRYPTION_KEY,
  {
    table: 'app_secrets',
    namespaceColumn: 'namespace',
    encryption: true
  }
)
```

## 🔒 Encryption & Security

### Encryption Algorithms

The service supports multiple encryption algorithms:

```typescript
// AES-256-GCM (Recommended - Authenticated Encryption)
const config = {
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyDerivation: {
      algorithm: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      keyLength: 32
    }
  }
}

// ChaCha20-Poly1305 (High Performance)
const config = {
  encryption: {
    algorithm: 'chacha20-poly1305'
  }
}
```

### Key Derivation Functions

```typescript
// PBKDF2 (Standard)
keyDerivation: {
  algorithm: 'pbkdf2',
  iterations: 100000,
  saltLength: 32,
  keyLength: 32
}

// Scrypt (Memory-hard)
keyDerivation: {
  algorithm: 'scrypt',
  iterations: 16384,
  saltLength: 32,
  keyLength: 32
}

// Argon2 (Latest standard - fallback to scrypt in Node.js)
keyDerivation: {
  algorithm: 'argon2',
  iterations: 3,
  saltLength: 32,
  keyLength: 32
}
```

### Security Best Practices

```typescript
// Generate secure encryption key
const encryptionKey = EncryptionService.generateSecurePassword(64)

// Generate secure API keys
const apiKey = EncryptionService.generateRandomKey(32)

// Hash sensitive data
const hashedData = EncryptionService.hash(sensitiveData, 'sha256')

// Create HMAC for integrity
const signature = EncryptionService.createHMAC(data, secretKey)

// Mask secrets in logs
const maskedSecret = EncryptionService.maskSecret(secret, 4)
// Result: "sk_t****************************3fG2"
```

## 🗄️ Database Schema

### Automatic Schema Creation

The database adapter automatically creates the required table:

```sql
CREATE TABLE secrets (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  namespace VARCHAR(100),
  version VARCHAR(50) DEFAULT '1',
  metadata TEXT,
  encrypted BOOLEAN DEFAULT FALSE,
  encryption_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  ttl INTEGER,
  expires_at TIMESTAMP,
  
  UNIQUE(key, namespace)
);

CREATE INDEX idx_secrets_key ON secrets(key);
CREATE INDEX idx_secrets_namespace ON secrets(namespace);
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);
```

### Manual Migration

```typescript
// In your Knex migration file
exports.up = function(knex) {
  return knex.schema.createTable('secrets', (table) => {
    table.increments('id').primary()
    table.string('key', 255).notNullable()
    table.text('value')
    table.string('namespace', 100).nullable()
    table.string('version', 50).defaultTo('1')
    table.text('metadata').nullable()
    table.boolean('encrypted').defaultTo(false)
    table.text('encryption_data').nullable()
    table.timestamps(true, true)
    table.string('created_by', 100).nullable()
    table.string('updated_by', 100).nullable()
    table.integer('ttl').nullable()
    table.timestamp('expires_at').nullable()
    
    table.unique(['key', 'namespace'])
    table.index('key')
    table.index('namespace')
    table.index('expires_at')
  })
}
```

## 🔄 Secret Operations

### Basic CRUD Operations

```typescript
// Get single secret
const secret = await secretsManager.get('API_KEY', 'payment')

// Set secret with options
await secretsManager.set('API_KEY', 'sk_test_...', 'payment', {
  ttl: 86400000,  // 24 hours
  metadata: {
    environment: 'staging',
    purpose: 'payment_processing'
  }
})

// Check if secret exists
const exists = await secretsManager.exists('API_KEY', 'payment')

// Delete secret
const deleted = await secretsManager.delete('API_KEY', 'payment')
```

### Bulk Operations

```typescript
// Get multiple secrets
const secrets = await secretsManager.getMultiple([
  'SMTP_HOST',
  'SMTP_USERNAME', 
  'SMTP_PASSWORD',
  'SMTP_PORT'
], 'email')

// Set multiple secrets
await secretsManager.setMultiple({
  'STRIPE_PUBLIC_KEY': 'pk_test_...',
  'STRIPE_SECRET_KEY': 'sk_test_...',
  'STRIPE_WEBHOOK_SECRET': 'whsec_...'
}, 'payment', {
  metadata: { environment: 'staging' }
})
```

### Secret Rotation

```typescript
// Rotate API key
const newApiKey = generateNewApiKey()
await secretsManager.rotate('API_KEY', newApiKey, 'external')

// Verify rotation
const rotatedSecret = await secretsManager.get('API_KEY', 'external')
console.log('Rotation successful:', rotatedSecret === newApiKey)
```

### Namespace Management

```typescript
// List all namespaces
const namespaces = await secretsManager.listNamespaces()
// Result: ['database', 'payment', 'email', 'auth']

// Clear entire namespace
await secretsManager.clearNamespace('staging')

// Get secrets by namespace
const paymentSecrets = await secretsManager.getMultiple([
  'PUBLIC_KEY',
  'SECRET_KEY',
  'WEBHOOK_SECRET'
], 'payment')
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Check overall health
GET /health/secrets-manager
```

**Response:**
```json
{
  "status": "healthy",
  "adapters": {
    "database": {
      "status": "healthy",
      "available": true,
      "responseTime": 15,
      "errorCount": 0,
      "lastChecked": "2024-01-15T10:00:00.000Z"
    },
    "environment": {
      "status": "healthy", 
      "available": true,
      "responseTime": 2,
      "errorCount": 0,
      "lastChecked": "2024-01-15T10:00:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 3600000
}
```

### Metrics Endpoint

```bash
# Get performance metrics
GET /metrics/secrets-manager
```

**Response:**
```json
{
  "totalSecrets": 156,
  "secretsByNamespace": {
    "database": 12,
    "payment": 8,
    "email": 6,
    "auth": 4
  },
  "cacheStats": {
    "hitRate": 0.85,
    "size": 128,
    "evictions": 5
  },
  "operationCounts": {
    "gets": 1250,
    "sets": 89,
    "deletes": 12,
    "rotations": 3
  },
  "adapters": {
    "database": {
      "operationCounts": {
        "gets": 800,
        "sets": 89,
        "deletes": 12,
        "errors": 2
      },
      "averageResponseTime": 25,
      "availability": 0.998,
      "lastUsed": "2024-01-15T09:59:45.000Z"
    }
  }
}
```

### Admin Endpoints (Development Only)

```bash
# Get secret (admin)
GET /admin/secrets/get?key=API_KEY&namespace=payment

# Set secret (admin)
POST /admin/secrets/set
{
  "key": "NEW_API_KEY",
  "value": "sk_test_new_key",
  "namespace": "payment",
  "ttl": 3600000
}

# Delete secret (admin)
DELETE /admin/secrets/delete
{
  "key": "OLD_API_KEY",
  "namespace": "payment"
}

# List namespaces (admin)
GET /admin/secrets/namespaces

# Clear cache (admin)
POST /admin/secrets/cache/clear
{
  "tags": ["payment", "external"]
}

# Rotate secret (admin)
POST /admin/secrets/rotate
{
  "key": "API_KEY",
  "newValue": "sk_test_rotated_key",
  "namespace": "payment"
}
```

## 🚀 Use Cases & Examples

### Healthcare API Integration

```typescript
async function getPatientData(request: FastifyRequest, reply: FastifyReply) {
  // Get healthcare API credentials
  const [apiKey, clientId, hipaaKey] = await Promise.all([
    request.server.getSecret('API_KEY', 'healthcare'),
    request.server.getSecret('CLIENT_ID', 'healthcare'),
    request.server.getSecret('HIPAA_ENCRYPTION_KEY', 'healthcare')
  ])
  
  if (!apiKey || !clientId || !hipaaKey) {
    return reply.code(500).send({
      error: 'Healthcare API credentials not configured'
    })
  }
  
  // Use with HTTP client for HIPAA-compliant API calls
  const healthcareClient = request.server.httpClientFactory.createForHealthcare({
    baseURL: process.env.HEALTHCARE_API_URL,
    bearerToken: apiKey
  })
  
  const patient = await healthcareClient.get('/patients/123', {
    headers: {
      'X-Client-ID': clientId,
      'X-HIPAA-Audit': 'true',
      'X-Requesting-Doctor': request.user.doctorId
    }
  })
  
  return {
    success: true,
    patient: patient.data,
    auditTrail: patient.headers['x-audit-id']
  }
}
```

### Payment Processing

```typescript
async function processPayment(request: FastifyRequest, reply: FastifyReply) {
  // Get payment gateway secrets
  const [stripeSecret, webhookSecret, encryptionKey] = await Promise.all([
    request.server.getSecret('STRIPE_SECRET_KEY', 'payment'),
    request.server.getSecret('STRIPE_WEBHOOK_SECRET', 'payment'),
    request.server.getSecret('PCI_ENCRYPTION_KEY', 'payment')
  ])
  
  if (!stripeSecret || !webhookSecret) {
    return reply.code(500).send({
      error: 'Payment gateway not configured'
    })
  }
  
  const paymentClient = request.server.httpClientFactory.createForPayment({
    baseURL: 'https://api.stripe.com',
    apiKey: stripeSecret
  })
  
  const charge = await paymentClient.post('/v1/charges', {
    amount: request.body.amount,
    currency: 'thb',
    source: request.body.cardToken,
    metadata: {
      orderId: request.body.orderId
    }
  })
  
  return {
    success: true,
    chargeId: charge.data.id,
    status: charge.data.status
  }
}
```

### Database Connection Management

```typescript
async function createDatabaseConnection() {
  // Get database credentials securely
  const [host, username, password, database, sslCert] = await Promise.all([
    secretsManager.get('DB_HOST', 'database'),
    secretsManager.get('DB_USERNAME', 'database'), 
    secretsManager.get('DB_PASSWORD', 'database'),
    secretsManager.get('DB_NAME', 'database'),
    secretsManager.get('SSL_CERTIFICATE', 'database')
  ])
  
  if (!host || !username || !password || !database) {
    throw new Error('Database credentials incomplete')
  }
  
  // Create secure connection
  const knex = Knex({
    client: 'postgresql',
    connection: {
      host,
      user: username,
      password,
      database,
      ssl: sslCert ? { cert: sslCert } : false
    },
    pool: {
      min: 2,
      max: 10
    }
  })
  
  return knex
}
```

### Email Service Configuration

```typescript
async function setupEmailService(request: FastifyRequest) {
  // Get email service credentials
  const emailSecrets = await request.server.secretsManager.getMultiple([
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USERNAME',
    'SMTP_PASSWORD',
    'SMTP_FROM_ADDRESS'
  ], 'email')
  
  // Validate all required secrets
  const missing = Object.entries(emailSecrets)
    .filter(([key, value]) => !value)
    .map(([key]) => key)
  
  if (missing.length > 0) {
    throw new Error(`Missing email secrets: ${missing.join(', ')}`)
  }
  
  // Configure email transport
  const transporter = nodemailer.createTransporter({
    host: emailSecrets.SMTP_HOST,
    port: parseInt(emailSecrets.SMTP_PORT!),
    secure: true,
    auth: {
      user: emailSecrets.SMTP_USERNAME,
      pass: emailSecrets.SMTP_PASSWORD
    }
  })
  
  return transporter
}
```

### Secret Rotation Strategy

```typescript
async function rotateApiKeys() {
  const namespaces = await secretsManager.listNamespaces()
  
  for (const namespace of namespaces) {
    try {
      // Get current API key
      const currentKey = await secretsManager.get('API_KEY', namespace)
      
      if (currentKey && currentKey.startsWith('sk_')) {
        // Generate new key
        const newKey = generateSecureApiKey()
        
        // Rotate the secret
        await secretsManager.rotate('API_KEY', newKey, namespace)
        
        // Update external service
        await updateExternalServiceApiKey(namespace, newKey)
        
        console.log(`Rotated API key for namespace: ${namespace}`)
      }
    } catch (error) {
      console.error(`Failed to rotate key for ${namespace}:`, error)
    }
  }
}

// Schedule rotation every 30 days
setInterval(rotateApiKeys, 30 * 24 * 60 * 60 * 1000)
```

## 🧪 Testing

### Mock Secrets Manager for Testing

```typescript
import { jest } from '@jest/globals'

// Mock the secrets manager in tests
const mockSecretsManager = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getMultiple: jest.fn(),
  setMultiple: jest.fn(),
  rotate: jest.fn(),
  healthCheck: jest.fn(),
  getStats: jest.fn()
}

describe('Payment Service', () => {
  beforeEach(() => {
    // Mock successful secret retrieval
    mockSecretsManager.get.mockImplementation((key, namespace) => {
      if (key === 'STRIPE_SECRET_KEY' && namespace === 'payment') {
        return Promise.resolve('sk_test_mock_key')
      }
      return Promise.resolve(null)
    })
  })
  
  it('should process payment with valid credentials', async () => {
    const payment = await paymentService.processPayment({
      amount: 2000,
      currency: 'thb',
      cardToken: 'tok_visa'
    })
    
    expect(mockSecretsManager.get).toHaveBeenCalledWith('STRIPE_SECRET_KEY', 'payment')
    expect(payment.success).toBe(true)
  })
})
```

### Integration Testing

```typescript
import { test } from 'tap'
import { build } from '../helper'

test('Secrets Manager integration', async (t) => {
  const app = await build()
  
  // Test health check endpoint
  const healthResponse = await app.inject({
    method: 'GET',
    url: '/health/secrets-manager'
  })
  
  t.equal(healthResponse.statusCode, 200)
  const health = JSON.parse(healthResponse.payload)
  t.equal(health.status, 'healthy')
  
  // Test metrics endpoint
  const metricsResponse = await app.inject({
    method: 'GET', 
    url: '/metrics/secrets-manager'
  })
  
  t.equal(metricsResponse.statusCode, 200)
  const metrics = JSON.parse(metricsResponse.payload)
  t.ok(metrics.operationCounts)
  
  // Test secret operations
  await app.secretsManager.set('TEST_KEY', 'test_value', 'test')
  const retrieved = await app.secretsManager.get('TEST_KEY', 'test')
  t.equal(retrieved, 'test_value')
})
```

### Environment-Specific Testing

```typescript
describe('Environment Configuration', () => {
  it('should load development configuration', async () => {
    process.env.NODE_ENV = 'development'
    process.env.SECRETS_ADAPTER = 'environment'
    
    const secretsManager = await SecretsManagerFactory.createFromEnvironment()
    
    expect(secretsManager).toBeDefined()
    
    const health = await secretsManager.healthCheck()
    expect(health.status).toBe('healthy')
  })
  
  it('should load production configuration', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SECRETS_ADAPTER = 'database'
    process.env.SECRETS_ENCRYPTION_KEY = 'test-encryption-key'
    
    const secretsManager = await SecretsManagerFactory.createFromEnvironment(knex)
    
    expect(secretsManager).toBeDefined()
  })
})
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Adapter Unavailable

```typescript
// Check adapter health
const health = await secretsManager.healthCheck()
console.log('Adapter status:', health.adapters)

// Verify configuration
if (health.adapters.database?.status === 'unhealthy') {
  console.log('Database adapter error:', health.adapters.database.lastError)
}
```

#### 2. Encryption/Decryption Errors

```typescript
try {
  const secret = await secretsManager.get('ENCRYPTED_KEY')
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Encryption error:', error.message)
    // Check encryption key configuration
    if (!process.env.SECRETS_ENCRYPTION_KEY) {
      console.error('SECRETS_ENCRYPTION_KEY not configured')
    }
  }
}
```

#### 3. Cache Issues

```typescript
// Clear cache if experiencing stale data
await secretsManager.clearCache()

// Clear specific tags
await secretsManager.clearCache(['payment', 'auth'])

// Check cache stats
const stats = await secretsManager.getStats()
console.log('Cache hit rate:', stats.cacheStats?.hitRate)
```

#### 4. Database Connection Issues

```typescript
// Verify database connection
try {
  await knex.raw('SELECT 1')
  console.log('Database connection OK')
} catch (error) {
  console.error('Database connection failed:', error)
}

// Check secrets table exists
const hasTable = await knex.schema.hasTable('secrets')
if (!hasTable) {
  console.error('Secrets table does not exist')
}
```

#### 5. High Memory Usage

```typescript
// Monitor cache size
const stats = await secretsManager.getStats()
if (stats.cacheStats && stats.cacheStats.size > 1000) {
  console.warn('Cache size is large:', stats.cacheStats.size)
  await secretsManager.clearCache()
}

// Reduce cache TTL
const config = {
  cache: {
    enabled: true,
    ttl: 60000,  // 1 minute instead of 5
    maxSize: 500 // Smaller cache
  }
}
```

## 📚 Best Practices

### 1. Security

- **Never log actual secret values** - Use masking in logs
- **Use strong encryption keys** - Generate with crypto.randomBytes
- **Rotate secrets regularly** - Implement automated rotation
- **Audit secret access** - Enable access logging in production
- **Use namespaces** - Organize secrets by context
- **Implement least privilege** - Restrict access to necessary secrets only

```typescript
// Good: Masked logging
fastify.log.info('API key configured:', EncryptionService.maskSecret(apiKey))

// Bad: Plain text logging
fastify.log.info('API key:', apiKey) // ❌ Never do this
```

### 2. Performance

- **Enable caching** for frequently accessed secrets
- **Use appropriate TTL** values based on secret sensitivity
- **Monitor cache hit rates** and adjust configuration
- **Use bulk operations** when possible
- **Implement health checks** for early error detection

### 3. Configuration Management

- **Use environment-specific configurations** (dev, staging, prod)
- **Implement fallback adapters** for high availability
- **Validate required secrets** at application startup
- **Use the builder pattern** for complex configurations

```typescript
// Validate required secrets at startup
async function validateRequiredSecrets() {
  const requiredSecrets = [
    { key: 'JWT_SECRET', namespace: 'auth' },
    { key: 'DB_PASSWORD', namespace: 'database' },
    { key: 'STRIPE_SECRET_KEY', namespace: 'payment' }
  ]
  
  for (const { key, namespace } of requiredSecrets) {
    const exists = await secretsManager.exists(key, namespace)
    if (!exists) {
      throw new Error(`Required secret missing: ${namespace}:${key}`)
    }
  }
}
```

### 4. Error Handling

- **Handle specific error types** appropriately
- **Implement retry logic** for transient failures  
- **Use circuit breakers** to prevent cascade failures
- **Provide meaningful error messages**

```typescript
try {
  const secret = await secretsManager.get('API_KEY')
} catch (error) {
  if (error instanceof SecretNotFoundError) {
    // Handle missing secret
    await notifyAdministrators('Critical secret missing')
  } else if (error instanceof AdapterUnavailableError) {
    // Handle adapter failure
    await switchToFallbackMode()
  } else {
    // Handle other errors
    fastify.log.error('Unexpected secrets error:', error)
  }
}
```

### 5. Testing

- **Mock the secrets manager** in unit tests
- **Use test-specific configurations** 
- **Test error scenarios** and edge cases
- **Validate secret rotation** processes

---

## 🔗 Related Documentation

- [HTTP Client Service](./http-client-service.md) - Uses secrets for API authentication
- [Audit System](./audit-system.md) - Logs secret access for compliance
- [Database Setup](./database.md) - Database adapter configuration
- [Security Guide](./security-guide.md) - Overall security best practices
- [Environment Configuration](../.env.example) - Configuration reference

---

## 🆘 Support & Troubleshooting

For additional support with the Secrets Manager Service:

1. **Check Health Endpoints** - Monitor `/health/secrets-manager` and `/metrics/secrets-manager`
2. **Review Logs** - Enable debug logging for detailed troubleshooting
3. **Validate Configuration** - Ensure all required environment variables are set
4. **Test Adapters** - Verify database connectivity and encryption keys
5. **Monitor Performance** - Watch cache hit rates and response times

---

<div align="center">

**🔐 Built for Healthcare Security • 🏥 HIPAA Compliant • 🚀 Production Ready**

</div>