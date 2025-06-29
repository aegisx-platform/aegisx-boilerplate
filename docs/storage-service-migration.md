# Storage Service Migration Guide

This guide helps you migrate existing AegisX projects to include the new Enterprise Storage Service.

## Overview

The Storage Service provides enterprise-grade file storage with support for multiple providers (Local, MinIO), healthcare compliance, encryption, compression, and seamless integration with the existing infrastructure.

## Migration Steps

### 1. Update Project Dependencies

If you're working with an existing AegisX project, ensure you have the latest dependencies by running:

```bash
npm install
```

The storage service uses these new dependencies:
- `minio` - MinIO client for S3-compatible storage
- `uuid` - For unique file ID generation

### 2. Environment Configuration

Add the storage configuration to your `.env` file. Copy the storage section from `.env.example`:

```bash
# Storage Service Configuration
STORAGE_ENABLED=true
STORAGE_PROVIDER=local

# Local Storage Configuration
STORAGE_LOCAL_BASE_PATH=./storage/local
STORAGE_LOCAL_MAX_FILE_SIZE=104857600

# MinIO Configuration (for production)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aegisx
MINIO_SECRET_KEY=aegisx123
MINIO_BUCKET=aegisx-files
MINIO_USE_SSL=false

# Storage Features
STORAGE_COMPRESSION_ENABLED=true
STORAGE_ENCRYPTION_ENABLED=false
STORAGE_HEALTHCARE_ENABLED=false
```

### 3. Create Storage Directories

Create the necessary storage directories:

```bash
mkdir -p storage/local
mkdir -p storage/temp
mkdir -p storage/thumbnails
mkdir -p storage/minio
```

### 4. Docker Compose Updates

#### Option A: Add MinIO to Main Docker Compose

Update your `docker-compose.yml` to include storage environment variables (already done in the main file).

#### Option B: Use Separate Storage Stack

Use the dedicated storage stack:

```bash
# Start MinIO with storage stack
docker-compose -f docker-compose.storage.yml up -d

# Or start everything together
docker-compose -f docker-compose.yml -f docker-compose.storage.yml up -d
```

### 5. Register Storage Service

The storage service is automatically registered when you import the storage plugin. Ensure your main application file includes:

```typescript
// apps/api/src/main.ts
import { storagePlugin } from './app/core/plugins/storage.plugin'

// Register storage plugin
await app.register(storagePlugin)
```

### 6. Usage in Existing Code

#### Basic File Upload

```typescript
// In your controller
export class FileController {
  async uploadFile(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file()
    
    if (!data) {
      throw new Error('No file provided')
    }
    
    const buffer = await data.file.toBuffer()
    
    const result = await request.server.storage.upload({
      file: buffer,
      filename: data.filename,
      mimeType: data.mimetype,
      options: {
        tags: ['user-upload'],
        healthcare: request.user?.isHealthcareProvider ? {
          patientId: request.body.patientId,
          recordType: 'document',
          classification: 'confidential'
        } : undefined
      }
    })
    
    return reply.code(201).send(result)
  }
}
```

#### File Download

```typescript
export class FileController {
  async downloadFile(request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) {
    const { fileId } = request.params
    
    const result = await request.server.storage.download({
      fileId,
      options: {
        validateChecksum: true,
        auditAccess: true,
        purpose: 'User download'
      }
    })
    
    return reply
      .type(result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.data)
  }
}
```

### 7. Healthcare Compliance Migration

If your project handles healthcare data, enable compliance features:

```bash
# Environment variables
STORAGE_HEALTHCARE_ENABLED=true
STORAGE_HEALTHCARE_ENCRYPTION_REQUIRED=true
STORAGE_HEALTHCARE_AUDIT_TRAIL=true
STORAGE_ENCRYPTION_ENABLED=true
```

```typescript
// Upload healthcare documents
const result = await fastify.storage.upload({
  file: buffer,
  filename: 'patient-record.pdf',
  mimeType: 'application/pdf',
  options: {
    dataClassification: 'restricted',
    healthcare: {
      patientId: 'P12345',
      recordType: 'medical-record',
      classification: 'restricted',
      hipaaCompliant: true,
      retentionPeriod: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
      consentRequired: true,
      anonymized: false
    }
  }
})
```

### 8. Integration with Existing Services

The storage service automatically integrates with existing infrastructure:

#### Event Integration
```typescript
// Listen to storage events
fastify.eventBus.subscribe('storage.operation', async (event) => {
  if (event.operation === 'upload' && event.success) {
    // Send notification, update database, etc.
    await fastify.notification.send('email', userId, 'file-uploaded', {
      filename: event.filename,
      fileId: event.fileId
    })
  }
})
```

#### Audit Integration
```typescript
// Storage operations are automatically audited when healthcare is enabled
// Manual audit logging is also available
await fastify.storage.auditFileAccess(fileId, 'download', 'Medical review')
```

#### Metrics Integration
```typescript
// Storage metrics are automatically recorded
// Access metrics via the metrics service
const metrics = await fastify.storage.getStats()
console.log(`Total files: ${metrics.storage.totalFiles}`)
```

### 9. Testing Your Migration

#### Test Local Storage

```bash
# Ensure directories exist and are writable
ls -la storage/local

# Test upload via API
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test-file.txt" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Test MinIO Storage

```bash
# Start MinIO stack
docker-compose -f docker-compose.storage.yml up -d

# Access MinIO Console
open http://localhost:9001

# Login with: aegisx / aegisx123

# Test upload with MinIO provider
STORAGE_PROVIDER=minio npm run dev
```

### 10. Production Considerations

#### MinIO Production Setup

```bash
# Production environment variables
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=your-minio-server.com
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-production-access-key
MINIO_SECRET_KEY=your-production-secret-key

# Enable encryption for production
STORAGE_ENCRYPTION_ENABLED=true
STORAGE_ENCRYPTION_KEY=your-256-bit-encryption-key

# Enable healthcare compliance
STORAGE_HEALTHCARE_ENABLED=true
STORAGE_HEALTHCARE_ENCRYPTION_REQUIRED=true
```

#### Performance Optimization

```bash
# Enable caching
STORAGE_CACHE_ENABLED=true
STORAGE_CACHE_FILE_ENABLED=true

# Configure compression
STORAGE_COMPRESSION_ENABLED=true
STORAGE_COMPRESSION_THRESHOLD=1048576  # 1MB

# Enable circuit breaker
STORAGE_CIRCUIT_BREAKER_ENABLED=true
STORAGE_RETRY_ENABLED=true
```

### 11. Migration Checklist

- [ ] Updated `.env` with storage configuration
- [ ] Created storage directories
- [ ] Updated Docker Compose (if using MinIO)
- [ ] Tested file upload/download functionality
- [ ] Verified healthcare compliance (if applicable)
- [ ] Checked integration with existing services
- [ ] Tested both local and MinIO providers
- [ ] Configured production settings
- [ ] Updated API documentation
- [ ] Trained team on new storage features

## Troubleshooting

### Common Issues

#### Permission Denied on Local Storage
```bash
# Fix directory permissions
chmod -R 755 storage/
chown -R $USER:$USER storage/
```

#### MinIO Connection Issues
```bash
# Check MinIO status
docker-compose -f docker-compose.storage.yml logs minio

# Verify network connectivity
docker network ls
docker network inspect aegisx-network
```

#### File Upload Failures
```bash
# Check application logs
docker-compose logs api

# Verify file size limits
echo "STORAGE_LOCAL_MAX_FILE_SIZE=209715200" >> .env  # 200MB
```

### Health Checks

```typescript
// Check storage health
const health = await fastify.storage.getHealth()
console.log('Storage Status:', health.status)

// Get storage statistics
const stats = await fastify.storage.getStats()
console.log('Total Files:', stats.storage.totalFiles)
```

## Support

For additional help with migration:

1. Check the main documentation: `docs/storage-service.md`
2. Review the API reference in the service files
3. Examine the example usage in the controllers
4. Consult the Healthcare compliance section for HIPAA requirements

## Next Steps

After successful migration:

1. Implement file upload/download in your application
2. Set up automated backups for production
3. Configure monitoring and alerting
4. Train your team on the new storage features
5. Consider implementing file versioning and lifecycle policies