// RBAC Types for Admin UI
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  user_count?: number;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  display_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: Role;
  assigned_by?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AssignPermissionsRequest {
  permission_ids: string[];
}

export interface AssignRoleRequest {
  role_id: string;
  expires_at?: string;
}

export interface RoleStats {
  total_roles: number;
  active_roles: number;
  total_users: number;
  total_permissions: number;
}

// Grouped permissions for UI
export interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

// For permission selection UI
export interface PermissionSelection {
  permission: Permission;
  selected: boolean;
}