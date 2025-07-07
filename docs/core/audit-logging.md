# Audit Logging System

The AegisX Boilerplate includes a comprehensive audit logging system that automatically tracks all user actions, API calls, and data changes for security monitoring, compliance, and debugging purposes.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Security Features](#security-features)
- [Performance Considerations](#performance-considerations)
- [Compliance & Reporting](#compliance--reporting)
- [Troubleshooting](#troubleshooting)

## Overview

The audit logging system provides:

- **Automatic Logging**: All API requests are logged automatically
- **Manual Logging**: Custom events can be logged programmatically
- **Data Change Tracking**: Before/after values for updates
- **Security Monitoring**: Failed logins, access denials, suspicious activities
- **Compliance Support**: HIPAA, GDPR, SOX audit trails
- **Performance Optimized**: Asynchronous logging with database indexing

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Request                            │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    Fastify Server                                  │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐ │
│  │   Middleware    │───▶│   Audit Service  │───▶│   Repository    │ │
│  │ (Auto Logging)  │    │  (Business Logic)│    │   (Database)    │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘ │
│           │                       │                       │         │
│           ▼                       ▼                       ▼         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐ │
│  │ HTTP Requests   │    │ Manual Logging   │    │ audit_logs table│ │
│  │ (Automatic)     │    │ (Custom Events)  │    │ (PostgreSQL)    │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

1. **Audit Log Middleware**: Automatically captures HTTP requests
2. **Audit Log Service**: Business logic for creating and querying logs
3. **Audit Log Repository**: Database operations and queries
4. **Audit Log Controller**: REST API endpoints
5. **Database Schema**: Optimized table structure with indexes

## Database Schema

The `audit_logs` table stores all audit information:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,              -- Action type (CREATE, READ, UPDATE, DELETE, etc.)
  resource_type VARCHAR NOT NULL,       -- Resource being accessed (user, patient, etc.)
  resource_id VARCHAR,                  -- Specific resource ID
  ip_address VARCHAR,                   -- Client IP address
  user_agent VARCHAR,                   -- Browser/client information
  session_id VARCHAR,                   -- Session identifier
  old_values JSONB,                     -- Previous state (for updates)
  new_values JSONB,                     -- New state (for creates/updates)
  metadata JSONB,                       -- Additional context data
  status VARCHAR NOT NULL DEFAULT 'success', -- success, failed, error
  error_message VARCHAR,                -- Error details if status = failed/error
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action_created ON audit_logs(action, created_at);
```

### Supported Actions

| Action | Description | Example |
|--------|-------------|---------|
| `CREATE` | Resource creation | User registration, patient creation |
| `READ` | Resource access | View user profile, read patient data |
| `UPDATE` | Resource modification | Update patient info, change settings |
| `DELETE` | Resource deletion | Delete user account, remove patient |
| `LOGIN` | Authentication events | Successful/failed login attempts |
| `LOGOUT` | Session termination | User logout, session expiry |
| `EXPORT` | Data export | Download reports, export patient data |
| `IMPORT` | Data import | Bulk upload, data migration |
| `ACCESS_DENIED` | Authorization failures | Insufficient permissions |
| `PASSWORD_CHANGE` | Password modifications | Password reset, change password |
| `EMAIL_VERIFY` | Email verification | Account verification |
| `ROLE_ASSIGN` | Role management | Assign/remove user roles |
| `PERMISSION_GRANT` | Permission changes | Grant/revoke permissions |

## Configuration

### Environment Variables

```bash
# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=900
```

### Middleware Configuration

```typescript
// apps/api/src/app/core/shared/middleware/audit-log-middleware.ts
const auditConfig: AuditConfig = {
  enabled: true,                    // Enable/disable audit logging
  excludeRoutes: [                  // Routes to exclude from logging
    '/health',
    '/ready', 
    '/docs',
    '/docs/*'
  ],
  excludeMethods: [                 // HTTP methods to exclude
    'GET',                          // Don't log read operations
    'HEAD', 
    'OPTIONS'
  ],
  logSuccessOnly: false,            // Log only successful requests
  logRequestBody: false,            // Include request body in logs
  logResponseBody: false,           // Include response body in logs
  maxBodySize: 1024 * 10           // Maximum body size to log (10KB)
};
```

### Usage in Routes

```typescript
// Enable audit middleware for specific routes
import { registerAuditMiddleware } from '../core/shared/middleware/audit-log-middleware';

// Apply to all routes
registerAuditMiddleware(fastify, auditConfig);

// Or apply to specific route groups
fastify.register(async function(fastify) {
  registerAuditMiddleware(fastify, {
    enabled: true,
    excludeMethods: [] // Log all methods for this group
  });
  
  // Your routes here
}, { prefix: '/api/v1/sensitive' });
```

## API Endpoints

All audit log endpoints require authentication and appropriate permissions:

### 1. List Audit Logs

```http
GET /api/v1/audit-logs
```

**Query Parameters:**

```typescript
{
  user_id?: string;           // Filter by user ID
  action?: AuditAction;       // Filter by action type
  resource_type?: string;     // Filter by resource type
  resource_id?: string;       // Filter by specific resource
  status?: AuditStatus;       // Filter by status (success/failed/error)
  start_date?: string;        // ISO date string
  end_date?: string;          // ISO date string
  ip_address?: string;        // Filter by IP address
  limit?: number;             // Number of results (default: 50, max: 1000)
  offset?: number;            // Pagination offset
  sort_by?: 'created_at' | 'action' | 'resource_type';
  sort_order?: 'asc' | 'desc';
}
```

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/v1/audit-logs?user_id=123&action=UPDATE&limit=100"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123",
      "action": "UPDATE",
      "resource_type": "patient",
      "resource_id": "456",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "session_id": "sess_123",
      "old_values": {
        "name": "John Doe",
        "age": 30
      },
      "new_values": {
        "name": "John Doe",
        "age": 31
      },
      "metadata": {
        "method": "PUT",
        "url": "/api/v1/patients/456",
        "duration_ms": 150
      },
      "status": "success",
      "error_message": null,
      "created_at": "2025-06-21T08:30:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "total_pages": 25
  }
}
```

### 2. Get Specific Audit Log

```http
GET /api/v1/audit-logs/:id
```

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/v1/audit-logs/550e8400-e29b-41d4-a716-446655440000"
```

### 3. Get User Audit Logs

```http
GET /api/v1/audit-logs/user/:userId
```

**Query Parameters:**
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/v1/audit-logs/user/123?limit=100"
```

### 4. Get Resource Audit Logs

```http
GET /api/v1/audit-logs/resource/:resourceType
```

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/v1/audit-logs/resource/patients"
```

### 5. Get Audit Statistics

```http
GET /api/v1/audit-logs/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_logs": 15420,
    "success_count": 14891,
    "failed_count": 529,
    "error_count": 0,
    "actions_summary": {
      "CREATE": 3245,
      "READ": 8934,
      "UPDATE": 2687,
      "DELETE": 554,
      "LOGIN": 1205,
      "LOGOUT": 1195
    },
    "resource_types_summary": {
      "user": 4500,
      "patient": 6780,
      "appointment": 3240,
      "medical_record": 900
    },
    "last_24h_count": 1205,
    "last_7d_count": 8934,
    "last_30d_count": 15420
  }
}
```

### 6. Cleanup Old Audit Logs

```http
POST /api/v1/audit-logs/cleanup
```

**Request Body:**

```json
{
  "olderThanDays": 365
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully cleaned up 1250 old audit logs",
  "data": {
    "deleted_count": 1250,
    "older_than_days": 365
  }
}
```

## Usage Examples

### 1. Automatic Logging

All HTTP requests are automatically logged when the middleware is enabled:

```typescript
// This happens automatically for all requests
// POST /api/v1/users
// -> Creates audit log with action=CREATE, resource_type=users
```

### 2. Manual Logging in Services

```typescript
import { AuditLogService } from '../domains/audit-log/services/audit-log-service';

class UserService {
  constructor(
    private userRepository: UserRepository,
    private auditLogService: AuditLogService
  ) {}

  async updateUser(userId: string, updates: any, context: any) {
    // Get current user data
    const oldUser = await this.userRepository.findById(userId);
    
    // Perform update
    const newUser = await this.userRepository.update(userId, updates);
    
    // Manual audit logging
    const changes = this.auditLogService.createAuditableChanges(oldUser, newUser);
    await this.auditLogService.logUpdate(
      'user',
      userId,
      changes,
      context,
      { operation: 'profile_update' }
    );
    
    return newUser;
  }

  async deleteUser(userId: string, context: any) {
    const user = await this.userRepository.findById(userId);
    
    await this.userRepository.delete(userId);
    
    // Log deletion with old values
    await this.auditLogService.logDelete(
      'user',
      userId,
      user,
      context,
      { reason: 'account_deletion' }
    );
  }
}
```

### 3. Security Event Logging

```typescript
class AuthService {
  async login(credentials: LoginRequest, context: any) {
    try {
      const user = await this.validateCredentials(credentials);
      
      // Log successful login
      await this.auditLogService.logLogin(
        user.id,
        context,
        { 
          loginMethod: 'password',
          userAgent: context.user_agent 
        }
      );
      
      return this.generateTokens(user);
    } catch (error) {
      // Log failed login attempt
      await this.auditLogService.logAction(
        'LOGIN',
        'user',
        context,
        {
          status: 'failed',
          errorMessage: 'Invalid credentials',
          metadata: {
            attemptedEmail: credentials.email,
            failureReason: 'invalid_password',
            securityAlert: true
          }
        }
      );
      
      throw error;
    }
  }

  async logout(userId: string, context: any) {
    await this.revokeTokens(userId);
    
    await this.auditLogService.logLogout(
      userId,
      context,
      { logoutType: 'user_initiated' }
    );
  }
}
```

### 4. Access Control Logging

```typescript
// In RBAC middleware
async function checkPermission(request: FastifyRequest, reply: FastifyReply) {
  const hasPermission = await rbacService.checkPermission(request, 'patients', 'read');
  
  if (!hasPermission) {
    // Log access denial
    await auditLogService.logAccessDenied(
      'patients',
      request.params.id,
      extractContext(request),
      'Insufficient permissions'
    );
    
    return reply.code(403).send({ error: 'Access denied' });
  }
}
```

### 5. Data Export Logging

```typescript
class ReportService {
  async exportPatientData(params: ExportParams, context: any) {
    const data = await this.generateReport(params);
    
    // Log data export for compliance
    await this.auditLogService.logAction(
      'EXPORT',
      'patient',
      context,
      {
        metadata: {
          exportType: 'patient_data',
          recordCount: data.length,
          dateRange: params.dateRange,
          exportFormat: params.format,
          complianceReason: params.reason
        }
      }
    );
    
    return data;
  }
}
```

## Security Features

### 1. Data Sanitization

The system automatically sanitizes sensitive information:

```typescript
// Sensitive fields are automatically redacted
const sensitiveFields = [
  'password', 'password_hash', 'token', 'secret', 'key',
  'credit_card', 'ssn', 'social_security_number'
];

// Example output:
{
  "old_values": {
    "name": "John Doe",
    "password": "[REDACTED]",  // Automatically sanitized
    "email": "john@example.com"
  }
}
```

### 2. Header Sanitization

Authorization and sensitive headers are redacted:

```typescript
const sensitiveHeaders = [
  'authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-session-id'
];

// Example metadata:
{
  "headers": {
    "user-agent": "Mozilla/5.0...",
    "authorization": "[REDACTED]",  // Automatically sanitized
    "content-type": "application/json"
  }
}
```

### 3. Size Limitations

Large payloads are truncated to prevent database bloat:

```typescript
// Bodies larger than maxBodySize are truncated
{
  "request_body": {
    "_truncated": true,
    "_size": 15360,
    "_limit": 10240
  }
}
```

### 4. IP Address Tracking

The system properly extracts client IP addresses, handling proxies:

```typescript
// IP extraction logic
const ip = request.ip || 
          request.headers['x-forwarded-for'] || 
          request.headers['x-real-ip'] || 
          request.socket?.remoteAddress;
```

## Performance Considerations

### 1. Asynchronous Logging

Audit logging is performed asynchronously to avoid blocking request processing:

```typescript
// Non-blocking audit logging
fastify.addHook('onResponse', async (request, reply) => {
  // Don't wait for audit logging to complete
  setImmediate(() => {
    auditService.logAction(...).catch(error => {
      fastify.log.error('Audit logging failed:', error);
    });
  });
});
```

### 2. Database Indexing

Optimized indexes for common query patterns:

```sql
-- User activity queries
CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at);

-- Resource access queries  
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Action-based queries
CREATE INDEX idx_audit_action_created ON audit_logs(action, created_at);

-- Time-based queries
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

### 3. Batch Operations

For high-volume scenarios, consider implementing batch logging:

```typescript
class AuditLogService {
  private batchQueue: AuditLogEntity[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  async batchLog(auditData: CreateAuditLogData) {
    this.batchQueue.push(auditData);
    
    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  private async flushBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, this.batchSize);
    await this.auditLogRepository.createBatch(batch);
  }
}
```

### 4. Data Retention

Implement automated cleanup to manage database size:

```typescript
// Scheduled cleanup job
const cleanupJob = new CronJob('0 2 * * *', async () => {
  const deletedCount = await auditLogService.cleanupOldLogs(365);
  console.log(`Cleaned up ${deletedCount} old audit logs`);
});
```

## Compliance & Reporting

### 1. HIPAA Compliance

Track all access to protected health information (PHI):

```typescript
// Example: Patient data access logging
async function getPatientRecord(patientId: string, context: any) {
  const patient = await patientRepository.findById(patientId);
  
  // Required for HIPAA compliance
  await auditLogService.logAction(
    'READ',
    'patient',
    context,
    {
      resourceId: patientId,
      metadata: {
        phi_access: true,
        access_reason: 'patient_care',
        minimum_necessary: true,
        hipaa_compliance: true
      }
    }
  );
  
  return patient;
}
```

### 2. GDPR Compliance

Track data processing activities:

```typescript
// Data processing logging
await auditLogService.logAction(
  'EXPORT',
  'user',
  context,
  {
    metadata: {
      gdpr_compliance: true,
      legal_basis: 'consent',
      data_subject_rights: 'data_portability',
      retention_period: '7_years'
    }
  }
);
```

### 3. Security Incident Reports

Generate security incident reports:

```typescript
// Security incident query
const suspiciousActivity = await auditLogService.searchAuditLogs({
  status: 'failed',
  action: 'LOGIN',
  start_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 1000
});

// Failed access attempts
const accessDenials = await auditLogService.searchAuditLogs({
  action: 'ACCESS_DENIED',
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
});
```

### 4. Compliance Reports

```typescript
class ComplianceReportService {
  async generateHIPAAReport(startDate: Date, endDate: Date) {
    return {
      phi_access_logs: await this.getPHIAccessLogs(startDate, endDate),
      unauthorized_attempts: await this.getUnauthorizedAttempts(startDate, endDate),
      data_exports: await this.getDataExports(startDate, endDate),
      user_activity: await this.getUserActivity(startDate, endDate)
    };
  }

  async generateGDPRReport(dataSubjectId: string) {
    return {
      data_processing: await this.getDataProcessingLogs(dataSubjectId),
      consent_changes: await this.getConsentChanges(dataSubjectId),
      data_exports: await this.getDataExports(dataSubjectId),
      deletion_requests: await this.getDeletionRequests(dataSubjectId)
    };
  }
}
```

## Troubleshooting

### 1. Performance Issues

**Problem**: Slow API responses due to audit logging

**Solutions**:
- Ensure audit logging is asynchronous
- Check database indexes are properly created
- Consider disabling audit logging for high-frequency endpoints
- Implement batch logging for high-volume scenarios

```typescript
// Check if async logging is enabled
fastify.addHook('onResponse', async (request, reply) => {
  // Use setImmediate to avoid blocking
  setImmediate(async () => {
    try {
      await auditService.logAction(...);
    } catch (error) {
      fastify.log.error('Audit logging failed:', error);
    }
  });
});
```

### 2. Database Storage Issues

**Problem**: Audit logs table growing too large

**Solutions**:
- Implement regular cleanup of old logs
- Partition the audit_logs table by date
- Archive old logs to separate storage
- Adjust retention policies

```sql
-- Table partitioning example
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3. Missing Audit Logs

**Problem**: Some actions are not being logged

**Solutions**:
- Check middleware configuration
- Verify excluded routes/methods
- Ensure service is properly injected
- Check error logs for failed audit operations

```typescript
// Debug missing logs
fastify.log.info('Audit middleware config:', auditConfig);
fastify.log.info('Request should be audited:', shouldAuditRequest(request));
```

### 4. Sensitive Data Exposure

**Problem**: Sensitive data appearing in audit logs

**Solutions**:
- Update sensitive field list
- Implement custom sanitization
- Review data sanitization rules
- Add field-level encryption

```typescript
// Custom sanitization
const customSanitize = (obj: any) => {
  // Add custom sanitization logic
  if (obj.customSensitiveField) {
    obj.customSensitiveField = '[REDACTED]';
  }
  return obj;
};
```

### 5. Audit Log API Errors

**Problem**: API endpoints returning errors

**Solutions**:
- Check authentication and authorization
- Verify database connectivity
- Review API permissions
- Check request parameters

```bash
# Test API endpoint
curl -v -H "Authorization: Bearer <token>" \
  "/api/v1/audit-logs" \
  2>&1 | grep -E "(HTTP/|Authorization:)"
```

### 6. Redis Caching Issues

**Problem**: Audit log service caching problems

**Solutions**:
- Check Redis connectivity
- Verify Redis configuration
- Review cache TTL settings
- Monitor cache hit rates

```typescript
// Check Redis health
const isHealthy = await fastify.isCacheHealthy();
console.log('Redis healthy:', isHealthy);

// Get cache stats
const stats = await fastify.getCacheStats();
console.log('Cache stats:', stats);
```

## Migration Guide

If upgrading from a system without audit logging:

### 1. Run Database Migration

```bash
npm run db:migrate
```

### 2. Update Environment Variables

Add Redis configuration to your `.env` file:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=900
```

### 3. Enable Middleware

```typescript
// In your main application file
import { registerAuditMiddleware } from './core/shared/middleware/audit-log-middleware';

registerAuditMiddleware(fastify, {
  enabled: true,
  excludeRoutes: ['/health', '/docs']
});
```

### 4. Start Redis Service

```bash
# Using Docker
docker-compose up -d redis

# Or install locally
brew install redis
redis-server
```

### 5. Verify Installation

```bash
# Check audit logs API
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/audit-logs/stats"

# Check Redis connectivity
docker exec -it aegisx-redis redis-cli ping
```

## Best Practices

1. **Security**: Always sanitize sensitive data before logging
2. **Performance**: Use asynchronous logging for production
3. **Storage**: Implement regular cleanup and archiving
4. **Compliance**: Include required metadata for your compliance needs
5. **Monitoring**: Set up alerts for failed audit operations
6. **Testing**: Include audit logging in your test scenarios
7. **Documentation**: Document custom audit requirements for your team

## Support

For issues or questions about the audit logging system:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check application logs for errors
4. Verify database and Redis connectivity
5. Review middleware configuration

The audit logging system is designed to be robust and handle failures gracefully, but proper monitoring and maintenance ensure optimal performance and compliance.