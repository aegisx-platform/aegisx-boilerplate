# Storage Shared Files Management

## Overview

The Shared Files Management feature allows users to share files with other users in the system with granular permissions control. This feature extends the enterprise storage service with collaborative capabilities while maintaining security and audit compliance.

## Features

- **File Sharing with Permissions**: Share files with specific read/write/delete/share permissions
- **Expiration Support**: Set expiration dates for shared files
- **User Management**: View files shared with you and files you've shared with others
- **Share Revocation**: Revoke shares you've created at any time
- **Audit Trail**: All sharing activities are logged for compliance
- **Security**: JWT authentication required for all operations
- **Database Integration**: Full database persistence with user relationships

## Database Schema

The shared files feature uses the `storage_file_shares` table with the following structure:

```sql
CREATE TABLE storage_file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES storage_files(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Permissions
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_share BOOLEAN NOT NULL DEFAULT false,
  
  -- Share settings
  expires_at TIMESTAMPTZ,
  requires_password BOOLEAN NOT NULL DEFAULT false,
  password_hash VARCHAR(255),
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  
  -- Tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(file_id, shared_with)
);
```

## API Endpoints

### 1. Share a File

**POST** `/api/v1/storage/share`

Share a file with another user with specific permissions.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fileId": "uuid-of-file-to-share",
  "sharedWith": "uuid-of-recipient-user", 
  "permissions": {
    "canRead": true,
    "canWrite": false,
    "canDelete": false,
    "canShare": false
  },
  "expiresAt": "2024-12-31T23:59:59Z" // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "fileId": "uuid-of-file",
  "sharedWith": "uuid-of-recipient",
  "permissions": {
    "canRead": true,
    "canWrite": false,
    "canDelete": false,
    "canShare": false
  },
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 2. Get Files Shared With You

**GET** `/api/v1/storage/shared-files`

Retrieve all files that have been shared with the current user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "files": [
    {
      "id": "internal-db-id",
      "fileId": "provider-file-id",
      "filename": "document.pdf",
      "originalName": "important-document.pdf",
      "mimeType": "application/pdf",
      "size": 1048576,
      "checksum": "sha256-hash",
      "provider": "local",
      "dataClassification": "internal",
      "encrypted": true,
      "tags": ["document", "important"],
      "customMetadata": {
        "department": "finance"
      },
      "createdBy": "original-owner-id",
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-10T09:00:00Z",
      "lastAccessedAt": "2024-01-15T10:00:00Z",
      "accessCount": 5,
      "status": "active",
      "shareInfo": {
        "shareId": "share-uuid",
        "fileId": "provider-file-id",
        "permissions": {
          "canRead": true,
          "canWrite": false,
          "canDelete": false,
          "canShare": false
        },
        "expiresAt": "2024-12-31T23:59:59Z",
        "sharedAt": "2024-01-15T10:30:00Z",
        "sharedBy": {
          "username": "john.doe",
          "email": "john.doe@company.com"
        }
      }
    }
  ],
  "total": 1
}
```

### 3. Get Your Shares

**GET** `/api/v1/storage/my-shares`

Retrieve all files that the current user has shared with others.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "files": [
    {
      "id": "internal-db-id",
      "fileId": "provider-file-id",
      "filename": "report.xlsx",
      "originalName": "quarterly-report.xlsx",
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "size": 2097152,
      "checksum": "sha256-hash",
      "provider": "local",
      "dataClassification": "confidential",
      "encrypted": true,
      "tags": ["report", "quarterly", "finance"],
      "customMetadata": {
        "quarter": "Q4-2024"
      },
      "createdBy": "current-user-id",
      "createdAt": "2024-01-10T14:00:00Z",
      "updatedAt": "2024-01-10T14:00:00Z",
      "lastAccessedAt": "2024-01-15T11:00:00Z",
      "accessCount": 3,
      "status": "active",
      "shareInfo": {
        "shareId": "share-uuid",
        "fileId": "provider-file-id", 
        "permissions": {
          "canRead": true,
          "canWrite": true,
          "canDelete": false,
          "canShare": false
        },
        "expiresAt": null,
        "sharedAt": "2024-01-15T10:30:00Z",
        "lastAccessedAt": "2024-01-15T11:00:00Z",
        "sharedWith": {
          "username": "jane.smith",
          "email": "jane.smith@company.com"
        }
      }
    }
  ],
  "total": 1
}
```

### 4. Revoke a Share

**DELETE** `/api/v1/storage/shares/:shareId`

Revoke a file share that you created.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `shareId`: UUID of the share to revoke

**Response (200):**
```json
{
  "success": true,
  "message": "Share revoked successfully",
  "shareId": "share-uuid"
}
```

**Error Responses:**

**403 Forbidden:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only revoke shares you created"
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "SHARE_NOT_FOUND", 
    "message": "Share not found"
  }
}
```

## Permission Levels

### Available Permissions

- **`canRead`**: Can download and view the file
- **`canWrite`**: Can upload new versions of the file (requires `canRead`)
- **`canDelete`**: Can delete the file (requires `canRead`)
- **`canShare`**: Can share the file with others (requires `canRead`)

### Permission Combinations

```javascript
// Read-only access (most common)
{
  "canRead": true,
  "canWrite": false,
  "canDelete": false,
  "canShare": false
}

// Edit access
{
  "canRead": true,
  "canWrite": true,
  "canDelete": false,
  "canShare": false
}

// Full access (be careful with this)
{
  "canRead": true,
  "canWrite": true,
  "canDelete": true,
  "canShare": true
}

// Collaborate access (can share but not delete)
{
  "canRead": true,
  "canWrite": true,
  "canDelete": false,
  "canShare": true
}
```

## Usage Examples

### Node.js/JavaScript Examples

#### Share a File
```javascript
const shareFile = async (fileId, recipientUserId, permissions) => {
  const response = await fetch('/api/v1/storage/share', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileId: fileId,
      sharedWith: recipientUserId,
      permissions: permissions,
      expiresAt: '2024-12-31T23:59:59Z' // Optional
    })
  })
  
  if (!response.ok) {
    throw new Error(`Failed to share file: ${response.statusText}`)
  }
  
  return await response.json()
}

// Usage
await shareFile('file-123', 'user-456', {
  canRead: true,
  canWrite: true,
  canDelete: false,
  canShare: false
})
```

#### Get Shared Files
```javascript
const getSharedFiles = async () => {
  const response = await fetch('/api/v1/storage/shared-files', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get shared files: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.files
}

// Usage
const sharedFiles = await getSharedFiles()
console.log(`You have ${sharedFiles.length} files shared with you`)
```

#### Get My Shares
```javascript
const getMyShares = async () => {
  const response = await fetch('/api/v1/storage/my-shares', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get my shares: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.files
}

// Usage
const myShares = await getMyShares()
console.log(`You have shared ${myShares.length} files with others`)
```

#### Revoke a Share
```javascript
const revokeShare = async (shareId) => {
  const response = await fetch(`/api/v1/storage/shares/${shareId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to revoke share: ${response.statusText}`)
  }
  
  return await response.json()
}

// Usage
await revokeShare('share-uuid-123')
console.log('Share revoked successfully')
```

### TypeScript Examples

```typescript
interface SharePermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canShare: boolean
}

interface ShareFileRequest {
  fileId: string
  sharedWith: string
  permissions: SharePermissions
  expiresAt?: string
}

interface SharedFile {
  id: string
  fileId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  shareInfo: {
    shareId: string
    permissions: SharePermissions
    expiresAt: string | null
    sharedAt: string
    sharedBy: {
      username: string
      email: string
    }
  }
}

class SharedFilesService {
  constructor(private baseUrl: string, private token: string) {}

  async shareFile(request: ShareFileRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/storage/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Share failed: ${response.statusText}`)
    }
  }

  async getSharedFiles(): Promise<SharedFile[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/storage/shared-files`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get shared files: ${response.statusText}`)
    }

    const data = await response.json()
    return data.files
  }

  async revokeShare(shareId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/storage/shares/${shareId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to revoke share: ${response.statusText}`)
    }
  }
}
```

## Security Considerations

### Authentication & Authorization
- All endpoints require valid JWT authentication
- Users can only share files they own
- Users can only revoke shares they created
- Recipients can only access files within their permission scope

### Data Protection
- Share information includes user details (username, email) for transparency
- Expired shares are automatically filtered out
- Inactive shares are excluded from results
- All operations are logged for audit compliance

### Permission Validation
- Permission combinations are validated on the server side
- Write operations require read permissions
- Delete operations require read permissions  
- Share operations require read permissions

## Healthcare Compliance

### HIPAA Considerations
- All sharing activities are logged in the audit system
- User information in share details supports access tracking
- Expiration dates help enforce data retention policies
- Permission granularity supports minimum necessary access principle

### Audit Trail
All shared files operations are automatically logged including:
- Share creation with recipient and permissions
- Share access attempts
- Share revocation events
- Permission changes

## Integration with Existing Systems

### Event Bus Integration
```javascript
// File sharing events are published to the event bus
fastify.eventBus.publish('file.shared', {
  fileId: 'file-123',
  sharedBy: 'user-123',
  sharedWith: 'user-456',
  permissions: { canRead: true, canWrite: false },
  shareId: 'share-789'
})

fastify.eventBus.publish('file.share.revoked', {
  shareId: 'share-789',
  fileId: 'file-123',
  revokedBy: 'user-123'
})
```

### Notification Service Integration
```javascript
// Automatically notify users when files are shared with them
await fastify.notification.send('email', recipientEmail, 'file-shared', {
  filename: 'document.pdf',
  sharedBy: 'John Doe',
  permissions: 'read-only',
  accessUrl: 'https://app.com/files/shared'
})
```

### Metrics Integration
```javascript
// Track sharing metrics
await fastify.metrics.recordEvent('file_shared', {
  fileType: 'pdf',
  permissions: 'read_write',
  expirationSet: true
})
```

## Error Handling

### Common Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Missing required fields or invalid data |
| 401 | `UNAUTHORIZED` | Invalid or missing authentication token |
| 403 | `FORBIDDEN` | Insufficient permissions for operation |
| 404 | `FILE_NOT_FOUND` | File does not exist or is not accessible |
| 404 | `SHARE_NOT_FOUND` | Share does not exist |
| 409 | `SHARE_ALREADY_EXISTS` | File already shared with this user |
| 500 | `INTERNAL_SERVER_ERROR` | Server error occurred |

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context if applicable"
    }
  }
}
```

## Best Practices

### Sharing Strategy
1. **Start with minimal permissions** - Begin with read-only access
2. **Use expiration dates** - Set expiration for sensitive files
3. **Regular audit** - Periodically review your shares using `/my-shares`
4. **Revoke unused shares** - Clean up shares that are no longer needed

### Permission Management
1. **Principle of least privilege** - Only grant necessary permissions
2. **Avoid cascade sharing** - Be careful with `canShare` permission
3. **Monitor delete permissions** - `canDelete` should be granted sparingly
4. **Review write access** - Ensure write permissions are appropriate

### Performance Optimization
1. **Pagination** - Use pagination for large share lists (future enhancement)
2. **Filtering** - Filter by file type or date ranges (future enhancement)
3. **Caching** - Share information is cached for better performance
4. **Bulk operations** - Consider batch operations for multiple shares

## Troubleshooting

### Common Issues

**Share not appearing in recipient's list:**
- Verify the share was created successfully
- Check if the share has expired
- Confirm the recipient user ID is correct
- Ensure the share is active (`is_active = true`)

**Cannot revoke share:**
- Verify you are the creator of the share (`shared_by`)
- Check if the share still exists and is active
- Confirm the share ID is correct

**Permission denied errors:**
- Verify JWT token is valid and not expired
- Confirm user has permission to share the specific file
- Check if the file still exists and is accessible

### Debugging Steps

1. **Check authentication:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3000/api/v1/storage/shared-files
   ```

2. **Verify file ownership:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3000/api/v1/storage/files/FILE_ID
   ```

3. **Check share existence:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3000/api/v1/storage/my-shares
   ```

## Future Enhancements

### Planned Features
- **Public Sharing**: Share files with external users via secure links
- **Password Protection**: Require passwords for sensitive shares
- **Download Limits**: Restrict number of downloads per share
- **Bulk Operations**: Share multiple files at once
- **Share Templates**: Predefined permission sets for common scenarios
- **Share Analytics**: Track share usage and access patterns

### API Versioning
This API follows semantic versioning. Breaking changes will result in a new API version (e.g., `/api/v2/storage/shared-files`).

## Related Documentation
- [Storage Service Documentation](./storage-service.md)
- [Storage Database Schema](./storage-database.md)
- [Authentication & Authorization](../auth/README.md)
- [Audit System](../audit-system.md)
- [Event Bus System](../event-bus.md)