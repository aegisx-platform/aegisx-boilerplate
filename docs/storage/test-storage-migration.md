# Storage Migration Test Guide

## Overview
This guide helps verify the storage system migration from UUID to bigserial primary keys.

## Migration Summary

### Database Changes
- Primary keys changed from UUID to bigserial for better performance
- Added `uuid_public` columns for external UUID-based access
- Updated all foreign key relationships
- Maintained backward compatibility

### Tables Affected
1. `storage_files`
2. `storage_operations`
3. `storage_file_shares`
4. `storage_file_versions`
5. `storage_quotas`

## Testing Steps

### 1. Verify Database Schema

```sql
-- Check storage_files table structure
\d storage_files

-- Verify bigserial primary key
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'storage_files' 
AND column_name IN ('id', 'uuid_public', 'file_id');

-- Check indexes
\di storage_files*
```

### 2. Test File Upload

```bash
# Upload a test file
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg" \
  -F "path=test" \
  -F "dataClassification=internal"
```

Expected: File uploads successfully and returns `fileId` string.

### 3. Test File Retrieval

```bash
# Get file info using the returned fileId
curl -X GET http://localhost:3000/api/storage/files/{fileId} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Download file
curl -X GET http://localhost:3000/api/storage/download/{fileId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded.jpg
```

Expected: File information and download work with string fileId.

### 4. Test File Operations

```bash
# List files
curl -X GET http://localhost:3000/api/storage/files \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete file
curl -X DELETE http://localhost:3000/api/storage/files/{fileId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Verify Internal ID Usage

```sql
-- Check that operations are logged with bigserial IDs
SELECT id, uuid_public, file_id, operation, status 
FROM storage_operations 
ORDER BY created_at DESC 
LIMIT 10;

-- Verify foreign key relationships
SELECT 
  so.id as operation_id,
  so.file_id as file_internal_id,
  sf.file_id as file_public_id,
  sf.uuid_public
FROM storage_operations so
JOIN storage_files sf ON so.file_id = sf.id
LIMIT 5;
```

### 6. Performance Testing

```sql
-- Compare query performance with bigserial
EXPLAIN ANALYZE
SELECT sf.*, COUNT(so.id) as operation_count
FROM storage_files sf
LEFT JOIN storage_operations so ON sf.id = so.file_id
WHERE sf.status = 'active'
GROUP BY sf.id
LIMIT 100;
```

## Expected Results

1. **API Compatibility**: All existing API endpoints continue working with string `fileId`
2. **Database Performance**: JOIN operations should be faster with integer keys
3. **Data Integrity**: All existing data preserved with proper relationships
4. **UUID Access**: Share operations and external access still use UUIDs

## Rollback Plan

If issues occur, the migration includes a rollback function:

```bash
# Rollback the migration
npm run db:dev:rollback

# Note: This will restore UUID primary keys but lose auto-increment sequences
```

## Monitoring

After migration, monitor:
- API response times
- Database query performance
- Error logs for any ID-related issues
- Storage operation success rates