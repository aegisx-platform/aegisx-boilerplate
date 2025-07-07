# RBAC (Role-Based Access Control) System

The AegisX Boilerplate includes a comprehensive Role-Based Access Control (RBAC) system that provides fine-grained authorization and permission management. This document covers the complete RBAC implementation including setup, configuration, usage patterns, and best practices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Permission Patterns](#permission-patterns)
- [Integration Examples](#integration-examples)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The RBAC system provides:

- **Role Management**: Create, assign, and manage user roles
- **Permission Control**: Fine-grained permissions for resources and actions
- **Scope-Based Access**: Support for own/department/all access levels
- **Middleware Integration**: Easy-to-use authorization middleware
- **Caching Support**: Redis-backed performance optimization
- **Audit Trail**: Complete logging of role and permission changes
- **RESTful API**: Full CRUD operations for roles and permissions

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Client Request                                │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    RBAC Middleware                                 │
│  ┌─────────────────┐    ┌──────────────────┐                       │
│  │  Authentication │───▶│   Authorization   │                       │
│  │   (JWT Token)   │    │ (Role/Permission) │                       │
│  └─────────────────┘    └──────────────────┘                       │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                     RBAC Service                                   │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐ │
│  │ Permission Check│───▶│   Role Service   │───▶│   Repository    │ │
│  │   (Business)    │    │  (Business Logic)│    │   (Database)    │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                    Database Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │     roles       │  │   permissions   │  │   user_roles        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ role_permissions│  │     users       │  │   audit_logs        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **RBAC Service**: Core business logic for role and permission management
2. **RBAC Middleware**: Request-level authorization checking
3. **Role Repository**: Database operations for roles and permissions
4. **RBAC Controller**: REST API endpoints for role management
5. **Permission System**: Flexible resource:action:scope permission model

## Database Schema

The RBAC system uses four main tables:

### 1. Roles Table

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,           -- Role name (admin, doctor, nurse)
  description TEXT,                           -- Human-readable description
  is_system BOOLEAN DEFAULT FALSE,            -- System role (cannot be deleted)
  is_active BOOLEAN DEFAULT TRUE,             -- Active status
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Permissions Table

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,          -- Permission name
  resource VARCHAR(50) NOT NULL,              -- Resource type (users, patients)
  action VARCHAR(50) NOT NULL,                -- Action (read, write, delete)
  scope VARCHAR(50) DEFAULT 'own',            -- Scope (own, department, all)
  description TEXT,                           -- Human-readable description
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. User Roles Junction Table

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                       -- Optional expiration
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role_id)
);
```

### 4. Role Permissions Junction Table

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(role_id, permission_id)
);
```

### Indexes for Performance

```sql
-- User role lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_active ON user_roles(user_id, is_active);

-- Permission lookups
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- Role management
CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_roles_name ON roles(name);
```

## Core Concepts

### 1. Roles

Roles represent job functions or responsibilities:

- **admin**: System administrator with full access
- **doctor**: Medical professional with patient care access
- **nurse**: Healthcare provider with limited patient access
- **receptionist**: Front desk staff with scheduling access
- **manager**: Department manager with team oversight
- **auditor**: Read-only access for compliance review

### 2. Permissions

Permissions follow the format: `resource:action:scope`

**Resources**:
- `users` - User account management
- `patients` - Patient information
- `appointments` - Scheduling system
- `medical_records` - Electronic health records
- `billing` - Financial transactions
- `reports` - Analytics and reporting
- `system` - System configuration

**Actions**:
- `read` - View/access data
- `write` - Create/update data
- `delete` - Remove data
- `export` - Extract data
- `configure` - System settings

**Scopes**:
- `own` - User's own data only
- `department` - Department/team data
- `all` - System-wide access

### 3. Permission Examples

```
users:read:own          # Read own user profile
users:write:department  # Edit users in same department  
users:delete:all        # Delete any user (admin only)
patients:read:own       # Read assigned patients
patients:write:all      # Edit any patient record
reports:export:department # Export department reports
system:configure:all    # System administration
```

## API Reference

### Middleware Functions

#### 1. `fastify.authenticate`

Validates JWT token and extracts user information.

```typescript
// Usage in routes
fastify.get('/protected', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    // request.user contains authenticated user info
    return { message: 'Authenticated access' };
  }
});
```

#### 2. `fastify.requirePermission(resource, action, scope?)`

Checks specific permissions for authenticated users.

```typescript
// Require specific permission
fastify.get('/users/:id', {
  preHandler: [
    fastify.authenticate,
    fastify.requirePermission('users', 'read', 'own')
  ],
  handler: async (request, reply) => {
    // User has permission to read users with 'own' scope
    return await userService.getUser(request.params.id);
  }
});
```

#### 3. `fastify.rbacRequire(roles[])`

Checks if user has any of the specified roles.

```typescript
// Require specific roles
fastify.get('/admin/dashboard', {
  preHandler: [
    fastify.authenticate,
    fastify.rbacRequire(['admin', 'manager'])
  ],
  handler: async (request, reply) => {
    // User must be admin or manager
    return await adminService.getDashboard();
  }
});
```

### RBAC Service Methods

#### 1. `getUserPermissions(userId: string)`

Get all permissions for a user.

```typescript
const permissions = await rbacService.getUserPermissions('user-123');
// Returns: Permission[]
```

#### 2. `getUserRoles(userId: string)`

Get all roles assigned to a user.

```typescript
const roles = await rbacService.getUserRoles('user-123');
// Returns: Role[]
```

#### 3. `hasPermission(context: RBACContext)`

Check if user has specific permission.

```typescript
const hasPermission = await rbacService.hasPermission({
  userId: 'user-123',
  resource: 'patients',
  action: 'read',
  scope: 'own'
});
// Returns: boolean
```

#### 4. `assignRoleToUser(userId, roleId, assignedBy?, expiresAt?)`

Assign role to user.

```typescript
await rbacService.assignRoleToUser(
  'user-123',
  'role-456',
  'admin-789',
  new Date('2025-12-31') // Optional expiration
);
```

#### 5. `removeRoleFromUser(userId, roleId)`

Remove role from user.

```typescript
await rbacService.removeRoleFromUser('user-123', 'role-456');
```

## Usage Examples

### 1. Basic Route Protection

```typescript
// Public route - no authentication required
fastify.get('/public/info', async (request, reply) => {
  return { message: 'Public information' };
});

// Authenticated route - requires valid JWT
fastify.get('/profile', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    return { user: request.user };
  }
});

// Permission-based route
fastify.get('/users', {
  preHandler: [
    fastify.authenticate,
    fastify.requirePermission('users', 'read', 'all')
  ],
  handler: async (request, reply) => {
    return await userService.getAllUsers();
  }
});

// Role-based route
fastify.get('/admin/logs', {
  preHandler: [
    fastify.authenticate,
    fastify.rbacRequire(['admin'])
  ],
  handler: async (request, reply) => {
    return await auditService.getAuditLogs();
  }
});
```

### 2. Dynamic Permission Checking

```typescript
class PatientController {
  async getPatient(request: FastifyRequest, reply: FastifyReply) {
    const { patientId } = request.params;
    const userId = request.user.id;

    // Check if user can read this specific patient
    const canRead = await rbacService.hasPermission({
      userId,
      resource: 'patients',
      action: 'read',
      scope: 'own',
      resourceId: patientId
    });

    if (!canRead) {
      throw fastify.httpErrors.forbidden('Cannot access this patient');
    }

    return await patientService.getPatient(patientId);
  }

  async updatePatient(request: FastifyRequest, reply: FastifyReply) {
    const { patientId } = request.params;
    const userId = request.user.id;

    // Check write permission
    const canWrite = await rbacService.hasPermission({
      userId,
      resource: 'patients',
      action: 'write',
      scope: 'department',
      resourceId: patientId
    });

    if (!canWrite) {
      throw fastify.httpErrors.forbidden('Cannot modify this patient');
    }

    return await patientService.updatePatient(patientId, request.body);
  }
}
```

### 3. Conditional UI/Features

```typescript
class UserService {
  async getUserWithPermissions(userId: string) {
    const user = await this.getUser(userId);
    const permissions = await rbacService.getUserPermissions(userId);
    const roles = await rbacService.getUserRoles(userId);

    // Add computed permissions for UI
    user.can = {
      // User management
      viewUsers: permissions.some(p => 
        p.resource === 'users' && p.action === 'read'
      ),
      editUsers: permissions.some(p => 
        p.resource === 'users' && p.action === 'write'
      ),
      deleteUsers: permissions.some(p => 
        p.resource === 'users' && p.action === 'delete'
      ),

      // Patient management
      viewPatients: permissions.some(p => 
        p.resource === 'patients' && p.action === 'read'
      ),
      editPatients: permissions.some(p => 
        p.resource === 'patients' && p.action === 'write'
      ),

      // System access
      accessAdmin: roles.some(r => r.name === 'admin'),
      exportData: permissions.some(p => p.action === 'export')
    };

    return user;
  }
}
```

### 4. Bulk Permission Checking

```typescript
class AuthorizationService {
  async checkMultiplePermissions(
    userId: string, 
    requiredPermissions: Array<{resource: string, action: string, scope?: string}>
  ) {
    const results = await Promise.all(
      requiredPermissions.map(perm => 
        rbacService.hasPermission({
          userId,
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope
        })
      )
    );

    return requiredPermissions.reduce((acc, perm, index) => {
      acc[`${perm.resource}:${perm.action}:${perm.scope || 'own'}`] = results[index];
      return acc;
    }, {} as Record<string, boolean>);
  }

  async requireAllPermissions(userId: string, permissions: any[]) {
    const hasAll = await rbacService.hasAllPermissions(userId, permissions);
    if (!hasAll) {
      throw fastify.httpErrors.forbidden('Insufficient permissions');
    }
  }

  async requireAnyPermission(userId: string, permissions: any[]) {
    const hasAny = await rbacService.hasAnyPermission(userId, permissions);
    if (!hasAny) {
      throw fastify.httpErrors.forbidden('No valid permissions');
    }
  }
}
```

## Permission Patterns

### 1. Healthcare System Example

```typescript
// Doctor permissions
const doctorPermissions = [
  'patients:read:own',           // Read assigned patients
  'patients:write:own',          // Update assigned patients
  'medical_records:read:own',    // Read medical records
  'medical_records:write:own',   // Write medical records
  'appointments:read:own',       // View appointments
  'prescriptions:write:own',     // Write prescriptions
  'reports:read:department'      // View department reports
];

// Nurse permissions
const nursePermissions = [
  'patients:read:department',    // Read department patients
  'patients:write:department',   // Update basic patient info
  'appointments:read:department', // View department appointments
  'medications:read:own',        // Read medication orders
  'vitals:write:department'      // Record vital signs
];

// Admin permissions
const adminPermissions = [
  'users:*:all',                 // Full user management
  'patients:*:all',              // Full patient management
  'system:configure:all',        // System configuration
  'reports:export:all',          // Export all reports
  'audit:read:all'               // Access audit logs
];
```

### 2. Multi-Tenant System

```typescript
// Tenant isolation
class TenantRBACService extends RBACService {
  async hasPermission(context: RBACContext & { tenantId: string }) {
    // First check basic permission
    const hasBasicPermission = await super.hasPermission(context);
    if (!hasBasicPermission) return false;

    // Then check tenant access
    return this.checkTenantAccess(context.userId, context.tenantId);
  }

  private async checkTenantAccess(userId: string, tenantId: string) {
    const userTenants = await this.getUserTenants(userId);
    return userTenants.includes(tenantId);
  }
}
```

### 3. Time-Based Permissions

```typescript
class TemporalRBACService extends RBACService {
  async hasPermission(context: RBACContext) {
    const hasBasicPermission = await super.hasPermission(context);
    if (!hasBasicPermission) return false;

    // Check time-based restrictions
    const now = new Date();
    const userRoles = await this.getUserRoles(context.userId);

    for (const role of userRoles) {
      // Check role expiration
      if (role.expires_at && role.expires_at < now) {
        continue; // Skip expired role
      }

      // Check time restrictions (e.g., business hours only)
      if (await this.isWithinAllowedTime(role, now)) {
        return true;
      }
    }

    return false;
  }

  private async isWithinAllowedTime(role: any, now: Date) {
    // Implementation depends on business requirements
    const hour = now.getHours();
    
    // Example: Some roles only work during business hours
    if (role.name === 'receptionist') {
      return hour >= 8 && hour <= 17; // 8 AM to 5 PM
    }

    return true; // No time restrictions
  }
}
```

## Integration Examples

### 1. Frontend Integration

```typescript
// Frontend API client
class AuthAPI {
  async getCurrentUserPermissions() {
    const response = await fetch('/api/v1/rbac/my-permissions', {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.json();
  }

  async checkPermission(resource: string, action: string, scope?: string) {
    const permissions = await this.getCurrentUserPermissions();
    const permissionKey = `${resource}:${action}:${scope || 'own'}`;
    return permissions.data.some(p => 
      p.resource === resource && 
      p.action === action && 
      (scope ? p.scope === scope : true)
    );
  }
}

// Vue.js component example
export default {
  async created() {
    this.userPermissions = await authAPI.getCurrentUserPermissions();
  },
  computed: {
    canEditUsers() {
      return this.userPermissions.data.some(p => 
        p.resource === 'users' && p.action === 'write'
      );
    },
    canDeletePatients() {
      return this.userPermissions.data.some(p => 
        p.resource === 'patients' && p.action === 'delete'
      );
    }
  }
}
```

### 2. GraphQL Integration

```typescript
// GraphQL directive for permissions
import { SchemaDirectiveVisitor } from 'apollo-server-fastify';

class RequirePermissionDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: any) {
    const { resource, action, scope } = this.args;
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async function(source: any, args: any, context: any, info: any) {
      const hasPermission = await context.rbacService.hasPermission({
        userId: context.user.id,
        resource,
        action,
        scope
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      return resolve.call(this, source, args, context, info);
    };
  }
}

// GraphQL schema usage
const typeDefs = gql`
  directive @requirePermission(
    resource: String!
    action: String!
    scope: String
  ) on FIELD_DEFINITION

  type Query {
    users: [User] @requirePermission(resource: "users", action: "read", scope: "all")
    myProfile: User @requirePermission(resource: "users", action: "read", scope: "own")
  }

  type Mutation {
    deleteUser(id: ID!): Boolean @requirePermission(resource: "users", action: "delete", scope: "all")
  }
`;
```

### 3. WebSocket Integration

```typescript
// WebSocket authorization
fastify.register(async function (fastify) {
  fastify.websocket('/ws', {
    preHandler: [fastify.authenticate],
    handler: (connection, request) => {
      connection.socket.on('message', async (message) => {
        const data = JSON.parse(message.toString());
        
        // Check permission for each WebSocket action
        if (data.type === 'subscribe_patients') {
          const canRead = await rbacService.hasPermission({
            userId: request.user.id,
            resource: 'patients',
            action: 'read',
            scope: 'department'
          });

          if (!canRead) {
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Insufficient permissions'
            }));
            return;
          }

          // Subscribe to patient updates
          patientService.subscribe(connection, request.user.id);
        }
      });
    }
  });
});
```

## Performance Optimization

### 1. Permission Caching

```typescript
class CachedRBACService extends RBACService {
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Try cache first
    const cacheKey = `permissions:${userId}`;
    const cached = await fastify.getFromCache(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const permissions = await super.getUserPermissions(userId);
    
    // Cache for 15 minutes
    await fastify.setToCache(cacheKey, permissions, 900);
    
    return permissions;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const cacheKey = `roles:${userId}`;
    const cached = await fastify.getFromCache(cacheKey);
    if (cached) return cached;

    const roles = await super.getUserRoles(userId);
    await fastify.setToCache(cacheKey, roles, 900);
    
    return roles;
  }

  // Invalidate cache when roles/permissions change
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string, expiresAt?: Date) {
    await super.assignRoleToUser(userId, roleId, assignedBy, expiresAt);
    
    // Invalidate caches
    await fastify.deleteFromCache(`roles:${userId}`);
    await fastify.deleteFromCache(`permissions:${userId}`);
  }
}
```

### 2. Batch Permission Checking

```typescript
class BatchRBACService extends RBACService {
  private permissionCache = new Map<string, boolean>();
  
  async batchCheckPermissions(
    userId: string, 
    permissions: Array<{resource: string, action: string, scope?: string}>
  ) {
    const userPermissions = await this.getUserPermissions(userId);
    const results: Record<string, boolean> = {};

    permissions.forEach(perm => {
      const key = `${perm.resource}:${perm.action}:${perm.scope || 'own'}`;
      results[key] = userPermissions.some(up =>
        up.resource === perm.resource &&
        up.action === perm.action &&
        up.scope === (perm.scope || 'own')
      );
    });

    return results;
  }
}
```

### 3. Preloaded Context

```typescript
// Preload user permissions in middleware
fastify.addHook('preHandler', async (request, reply) => {
  if (request.user) {
    // Preload permissions for authenticated users
    request.userPermissions = await rbacService.getUserPermissions(request.user.id);
    request.userRoles = await rbacService.getUserRoles(request.user.id);
  }
});

// Use preloaded permissions in routes
fastify.get('/dashboard', {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    const hasAccess = request.userPermissions.some(p => 
      p.resource === 'dashboard' && p.action === 'read'
    );

    if (!hasAccess) {
      throw fastify.httpErrors.forbidden();
    }

    return await dashboardService.getDashboard(request.userPermissions);
  }
});
```

## Security Considerations

### 1. Principle of Least Privilege

Always assign the minimum permissions necessary:

```typescript
// Good: Specific permissions
const nursePermissions = [
  'patients:read:department',
  'vitals:write:department',
  'medications:read:own'
];

// Bad: Overly broad permissions
const nursePermissions = [
  'patients:*:all',  // Too broad
  'medical_records:*:all'  // Unnecessary access
];
```

### 2. Permission Validation

Validate permissions before granting access:

```typescript
class SecureRBACService extends RBACService {
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string) {
    // Validate role exists and is active
    const role = await this.roleRepository.findById(roleId);
    if (!role || !role.is_active) {
      throw new Error('Invalid or inactive role');
    }

    // Check if assigner has permission to assign this role
    if (assignedBy) {
      const canAssign = await this.hasPermission({
        userId: assignedBy,
        resource: 'roles',
        action: 'assign',
        scope: 'all'
      });

      if (!canAssign) {
        throw new Error('Insufficient permissions to assign role');
      }
    }

    return super.assignRoleToUser(userId, roleId, assignedBy);
  }
}
```

### 3. Audit Trail

Log all permission changes:

```typescript
class AuditedRBACService extends RBACService {
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string) {
    const result = await super.assignRoleToUser(userId, roleId, assignedBy);
    
    // Log role assignment
    await auditLogService.logAction(
      'ROLE_ASSIGN',
      'user',
      { user_id: assignedBy },
      {
        resourceId: userId,
        metadata: {
          roleId,
          assignedBy,
          timestamp: new Date()
        }
      }
    );

    return result;
  }
}
```

## Best Practices

### 1. Role Design

- **Keep roles business-focused**: Align with job functions
- **Use inheritance**: Create base roles and extend them
- **Avoid role explosion**: Don't create too many granular roles
- **Regular review**: Periodically review and clean up unused roles

```typescript
// Good role hierarchy
const roleHierarchy = {
  'healthcare_base': {
    permissions: ['patients:read:own', 'appointments:read:own']
  },
  'doctor': {
    inherits: ['healthcare_base'],
    permissions: ['patients:write:department', 'prescriptions:write:own']
  },
  'senior_doctor': {
    inherits: ['doctor'],
    permissions: ['patients:read:all', 'users:read:department']
  }
};
```

### 2. Permission Naming

Use consistent, hierarchical naming:

```typescript
// Good naming convention
const permissions = [
  'users:read:own',
  'users:write:own', 
  'users:delete:department',
  'patients:read:own',
  'patients:write:department',
  'reports:export:all'
];

// Bad naming
const permissions = [
  'can_view_users',
  'user_edit_permission',
  'delete_any_patient',
  'full_report_access'
];
```

### 3. Error Handling

Provide clear, actionable error messages:

```typescript
class UserFriendlyRBACService extends RBACService {
  async requirePermission(context: RBACContext) {
    const hasPermission = await this.hasPermission(context);
    
    if (!hasPermission) {
      const message = this.getPermissionErrorMessage(context);
      throw fastify.httpErrors.forbidden(message);
    }
  }

  private getPermissionErrorMessage(context: RBACContext): string {
    const { resource, action, scope } = context;
    
    const actionText = {
      read: 'view',
      write: 'edit',
      delete: 'delete',
      export: 'export'
    }[action] || action;

    const scopeText = {
      own: 'your own',
      department: 'department',
      all: 'all'
    }[scope || 'own'];

    return `You don't have permission to ${actionText} ${scopeText} ${resource}. Please contact your administrator.`;
  }
}
```

### 4. Testing

Comprehensive test coverage for permissions:

```typescript
describe('RBAC Service', () => {
  describe('Permission Checking', () => {
    it('should allow user to read own profile', async () => {
      const hasPermission = await rbacService.hasPermission({
        userId: 'user-123',
        resource: 'users',
        action: 'read',
        scope: 'own',
        resourceId: 'user-123'
      });
      
      expect(hasPermission).toBe(true);
    });

    it('should deny user reading other profiles without permission', async () => {
      const hasPermission = await rbacService.hasPermission({
        userId: 'user-123',
        resource: 'users',
        action: 'read',
        scope: 'own',
        resourceId: 'user-456'  // Different user
      });
      
      expect(hasPermission).toBe(false);
    });

    it('should allow admin to read all profiles', async () => {
      // Assign admin role to user
      await rbacService.assignRoleToUser('user-123', 'admin-role');
      
      const hasPermission = await rbacService.hasPermission({
        userId: 'user-123',
        resource: 'users',
        action: 'read',
        scope: 'all'
      });
      
      expect(hasPermission).toBe(true);
    });
  });
});
```

## Troubleshooting

### 1. Permission Denied Issues

**Problem**: Users getting permission denied unexpectedly

**Debug Steps**:
```typescript
// Debug permission checking
async function debugPermission(userId: string, resource: string, action: string, scope?: string) {
  console.log('=== Permission Debug ===');
  console.log(`User: ${userId}`);
  console.log(`Checking: ${resource}:${action}:${scope || 'own'}`);
  
  // Check user roles
  const roles = await rbacService.getUserRoles(userId);
  console.log('User roles:', roles.map(r => r.name));
  
  // Check user permissions
  const permissions = await rbacService.getUserPermissions(userId);
  console.log('User permissions:', permissions.map(p => 
    `${p.resource}:${p.action}:${p.scope}`
  ));
  
  // Check specific permission
  const hasPermission = await rbacService.hasPermission({
    userId, resource, action, scope
  });
  console.log('Has permission:', hasPermission);
  
  return hasPermission;
}
```

### 2. Performance Issues

**Problem**: Slow permission checking

**Solutions**:
- Enable Redis caching
- Use batch permission checking
- Preload permissions in middleware
- Review database indexes

```typescript
// Performance monitoring
const start = Date.now();
const hasPermission = await rbacService.hasPermission(context);
const duration = Date.now() - start;

if (duration > 100) {
  fastify.log.warn(`Slow permission check: ${duration}ms`, context);
}
```

### 3. Cache Inconsistency

**Problem**: Stale permissions in cache

**Solutions**:
```typescript
// Ensure cache invalidation on changes
class CacheInvalidatingRBACService extends CachedRBACService {
  async assignRoleToUser(userId: string, roleId: string) {
    await super.assignRoleToUser(userId, roleId);
    await this.invalidateUserCache(userId);
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    await super.removeRoleFromUser(userId, roleId);
    await this.invalidateUserCache(userId);
  }

  private async invalidateUserCache(userId: string) {
    await Promise.all([
      fastify.deleteFromCache(`roles:${userId}`),
      fastify.deleteFromCache(`permissions:${userId}`)
    ]);
  }
}
```

### 4. Role Assignment Issues

**Problem**: Unable to assign roles

**Debug Steps**:
```bash
# Check role exists
SELECT * FROM roles WHERE id = 'role-id';

# Check user exists  
SELECT * FROM users WHERE id = 'user-id';

# Check existing assignments
SELECT * FROM user_roles WHERE user_id = 'user-id';

# Check role permissions
SELECT r.name, p.resource, p.action, p.scope 
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 'role-id';
```

The RBAC system provides a flexible and secure foundation for authorization. Proper implementation of these patterns ensures both security and usability in your application.