# Storage Service Documentation

## Overview

The AegisX Storage Service is a comprehensive, enterprise-grade file storage solution designed for healthcare applications requiring HIPAA compliance, audit trails, and multi-provider support. It provides a unified interface for both local file system and MinIO (S3-compatible) storage backends.

## Features

### Core Capabilities
- **Multi-Provider Support**: Local file system and MinIO object storage
- **Healthcare Compliance**: HIPAA-compliant with audit trails and encryption
- **Enterprise Integration**: Circuit breaker, retry, caching, and metrics
- **Event-Driven Architecture**: Real-time events via Event Bus
- **Advanced Security**: Encryption, data classification, and access controls
- **Performance Optimization**: Caching, compression, and connection pooling

### Healthcare Features
- **HIPAA Compliance**: Built-in compliance validation and enforcement
- **Data Classification**: Automatic classification (public, internal, confidential, restricted)
- **Audit Trails**: Comprehensive access logging for healthcare data
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Retention Policies**: Configurable retention based on data classification
- **Consent Management**: Track and enforce patient consent requirements

## Architecture

### Multi-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Fastify Plugin Layer                      │
│  (HTTP endpoints, health checks, admin interface)          │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                 Storage Service Layer                      │
│     (Unified interface, enterprise features)               │
└─────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼────────┐                           ┌──────────▼─────────┐
│ Local Provider │                           │   MinIO Provider   │
│ (File System)  │                           │ (Object Storage)   │
└────────────────┘                           └────────────────────┘
```

### Key Components

1. **Storage Service**: Main service interface with enterprise features
2. **Storage Providers**: Pluggable backends (Local, MinIO)
3. **Storage Factory**: Service instantiation and configuration
4. **Event System**: Real-time event publishing and subscription
5. **Enterprise Integration**: Circuit breaker, retry, cache, metrics

## Installation & Configuration

### Environment Variables

```bash
# Storage Provider Configuration
STORAGE_PROVIDER=local|minio
STORAGE_ENABLED=true

# Local Storage Configuration
STORAGE_LOCAL_BASE_PATH=./storage
STORAGE_LOCAL_PERMISSIONS=0755
STORAGE_LOCAL_MAX_FILE_SIZE=104857600  # 100MB
STORAGE_LOCAL_MAX_FILES=10000

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=aegisx-storage
MINIO_REGION=us-east-1

# Security & Encryption
STORAGE_ENCRYPTION_ENABLED=true
STORAGE_ENCRYPTION_ALGORITHM=AES-256-GCM
STORAGE_ENCRYPT_METADATA=true

# Healthcare Compliance
STORAGE_HEALTHCARE_ENABLED=true
STORAGE_HIPAA_COMPLIANCE=true
STORAGE_AUDIT_TRAIL=true
STORAGE_HEALTHCARE_ENCRYPTION_REQUIRED=true
```

### Fastify Plugin Registration

```typescript
import storagePlugin from './core/plugins/storage'

// Basic registration
await fastify.register(storagePlugin, {
  config: {
    provider: 'minio',
    minio: {
      endpoint: 'localhost',
      port: 9000,
      bucket: 'my-bucket'
    }
  },
  enableHealthCheck: true,
  enableMetrics: true,
  enableFileEndpoints: true
})

// Access storage service
const result = await fastify.storage.upload({
  file: buffer,
  filename: 'document.pdf',
  mimeType: 'application/pdf'
})
```

## Usage Examples

### Basic File Operations

```typescript
// Upload a file
const uploadResult = await fastify.storage.upload({
  file: fileBuffer,
  filename: 'patient-record.pdf',
  mimeType: 'application/pdf',
  options: {
    dataClassification: 'restricted',
    tags: ['patient-record', 'medical'],
    healthcare: {
      patientId: 'PAT-12345',
      recordType: 'medical-record',
      classification: 'restricted',
      hipaaCompliant: true,
      consentRequired: true
    }
  }
})

// Download a file
const downloadResult = await fastify.storage.download({
  fileId: uploadResult.fileId,
  options: {
    auditAccess: true,
    purpose: 'Medical review'
  }
})

// Get file information
const fileInfo = await fastify.storage.getFileInfo(uploadResult.fileId)

// List files with filtering
const files = await fastify.storage.listFiles({
  filters: {
    dataClassification: ['restricted'],
    tags: ['patient-record'],
    mimeTypes: ['application/pdf']
  },
  sortBy: 'created',
  sortOrder: 'desc',
  limit: 50
})

// Delete a file
const deleted = await fastify.storage.delete(uploadResult.fileId)
```

### Healthcare Compliance Features

```typescript
// Validate HIPAA compliance
const isCompliant = await fastify.storage.validateHIPAACompliance(fileId)

// Classify data automatically
const classification = await fastify.storage.classifyData(fileBuffer, {
  healthcare: {
    patientId: 'PAT-12345',
    recordType: 'lab-result'
  }
})

// Audit file access
await fastify.storage.auditFileAccess(
  fileId, 
  'download', 
  'Patient care - lab review'
)
```

### Advanced Features

```typescript
// Generate presigned URLs
const presignedUrl = await fastify.storage.generatePresignedUrl({
  fileId: 'file-123',
  operation: 'read',
  expiresIn: 3600 // 1 hour
})

// Batch operations
const uploadResults = await fastify.storage.uploadMultiple([
  { file: buffer1, filename: 'doc1.pdf', mimeType: 'application/pdf' },
  { file: buffer2, filename: 'doc2.pdf', mimeType: 'application/pdf' }
])

// Copy and move files
const copied = await fastify.storage.copyFile(sourceId, 'archive/2024/')
const moved = await fastify.storage.moveFile(sourceId, 'processed/')

// Search files
const searchResults = await fastify.storage.searchFiles('patient report', {
  filters: { dataClassification: ['confidential', 'restricted'] }
})
```

## API Endpoints

### File Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/storage/upload` | Upload a file |
| GET | `/api/storage/download/:fileId` | Download a file |
| GET | `/api/storage/download/:fileId/info` | Get file information |
| GET | `/api/storage/files` | List files with filtering |
| DELETE | `/api/storage/download/:fileId` | Delete a file |
| POST | `/api/storage/presigned-url` | Generate presigned URL |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/storage` | Storage service health |
| GET | `/metrics/storage` | Storage metrics |

### Administrative

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/storage/config` | Get configuration |
| POST | `/admin/storage/cleanup` | Trigger cleanup |
| GET | `/admin/storage/hipaa-compliance/:fileId` | Check HIPAA compliance |

## Configuration Templates

### Development Configuration

```typescript
const devConfig = {
  provider: 'local',
  local: {
    basePath: './storage/dev',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1000
  },
  encryption: { enabled: false },
  healthcare: { enabled: false },
  integration: {
    circuitBreaker: { enabled: false },
    retry: { enabled: false },
    eventBus: { enabled: false }
  }
}
```

### Production Configuration

```typescript
const prodConfig = {
  provider: 'minio',
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    useSSL: true,
    bucket: 'production-storage',
    maxFileSize: 100 * 1024 * 1024 // 100MB
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    encryptMetadata: true
  },
  healthcare: {
    enabled: true,
    hipaaCompliance: true,
    auditTrail: true,
    encryptionRequired: true
  },
  integration: {
    circuitBreaker: { enabled: true },
    retry: { enabled: true },
    eventBus: { enabled: true },
    audit: { enabled: true },
    metrics: { enabled: true }
  }
}
```

### Healthcare Configuration

```typescript
const healthcareConfig = {
  provider: 'minio',
  encryption: {
    enabled: true,
    encryptMetadata: true,
    encryptFilenames: true,
    keyManagement: {
      keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  },
  healthcare: {
    enabled: true,
    hipaaCompliance: true,
    auditTrail: true,
    encryptionRequired: true,
    accessLogging: true,
    retentionPolicies: {
      public: 365 * 24 * 60 * 60 * 1000, // 1 year
      internal: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      confidential: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      restricted: 50 * 365 * 24 * 60 * 60 * 1000 // 50 years
    },
    consentManagement: true,
    anonymization: {
      enabled: true,
      algorithms: ['hash', 'tokenize', 'redact', 'generalize']
    }
  },
  processing: {
    virusScanning: { enabled: true },
    contentAnalysis: { enabled: true, classifyContent: true }
  }
}
```

## Event System

### Storage Events

The storage service publishes events through the Event Bus for real-time monitoring and integration:

```typescript
// Storage operation events
fastify.eventBus.subscribe('storage.operation', (event) => {
  console.log(`Storage ${event.operation}: ${event.filename}`)
})

// Storage health events
fastify.eventBus.subscribe('storage.health-changed', (event) => {
  if (event.newStatus === 'unhealthy') {
    // Send alert
  }
})

// Compliance violation events
fastify.eventBus.subscribe('storage.compliance-violation', (event) => {
  // Handle HIPAA violations
  console.log(`Compliance violation: ${event.violationType}`)
})

// Cleanup events
fastify.eventBus.subscribe('storage.cleanup-completed', (event) => {
  console.log(`Cleanup freed ${event.bytesFreed} bytes`)
})
```

### Event Types

- **storage.operation**: File operations (upload, download, delete)
- **storage.health-changed**: Provider health status changes
- **storage.compliance-violation**: HIPAA/compliance violations
- **storage.cleanup-completed**: Cleanup operation results

## Security & Compliance

### HIPAA Compliance Features

1. **Encryption**: AES-256-GCM encryption for files and metadata
2. **Audit Trails**: Comprehensive access logging
3. **Data Classification**: Automatic classification and handling
4. **Access Controls**: Role-based access and permissions
5. **Retention Policies**: Configurable retention based on classification
6. **Consent Management**: Track patient consent requirements

### Data Classification Levels

- **Public**: Non-sensitive data (1 year retention)
- **Internal**: Internal company data (7 years retention)
- **Confidential**: Sensitive business data (10 years retention)
- **Restricted**: HIPAA/PHI data (20+ years retention)

### Security Best Practices

1. Always enable encryption for healthcare data
2. Use strong access controls and authentication
3. Regularly rotate encryption keys
4. Monitor and audit file access
5. Implement proper backup and disaster recovery
6. Validate HIPAA compliance regularly

## Monitoring & Health Checks

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "storages": {
    "default": {
      "status": "healthy",
      "score": 95,
      "provider": "minio",
      "connected": true,
      "latency": 45,
      "errorRate": 0.001,
      "diskUsage": {
        "used": 1073741824,
        "total": 107374182400,
        "percentage": 0.01
      },
      "issues": [],
      "recommendations": []
    }
  }
}
```

### Metrics Response

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "storages": {
    "default": {
      "provider": "minio",
      "operations": {
        "uploads": 1250,
        "downloads": 3420,
        "deletes": 45,
        "errors": 12
      },
      "performance": {
        "averageUploadTime": 245,
        "averageDownloadTime": 123,
        "averageLatency": 67,
        "throughput": 15.5
      },
      "storage": {
        "totalFiles": 5678,
        "totalSize": 2147483648,
        "averageFileSize": 378234,
        "largestFile": 52428800
      }
    }
  }
}
```

## Error Handling

### Common Errors

- **FILE_NOT_FOUND**: File does not exist
- **FILE_TOO_LARGE**: File exceeds size limits
- **INVALID_FILE_TYPE**: MIME type not allowed
- **PERMISSION_DENIED**: Insufficient permissions
- **STORAGE_FULL**: Storage capacity exceeded
- **NETWORK_ERROR**: Connection issues
- **ENCRYPTION_ERROR**: Encryption/decryption failed
- **HIPAA_VIOLATION**: HIPAA compliance violation
- **PROVIDER_UNAVAILABLE**: Storage provider offline

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File with ID 'abc123' not found",
    "provider": "minio",
    "fileId": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Best Practices

### File Organization

1. Use meaningful file paths and naming conventions
2. Apply appropriate tags for categorization
3. Set correct data classification levels
4. Include relevant metadata for searchability

### Performance Optimization

1. Enable caching for frequently accessed files
2. Use compression for large text files
3. Implement proper cleanup policies
4. Monitor storage usage and performance

### Healthcare Compliance

1. Always set appropriate data classification
2. Enable audit logging for sensitive data
3. Implement proper consent management
4. Regular compliance validation
5. Secure key management and rotation

### Integration

1. Use events for real-time notifications
2. Implement proper error handling and retries
3. Monitor health and performance metrics
4. Use circuit breakers for resilience

## Troubleshooting

### Common Issues

**Connection Issues**
- Check MinIO endpoint and credentials
- Verify network connectivity
- Check firewall settings
- Validate SSL/TLS configuration

**Upload Failures**
- Verify file size limits
- Check available storage space
- Validate MIME type restrictions
- Review permission settings

**Performance Issues**
- Monitor cache hit rates
- Check network latency
- Review compression settings
- Analyze storage metrics

**Compliance Issues**
- Verify encryption settings
- Check audit trail configuration
- Review data classification
- Validate retention policies

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
LOG_LEVEL=debug
STORAGE_LOGGING_ENABLED=true
STORAGE_LOGGING_INCLUDE_METADATA=true
```

## Migration Guide

### From Local to MinIO

1. Configure MinIO connection settings
2. Create bucket and set permissions
3. Migrate existing files using batch operations
4. Update configuration to use MinIO provider
5. Validate data integrity and access

### Upgrading Storage Service

1. Review breaking changes in release notes
2. Update configuration as needed
3. Run database migrations if required
4. Test in staging environment
5. Deploy with zero-downtime strategy

## Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial release with local and MinIO providers
- HIPAA compliance features
- Enterprise integration (circuit breaker, retry, cache)
- Comprehensive API and health monitoring
- Event-driven architecture
- Healthcare-specific features and compliance