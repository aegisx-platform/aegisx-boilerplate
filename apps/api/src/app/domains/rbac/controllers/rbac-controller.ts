import { FastifyRequest, FastifyReply } from 'fastify';
import { RBACService } from '../services/rbac-service';
import { CreateRole, UpdateRole, AssignRole, AssignPermissions } from '../types/rbac-request-types';

export class RBACController {
  constructor(private rbacService: RBACService) { }

  // Role management
  async getAllRoles(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const roles = await this.rbacService.getAllRoles();
      return {
        roles: roles,
        total: roles.length
      };
    } catch (error) {
      request.log.error('Failed to get roles:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve roles',
        statusCode: 500
      });
    }
  }

  async getRoleById(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };
    try {
      const role = await this.rbacService.getRoleWithPermissions(id);

      if (!role) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Role not found',
          statusCode: 404
        });
      }

      return { role: role };
    } catch (error) {
      request.log.error('Failed to get role:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve role',
        statusCode: 500
      });
    }
  }

  async createRole(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const roleData = request.body as CreateRole;
    try {
      const role = await this.rbacService.createRole({
        ...roleData,
        is_system: false,
        is_active: roleData.is_active ?? true
      });

      return reply.code(201).send({
        message: 'Role created successfully',
        role: role
      });
    } catch (error: any) {
      request.log.error('Failed to create role:', error);

      if (error.code === '23505') { // Unique constraint violation
        return reply.code(400).send({
          success: false,
          message: 'Role name already exists'
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Failed to create role'
      });
    }
  }

  async updateRole(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };
    const updateData = request.body as UpdateRole;
    try {
      const role = await this.rbacService.updateRole(id, updateData);

      if (!role) {
        return reply.code(404).send({
          success: false,
          message: 'Role not found'
        });
      }

      return {
        message: 'Role updated successfully',
        role: role
      };
    } catch (error) {
      request.log.error('Failed to update role:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update role'
      });
    }
  }

  async deleteRole(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };
    try {
      const deleted = await this.rbacService.deleteRole(id);

      if (!deleted) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete system role or role not found'
        });
      }

      return {
        success: true,
        message: 'Role deleted successfully'
      };
    } catch (error) {
      request.log.error('Failed to delete role:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete role'
      });
    }
  }

  // Permission management
  async getAllPermissions(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const permissions = await this.rbacService.getAllPermissions();
      return {
        permissions: permissions,
        total: permissions.length
      };
    } catch (error) {
      request.log.error('Failed to get permissions:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve permissions',
        statusCode: 500
      });
    }
  }

  async assignPermissionsToRole(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };
    const { permission_ids } = request.body as AssignPermissions;
    try {
      await this.rbacService.assignPermissionsToRole(id, permission_ids);

      return {
        message: 'Permissions assigned successfully'
      };
    } catch (error) {
      request.log.error('Failed to assign permissions:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to assign permissions',
        statusCode: 500
      });
    }
  }

  // User role management
  async getUserRoles(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };

    try {
      const userRoles = await this.rbacService.getUserRoles(id);

      // Transform roles to match UserRoleAssignmentSchema
      const transformedRoles = userRoles.map(role => ({
        id: `${id}-${role.id}`, // Generate assignment ID
        user_id: id,
        role_id: role.id,
        expires_at: null,
        created_at: role.created_at,
        role: role
      }));

      return {
        user_id: id,
        roles: transformedRoles,
        total_roles: transformedRoles.length
      };
    } catch (error) {
      request.log.error('Failed to get user roles:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user roles',
        statusCode: 500
      });
    }
  }

  async assignRoleToUser(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { id } = request.params as { id: string };
    const { role_id, expires_at } = request.body as AssignRole;
    try {
      const userContext = this.rbacService.getUserContext(request);

      await this.rbacService.assignRoleToUser(
        id,
        role_id,
        userContext?.userId,
        expires_at ? new Date(expires_at) : undefined
      );

      return {
        success: true,
        message: 'Role assigned successfully'
      };
    } catch (error) {
      request.log.error('Failed to assign role:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign role'
      });
    }
  }

  async removeRoleFromUser(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    const { userId, roleId } = request.params as { userId: string; roleId: string };
    try {
      await this.rbacService.removeRoleFromUser(userId, roleId);

      return {
        success: true,
        message: 'Role removed successfully'
      };
    } catch (error) {
      request.log.error('Failed to remove role:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to remove role'
      });
    }
  }

  // Current user permissions
  async getCurrentUserPermissions(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      // Get user from JWT
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply.code(401).send({
          success: false,
          message: 'Unauthorized - no user found'
        });
      }

      // Since JWT already contains roles and permissions, we can return them directly
      // But for consistency with expected API format, let's also fetch from database
      const [userRoles, permissions] = await Promise.all([
        this.rbacService.getUserRoles(user.id),
        this.rbacService.getUserPermissions(user.id)
      ]);

      return {
        success: true,
        data: {
          roles: userRoles,
          permissions
        }
      };
    } catch (error: any) {
      request.log.error('Failed to get current user permissions:', { 
        error: error.message, 
        stack: error.stack,
        user: (request as any).user?.id 
      });
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to retrieve permissions'
      });
    }
  }
}
