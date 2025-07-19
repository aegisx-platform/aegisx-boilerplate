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
  const rbacService = new RBACService(roleRepository, fastify);

  // Register RBAC service
  fastify.decorate('rbac', rbacService);

  // JWT-based permission checking middleware factory (HIGH PERFORMANCE)
  const requirePermission = (resource: string, action: string, scope?: string) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Check if user is authenticated and has JWT payload
        const user = (request as any).user;
        if (!user || !user.permissions) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required'
          });
        }

        // Build required permission string
        const requiredPermission = `${resource}:${action}${scope ? `:${scope}` : ''}`;
        
        // Check if user has the required permission in JWT (NO DATABASE QUERY!)
        const hasPermission = user.permissions.includes(requiredPermission);

        if (!hasPermission) {
          // Log for audit purposes
          fastify.log.warn('Permission denied', { 
            userId: user.id, 
            required: requiredPermission, 
            userPermissions: user.permissions 
          });

          // Audit log for security events
          // Note: Will be logged by audit middleware automatically for 403 responses
          
          return reply.code(403).send({
            success: false,
            error: `Insufficient permissions: ${requiredPermission}`
          });
        }

        // Permission granted, continue to route handler
        fastify.log.debug('Permission granted', { userId: user.id, permission: requiredPermission });
      } catch (error: any) {
        fastify.log.error('RBAC permission check failed:', error);
        return reply.code(500).send({
          success: false,
          error: 'Permission check failed'
        });
      }
    };
  };

  // Register permission middleware factory
  fastify.decorate('requirePermission', requirePermission);

  // JWT-based role checking middleware factory (HIGH PERFORMANCE)
  const rbacRequire = (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Check if user is authenticated and has JWT payload
        const user = (request as any).user;
        if (!user || !user.roles) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required'
          });
        }

        // Check if user has any of the required roles from JWT (NO DATABASE QUERY!)
        const hasRequiredRole = roles.some(role => user.roles.includes(role));
        
        if (!hasRequiredRole) {
          // Log for audit purposes
          fastify.log.warn('Role access denied', { 
            userId: user.id, 
            requiredRoles: roles, 
            userRoles: user.roles 
          });

          // Audit log for security events  
          // Note: Will be logged by audit middleware automatically for 403 responses
          
          return reply.code(403).send({
            success: false,
            error: `Insufficient permissions: requires one of ${roles.join(', ')}`
          });
        }

        // Role check passed, continue to route handler
        fastify.log.debug('Role access granted', { userId: user.id, roles: roles });
      } catch (error: any) {
        fastify.log.error('RBAC role check failed:', error);
        return reply.code(500).send({
          success: false,
          error: 'Role check failed'
        });
      }
    };
  };

  fastify.decorate('rbacRequire', rbacRequire);

  // Helper decorators for common permission patterns
  fastify.decorate('requireAdmin', rbacRequire(['admin']));
  fastify.decorate('requireUserManagement', requirePermission('users', 'read', 'all'));
  fastify.decorate('requireOwnProfile', requirePermission('users', 'read', 'own'));

  // No more preHandler hook for database queries!
  // All permissions and roles are now available directly from JWT in request.user
  
  fastify.log.info('✅ High-performance JWT-based RBAC plugin loaded (no database queries per request)');
}

// Export the plugin
export default fp(rbacPlugin, {
  name: 'rbac',
  dependencies: ['knex-plugin', 'jwt-plugin'] // Ensure knex and jwt plugins are loaded first
});
