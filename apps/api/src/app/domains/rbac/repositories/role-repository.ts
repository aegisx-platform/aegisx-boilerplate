import type { Knex } from 'knex';
import {
  Role,
  Permission,
  RoleWithPermissions,
  UserWithRoles,
  RoleRepositoryInterface
} from '../types/rbac-types';

export class RoleRepository implements RoleRepositoryInterface {
  constructor(private knex: Knex) {}

  async findById(id: string): Promise<Role | null> {
    const role = await this.knex('roles')
      .where({ id })
      .first();
    return role || null;
  }

  async findByName(name: string): Promise<Role | null> {
    const role = await this.knex('roles')
      .where({ name })
      .first();
    return role || null;
  }

  async findAll(activeOnly = true): Promise<Role[]> {
    const knex = this.knex; // Store reference for closure
    const query = this.knex('roles')
      .select(
        'roles.*',
        this.knex.raw('COUNT(DISTINCT user_roles.user_id) as user_count')
      )
      .leftJoin('user_roles', function() {
        this.on('roles.id', '=', 'user_roles.role_id')
          .andOn('user_roles.is_active', '=', knex.raw('?', [true]));
      })
      .groupBy('roles.id');

    if (activeOnly) {
      query.where('roles.is_active', true);
    }

    const roles = await query.orderBy('roles.display_name');

    // Convert count to number and ensure proper type
    return roles.map(role => ({
      ...role,
      user_count: parseInt(role.user_count as string, 10) || 0
    })) as Role[];
  }

  async findRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
    const role = await this.findById(roleId);
    if (!role) return null;

    const permissions = await this.knex('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', roleId)
      .select('permissions.*')
      .orderBy(['permissions.resource', 'permissions.action', 'permissions.scope']);

    return {
      ...role,
      permissions
    };
  }

  async findUserRoles(userId: string): Promise<UserWithRoles> {
    const userRoles = await this.knex('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({
        'user_roles.user_id': userId,
        'user_roles.is_active': true,
        'roles.is_active': true
      })
      .where(function() {
        this.whereNull('user_roles.expires_at')
          .orWhere('user_roles.expires_at', '>', new Date());
      })
      .select('roles.*')
      .orderBy('roles.display_name');

    const rolesWithPermissions: RoleWithPermissions[] = [];

    for (const role of userRoles) {
      const permissions = await this.knex('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', role.id)
        .select('permissions.*')
        .orderBy(['permissions.resource', 'permissions.action', 'permissions.scope']);

      rolesWithPermissions.push({
        ...role,
        permissions
      });
    }

    return {
      user_id: userId,
      roles: rolesWithPermissions
    };
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const permissions = await this.knex('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({
        'user_roles.user_id': userId,
        'user_roles.is_active': true,
        'roles.is_active': true
      })
      .where(function() {
        this.whereNull('user_roles.expires_at')
          .orWhere('user_roles.expires_at', '>', new Date());
      })
      .select('permissions.*')
      .distinct()
      .orderBy(['permissions.resource', 'permissions.action', 'permissions.scope']);

    return permissions;
  }

  async hasPermission(userId: string, resource: string, action: string, scope?: string): Promise<boolean> {
    const query = this.knex('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({
        'user_roles.user_id': userId,
        'user_roles.is_active': true,
        'roles.is_active': true,
        'permissions.resource': resource,
        'permissions.action': action
      })
      .where(function() {
        this.whereNull('user_roles.expires_at')
          .orWhere('user_roles.expires_at', '>', new Date());
      });

    if (scope) {
      query.where('permissions.scope', scope);
    }

    const result = await query.first();
    return !!result;
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string, expiresAt?: Date): Promise<void> {
    // Check if role assignment already exists
    const existing = await this.knex('user_roles')
      .where({ user_id: userId, role_id: roleId })
      .first();

    if (existing) {
      // Update existing assignment
      await this.knex('user_roles')
        .where({ user_id: userId, role_id: roleId })
        .update({
          is_active: true,
          expires_at: expiresAt,
          updated_at: new Date()
        });
    } else {
      // Create new assignment
      await this.knex('user_roles').insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        expires_at: expiresAt,
        is_active: true
      });
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.knex('user_roles')
      .where({ user_id: userId, role_id: roleId })
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  async createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const [role] = await this.knex('roles')
      .insert(roleData)
      .returning('*');
    return role;
  }

  async updateRole(id: string, roleData: Partial<Omit<Role, 'id' | 'created_at' | 'updated_at'>>): Promise<Role | null> {
    const [role] = await this.knex('roles')
      .where({ id })
      .update({
        ...roleData,
        updated_at: new Date()
      })
      .returning('*');
    return role || null;
  }

  async deleteRole(id: string): Promise<boolean> {
    // Check if role is system role
    const role = await this.findById(id);
    if (!role || role.is_system) {
      return false;
    }

    // Soft delete by setting is_active to false
    await this.knex('roles')
      .where({ id })
      .update({
        is_active: false,
        updated_at: new Date()
      });

    // Deactivate all user role assignments
    await this.knex('user_roles')
      .where({ role_id: id })
      .update({
        is_active: false,
        updated_at: new Date()
      });

    return true;
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.knex('permissions')
      .orderBy(['resource', 'action', 'scope']);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    // Remove existing permissions
    await this.knex('role_permissions')
      .where({ role_id: roleId })
      .del();

    // Add new permissions
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId
      }));

      await this.knex('role_permissions').insert(rolePermissions);
    }
  }
}
