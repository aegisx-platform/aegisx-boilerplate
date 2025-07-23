# Configuration Management API Reference

## 📋 Overview

This document provides detailed API reference for the Dynamic Configuration Management System. All endpoints support JSON request/response format and follow RESTful conventions.

**Base URL**: `http://localhost:3000/api/v1/config`  
**Content-Type**: `application/json`  
**Authentication**: Currently disabled (will be enabled in future versions)

## 🏷️ Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* Response data */ },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "statusCode": 400,
  "timestamp": "2025-01-21T10:30:00.000Z",
  "path": "/api/v1/config/123",
  "details": { /* Additional error details */ }
}
```

## 📝 Core Configuration Management

### Create Configuration

**Endpoint**: `POST /api/v1/config`

Creates a new configuration entry.

**Request Body**:
```json
{
  "category": "smtp",                    // Required: Configuration category
  "configKey": "host",                   // Required: Unique key within category
  "configValue": "smtp.gmail.com",       // Optional: Configuration value
  "valueType": "string",                 // Optional: string|number|boolean|json
  "isEncrypted": false,                  // Optional: Encrypt sensitive values
  "isActive": true,                      // Optional: Enable/disable config
  "environment": "production",           // Optional: Target environment
  "changeReason": "Initial setup"        // Optional: Reason for change
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Configuration created successfully",
  "data": {
    "id": 123,
    "category": "smtp",
    "configKey": "host",
    "configValue": "smtp.gmail.com",
    "valueType": "string",
    "isEncrypted": false,
    "isActive": true,
    "environment": "production",
    "updatedBy": null,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:00.000Z"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed or duplicate key
- `500 Internal Server Error`: Database error

---

### Get Configuration by ID

**Endpoint**: `GET /api/v1/config/:id`

Retrieves a specific configuration by its ID with metadata.

**Parameters**:
- `id` (path): Configuration ID (integer)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration retrieved successfully",
  "data": {
    "id": 123,
    "category": "smtp",
    "configKey": "host",
    "configValue": "smtp.gmail.com",
    "valueType": "string",
    "isEncrypted": false,
    "isActive": true,
    "environment": "production",
    "updatedBy": 1,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:35:00.000Z",
    // Metadata fields (if available)
    "displayName": "SMTP Host",
    "description": "SMTP server hostname",
    "inputType": "text",
    "validationRules": {
      "required": true,
      "pattern": "^[a-zA-Z0-9.-]+$"
    },
    "groupName": "Connection Settings",
    "helpText": "Enter your SMTP server hostname"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Configuration not found
- `500 Internal Server Error`: Database error

---

### Update Configuration

**Endpoint**: `PUT /api/v1/config/:id`

Updates an existing configuration.

**Parameters**:
- `id` (path): Configuration ID (integer)

**Request Body**:
```json
{
  "configValue": "smtp.sendgrid.net",     // Optional: New value
  "valueType": "string",                  // Optional: Value type
  "isEncrypted": false,                   // Optional: Encryption flag
  "isActive": true,                       // Optional: Active status
  "changeReason": "Switch to SendGrid"    // Optional: Change reason
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "id": 123,
    "category": "smtp",
    "configKey": "host",
    "configValue": "smtp.sendgrid.net",
    "valueType": "string",
    "isEncrypted": false,
    "isActive": true,
    "environment": "production",
    "updatedBy": 1,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:45:00.000Z"
  },
  "timestamp": "2025-01-21T10:45:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed
- `404 Not Found`: Configuration not found
- `500 Internal Server Error`: Database error

---

### Delete Configuration

**Endpoint**: `DELETE /api/v1/config/:id`

Deletes a configuration entry (soft delete - records in history).

**Parameters**:
- `id` (path): Configuration ID (integer)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration deleted successfully",
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Configuration not found
- `500 Internal Server Error`: Database error

---

## 🔍 Search & Browse

### Search Configurations

**Endpoint**: `GET /api/v1/config/search`

Search configurations with various filters and pagination.

**Query Parameters**:
- `category` (string): Filter by category
- `configKey` (string): Filter by config key
- `environment` (string): Filter by environment
- `isActive` (boolean): Filter by active status
- `isEncrypted` (boolean): Filter by encryption status
- `groupName` (string): Filter by metadata group
- `search` (string): General search term
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `sortBy` (string): Sort field (configKey|category|updatedAt|createdAt)
- `sortOrder` (string): Sort order (asc|desc)

**Example Request**:
```
GET /api/v1/config/search?category=smtp&environment=production&search=host&page=1&limit=10&sortBy=updatedAt&sortOrder=desc
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configurations searched successfully",
  "data": {
    "configurations": [
      {
        "id": 123,
        "category": "smtp",
        "configKey": "host",
        "configValue": "smtp.gmail.com",
        "valueType": "string",
        "isEncrypted": false,
        "isActive": true,
        "environment": "production",
        "updatedBy": 1,
        "createdAt": "2025-01-21T10:30:00.000Z",
        "updatedAt": "2025-01-21T10:35:00.000Z",
        "displayName": "SMTP Host",
        "description": "SMTP server hostname"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "filters": {
      "categories": ["smtp", "database", "api_keys"],
      "environments": ["development", "production", "staging", "test"],
      "groups": ["Connection Settings", "Authentication", "Advanced"]
    }
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Get Configurations by Category

**Endpoint**: `GET /api/v1/config/category/:category`

Retrieve all configurations for a specific category with metadata.

**Parameters**:
- `category` (path): Configuration category (string)

**Query Parameters**:
- `environment` (string): Target environment (default: development)
- `includeInactive` (boolean): Include inactive configurations (default: false)

**Example Request**:
```
GET /api/v1/config/category/smtp?environment=production&includeInactive=false
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration by category retrieved successfully",
  "data": {
    "category": "smtp",
    "displayName": "SMTP Settings",
    "description": "Email server configuration",
    "configs": [
      {
        "id": 123,
        "configKey": "host",
        "configValue": "smtp.gmail.com",
        "displayName": "SMTP Host",
        "inputType": "text",
        "groupName": "Connection Settings"
      },
      {
        "id": 124,
        "configKey": "port",
        "configValue": "587",
        "displayName": "SMTP Port",
        "inputType": "number",
        "groupName": "Connection Settings"
      }
    ],
    "groups": [
      {
        "groupName": "Connection Settings",
        "displayName": "Connection Settings",
        "description": "Basic SMTP connection parameters",
        "configs": [/* configs in this group */]
      }
    ]
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## ⚡ Bulk Operations

### Bulk Update Configurations

**Endpoint**: `PUT /api/v1/config/bulk`

Update multiple configurations in a single transaction.

**Request Body**:
```json
{
  "updates": [
    {
      "id": 123,
      "configValue": "smtp.gmail.com",
      "isActive": true
    },
    {
      "id": 124,
      "configValue": "587",
      "isActive": true
    },
    {
      "id": 125,
      "configValue": "false",
      "isActive": true
    }
  ],
  "changeReason": "Bulk SMTP configuration update",
  "environment": "production"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "3 configurations updated successfully",
  "data": [
    {
      "id": 123,
      "category": "smtp",
      "configKey": "host",
      "configValue": "smtp.gmail.com",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    },
    {
      "id": 124,
      "category": "smtp",
      "configKey": "port", 
      "configValue": "587",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    },
    {
      "id": 125,
      "category": "smtp",
      "configKey": "secure",
      "configValue": "false",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed or partial update error
- `500 Internal Server Error`: Database transaction error

---

## 📊 Values & Merged Configuration

### Get Configuration Values

**Endpoint**: `GET /api/v1/config/values/:category`

Get configuration as key-value pairs (ready for application use).

**Parameters**:
- `category` (path): Configuration category (string)

**Query Parameters**:
- `environment` (string): Target environment (default: development)

**Example Request**:
```
GET /api/v1/config/values/smtp?environment=production
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration values retrieved successfully",
  "data": {
    "category": "smtp",
    "environment": "production",
    "values": {
      "host": "smtp.gmail.com",
      "port": "587",
      "secure": "false",
      "auth_user": "your-email@gmail.com",
      "auth_pass": "your-app-password"
    },
    "lastUpdated": "2025-01-21T10:30:00.000Z"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Get Merged Configuration

**Endpoint**: `GET /api/v1/config/merged/:category`

Get configuration merged from all sources (database → cache → environment → defaults).

**Parameters**:
- `category` (path): Configuration category (string)

**Query Parameters**:
- `environment` (string): Target environment (default: development)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Merged configuration retrieved successfully",
  "data": {
    "category": "smtp",
    "environment": "production",
    "sources": {
      "database": {
        "host": "smtp.gmail.com",
        "port": "587"
      },
      "cache": {
        "auth_user": "cached@gmail.com"
      },
      "environment": {
        "secure": "false"
      },
      "defaults": {
        "timeout": "30000"
      }
    },
    "merged": {
      "host": "smtp.gmail.com",        // from database (highest priority)
      "port": "587",                   // from database
      "auth_user": "cached@gmail.com", // from cache
      "secure": "false",               // from environment
      "timeout": "30000"               // from defaults (lowest priority)
    },
    "metadata": {
      "loadOrder": ["database", "cache", "environment", "defaults"],
      "loadTime": "2025-01-21T10:30:00.000Z",
      "cacheHit": true
    }
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## 📜 History & Audit

### Get Configuration History

**Endpoint**: `GET /api/v1/config/:id/history`

Get change history for a specific configuration.

**Parameters**:
- `id` (path): Configuration ID (integer)

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `sortOrder` (string): Sort order (asc|desc, default: desc)

**Example Request**:
```
GET /api/v1/config/123/history?page=1&limit=5&sortOrder=desc
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration history retrieved successfully",
  "data": {
    "history": [
      {
        "id": 456,
        "configId": 123,
        "oldValue": "smtp.sendgrid.net",
        "newValue": "smtp.gmail.com",
        "changedBy": 1,
        "changeReason": "Switch back to Gmail",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "createdAt": "2025-01-21T10:30:00.000Z",
        "config": {
          "category": "smtp",
          "configKey": "host",
          "environment": "production"
        },
        "changedByUser": {
          "id": 1,
          "email": "admin@example.com",
          "username": "admin"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 12,
      "totalPages": 3
    }
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## 🔄 Hot Reload System (Mock Implementation)

⚠️ **Note**: Currently using mock responses due to hot reload service issues.

### Force Reload

**Endpoint**: `POST /api/v1/config/reload`

Force reload configuration for specific category and environment.

**Request Body**:
```json
{
  "category": "smtp",                    // Required: Configuration category
  "environment": "production",           // Required: Target environment
  "changeReason": "Updated credentials"  // Optional: Reason for reload
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration reload initiated for smtp:production",
  "data": {
    "category": "smtp",
    "environment": "production",
    "requestedBy": 0,
    "requestedAt": "2025-01-21T10:30:00.000Z",
    "reason": "Updated credentials",
    "status": "Mock reload completed successfully"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Get Reload Statistics

**Endpoint**: `GET /api/v1/config/reload/stats`

Get statistics about configuration reload operations.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Reload statistics retrieved successfully",
  "data": {
    "services": {
      "email-service": {
        "successCount": 0,
        "errorCount": 0,
        "categories": ["smtp"]
      }
    },
    "timestamp": "2025-01-21T10:30:00.000Z"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Reset Reload Statistics

**Endpoint**: `POST /api/v1/config/reload/stats/reset`

Reset reload statistics for all services.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Reload stats reset successfully (mock)",
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## 🏷️ Meta Information

### Get Categories

**Endpoint**: `GET /api/v1/config/categories`

Get list of all configuration categories.

**Query Parameters**:
- `environment` (string): Filter by environment

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    "smtp",
    "database", 
    "api_keys",
    "security",
    "integration"
  ],
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Get Environments  

**Endpoint**: `GET /api/v1/config/environments`

Get list of all available environments.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Environments retrieved successfully",
  "data": [
    "development",
    "production", 
    "staging",
    "test"
  ],
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## 📋 Template Management

### Get Available Templates

**Endpoint**: `GET /api/v1/config/templates`

Get list of all available configuration templates.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Templates retrieved successfully",
  "data": [
    {
      "id": 1,
      "providerName": "gmail",
      "category": "smtp",
      "description": "Gmail SMTP configuration template",
      "templateData": {
        "host": "smtp.gmail.com",
        "port": "587",
        "secure": "false",
        "auth": {
          "user": "{{EMAIL_USER}}",
          "pass": "{{EMAIL_PASS}}"
        }
      },
      "isActive": true,
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    },
    {
      "id": 2,
      "providerName": "sendgrid",
      "category": "smtp",
      "description": "SendGrid SMTP configuration template",
      "templateData": {
        "host": "smtp.sendgrid.net",
        "port": "587",
        "secure": "false",
        "auth": {
          "user": "apikey",
          "pass": "{{SENDGRID_API_KEY}}"
        }
      },
      "isActive": true,
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Get Template by Provider

**Endpoint**: `GET /api/v1/config/templates/:provider`

Get template for specific provider.

**Parameters**:
- `provider` (path): Provider name (string)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Template retrieved successfully",
  "data": {
    "id": 1,
    "providerName": "gmail",
    "category": "smtp",
    "description": "Gmail SMTP configuration template",
    "templateData": {
      "host": "smtp.gmail.com",
      "port": "587",
      "secure": "false",
      "auth": {
        "user": "{{EMAIL_USER}}",
        "pass": "{{EMAIL_PASS}}"
      }
    },
    "variables": [
      {
        "name": "EMAIL_USER",
        "description": "Gmail email address",
        "required": true,
        "example": "your-email@gmail.com"
      },
      {
        "name": "EMAIL_PASS", 
        "description": "Gmail App Password (16 characters)",
        "required": true,
        "example": "abcd efgh ijkl mnop"
      }
    ],
    "isActive": true,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:00.000Z"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

### Apply Template

**Endpoint**: `POST /api/v1/config/templates/apply`

Apply a template to create/update configurations.

**Request Body**:
```json
{
  "provider": "gmail",                   // Required: Template provider
  "environment": "production",           // Required: Target environment
  "variables": {                         // Required: Template variables
    "EMAIL_USER": "your-email@gmail.com",
    "EMAIL_PASS": "your-16-char-app-password"
  },
  "changeReason": "Setup Gmail SMTP"     // Optional: Change reason
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Template applied successfully",
  "data": {
    "provider": "gmail",
    "environment": "production",
    "configurationsCreated": [
      {
        "id": 123,
        "category": "smtp",
        "configKey": "host",
        "configValue": "smtp.gmail.com"
      },
      {
        "id": 124,
        "category": "smtp", 
        "configKey": "port",
        "configValue": "587"
      },
      {
        "id": 125,
        "category": "smtp",
        "configKey": "auth_user",
        "configValue": "your-email@gmail.com"
      },
      {
        "id": 126,
        "category": "smtp",
        "configKey": "auth_pass",
        "configValue": "your-16-char-app-password",
        "isEncrypted": true
      }
    ],
    "appliedAt": "2025-01-21T10:30:00.000Z"
  },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

---

## 🔧 Error Handling

### Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid request data or validation failed |
| 404 | Not Found | Resource not found |  
| 409 | Conflict | Duplicate configuration key |
| 422 | Unprocessable Entity | Valid JSON but business logic error |
| 500 | Internal Server Error | Database or server error |
| 503 | Service Unavailable | Hot reload service not available |

### Error Response Examples

**Validation Error (400)**:
```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "statusCode": 400,
  "timestamp": "2025-01-21T10:30:00.000Z",
  "path": "/api/v1/config",
  "details": {
    "field": "configKey",
    "code": "required",
    "message": "configKey is required"
  }
}
```

**Duplicate Key Error (409)**:
```json
{
  "error": "Conflict",
  "message": "Configuration key 'host' already exists in category 'smtp' for environment 'production'",
  "statusCode": 409,
  "timestamp": "2025-01-21T10:30:00.000Z",
  "path": "/api/v1/config"
}
```

---

## 🚀 Usage Examples

### Complete SMTP Setup Example

```bash
# 1. Create SMTP configurations
curl -X POST http://localhost:3000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{
    "category": "smtp",
    "configKey": "host", 
    "configValue": "smtp.gmail.com",
    "environment": "production",
    "changeReason": "Initial SMTP setup"
  }'

curl -X POST http://localhost:3000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{
    "category": "smtp",
    "configKey": "port",
    "configValue": "587", 
    "valueType": "number",
    "environment": "production"
  }'

# 2. Get all SMTP values for application use
curl http://localhost:3000/api/v1/config/values/smtp?environment=production

# 3. Update configuration 
curl -X PUT http://localhost:3000/api/v1/config/123 \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "smtp.sendgrid.net",
    "changeReason": "Switch to SendGrid"
  }'

# 4. Force reload to apply changes
curl -X POST http://localhost:3000/api/v1/config/reload \
  -H "Content-Type: application/json" \
  -d '{
    "category": "smtp",
    "environment": "production",
    "changeReason": "Apply SendGrid changes"
  }'

# 5. Check history
curl http://localhost:3000/api/v1/config/123/history
```

### Template Application Example

```bash
# Apply Gmail template
curl -X POST http://localhost:3000/api/v1/config/templates/apply \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "environment": "production",
    "variables": {
      "EMAIL_USER": "your-email@gmail.com",
      "EMAIL_PASS": "your-app-password"
    },
    "changeReason": "Setup Gmail SMTP using template"
  }'
```

---

## 📚 Related Documentation

- [Main Documentation](./dynamic-configuration-management.md) - System overview
- [Database Schema](./config-management-database.md) - Database structure  
- [Integration Guide](./config-management-integration.md) - Integration patterns

---

**Created**: 2025-01-21  
**Last Updated**: 2025-01-21  
**Version**: 1.0.0