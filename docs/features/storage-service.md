# Storage Service Documentation

## Overview

The AegisX Storage Service is a comprehensive, enterprise-grade file storage solution with multi-provider support, healthcare compliance features, and seamless integration with modern web applications. It supports both local file system and MinIO (S3-compatible) storage providers with advanced features like encryption, compression, caching, and database integration.

## Features

### Core Features
- **Multi-Provider Support**: Local file system and MinIO (S3-compatible) storage
- **Swagger UI Integration**: Custom `@aegisx/fastify-multipart` plugin for form-based file uploads in Swagger UI
- **Database Integration**: Complete file metadata persistence with PostgreSQL
- **Enterprise Security**: AES-256-CBC encryption with proper IV handling
- **File Compression**: Configurable compression for supported MIME types
- **Caching**: Multi-level caching for metadata, files, and presigned URLs
- **Audit Logging**: Comprehensive operation tracking and compliance logging
- **Health Monitoring**: Real-time health checks and performance metrics
- **Circuit Breaker**: Resilience patterns for external service failures
- **Retry Logic**: Configurable retry mechanisms with exponential backoff

### Advanced Features
- **Data Classification**: Support for public, internal, confidential, and restricted data
- **Quota Management**: User-based storage quota tracking and enforcement
- **Presigned URLs**: Secure, time-limited access URLs for direct file operations
- **File Validation**: MIME type validation, size limits, and integrity checks
- **Batch Operations**: Upload, download, and delete multiple files efficiently
- **Event-Driven Architecture**: Integration with EventBus for real-time notifications

### Database Integration Features
- **Metadata Persistence**: All file metadata stored in PostgreSQL database
- **Operation Logging**: Complete audit trail of storage operations in database
- **File Sharing System**: Database-backed file sharing with expiration and permissions
- **Storage Quotas**: Configurable storage limits per user/entity with real-time tracking
- **File Versioning**: Track file versions and changes in database
- **Advanced Search**: Query files by metadata, tags, classification with database indexing
- **Statistics & Analytics**: Storage usage reports and insights from database

## Architecture

### Multi-Layer Architecture with Database Integration

```
┌─────────────────────────────────────────────────────────────┐
│                  API Routes Layer                          │
│           (HTTP endpoints, schema validation)              │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                Storage Controller Layer                    │
│         (Request handling, authentication)                 │
└─────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼────────┐                           ┌──────────▼─────────┐
│ Storage Service│                           │ Database Service   │
│ (File Storage) │                           │ (Metadata/Audit)   │
└────────────────┘                           └────────────────────┘
        │                                               │
┌───────▼────────┐                           ┌──────────▼─────────┐
│   Providers    │                           │   Repository       │
│ (Local/MinIO)  │                           │   (Data Access)    │
└────────────────┘                           └────────────────────┘
                                                       │
                                            ┌──────────▼─────────┐
                                            │    PostgreSQL      │
                                            │    (Database)      │
                                            └────────────────────┘
```

### Key Components

1. **API Routes**: RESTful endpoints with schema validation
2. **Storage Controller**: HTTP request handling and business logic coordination
3. **Storage Service**: Main service interface with enterprise features for file operations
4. **Database Service**: Metadata management, audit logging, and analytics
5. **Repository Layer**: Data access abstraction for database operations
6. **Storage Providers**: Pluggable backends (Local, MinIO)
7. **Event System**: Real-time event publishing and subscription
8. **Enterprise Integration**: Circuit breaker, retry, cache, metrics

## Installation & Setup

### Prerequisites
- Node.js 18+ with TypeScript support
- PostgreSQL database
- MinIO server (optional, for S3-compatible storage)
- Redis (optional, for caching)

### Package Dependencies
```bash
# Core dependencies
npm install @aegisx/fastify-multipart uuid crypto zlib
npm install minio @types/minio

# Development dependencies
npm install --save-dev @types/uuid
```

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
STORAGE_ENCRYPTION_ENABLED=false
STORAGE_ENCRYPTION_ALGORITHM=aes-256-cbc

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/aegisx_db
STORAGE_DATABASE_ENABLED=true
STORAGE_QUOTA_ENFORCEMENT=true
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

## API Documentation

### Authentication
All storage endpoints require JWT authentication:
```bash
Authorization: Bearer <jwt-token>
```

### Upload Endpoint

**POST** `/api/v1/storage/upload`

Upload files with metadata using multipart form data. This endpoint supports Swagger UI form interface.

#### Form Fields
- `file` (required): Binary file data
- `path` (optional): Storage path for the file
- `dataClassification` (optional): `public` | `internal` | `confidential` | `restricted`
- `encrypt` (optional): `true` | `false` - Override default encryption strategy (MinIO: false, Local: env-based)
- `overwrite` (optional): `true` | `false` - Allow overwriting existing files
- `tags` (optional): Comma-separated tags for file organization
- `customMetadata` (optional): JSON string with additional metadata

#### Example using curl
```bash
curl -X POST "http://localhost:3000/api/v1/storage/upload" \
  -H "Authorization: Bearer <jwt-token>" \
  -F "file=@document.pdf" \
  -F "path=documents/2025" \
  -F "dataClassification=confidential" \
  -F "encrypt=true" \
  -F "tags=financial,report,2025" \
  -F "customMetadata={\"department\":\"finance\",\"quarter\":\"Q1\"}"
```

#### Response
```json
{
  "success": true,
  "fileId": "uuid-string",
  "filename": "uuid-string.pdf",
  "path": "documents/2025",
  "size": 1048576,
  "checksum": "sha256-hash",
  "mimeType": "application/pdf",
  "encrypted": true,
  "dataClassification": "confidential",
  "metadata": {
    "originalName": "document.pdf",
    "createdAt": "2025-01-05T10:30:00Z",
    "tags": ["financial", "report", "2025"],
    "customMetadata": {
      "department": "finance",
      "quarter": "Q1"
    }
  },
  "url": "/api/v1/storage/download/uuid-string"
}
```

### Download Endpoint

**GET** `/api/v1/storage/download/:fileId`

Download files with automatic decryption and decompression.

#### Parameters
- `fileId` (required): Unique file identifier
- `purpose` (optional): Audit purpose for the download
- `validateChecksum` (optional): Verify file integrity
- `decrypt` (optional): Auto-decrypt encrypted files (default: true)
- `decompress` (optional): Auto-decompress compressed files (default: true)

#### Example
```bash
curl -X GET "http://localhost:3000/api/v1/storage/download/uuid-string?purpose=user-request" \
  -H "Authorization: Bearer <jwt-token>" \
  --output downloaded-file.pdf
```

### File Information Endpoint

**GET** `/api/v1/storage/info/:fileId`

Retrieve comprehensive file metadata without downloading the actual file.

#### Response
```json
{
  "success": true,
  "fileInfo": {
    "fileId": "uuid-string",
    "filename": "uuid-string.pdf",
    "originalName": "document.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "path": "documents/2025",
    "checksum": "sha256-hash",
    "encrypted": true,
    "dataClassification": "confidential",
    "metadata": {
      "createdAt": "2025-01-05T10:30:00Z",
      "updatedAt": "2025-01-05T10:30:00Z",
      "createdBy": "user-id",
      "tags": ["financial", "report", "2025"],
      "customMetadata": {
        "department": "finance",
        "quarter": "Q1"
      }
    },
    "urls": {
      "download": "/api/v1/storage/download/uuid-string"
    },
    "permissions": {
      "canRead": true,
      "canWrite": true,
      "canDelete": true,
      "canShare": true
    }
  }
}
```

### List Files Endpoint

**GET** `/api/v1/storage/files`

List files with advanced filtering, sorting, and pagination.

#### Query Parameters
- `limit`: Maximum files to return (1-1000, default: 50)
- `offset`: Files to skip for pagination (default: 0)
- `sortBy`: Sort field (`name` | `size` | `created` | `modified`, default: `created`)
- `sortOrder`: Sort direction (`asc` | `desc`, default: `desc`)
- `mimeType`: Filter by MIME type
- `dataClassification`: Filter by classification level
- `tags`: Comma-separated tags to filter by
- `sizeMin`: Minimum file size in bytes
- `sizeMax`: Maximum file size in bytes
- `createdAfter`: ISO date string for created date filter
- `createdBefore`: ISO date string for created date filter

#### Example
```bash
curl -X GET "http://localhost:3000/api/v1/storage/files?limit=10&dataClassification=confidential&sortBy=size&sortOrder=desc" \
  -H "Authorization: Bearer <jwt-token>"
```

### Delete Endpoint

**DELETE** `/api/v1/storage/delete/:fileId`

Safely delete files with audit logging and quota updates.

#### Parameters
- `fileId` (required): File to delete
- `force` (optional): Force delete even if file has dependencies
- `reason` (optional): Deletion reason for audit purposes

#### Example
```bash
curl -X DELETE "http://localhost:3000/api/v1/storage/delete/uuid-string?reason=user-request" \
  -H "Authorization: Bearer <jwt-token>"
```

### Health Check Endpoint

**GET** `/api/v1/storage/health`

Monitor storage service health and performance metrics.

#### Response
```json
{
  "status": "healthy",
  "score": 95,
  "provider": "local",
  "connected": true,
  "latency": 25,
  "errorRate": 0.001,
  "diskUsage": {
    "used": 1073741824,
    "total": 107374182400,
    "percentage": 0.01
  },
  "issues": [],
  "recommendations": [],
  "lastCheck": "2025-01-05T10:30:00Z"
}
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
    customMetadata: {
      department: 'medical',
      recordType: 'patient-document',
      sensitivity: 'high'
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

### Advanced Data Handling

```typescript
// Check file classification
const fileInfo = await fastify.storage.getFileInfo(fileId)

// File search with classification filter
const searchResults = await fastify.storage.searchFiles('document', {
  filters: { 
    dataClassification: ['confidential', 'restricted'],
    tags: ['sensitive']
  }
})

// Audit file access through the audit system
await fastify.auditLog.log({
  action: 'file.download',
  resource: 'storage',
  resourceId: fileId,
  details: { purpose: 'Document review' }
})
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

// Database-specific operations
// Get file metadata from database
const metadata = await fastify.storage.getFileMetadata('file-123')

// Update file metadata
await fastify.storage.updateFileMetadata('file-123', {
  tags: ['medical', 'updated'],
  customMetadata: { department: 'radiology' }
})

// Check storage quota
const quotaCheck = await fastify.storage.checkQuota('user-456', 50 * 1024 * 1024) // 50MB
if (!quotaCheck.allowed) {
  throw new Error('Storage quota exceeded')
}

// Get storage statistics for user
const userStats = await fastify.storage.getUserStatistics('user-456')
```

## API Endpoints

### File Operations (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/storage/upload` | Upload a file with metadata |
| GET | `/api/v1/storage/download/:fileId` | Download a file |
| GET | `/api/v1/storage/files/:fileId` | Get file information and metadata |
| GET | `/api/v1/storage/files` | List files with advanced filtering |
| DELETE | `/api/v1/storage/files/:fileId` | Delete a file |
| POST | `/api/v1/storage/presigned-url` | Generate presigned URL |
| POST | `/api/v1/storage/share` | Share a file with another user |
| GET | `/api/v1/storage/stats` | Get storage usage statistics |

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
| GET | `/admin/storage/classify/:fileId` | Get file classification |

## Database Schema

The storage system uses a comprehensive database schema with 5 main tables for metadata management:

### storage_files
Primary table for file metadata and information:
- `id`: UUID primary key
- `file_id`: Unique file identifier (indexed)
- `filename`: Current filename
- `original_name`: Original uploaded filename
- `mime_type`: File MIME type
- `size`: File size in bytes
- `checksum`: File integrity checksum
- `provider`: Storage provider (local, minio)
- `provider_path`: Provider-specific file path
- `data_classification`: Security classification level
- `encrypted`: Whether file is encrypted
- `tags`: JSON array of tags
- `custom_metadata`: JSON object of custom metadata
- `created_by`, `updated_by`: User tracking
- `created_at`, `updated_at`: Timestamps
- `last_accessed_at`: Last access timestamp
- `access_count`: Number of times accessed
- `status`: File status (active, archived, deleted, corrupted)

### storage_operations
Audit trail of all storage operations:
- `id`: UUID primary key
- `file_id`: Related file ID (indexed)
- `operation`: Type of operation (upload, download, delete, etc.)
- `status`: Operation status (success, failed, pending)
- `provider`: Storage provider used
- `bytes_transferred`: Amount of data transferred
- `duration`: Operation duration in milliseconds
- `user_id`: User who performed operation
- `client_ip`: Client IP address
- `user_agent`: User agent string
- `session_id`: Session identifier
- `correlation_id`: Request correlation ID
- `error_code`, `error_message`: Error details if failed
- `purpose`: Purpose/reason for operation
- `metadata`: Additional operation metadata (JSON)
- `created_at`: Operation timestamp

### storage_file_shares
File sharing permissions and access control:
- `id`: UUID primary key
- `file_id`: Shared file ID (indexed)
- `shared_by`: User who shared the file
- `shared_with`: User receiving shared access
- `permissions`: JSON object with access permissions
- `expires_at`: Share expiration date
- `requires_password`: Whether password is required
- `max_downloads`: Maximum download limit
- `download_count`: Current download count
- `is_active`: Whether share is currently active
- `created_at`, `updated_at`: Timestamps
- `last_accessed_at`: Last access timestamp

### storage_file_versions
File version history and tracking:
- `id`: UUID primary key
- `file_id`: Parent file ID (indexed)
- `version_number`: Sequential version number
- `checksum`: Version-specific checksum
- `size`: Version file size
- `provider_path`: Storage path for this version
- `metadata`: Version-specific metadata (JSON)
- `created_by`: User who created version
- `created_at`: Version creation timestamp
- `is_current`: Whether this is the current version

### storage_quotas
User and entity storage quotas:
- `id`: UUID primary key
- `user_id`: User ID for quota
- `entity_type`: Type of entity (user, department, organization)
- `entity_id`: Entity identifier
- `max_storage_bytes`: Maximum storage limit in bytes
- `max_files`: Maximum number of files
- `max_file_size_bytes`: Maximum individual file size
- `used_storage_bytes`: Current storage usage
- `used_files`: Current file count
- `is_active`: Whether quota is active
- `created_at`, `updated_at`: Timestamps
- `last_calculated_at`: Last quota calculation timestamp

### Database Setup Commands

```bash
# Run migration to create tables
npm run db:migrate

# Seed sample data (optional)
npm run db:seed

# Reset database (development only)
npm run db:reset
```

## Multipart Integration

### Custom @aegisx/fastify-multipart Plugin

The storage service uses a custom multipart plugin that enables Swagger UI form support while maintaining security and validation.

#### Key Features
- **Swagger UI Compatibility**: Form-based file uploads work seamlessly in Swagger documentation
- **Plain Field Values**: Returns clean string values instead of wrapped objects
- **Security**: Maintains file size limits and validation
- **Performance**: Optimized for large file uploads

#### Configuration
```typescript
// In storage.routes.ts
await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
    fieldSize: 1024 * 1024,
    fields: 10
  },
  autoContentTypeParser: true
})

// Validation bypass for multipart routes
fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
  return function validate(data) {
    if (httpPart === 'body' && url && url.includes('/upload')) {
      return { value: data }
    }
    return { value: data }
  }
})
```

#### Usage in Controller
```typescript
// Parse multipart data
const { files, fields } = await (request as any).parseMultipart()
const file = files[0]
const fileBuffer = await file.toBuffer()

// Access clean field values
const dataClassification = fields.dataClassification // "public" (not wrapped)
const encrypt = fields.encrypt === 'true' // Clean boolean conversion
const tags = fields.tags ? fields.tags.split(',') : []
```

## Security Features

### Encryption

#### Modern AES-256-CBC Encryption
The service uses secure encryption with proper initialization vectors:

```typescript
// Encryption process
private async encryptFile(data: Buffer, fileId: string): Promise<Buffer> {
  const key = crypto.scryptSync(fileId, 'salt', 32)
  const iv = crypto.randomBytes(16) // Generate random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  
  const encrypted = Buffer.concat([
    iv, // Prepend IV to encrypted data
    cipher.update(data),
    cipher.final()
  ])
  
  return encrypted
}

// Decryption process  
private async decryptFile(encryptedData: Buffer, fileId: string): Promise<Buffer> {
  const key = crypto.scryptSync(fileId, 'salt', 32)
  const iv = encryptedData.subarray(0, 16) // Extract IV from beginning
  const ciphertext = encryptedData.subarray(16) // Rest is encrypted data
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ])
  
  return decrypted
}
```

#### Encryption Strategy

The encryption strategy follows a smart default approach based on storage provider and user preferences:

**Priority Order:**
1. **User Choice** (highest priority): If `encrypt` field is specified, it always takes precedence
2. **Provider-Based Defaults**: When user doesn't specify `encrypt`:
   - **MinIO**: Default `false` (uses MinIO's server-side encryption)
   - **Local Storage**: Based on `STORAGE_LOCAL_AUTO_ENCRYPT` environment variable

**Examples:**
```yaml
# User specifies encrypt=true (always encrypted regardless of provider)
MinIO + encrypt: true → Encrypted file in MinIO
Local + encrypt: true → Encrypted file on disk

# User specifies encrypt=false (never encrypted)
MinIO + encrypt: false → Plain file in MinIO  
Local + encrypt: false → Plain file on disk

# User doesn't specify (uses defaults)
MinIO + undefined → Plain file (MinIO handles encryption)
Local + undefined → Based on STORAGE_LOCAL_AUTO_ENCRYPT
```

**Environment Variables:**
```bash
# For local storage when user doesn't specify encrypt option
STORAGE_LOCAL_AUTO_ENCRYPT=false  # Development: convenience
STORAGE_LOCAL_AUTO_ENCRYPT=true   # Production: security
```

### Data Classification

#### Classification Levels
- **Public**: No encryption required, accessible to all authenticated users
- **Internal**: Standard encryption, accessible to organization members
- **Confidential**: Strong encryption, restricted access logging
- **Restricted**: Maximum encryption, comprehensive audit trails

#### Field Persistence Fix
Recent fixes ensure that field values are correctly persisted:
- `dataClassification` now reads from `request.metadata` instead of `request.options`
- `encrypt` flag properly overrides global configuration settings
- All form field values are validated and stored correctly

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
  security: {
    enabled: true,
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
  security: {
    enabled: true,
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
  // Handle compliance violations
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
- **storage.compliance-violation**: Data compliance violations
- **storage.cleanup-completed**: Cleanup operation results

## Security & Compliance

### Security & Compliance Features

1. **Encryption**: AES-256-CBC encryption for files and metadata
2. **Audit Trails**: Comprehensive access logging
3. **Data Classification**: Automatic classification and handling
4. **Access Controls**: Role-based access and permissions
5. **Retention Policies**: Configurable retention based on classification
6. **Metadata Protection**: Secure handling of sensitive file information

### Data Classification Levels

- **Public**: Non-sensitive data (1 year retention)
- **Internal**: Internal company data (7 years retention)
- **Confidential**: Sensitive business data (10 years retention)
- **Restricted**: Highly sensitive data (20+ years retention)

### Security Best Practices

1. Always enable encryption for sensitive data
2. Use strong access controls and authentication
3. Regularly rotate encryption keys
4. Monitor and audit file access
5. Implement proper backup and disaster recovery
6. Validate data classification and compliance regularly

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
- **COMPLIANCE_VIOLATION**: Data compliance violation
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

#### 1. Encryption Failures
**Problem**: RetryService failures with 500 errors during encryption
**Solution**: Updated to use modern `crypto.createCipheriv()` with proper IV handling

```typescript
// Old (deprecated and causes failures)
const cipher = crypto.createCipher('aes-256-cbc', key)

// New (secure and reliable)
const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
```

#### 2. Field Value Persistence
**Problem**: `dataClassification` and `encrypt` values not saving correctly
**Solution**: Fixed to read from `request.metadata` instead of `request.options`

```typescript
// Old (incorrect field mapping)
dataClassification: request.options?.dataClassification

// New (correct field mapping)
dataClassification: request.metadata?.dataClassification
```

#### 3. Swagger UI Multipart Issues  
**Problem**: Multipart uploads not working in Swagger UI
**Solution**: Migrated to `@aegisx/fastify-multipart` with validation bypass

```typescript
// Migration steps:
npm uninstall @fastify/multipart
npm install @aegisx/fastify-multipart

// Update configuration
await fastify.register(multipart, {
  autoContentTypeParser: true  // Instead of attachFieldsToBody: true
})
```

#### 4. Database Connection Issues
**Problem**: File metadata not saving to database
**Solution**: Ensure Knex instance is properly injected into StorageService

```typescript
// Correct initialization
const repository = new StorageFileRepository(knex)
const databaseService = new StorageDatabaseService(repository)
const storageService = new StorageService(config, eventBus, circuitBreaker, retry, cache, metrics, knex)
```

### Debug Tips

#### Enable Debug Logging
```typescript
// Add debug logging to storage operations
console.log('Upload request:', {
  filename: request.filename,
  size: request.file.length,
  dataClassification: request.metadata?.dataClassification,
  encrypt: request.options?.encrypt
})
```

#### Health Check Monitoring
```bash
# Check storage service health
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/storage/health
```

#### Database Query Debugging
```sql
-- Check recent uploads
SELECT file_id, original_name, data_classification, encrypted, created_at 
FROM storage_files 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check operation logs
SELECT operation, status, error_message, created_at
FROM storage_operations 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Migration Guide

#### From @fastify/multipart to @aegisx/fastify-multipart

1. **Update package.json**:
```bash
npm uninstall @fastify/multipart
npm install @aegisx/fastify-multipart
```

2. **Update imports**:
```typescript
// Old
import multipart from '@fastify/multipart'

// New  
import multipart from '@aegisx/fastify-multipart'
```

3. **Update multipart configuration**:
```typescript
// Old
await fastify.register(multipart, {
  attachFieldsToBody: true
})

// New
await fastify.register(multipart, {
  autoContentTypeParser: true
})
```

4. **Update request parsing**:
```typescript
// Old
const body = request.body as any
const fileBuffer = await body.file.toBuffer()
const dataClassification = body.dataClassification?.value

// New
const { files, fields } = await (request as any).parseMultipart()
const fileBuffer = await files[0].toBuffer()
const dataClassification = fields.dataClassification // Plain string
```

### Performance Monitoring

#### Caching Strategy
```typescript
// Metadata caching
const cacheKey = `fileinfo:${fileId}`
if (this.cache && this.config.caching.metadataCache.enabled) {
  const cached = await this.cache.get<FileInfo>(cacheKey)
  if (cached) return cached
}

// File content caching (for small files)
if (result.size <= this.config.caching.fileCache.maxFileSize) {
  await this.cache.set(cacheKey, result, {
    ttl: this.config.caching.fileCache.ttl
  })
}
```

#### Custom Metrics
```typescript
// Operation metrics
await this.recordMetric('storage.upload.success', 1, {
  provider: this.config.provider,
  size: request.file.length,
  mimeType: request.mimeType,
  encrypted: result.encrypted
})

// Business metrics
await this.recordMetric('storage.classification.usage', 1, {
  classification: request.metadata?.dataClassification,
  department: request.metadata?.customMetadata?.department
})
```

### Resilience Patterns

#### Circuit Breaker Integration
```typescript
// Circuit breaker protection
if (this.circuitBreaker && this.config.integration.circuitBreaker.enabled) {
  return await this.circuitBreaker.execute(async () => {
    return await operation()
  })
}
```

#### Retry Mechanism
```typescript
// Exponential backoff retry
if (this.retry && this.config.integration.retry.enabled) {
  return await this.retry.execute({
    operation,
    strategy: 'standard',
    maxAttempts: 3,
    baseDelay: 1000
  })
}
```

### Best Practices

#### Security
1. Always validate file types and sizes before upload
2. Use explicit encryption for sensitive data classifications
3. Implement proper audit logging for compliance
4. Regularly rotate encryption keys (future enhancement)
5. Monitor access patterns for anomaly detection

#### Performance
1. Enable caching for frequently accessed metadata
2. Use presigned URLs for large file operations
3. Implement file compression for supported types
4. Monitor disk usage and implement cleanup policies
5. Use batch operations for multiple file handling

#### Monitoring
1. Set up health check alerts for storage providers
2. Monitor error rates and latency metrics
3. Track storage usage by user and classification
4. Implement log aggregation for audit trails
5. Set up automated backup verification

#### Development
1. Use development configuration for local testing
2. Test with various file types and sizes
3. Validate multipart form handling in Swagger UI
4. Test encryption/decryption cycles thoroughly
5. Verify database integration with proper migrations

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

### v2.1.0 (2025-01-05) - Latest Updates
- **@aegisx/fastify-multipart Integration**: Migrated from `@fastify/multipart` for Swagger UI support
- **Secure Encryption**: Updated to modern `crypto.createCipheriv()` with proper IV handling
- **Field Persistence Fixes**: Corrected `dataClassification` and `encrypt` field mapping from form data
- **Database Integration**: Enhanced PostgreSQL integration with comprehensive metadata persistence
- **Swagger UI Support**: Form-based file uploads now work seamlessly in Swagger documentation
- **Performance Improvements**: Fixed RetryService failures and encryption errors
- **Enhanced Security**: Removed deprecated crypto methods and added proper IV generation
- **API Enhancements**: Clean field value parsing with `parseMultipart()` method
- **Documentation**: Complete API documentation with troubleshooting guides

### v2.0.0 (2024-12-30)
- **Database Integration**: Complete PostgreSQL integration for metadata management
- **Advanced API**: RESTful API with TypeBox schema validation
- **File Sharing System**: Database-backed file sharing with permissions and expiration
- **Storage Quotas**: User and entity-based storage quota management
- **Operation Auditing**: Complete audit trail of all storage operations
- **Advanced Search**: Query files by metadata, tags, and classification
- **Storage Analytics**: Comprehensive usage statistics and reporting
- **File Versioning**: Track and manage file versions in database

### v1.0.0 (2024-01-01)
- Initial release with local and MinIO providers
- Data compliance features
- Enterprise integration (circuit breaker, retry, cache)
- Comprehensive API and health monitoring
- Event-driven architecture
- Security and compliance framework