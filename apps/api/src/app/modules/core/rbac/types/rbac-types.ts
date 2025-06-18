
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  display_name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserWithRoles {
  user_id: string;
  roles: RoleWithPermissions[];
}

export interface RBACContext {
  userId: string;
  resource: string;
  action: string;
  scope?: string;
  resourceId?: string;
  departmentId?: string;
}

/**
 * Repository interface for Role operations
 */
export interface RoleRepositoryInterface {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(activeOnly?: boolean): Promise<Role[]>;
  findRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null>;
  findUserRoles(userId: string): Promise<UserWithRoles>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  hasPermission(userId: string, resource: string, action: string, scope?: string): Promise<boolean>;
  assignRoleToUser(userId: string, roleId: string, assignedBy?: string, expiresAt?: Date): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role>;
  updateRole(id: string, roleData: Partial<Omit<Role, 'id' | 'created_at' | 'updated_at'>>): Promise<Role | null>;
  deleteRole(id: string): Promise<boolean>;
  findAllPermissions(): Promise<Permission[]>;
  assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void>;
}

/**
 * Service interface for RBAC operations
 */
export interface RBACServiceInterface {
  getUserPermissions(userId: string): Promise<Permission[]>;
  getUserRoles(userId: string): Promise<UserWithRoles>;
  hasPermission(context: RBACContext): Promise<boolean>;
  assignRoleToUser(userId: string, roleId: string, assignedBy?: string, expiresAt?: Date): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  getAllRoles(activeOnly?: boolean): Promise<Role[]>;
  getAllPermissions(): Promise<Permission[]>;
  getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null>;
  createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role>;
  updateRole(id: string, roleData: Partial<Omit<Role, 'id' | 'created_at' | 'updated_at'>>): Promise<Role | null>;
  deleteRole(id: string): Promise<boolean>;
  assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void>;
}
