import { FastifyRequest, FastifyInstance } from 'fastify';
import { RoleRepository } from '../repositories/role-repository';
import {
  Permission,
  Role,
  RBACContext,
  RBACServiceInterface
} from '../types/rbac-types';

export class RBACService implements RBACServiceInterface {
  constructor(
    private roleRepository: RoleRepository,
    private fastify?: FastifyInstance
  ) {}

  async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!userId) {
      throw new Error('"user_id" is required!');
    }
    return this.roleRepository.getUserPermissions(userId);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    if (!userId) {
      throw new Error('"user_id" is required!');
    }
    const userWithRoles = await this.roleRepository.findUserRoles(userId);
    return userWithRoles.roles || [];
  }

  async hasPermission(context: RBACContext): Promise<boolean> {
    const { userId, resource, action, scope } = context;

    // Check basic permission
    const hasBasicPermission = await this.roleRepository.hasPermission(userId, resource, action, scope);
    if (!hasBasicPermission) {
      return false;
    }

    // Additional scope-based checks
    return this.checkScopePermission(context);
  }

  private async checkScopePermission(context: RBACContext): Promise<boolean> {
    const { scope, userId, resourceId } = context;

    switch (scope) {
      case 'own':
        // User can only access their own resources
        return this.checkOwnResource(userId, resourceId);

      case 'department':
        // User can access resources within their department
        return this.checkDepartmentResource(userId, context.departmentId);

      case 'all':
        // User has system-wide access
        return true;

      default:
        return true;
    }
  }

  private async checkOwnResource(userId: string, resourceId?: string): Promise<boolean> {
    // If no resourceId provided, assume it's about the user themselves
    if (!resourceId) return true;

    // Check if the resource belongs to the user
    // This would need to be implemented based on your specific resource relationships
    return userId === resourceId;
  }

  private async checkDepartmentResource(userId: string, departmentId?: string): Promise<boolean> {
    // This would need to be implemented based on your department/organization structure
    // For now, we'll return true - implement based on your business logic
    return true;
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string, expiresAt?: Date): Promise<void> {
    return this.roleRepository.assignRoleToUser(userId, roleId, assignedBy, expiresAt);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return this.roleRepository.removeRoleFromUser(userId, roleId);
  }

  async getAllRoles(activeOnly = true): Promise<Role[]> {
    return this.roleRepository.findAll(activeOnly);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.roleRepository.findAllPermissions();
  }

  async getRoleWithPermissions(roleId: string) {
    return this.roleRepository.findRoleWithPermissions(roleId);
  }

  async createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    return this.roleRepository.createRole(roleData);
  }

  async updateRole(id: string, roleData: Partial<Omit<Role, 'id' | 'created_at' | 'updated_at'>>): Promise<Role | null> {
    return this.roleRepository.updateRole(id, roleData);
  }

  async deleteRole(id: string): Promise<boolean> {
    return this.roleRepository.deleteRole(id);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    return this.roleRepository.assignPermissionsToRole(roleId, permissionIds);
  }

  // Helper method to extract user context from request
  getUserContext(request: FastifyRequest): { userId: string } | null {
    const user = (request as any).user;
    if (this.fastify) {
      this.fastify.log.info('getUserContext called', { 
        hasUser: !!user, 
        userId: user?.id,
        userObject: user, // Log entire user object
        userType: typeof user,
        userKeys: user ? Object.keys(user) : null,
        requestUrl: request.url 
      });
    }
    
    // Check different possible property names
    const possibleIds = [user?.id, user?.user_id, user?.userId, user?.sub];
    const actualId = possibleIds.find(id => id !== undefined && id !== null);
    
    if (this.fastify) {
      this.fastify.log.info('Checking possible ID fields', { 
        'user.id': user?.id,
        'user.user_id': user?.user_id,
        'user.userId': user?.userId,
        'user.sub': user?.sub,
        actualId
      });
    }
    
    if (!user || !actualId) {
      if (this.fastify) {
        this.fastify.log.warn('No user or user.id found in request', {
          hasUser: !!user,
          userProperties: user ? Object.keys(user) : null
        });
      }
      return null;
    }
    
    if (this.fastify) {
      this.fastify.log.info('User context extracted successfully', { userId: actualId });
    }
    return { userId: actualId };
  }

  // Permission check middleware helper
  async checkPermission(
    request: FastifyRequest,
    resource: string,
    action: string,
    scope?: string,
    resourceId?: string
  ): Promise<boolean> {
    const userContext = this.getUserContext(request);
    if (!userContext) {
      return false;
    }

    return this.hasPermission({
      userId: userContext.userId,
      resource,
      action,
      scope,
      resourceId
    });
  }

  // Generate permission string (for caching or logging)
  generatePermissionKey(resource: string, action: string, scope?: string): string {
    return scope ? `${resource}:${action}:${scope}` : `${resource}:${action}`;
  }

  // Check multiple permissions at once
  async hasAnyPermission(userId: string, permissions: Array<{resource: string, action: string, scope?: string}>): Promise<boolean> {
    for (const perm of permissions) {
      const hasPermission = await this.hasPermission({
        userId,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope
      });
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(userId: string, permissions: Array<{resource: string, action: string, scope?: string}>): Promise<boolean> {
    for (const perm of permissions) {
      const hasPermission = await this.hasPermission({
        userId,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope
      });
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }
}
