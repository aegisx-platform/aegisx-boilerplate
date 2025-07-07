import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Data already cleared in 001_users.ts seed
  // We only need to insert new data here

  // 1. Insert default roles (general purpose)
  const roles = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system access and user management',
      is_system: true,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'manager',
      display_name: 'Manager',
      description: 'Management level access with team oversight',
      is_system: false,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'user',
      display_name: 'User',
      description: 'Standard user with basic access permissions',
      is_system: false,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'viewer',
      display_name: 'Viewer',
      description: 'Read-only access to basic resources',
      is_system: false,
      is_active: true
    }
  ];
  
  await knex('roles').insert(roles);

  // 2. Insert basic permissions (general purpose)
  const permissions = [
    // User Management
    { resource: 'users', action: 'create', scope: 'all', display_name: 'Create Users', description: 'Create new users' },
    { resource: 'users', action: 'read', scope: 'all', display_name: 'View Users', description: 'View all users' },
    { resource: 'users', action: 'read', scope: 'own', display_name: 'View Own Profile', description: 'View own user profile' },
    { resource: 'users', action: 'update', scope: 'all', display_name: 'Update Users', description: 'Update any user information' },
    { resource: 'users', action: 'update', scope: 'own', display_name: 'Update Own Profile', description: 'Update own user profile' },
    { resource: 'users', action: 'delete', scope: 'all', display_name: 'Delete Users', description: 'Delete users' },
    
    // Role Management
    { resource: 'roles', action: 'read', scope: 'all', display_name: 'View Roles', description: 'View all roles' },
    { resource: 'roles', action: 'assign', scope: 'all', display_name: 'Assign Roles', description: 'Assign roles to users' },
    { resource: 'roles', action: 'create', scope: 'all', display_name: 'Create Roles', description: 'Create new roles' },
    { resource: 'roles', action: 'update', scope: 'all', display_name: 'Update Roles', description: 'Update role information' },
    { resource: 'roles', action: 'delete', scope: 'all', display_name: 'Delete Roles', description: 'Delete roles' },
    
    // System Administration
    { resource: 'system', action: 'configure', scope: 'all', display_name: 'System Configuration', description: 'Configure system settings' },
    { resource: 'system', action: 'read', scope: 'all', display_name: 'View System Info', description: 'View system information' },
    
    // Dashboard/Analytics
    { resource: 'dashboard', action: 'read', scope: 'own', display_name: 'View Own Dashboard', description: 'View personal dashboard' },
    { resource: 'dashboard', action: 'read', scope: 'all', display_name: 'View All Dashboards', description: 'View system-wide dashboard' },
    
    // Reports
    { resource: 'reports', action: 'read', scope: 'own', display_name: 'View Own Reports', description: 'View personal reports' },
    { resource: 'reports', action: 'read', scope: 'all', display_name: 'View All Reports', description: 'View all system reports' },
    { resource: 'reports', action: 'export', scope: 'own', display_name: 'Export Own Reports', description: 'Export personal reports' },
    { resource: 'reports', action: 'export', scope: 'all', display_name: 'Export All Reports', description: 'Export any system reports' },
    
    // Audit Logs
    { resource: 'audit', action: 'read', scope: 'own', display_name: 'View Own Activity', description: 'View own activity logs' },
    { resource: 'audit', action: 'read', scope: 'all', display_name: 'View All Audit Logs', description: 'View all system audit logs' },
    
    // API Keys
    { resource: 'api_keys', action: 'create', scope: 'own', display_name: 'Create API Keys', description: 'Create own API keys' },
    { resource: 'api_keys', action: 'read', scope: 'own', display_name: 'View Own API Keys', description: 'View own API keys' },
    { resource: 'api_keys', action: 'update', scope: 'own', display_name: 'Update Own API Keys', description: 'Update own API keys' },
    { resource: 'api_keys', action: 'delete', scope: 'own', display_name: 'Delete Own API Keys', description: 'Delete own API keys' },
    { resource: 'api_keys', action: 'read', scope: 'all', display_name: 'View All API Keys', description: 'View all API keys (admin)' },
    { resource: 'api_keys', action: 'delete', scope: 'all', display_name: 'Delete All API Keys', description: 'Delete any API keys (admin)' }
  ].map(p => ({
    id: knex.raw('gen_random_uuid()'),
    ...p
  }));
  
  await knex('permissions').insert(permissions);

  // 3. Get role and permission IDs for junction tables
  const insertedRoles = await knex('roles').select('id', 'name');
  const insertedPermissions = await knex('permissions').select('id', 'resource', 'action', 'scope');

  // Helper function to find role/permission IDs
  const getRoleId = (name: string) => insertedRoles.find(r => r.name === name)?.id;
  const getPermissionId = (resource: string, action: string, scope: string) => 
    insertedPermissions.find(p => p.resource === resource && p.action === action && p.scope === scope)?.id;

  // 4. Assign permissions to roles
  const rolePermissions = [];

  // Admin - All permissions
  const adminId = getRoleId('admin');
  for (const permission of insertedPermissions) {
    rolePermissions.push({
      id: knex.raw('gen_random_uuid()'),
      role_id: adminId,
      permission_id: permission.id
    });
  }

  // Manager - Management permissions
  const managerId = getRoleId('manager');
  const managerPermissions = [
    'users:read:all', 'users:update:all',
    'roles:read:all', 'roles:assign:all',
    'dashboard:read:all', 'reports:read:all', 'reports:export:all',
    'audit:read:all', 'system:read:all',
    'api_keys:create:own', 'api_keys:read:own', 'api_keys:update:own', 'api_keys:delete:own',
    'api_keys:read:all'
  ];
  for (const perm of managerPermissions) {
    const [resource, action, scope] = perm.split(':');
    const permId = getPermissionId(resource, action, scope);
    if (permId) {
      rolePermissions.push({
        id: knex.raw('gen_random_uuid()'),
        role_id: managerId,
        permission_id: permId
      });
    }
  }

  // User - Standard user permissions
  const userId = getRoleId('user');
  const userPermissions = [
    'users:read:own', 'users:update:own',
    'dashboard:read:own', 'reports:read:own', 'reports:export:own',
    'audit:read:own',
    'api_keys:create:own', 'api_keys:read:own', 'api_keys:update:own', 'api_keys:delete:own'
  ];
  for (const perm of userPermissions) {
    const [resource, action, scope] = perm.split(':');
    const permId = getPermissionId(resource, action, scope);
    if (permId) {
      rolePermissions.push({
        id: knex.raw('gen_random_uuid()'),
        role_id: userId,
        permission_id: permId
      });
    }
  }

  // Viewer - Read-only permissions
  const viewerId = getRoleId('viewer');
  const viewerPermissions = [
    'users:read:own',
    'dashboard:read:own', 'reports:read:own',
    'audit:read:own'
  ];
  for (const perm of viewerPermissions) {
    const [resource, action, scope] = perm.split(':');
    const permId = getPermissionId(resource, action, scope);
    if (permId) {
      rolePermissions.push({
        id: knex.raw('gen_random_uuid()'),
        role_id: viewerId,
        permission_id: permId
      });
    }
  }

  await knex('role_permissions').insert(rolePermissions);

  // 5. Assign roles to existing users (from seed 001_users.ts)
  const users = await knex('users').select('id', 'email', 'username');
  const userRoleAssignments = [];

  // Get admin user ID for assigned_by field
  const adminUser = users.find(u => u.email === 'admin@aegisx.com');
  const assignedByUserId = adminUser?.id || users[0]?.id; // Fallback to first user

  for (const user of users) {
    let roleToAssign = null;

    // Assign roles based on email/username patterns
    if (user.email === 'admin@aegisx.com' || user.username === 'admin') {
      roleToAssign = adminId;
    } else if (user.email?.includes('manager') || user.username?.includes('manager')) {
      roleToAssign = managerId;
    } else if (user.email?.includes('viewer') || user.username?.includes('viewer')) {
      roleToAssign = viewerId;
    } else {
      // Default role for other users
      roleToAssign = userId;
    }

    if (roleToAssign) {
      userRoleAssignments.push({
        id: knex.raw('gen_random_uuid()'),
        user_id: user.id,
        role_id: roleToAssign,
        assigned_by: assignedByUserId, // Assigned by admin user ID
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  if (userRoleAssignments.length > 0) {
    await knex('user_roles').insert(userRoleAssignments);
  }

  console.log(`✅ RBAC seed completed:`);
  console.log(`   - Created ${roles.length} roles`);
  console.log(`   - Created ${permissions.length} permissions`);
  console.log(`   - Assigned ${rolePermissions.length} role-permission mappings`);
  console.log(`   - Assigned roles to ${userRoleAssignments.length} users`);
}