# API Key Authentication

Complete API key authentication system with dual expiration strategies, comprehensive security features, and full integration with existing infrastructure services.

## Overview

The API Key Authentication system provides enterprise-grade API key management with:

- **Dual Authentication Support**: API keys work alongside JWT authentication
- **Hybrid Expiration Strategy**: Traditional cron-based cleanup + Redis TTL notifications  
- **Advanced Security**: Rate limiting, IP whitelisting, prefix-based key identification
- **Full Infrastructure Integration**: Event Bus, Audit System, Logging, Cache, Metrics
- **Healthcare Compliance**: HIPAA-compliant audit trails and data sanitization

## Features

### ✅ Core API Key Management
- **Secure Key Generation**: Environment-based prefixes (sk_live_, sk_test_, sk_sandbox_)
- **BCrypt Hashing**: Secure key storage with 12 rounds of hashing
- **Comprehensive Metadata**: Permissions, expiration, rate limits, IP whitelist
- **Key Lifecycle Management**: Create, validate, revoke, regenerate

### ✅ Advanced Security
- **IP Whitelisting**: Restrict API key usage to specific IP addresses
- **Rate Limiting**: Configurable per-key rate limits (requests per hour)
- **Permission System**: Fine-grained permission control per API key
- **Usage Tracking**: Real-time usage statistics and monitoring

### ✅ Dual Expiration Strategy
- **Cron-based Cleanup**: Traditional background job for bulk cleanup
- **Redis TTL Notifications**: Real-time expiration handling via Redis keyspace events
- **Pre-expiration Warnings**: Configurable warnings before key expiration
- **Hybrid Mode**: Combine both strategies for maximum reliability

### ✅ Infrastructure Integration
- **Event Bus**: Publish key lifecycle events (created, expired, revoked)
- **Audit System**: Complete audit trail for all API key operations
- **Structured Logging**: Correlation ID tracking and business event logging
- **Cache Management**: Multi-level caching for validation performance
- **Metrics & Monitoring**: Usage statistics and performance monitoring

## Database Schema

The API key system uses a comprehensive database table:

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    rate_limit INTEGER DEFAULT 1000,
    ip_whitelist JSONB DEFAULT '[]',
    last_used_at TIMESTAMP,
    last_used_ip VARCHAR(45),
    usage_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id),
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Create API Key
```http
POST /api/v1/auth/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "name": "My API Key",
    "description": "For automated tasks",
    "permissions": {
        "resources": ["users", "files"],
        "actions": ["read", "write"],
        "scopes": ["own", "department"]
    },
    "expiresAt": "2024-12-31T23:59:59Z",
    "rateLimit": 2000,
    "ipWhitelist": ["192.168.1.100", "10.0.0.50"]
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "key": "sk_live_abc123def456...",
        "name": "My API Key",
        "prefix": "sk_live_abc1...",
        "createdAt": "2024-01-15T10:30:00Z"
    },
    "message": "API key created successfully. Store it securely - it will not be shown again."
}
```

### List API Keys
```http
GET /api/v1/auth/api-keys
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "name": "My API Key",
            "description": "For automated tasks",
            "prefix": "sk_live_abc1...",
            "permissions": {
                "resources": ["users", "files"],
                "actions": ["read", "write"],
                "scopes": ["own", "department"]
            },
            "expiresAt": "2024-12-31T23:59:59Z",
            "lastUsedAt": "2024-01-15T14:22:33Z",
            "usageCount": 142,
            "isActive": true,
            "createdAt": "2024-01-15T10:30:00Z"
        }
    ],
    "total": 1
}
```

### Get API Key Details
```http
GET /api/v1/auth/api-keys/{id}
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "My API Key",
        "description": "For automated tasks",
        "prefix": "sk_live_abc1...",
        "permissions": {
            "resources": ["users", "files"],
            "actions": ["read", "write"],
            "scopes": ["own", "department"]
        },
        "expiresAt": "2024-12-31T23:59:59Z",
        "lastUsedAt": "2024-01-15T14:22:33Z",
        "usageCount": 142,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "usageStats": {
            "totalRequests": 142,
            "successfulRequests": 138,
            "failedRequests": 4,
            "topEndpoints": [
                {"endpoint": "/api/v1/users", "count": 89},
                {"endpoint": "/api/v1/files", "count": 53}
            ],
            "dailyUsage": [
                {"date": "2024-01-15", "count": 42},
                {"date": "2024-01-14", "count": 38}
            ]
        }
    }
}
```

### Revoke API Key
```http
DELETE /api/v1/auth/api-keys/{id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "reason": "Security policy update"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "API key revoked successfully"
}
```

### Regenerate API Key
```http
POST /api/v1/auth/api-keys/{id}/regenerate
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "new-uuid-here",
        "key": "sk_live_new123key456...",
        "name": "My API Key (Regenerated)",
        "prefix": "sk_live_new1...",
        "createdAt": "2024-01-15T15:45:00Z"
    },
    "message": "API key regenerated successfully. Store the new key securely - it will not be shown again."
}
```

### Test API Key
```http
GET /api/v1/auth/api-keys/test
X-API-Key: sk_live_abc123def456...
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "API key is valid",
    "data": {
        "apiKeyId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "My API Key",
        "permissions": {
            "resources": ["users", "files"],
            "actions": ["read", "write"],
            "scopes": ["own", "department"]
        },
        "rateLimit": 2000,
        "expiresAt": "2024-12-31T23:59:59Z",
        "lastUsedAt": "2024-01-15T14:22:33Z",
        "usageCount": 143
    }
}
```

## Usage Examples

### Using API Keys for Authentication

API keys can be used instead of JWT tokens by including the `X-API-Key` header:

```bash
# Instead of JWT
curl -H "Authorization: Bearer <jwt_token>" \
     https://api.example.com/api/v1/users

# Use API Key
curl -H "X-API-Key: sk_live_abc123def456..." \
     https://api.example.com/api/v1/users
```

### Authentication Strategies

The system provides three authentication decorators for different use cases:

#### **1. Dual Authentication** (`fastify.authenticate`)
```typescript
// Supports both JWT and API Key with API Key priority
fastify.get('/files/:id', {
  preHandler: [fastify.authenticate],
  handler: fileHandler
});
```

**Priority Order:**
1. **API Key** (higher priority) - if X-API-Key header present, validates API key
2. **JWT Token** (fallback) - if no API key header, validates JWT

#### **2. JWT Only** (`fastify.authenticateJWT`)
```typescript
// JWT authentication only
fastify.get('/user/profile', {
  preHandler: [fastify.authenticateJWT],
  handler: profileHandler
});
```

#### **3. API Key Only** (`fastify.authenticateApiKey`)
```typescript
// API Key authentication only
fastify.post('/admin/bulk-import', {
  preHandler: [fastify.authenticateApiKey],
  handler: bulkImportHandler
});
```

### Usage Scenarios

```javascript
// Web Application (JWT only)
const response = await fetch('/api/v1/user/profile', {
    headers: {
        'Authorization': 'Bearer jwt_token_here'
    }
});
// → Uses JWT authentication

// Service Integration (API Key only)
const response = await fetch('/api/v1/admin/bulk', {
    headers: {
        'X-API-Key': 'sk_live_api_key_here'
    }
});
// → Uses API Key authentication

// Mixed Access (both headers sent)
const response = await fetch('/api/v1/files/shared', {
    headers: {
        'Authorization': 'Bearer jwt_token_here',
        'X-API-Key': 'sk_live_api_key_here'
    }
});
// → Uses API Key authentication (higher priority)
```

### Permission System

API keys support fine-grained permissions:

```json
{
    "permissions": {
        "resources": ["users", "files", "reports"],
        "actions": ["read", "write", "delete"],
        "scopes": ["own", "department", "all"],
        "endpoints": ["/api/v1/users/*", "/api/v1/files/upload"],
        "rateLimit": 5000,
        "maxRequests": 100000
    }
}
```

## Configuration

### Environment Variables

```bash
# Expiration Strategy
API_KEY_EXPIRATION_STRATEGY=hybrid  # cronjob|redis_ttl|hybrid
API_KEY_CRONJOB_ENABLED=true
API_KEY_REDIS_TTL_ENABLED=true

# Cron Job Configuration
API_KEY_CLEANUP_SCHEDULE="0 2 * * *"  # 2 AM daily
API_KEY_CLEANUP_BATCH_SIZE=100

# Redis TTL Configuration
API_KEY_REDIS_CHANNEL=api_key_expiration
API_KEY_PRE_EXPIRATION_HOURS=24

# Security Settings
API_KEY_MAX_PER_USER=10
API_KEY_DEFAULT_RATE_LIMIT=1000
API_KEY_MAX_RATE_LIMIT=10000
```

### Expiration Strategies

#### 1. Cron-based Cleanup (Traditional)
```bash
API_KEY_EXPIRATION_STRATEGY=cronjob
API_KEY_CRONJOB_ENABLED=true
API_KEY_CLEANUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

#### 2. Redis TTL-based (Real-time)
```bash
API_KEY_EXPIRATION_STRATEGY=redis_ttl
API_KEY_REDIS_TTL_ENABLED=true
API_KEY_REDIS_CHANNEL=api_key_expiration
```

#### 3. Hybrid (Recommended)
```bash
API_KEY_EXPIRATION_STRATEGY=hybrid
API_KEY_CRONJOB_ENABLED=true
API_KEY_REDIS_TTL_ENABLED=true
```

## Architecture Integration

### Event Bus Integration

The API key system publishes events for cross-domain communication:

```typescript
// Published Events
fastify.eventBus.publish('api_key.created', {
    userId,
    apiKeyId,
    name,
    permissions,
    timestamp: new Date()
});

fastify.eventBus.publish('api_key.expired.redis', {
    apiKeyId,
    userId,
    keyName,
    timestamp: new Date(),
    strategy: 'redis_ttl'
});

fastify.eventBus.publish('api_key.revoked', {
    apiKeyId,
    userId,
    reason,
    timestamp: new Date()
});

// Subscribe to Events
fastify.eventBus.subscribe('api_key.created', async (data) => {
    // Handle new API key creation
    console.log(`New API key created for user ${data.userId}`);
});
```

### Audit System Integration

All API key operations are automatically audited:

```typescript
// Audit logs are automatically created for:
// - API key creation
// - API key validation attempts (success/failure)
// - API key revocation
// - IP whitelist violations
// - Rate limit violations

// Example audit entry
{
    action: 'api_key.create',
    resource: 'api_keys',
    resourceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    userId: 'user-uuid-here',
    details: {
        name: 'My API Key',
        permissions: { ... },
        expiresAt: '2024-12-31T23:59:59Z',
        hasIpWhitelist: true
    },
    metadata: {
        ip: '192.168.1.100',
        userAgent: 'PostmanRuntime/7.28.4'
    }
}
```

### Structured Logging Integration

API key operations are logged with correlation IDs:

```typescript
// Example log entry
fastify.log.info('API key created', {
    correlationId: request.id,
    userId: 'user-uuid-here',
    apiKeyId: 'api-key-uuid-here',
    operation: 'api_key.create',
    businessEvent: 'api_key_creation',
    metadata: {
        keyName: 'My API Key',
        hasExpiry: true,
        hasIpWhitelist: true
    }
});
```

## Security Features

### IP Whitelisting

Restrict API key usage to specific IP addresses:

```json
{
    "ipWhitelist": [
        "192.168.1.100",
        "10.0.0.50",
        "203.0.113.0/24"
    ]
}
```

### Rate Limiting

Configure per-key rate limits:

```json
{
    "rateLimit": 2000,  // requests per hour
    "permissions": {
        "maxRequests": 100000  // total lifetime requests
    }
}
```

### Key Prefixes

Environment-based key identification:

- **Production**: `sk_live_abc123def456...`
- **Test**: `sk_test_abc123def456...`
- **Sandbox**: `sk_sandbox_abc123def456...`

### Secure Storage

- Keys are hashed using BCrypt with 12 rounds
- Only prefixes are stored for identification
- Full keys are never logged or stored in plaintext

## Healthcare Compliance

### HIPAA Compliance Features

1. **Audit Trails**: Complete audit logs for all API key operations
2. **Data Sanitization**: Sensitive data is automatically redacted from logs
3. **Access Controls**: Fine-grained permission system
4. **Encryption**: Keys are securely hashed and stored
5. **IP Restrictions**: Limit access to authorized networks

### Compliance Logging

```typescript
// HIPAA-compliant audit entries
{
    action: 'api_key.validate_failed',
    resource: 'api_keys',
    details: {
        reason: 'ip_not_whitelisted',
        ip: '[REDACTED]',  // Sensitive data sanitized
        allowedIps: ['[REDACTED]', '[REDACTED]']
    },
    hipaa_compliant: true,
    data_classification: 'PHI'
}
```

## Error Handling

### Common Error Responses

#### Invalid API Key (401 Unauthorized)
```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid or inactive API key"
    }
}
```

#### IP Not Whitelisted (401 Unauthorized)
```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "IP address not whitelisted"
    }
}
```

#### Rate Limit Exceeded (429 Too Many Requests)
```json
{
    "success": false,
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "API key rate limit exceeded",
        "details": {
            "limit": 1000,
            "window": "1 hour",
            "resetAt": "2024-01-15T16:00:00Z"
        }
    }
}
```

#### API Key Not Found (404 Not Found)
```json
{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "API key not found"
    }
}
```

## Monitoring & Metrics

### Key Metrics Tracked

- `api_keys_created_total`: Total API keys created
- `api_keys_validated_total`: Total validation attempts
- `api_keys_validation_success_rate`: Success rate of validations
- `api_keys_expired_total`: Total expired keys
- `api_keys_revoked_total`: Total revoked keys
- `api_key_cache_hit_rate`: Cache hit rate for validations

### Health Checks

The system provides health check endpoints:

```http
GET /api/v1/health/api-keys
```

**Response:**
```json
{
    "status": "healthy",
    "checks": {
        "database": "healthy",
        "redis": "healthy",
        "cache": "healthy"
    },
    "metrics": {
        "total_active_keys": 1524,
        "validation_rate": "245.2/sec",
        "cache_hit_rate": "94.7%"
    }
}
```

## Troubleshooting

### Common Issues

#### 1. API Key Validation Fails
**Symptoms**: 401 Unauthorized responses
**Check**:
- Verify API key is active: `SELECT is_active FROM api_keys WHERE key_hash = ?`
- Check expiration: `SELECT expires_at FROM api_keys WHERE key_hash = ?`
- Verify IP whitelist: `SELECT ip_whitelist FROM api_keys WHERE key_hash = ?`

#### 2. Redis TTL Not Working
**Symptoms**: Keys not expiring automatically
**Check**:
- Redis keyspace notifications: `CONFIG GET notify-keyspace-events`
- Redis connection: Check Redis logs for connection issues
- TTL values: `TTL api_key_ttl:{key_id}`

#### 3. High Validation Latency
**Symptoms**: Slow API responses
**Solutions**:
- Enable caching in production
- Check database indexes on `api_keys.key_hash`
- Monitor cache hit rates

### Debug Commands

```bash
# Check active API keys
SELECT id, name, is_active, expires_at FROM api_keys WHERE user_id = ?;

# Check Redis TTL keys
redis-cli KEYS "api_key_ttl:*"

# Check validation performance
SELECT AVG(duration_ms) FROM audit_logs WHERE action = 'api_key.validate';

# Check rate limit usage
SELECT usage_count, rate_limit FROM api_keys WHERE id = ?;
```

## Best Practices

### 1. Key Management
- **Rotate Keys Regularly**: Set expiration dates and rotate before expiry
- **Use Descriptive Names**: Include purpose and environment in key names
- **Limit Permissions**: Grant only necessary permissions per key
- **Monitor Usage**: Track key usage patterns and anomalies

### 2. Security
- **IP Whitelisting**: Always use IP restrictions for production keys
- **Rate Limiting**: Set appropriate rate limits based on usage patterns
- **Audit Regularly**: Review audit logs for suspicious activity
- **Revoke Unused Keys**: Remove keys that are no longer needed

### 3. Integration
- **Event Handling**: Subscribe to key lifecycle events for custom logic
- **Error Handling**: Implement proper error handling for all scenarios
- **Monitoring**: Set up alerts for key expirations and rate limit violations
- **Documentation**: Document key purposes and access patterns

### 4. Performance
- **Caching**: Enable validation caching in production
- **Database Indexes**: Ensure proper indexing on frequently queried fields
- **Batch Operations**: Use batch operations for bulk key management
- **Redis Configuration**: Optimize Redis for TTL performance

---

**🔗 Related Documentation:**
- [Authentication System](./auth-system.md)
- [RBAC System](./rbac-system.md)
- [Audit System](./audit-system.md)
- [Event Bus System](./event-bus.md)
- [Rate Limiting](./rate-limiting.md)

**📝 Last Updated:** January 2024
**🔖 Version:** 1.0.0
**🏥 Healthcare Compliance:** HIPAA Ready