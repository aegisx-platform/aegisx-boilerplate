# File Access Control Plugin

## Overview

The File Access Control Plugin provides comprehensive security middleware for file operations in the storage system. It ensures that users can only access files they own or have been explicitly granted permission to access through the shared files system.

## Features

- **Ownership-based Access**: File owners have full access to their files
- **Shared Permissions**: Granular access control through file shares
- **Operation-specific Checks**: Different permissions for read/write/delete/share operations
- **Caching**: Performance optimization with configurable cache expiration
- **Audit Integration**: Comprehensive logging of access attempts and results
- **Automatic Cleanup**: Cache management and share expiration handling

## Installation

The plugin is automatically registered in the core plugins chain and requires the following dependencies:
- Database plugin (Knex)
- Audit plugin (optional, for logging)

```typescript
// Already registered in apps/api/src/app/core/plugins/index.ts
await fastify.register(fileAccessControl)
```

## Configuration

```typescript
interface FileAccessControlOptions {
  enableCache?: boolean        // Default: true
  cacheExpiration?: number     // Default: 5 minutes (300000ms)
  enableAuditLogging?: boolean // Default: true
}
```

## API Reference

### Fastify Instance Extensions

The plugin extends the Fastify instance with the following decorators:

#### `fastify.checkFileAccess(operation)`

Middleware factory that creates preHandler middleware for route protection.

**Parameters:**
- `operation`: `'read' | 'write' | 'delete' | 'share'`

**Returns:** `preHandlerHookHandler`

**Usage:**
```typescript
// Single operation check
fastify.get('/files/:fileId', {
  preHandler: [
    fastify.authenticate,
    fastify.checkFileAccess('read')
  ]
}, handler)

// Multiple middleware
fastify.delete('/files/:fileId', {
  preHandler: [
    fastify.authenticate,
    fastify.checkFileAccess('delete')
  ]
}, handler)
```

#### `fastify.fileAccessControl`

Direct access to the FileAccessControlService instance.

**Methods:**
- `checkAccess(fileId, userId, operation)`: Check access permissions
- `clearCache(fileId?, userId?)`: Clear cached permissions

## Operation Types

### `read`
- **Owner**: Always allowed
- **Shared**: Requires `can_read: true` permission
- **Use cases**: Download files, view file metadata, generate presigned URLs for reading

### `write`
- **Owner**: Always allowed  
- **Shared**: Requires `can_write: true` permission
- **Use cases**: Upload new versions, update file metadata

### `delete`
- **Owner**: Always allowed
- **Shared**: Requires `can_delete: true` permission
- **Use cases**: Delete files permanently

### `share`
- **Owner**: Always allowed
- **Shared**: Requires `can_share: true` permission  
- **Use cases**: Create shares with other users

## Access Control Logic

### 1. File Ownership Check
```typescript
if (file.created_by === userId) {
  return { allowed: true, isOwner: true }
}
```

### 2. Shared Permission Check
```typescript
const share = await getActiveShare(fileId, userId)
if (share && share[`can_${operation}`]) {
  return { allowed: true, isOwner: false, shareId: share.id }
}
```

### 3. Additional Validations
- File must exist and be active
- Share must be active (`is_active: true`)
- Share must not be expired (`expires_at > now`)

## Response Structure

### Successful Access
```json
{
  "allowed": true,
  "isOwner": true,
  "reason": "File owner"
}
```

```json
{
  "allowed": true,
  "isOwner": false,
  "shareId": "uuid",
  "reason": "Share permission: read",
  "permissions": {
    "canRead": true,
    "canWrite": false,
    "canDelete": false,
    "canShare": false
  }
}
```

### Access Denied
```json
{
  "allowed": false,
  "reason": "No access permission"
}
```

## Error Handling

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | User not authenticated |
| 400 | `INVALID_REQUEST` | File ID missing |
| 404 | `FILE_NOT_FOUND` | File does not exist |
| 403 | `ACCESS_DENIED` | Insufficient permissions |
| 500 | `INTERNAL_SERVER_ERROR` | Access control check failed |

### Error Response Format
```json
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You do not have permission to delete this file"
  }
}
```

## Route Integration Examples

### Standard File Operations
```typescript
// Download with read permission
fastify.get('/download/:fileId', {
  preHandler: [
    fastify.authenticate,
    fastify.checkFileAccess('read')
  ]
}, downloadHandler)

// Delete with delete permission
fastify.delete('/files/:fileId', {
  preHandler: [
    fastify.authenticate,
    fastify.checkFileAccess('delete')
  ]
}, deleteHandler)
```

### Custom Share Check
```typescript
// Share endpoint with custom middleware (fileId in body)
fastify.post('/share', {
  preHandler: [
    fastify.authenticate,
    async (request, reply) => {
      const { fileId } = request.body
      const user = request.user
      
      const accessResult = await fastify.fileAccessControl.checkAccess(
        fileId, 
        user.id, 
        'share'
      )
      
      if (!accessResult.allowed) {
        return reply.code(403).send({
          error: {
            code: 'ACCESS_DENIED',
            message: accessResult.reason
          }
        })
      }
    }
  ]
}, shareHandler)
```

## Performance Features

### Caching
- **Automatic caching**: Access results cached for 5 minutes by default
- **Cache key format**: `{fileId}:{userId}:{operation}`
- **Cache invalidation**: Automatic cleanup of expired entries
- **Cache clearing**: Manual clearing when shares are modified

### Cache Management
```typescript
// Clear all cache
fastify.fileAccessControl.clearCache()

// Clear cache for specific file
fastify.fileAccessControl.clearCache('file-123')

// Clear cache for specific user
fastify.fileAccessControl.clearCache(undefined, 'user-456')
```

### Automatic Cache Invalidation
The plugin automatically clears cache when:
- Share operations are performed (`/share`, `/shares/:id`)
- Cache size exceeds 1000 entries
- Entries expire (checked during access)

## Audit Integration

### Access Granted Events
```json
{
  "action": "file.access.granted.read",
  "resource": "storage",
  "resourceId": "file-uuid",
  "details": {
    "operation": "read",
    "isOwner": true,
    "shareId": null,
    "permissions": null
  }
}
```

### Access Denied Events
```json
{
  "action": "file.access.denied.write",
  "resource": "storage", 
  "resourceId": "file-uuid",
  "details": {
    "reason": "No write permission",
    "operation": "write",
    "isOwner": false
  }
}
```

## Security Considerations

### Permission Inheritance
- File owners have all permissions regardless of shares
- Shared permissions are additive (you can have multiple shares)
- Most restrictive permission wins (if any share denies, access is denied)

### Expiration Handling
- Expired shares are automatically excluded
- Cache is cleared when shares are modified
- Real-time expiration checking

### Cache Security
- Cache keys include user ID to prevent cross-user access
- Cache entries automatically expire
- Sensitive data not stored in cache (only access results)

## Best Practices

### Route Protection
```typescript
// Always authenticate first
preHandler: [
  fastify.authenticate,        // Authentication check
  fastify.checkFileAccess('read')  // Authorization check
]
```

### Error Handling
```typescript
// Handle access control errors gracefully
try {
  const result = await fastify.fileAccessControl.checkAccess(fileId, userId, 'read')
  if (!result.allowed) {
    // Handle denial with appropriate HTTP status
    return reply.code(403).send({ error: { code: 'ACCESS_DENIED', message: result.reason } })
  }
} catch (error) {
  // Handle system errors
  fastify.log.error('Access control error:', error)
  return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Access check failed' } })
}
```

### Cache Optimization
```typescript
// Clear cache when modifying shares
await fastify.fileAccessControl.clearCache(fileId)

// Use specific cache clearing for better performance
await fastify.fileAccessControl.clearCache(fileId, userId)
```

## Integration with Other Systems

### Event Bus Integration
```typescript
// Publish events when access is granted/denied
fastify.eventBus.publish('file.access.granted', {
  fileId,
  userId,
  operation,
  isOwner: result.isOwner
})
```

### Notification Integration
```typescript
// Notify on access violations
if (!accessResult.allowed) {
  await fastify.notification.send('security-alert', adminEmail, 'access-violation', {
    fileId,
    userId,
    operation,
    reason: accessResult.reason
  })
}
```

### RBAC Integration
```typescript
// Combine with RBAC for additional security layers
preHandler: [
  fastify.authenticate,
  fastify.requirePermission('storage', 'access'),  // RBAC check
  fastify.checkFileAccess('read')                   // File-specific check
]
```

## Troubleshooting

### Common Issues

**Access denied for file owner:**
- Check if file exists and status is 'active'
- Verify `created_by` field matches user ID
- Check if file was soft-deleted

**Shared file access denied:**
- Verify share is active (`is_active: true`)
- Check expiration date (`expires_at`)
- Confirm correct permission for operation
- Clear cache if permissions were recently updated

**Performance issues:**
- Monitor cache hit rates
- Adjust cache expiration settings
- Clear cache more frequently for high-traffic files

### Debug Information

**Enable detailed logging:**
```typescript
// Add debug logging
fastify.log.debug('File access check', {
  fileId,
  userId,
  operation,
  result: accessResult
})
```

**Cache statistics:**
```typescript
// Monitor cache size
const cacheSize = fastify.fileAccessControl.cache.size
fastify.log.info(`File access cache size: ${cacheSize}`)
```

## Related Documentation
- [Storage Service Documentation](./storage-service.md)
- [Shared Files Management](./storage-shared-files.md)
- [RBAC Plugin](../rbac/README.md)
- [Audit System](../audit-system.md)