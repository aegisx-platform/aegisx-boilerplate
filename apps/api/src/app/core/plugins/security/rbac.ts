import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RoleRepository } from '../../../domains/rbac/repositories/role-repository';
import { RBACService } from '../../../domains/rbac/services/rbac-service';

declare module 'fastify' {
  interface FastifyInstance {
    rbac: RBACService;
    requirePermission: (resource: string, action: string, scope?: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rbacRequire: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface RBACOptions {
  // Add any configuration options here
  [key: string]: unknown;
}

async function rbacPlugin(fastify: FastifyInstance, _options: RBACOptions) {
  // Initialize RBAC service
  const roleRepository = new RoleRepository(fastify.knex);
  const rbacService = new RBACService(roleRepository);

  // Register RBAC service
  fastify.decorate('rbac', rbacService);

  // Permission checking middleware factory
  const requirePermission = (resource: string, action: string, scope?: string) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Check if user is authenticated
        const userContext = rbacService.getUserContext(request);
        if (!userContext) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
        }

        // Check permission
        const hasPermission = await rbacService.checkPermission(
          request,
          resource,
          action,
          scope
        );

        if (!hasPermission) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: `Insufficient permissions: ${resource}:${action}${scope ? `:${scope}` : ''}`,
            required_permission: {
              resource,
              action,
              scope
            }
          });
        }

        // Permission granted, continue to route handler
      } catch (error) {
        fastify.log.error('RBAC permission check failed:', error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Permission check failed'
        });
      }
    };
  };

  // Register permission middleware factory
  fastify.decorate('requirePermission', requirePermission);

  // Role-based access control middleware factory
  const rbacRequire = (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Check if user is authenticated
        const userContext = rbacService.getUserContext(request);
        if (!userContext) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
        }

        // Get user roles
        const userRoles = await rbacService.getUserRoles(userContext.userId);
        const userRoleNames = userRoles.map(role => role.name);

        // Check if user has any of the required roles
        const hasRequiredRole = roles.some(role => userRoleNames.includes(role));
        
        if (!hasRequiredRole) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: `Insufficient permissions: requires one of ${roles.join(', ')}`,
            required_roles: roles,
            user_roles: userRoleNames
          });
        }

        // Role check passed, continue to route handler
      } catch (error) {
        fastify.log.error('RBAC role check failed:', error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Role check failed'
        });
      }
    };
  };

  fastify.decorate('rbacRequire', rbacRequire);

  // Helper decorators for common permission patterns
  fastify.decorate('requireAdmin', requirePermission('system', 'configure', 'all'));
  fastify.decorate('requireUserManagement', requirePermission('users', 'read', 'all'));
  fastify.decorate('requireOwnProfile', requirePermission('users', 'read', 'own'));

  // Hook to add user permissions to request context (optional)
  fastify.addHook('preHandler', async (request, _reply) => {
    // Only add permissions for authenticated users
    const userContext = rbacService.getUserContext(request);
    if (userContext) {
      try {
        const permissions = await rbacService.getUserPermissions(userContext.userId);
        const roles = await rbacService.getUserRoles(userContext.userId);

        // Add to request context for easy access in route handlers
        (request as FastifyRequest & { userPermissions: unknown; userRoles: unknown }).userPermissions = permissions;
        (request as FastifyRequest & { userPermissions: unknown; userRoles: unknown }).userRoles = roles;
      } catch (error) {
        fastify.log.warn('Failed to load user permissions:', error);
      }
    }
  });
}

// Export the plugin
export default fp(rbacPlugin, {
  name: 'rbac',
  dependencies: ['knex-plugin', 'jwt-plugin'] // Ensure knex and jwt plugins are loaded first
});
