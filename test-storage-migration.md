# Storage Migration Test Plan

## Manual Testing Steps

### 1. Database Migration
```bash
# Run the migration
npm run db:migrate

# Verify tables structure
psql -h localhost -p 5432 -U postgres -d aegisx_dev -c "\d storage_files"
psql -h localhost -p 5432 -U postgres -d aegisx_dev -c "\d storage_operations"
psql -h localhost -p 5432 -U postgres -d aegisx_dev -c "\d storage_file_shares"
```

### 2. API Endpoint Testing
Test that existing API endpoints continue to work:

```bash
# Upload a file
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-file.txt"

# Download by file_id (should work as before)
curl -X GET http://localhost:3000/api/storage/download/RETURNED_FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get file info
curl -X GET http://localhost:3000/api/storage/files/RETURNED_FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# List files
curl -X GET http://localhost:3000/api/storage/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Database Verification
Verify the data structure after migration:

```sql
-- Check that bigserial IDs are working
SELECT id, uuid_public, file_id, filename FROM storage_files LIMIT 5;

-- Check foreign key relationships
SELECT sf.id, sf.uuid_public, so.id, so.uuid_public 
FROM storage_files sf 
JOIN storage_operations so ON sf.id = so.file_id 
LIMIT 5;

-- Verify folder relationships
SELECT sf.id, sf.folder_id, fo.id, fo.name 
FROM storage_files sf 
LEFT JOIN storage_folders fo ON sf.folder_id = fo.id 
LIMIT 5;
```

## Expected Results

### Database Structure
- Primary keys should be bigserial (auto-incrementing integers)
- `uuid_public` columns should contain UUID values
- Foreign key relationships should use bigserial IDs
- `file_id` string column should remain unchanged for API compatibility

### API Behavior
- All existing endpoints should work without changes
- File uploads should return the same `file_id` format
- File downloads should work with existing `file_id` values
- File sharing should use UUID-based share identifiers

### Performance
- Database queries should be faster due to integer primary keys
- JOIN operations should be more efficient
- Index lookups should improve

## Troubleshooting

### Common Issues
1. **Foreign key constraint errors**: Check that all related records were properly migrated
2. **UUID format errors**: Verify that `uuid_public` columns contain valid UUIDs
3. **API parameter type errors**: Ensure controllers handle both string file_ids and numeric internal IDs correctly

### Rollback Plan
If issues occur, the migration includes a `down()` function, but manual verification and cleanup may be required for complex data relationships.

## Migration Benefits Achieved

1. **Performance**: Faster JOIN operations with integer primary keys
2. **Storage**: Reduced storage overhead from smaller primary keys  
3. **Security**: Internal sequential IDs hidden from public interface
4. **Compatibility**: Public API continues to use stable string identifiers
5. **Future-proofing**: UUID public identifiers available for new features requiring UUID-based access