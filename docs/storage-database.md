# Storage Database Integration

## Overview

The Storage Database Integration enhances the AegisX Storage Service with comprehensive database persistence, providing metadata tracking, operation auditing, quota management, and file sharing capabilities.

## Features

### 🗄️ Database Schema
- **5 comprehensive tables** for complete storage metadata management
- **Relational integrity** with foreign key constraints
- **Optimized indexes** for high-performance queries
- **Healthcare-ready** data classification and audit trails

### 📊 Key Capabilities
- **File Metadata Tracking** - Complete file information persistence
- **Operation Audit Trail** - Detailed logging of all storage operations
- **Quota Management** - User/organization storage limits and tracking
- **File Sharing** - Secure file sharing between users with permissions
- **Version Control** - File versioning and history tracking
- **Analytics & Statistics** - Usage patterns and storage analytics
- **Search & Filtering** - Advanced file discovery capabilities

## Database Schema

### 1. `storage_files` - File Metadata
Primary table storing comprehensive file information:

```sql
- id (UUID, Primary Key)
- file_id (String, Unique) - Provider-specific file identifier
- filename (String) - Current filename
- original_name (String) - Original upload filename
- mime_type (String) - File MIME type
- size (BigInt) - File size in bytes
- checksum (String) - SHA256 file checksum
- checksum_algorithm (String) - Checksum algorithm used
- encoding (String) - File encoding
- provider (String) - Storage provider (local, minio)
- provider_path (String) - Provider-specific file path
- provider_metadata (JSON) - Provider-specific metadata
- data_classification (Enum) - public, internal, confidential, restricted
- encrypted (Boolean) - Encryption status
- encryption_key_id (String) - Encryption key reference
- tags (JSON) - File tags array
- custom_metadata (JSON) - Custom metadata object
- created_by (UUID) - User who created the file
- updated_by (UUID) - User who last updated the file
- created_at (Timestamp) - Creation timestamp
- updated_at (Timestamp) - Last update timestamp
- last_accessed_at (Timestamp) - Last access timestamp
- access_count (Integer) - Number of times accessed
- status (Enum) - active, archived, deleted, corrupted
- deleted_at (Timestamp) - Soft delete timestamp
```

### 2. `storage_operations` - Audit Trail
Comprehensive logging of all storage operations:

```sql
- id (UUID, Primary Key)
- file_id (UUID, Foreign Key) - Reference to storage_files
- operation (Enum) - upload, download, delete, copy, move, update_metadata
- status (Enum) - success, failed, pending
- provider (String) - Storage provider used
- bytes_transferred (BigInt) - Bytes transferred in operation
- duration_ms (Integer) - Operation duration in milliseconds
- client_ip (String) - Client IP address
- user_agent (String) - Client user agent
- user_id (UUID) - User performing operation
- session_id (String) - Session identifier
- correlation_id (String) - Request correlation ID
- error_code (String) - Error code if failed
- error_message (Text) - Error message if failed
- error_details (JSON) - Detailed error information
- purpose (String) - Operation purpose description
- metadata (JSON) - Operation-specific metadata
- created_at (Timestamp) - Operation timestamp
```

### 3. `storage_file_shares` - File Sharing
Secure file sharing with granular permissions:

```sql
- id (UUID, Primary Key)
- file_id (UUID, Foreign Key) - Reference to storage_files
- shared_by (UUID, Foreign Key) - User sharing the file
- shared_with (UUID, Foreign Key) - User receiving access
- can_read (Boolean) - Read permission
- can_write (Boolean) - Write permission
- can_delete (Boolean) - Delete permission
- can_share (Boolean) - Share permission
- expires_at (Timestamp) - Share expiration
- requires_password (Boolean) - Password protection
- password_hash (String) - Password hash if protected
- max_downloads (Integer) - Maximum download limit
- download_count (Integer) - Current download count
- is_active (Boolean) - Share status
- created_at (Timestamp) - Share creation time
- updated_at (Timestamp) - Last update time
- last_accessed_at (Timestamp) - Last access time
```

### 4. `storage_file_versions` - Version Control
File versioning and history tracking:

```sql
- id (UUID, Primary Key)
- file_id (UUID, Foreign Key) - Reference to storage_files
- version_number (Integer) - Version number
- version_file_id (String) - Provider-specific version file ID
- filename (String) - Version filename
- size (BigInt) - Version file size
- checksum (String) - Version checksum
- mime_type (String) - Version MIME type
- provider_path (String) - Version storage path
- created_by (UUID) - User who created version
- created_at (Timestamp) - Version creation time
- change_description (String) - Description of changes
- is_current (Boolean) - Current version flag
```

### 5. `storage_quotas` - Quota Management
User and organization storage quotas:

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key) - Reference to users
- entity_type (String) - user, organization, project
- entity_id (String) - Entity identifier
- max_storage_bytes (BigInt) - Maximum storage limit
- max_files (Integer) - Maximum file count limit
- max_file_size_bytes (BigInt) - Maximum individual file size
- used_storage_bytes (BigInt) - Current storage usage
- used_files (Integer) - Current file count
- is_active (Boolean) - Quota status
- created_at (Timestamp) - Quota creation time
- updated_at (Timestamp) - Last update time
- last_calculated_at (Timestamp) - Last usage calculation
```

## Service Architecture

### Repository Layer (`StorageFileRepository`)
- **CRUD operations** for all storage tables
- **Advanced querying** with filtering, searching, and pagination
- **Statistics and analytics** methods
- **Bulk operations** support
- **Performance-optimized** queries with proper indexing

### Service Layer (`StorageDatabaseService`)
- **Business logic** for storage database operations
- **File metadata management** with validation
- **Operation logging** and audit trail creation
- **Quota checking** and enforcement
- **File sharing** permission management
- **Statistics and analytics** aggregation

### Integration Layer (`StorageService`)
- **Seamless integration** with existing storage providers
- **Automatic database persistence** for all operations
- **Graceful degradation** if database is unavailable
- **Real-time quota updates** during operations
- **Comprehensive audit logging** for compliance

## Usage Examples

### File Upload with Database Persistence
```typescript
const uploadRequest: UploadRequest = {
  file: fileBuffer,
  filename: 'document.pdf',
  mimeType: 'application/pdf',
  metadata: {
    createdBy: userId,
    dataClassification: 'confidential',
    tags: ['document', 'patient-record'],
    customMetadata: {
      department: 'cardiology',
      patientId: 'P001'
    }
  }
}

const result = await storageService.upload(uploadRequest)
// Automatically saves metadata to database and logs operation
```

### File Download with Access Tracking
```typescript
const downloadRequest: DownloadRequest = {
  fileId: 'file_123',
  userId: currentUserId
}

const result = await storageService.download(downloadRequest)
// Automatically updates access count and logs download operation
```

### Database-Only Operations
```typescript
// Get file metadata from database
const metadata = await databaseService.getFileMetadata(fileId)

// Search files by criteria
const files = await databaseService.listFiles({
  userId: 'user123',
  mimeType: 'application/pdf',
  dataClassification: 'confidential',
  search: 'patient',
  limit: 50,
  offset: 0
})

// Check quota before upload
const quotaCheck = await databaseService.checkQuota(userId, fileSize)
if (!quotaCheck.allowed) {
  throw new Error(quotaCheck.reason)
}

// Get storage statistics
const stats = await databaseService.getStorageStatistics(userId)
```

### File Sharing
```typescript
// Share file with another user
await databaseService.shareFile(fileId, sharedBy, sharedWith, {
  canRead: true,
  canWrite: false,
  canDelete: false,
  canShare: false,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
})

// Get shared files for user
const sharedFiles = await databaseService.getSharedFiles(userId)
```

## Configuration

### Environment Variables
No additional environment variables required. The storage database integration uses the existing database connection configured in the main application.

### Migration and Seeding
```bash
# Run database migration to create storage tables
npm run db:migrate

# Seed sample storage data
npm run db:seed
```

## Integration with Existing Services

### Automatic Integration
The storage database service automatically integrates with:
- **Storage Service** - All file operations are persisted
- **Audit System** - Operation logs are recorded
- **Event Bus** - Storage events are published
- **Metrics Service** - Storage metrics are tracked
- **Cache Manager** - Database queries are cached where appropriate

### Graceful Degradation
If the database is unavailable:
- Storage operations continue to work with providers
- Database operations fail silently with warning logs
- Application functionality is not disrupted
- Database operations resume when connection is restored

## Healthcare Compliance

### HIPAA Considerations
- **Data Classification** - Built-in data classification levels
- **Audit Trails** - Comprehensive operation logging
- **Access Tracking** - File access monitoring
- **Secure Sharing** - Permission-based file sharing
- **Data Retention** - Configurable retention policies

### Security Features
- **Encryption Tracking** - Monitor file encryption status
- **Access Control** - Granular permission system
- **Audit Integrity** - Tamper-evident audit logs
- **Data Sanitization** - Secure data deletion tracking

## Performance Optimization

### Database Indexes
- **Composite indexes** for common query patterns
- **Single column indexes** for frequent lookups
- **Partial indexes** for status-based queries
- **Text indexes** for full-text search capabilities

### Query Optimization
- **Pagination support** for large datasets
- **Efficient joins** between related tables
- **Aggregation queries** for statistics
- **Prepared statements** for security and performance

### Caching Strategy
- **Metadata caching** for frequently accessed files
- **Statistics caching** for dashboard queries
- **Query result caching** for expensive operations
- **Cache invalidation** on data updates

## Monitoring and Metrics

### Available Metrics
- **Storage usage** by user/organization
- **File operations** counts and performance
- **Quota utilization** and trends
- **Error rates** and failure patterns
- **Access patterns** and popular files

### Health Monitoring
```typescript
// Get database health information
const healthInfo = await databaseService.getDatabaseHealthInfo()
// Returns: totalFiles, totalOperations, storageUsed, etc.
```

## Maintenance Operations

### Cleanup Operations
```typescript
// Mark corrupted files
await databaseService.markCorruptedFiles(['file1', 'file2'])

// Find orphaned files (deleted > 30 days ago)
const orphaned = await databaseService.findOrphanedFiles()

// Cleanup old operation logs
const cleaned = await databaseService.cleanupOldOperations(90) // 90 days
```

### Data Maintenance
- **Automatic quota recalculation** on file operations
- **Orphaned file detection** for cleanup
- **Audit log rotation** to manage size
- **Statistics aggregation** for reporting

## API Integration

The storage database service is automatically available via the storage service and does not require separate API endpoints. All database operations happen transparently during storage operations.

For direct database queries, the service is available through dependency injection in controllers and other services.

## Troubleshooting

### Common Issues
1. **Migration Failures** - Check database permissions and existing table conflicts
2. **Performance Issues** - Verify indexes are created and query optimization
3. **Quota Enforcement** - Ensure quota calculations are accurate and up-to-date
4. **Audit Trail Gaps** - Check database connection stability and error logging

### Debug Information
- Enable detailed logging for database operations
- Monitor query performance and slow queries
- Check foreign key constraint violations
- Verify data consistency between storage and database

## Future Enhancements

### Planned Features
- **Advanced search** with full-text indexing
- **File deduplication** detection and management
- **Automated cleanup** scheduling and policies
- **Advanced analytics** with machine learning insights
- **Multi-tenant** quota and isolation support

### Extension Points
- **Custom metadata schemas** for specific use cases
- **Plugin architecture** for additional storage providers
- **Advanced audit** with cryptographic verification
- **Integration APIs** for external systems