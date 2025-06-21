import { Role, Permission } from '../../../domains/rbac/types/rbac-types';
import { FastifyInstance } from 'fastify';

export interface RBACCacheData {
  roles: string[];        // Role names: ["admin", "doctor"]
  permissions: string[];  // Permission strings: ["users:read:all", "patients:write:own"]
}

export class RBACCache {
  private readonly TTL_SECONDS: number = 900; // 15 minutes

  constructor(private readonly fastify: FastifyInstance) {}

  private getUserRBACKey(userId: string): string {
    return `rbac:${userId}`;
  }

  /**
   * Cache user RBAC data in Redis
   */
  async set(userId: string, roles: Role[], permissions: Permission[]): Promise<void> {
    try {
      const data: RBACCacheData = {
        roles: roles.map(role => role.name),
        permissions: permissions.map(permission => 
          `${permission.resource}:${permission.action}${permission.scope ? `:${permission.scope}` : ''}`
        )
      };

      const key = this.getUserRBACKey(userId);
      await this.fastify.setToCache(key, data, this.TTL_SECONDS);
      
      this.fastify.log.debug('RBAC data cached', { userId, rolesCount: roles.length, permissionsCount: permissions.length });
    } catch (error) {
      this.fastify.log.error('Failed to cache RBAC data', { userId, error });
    }
  }

  /**
   * Get user RBAC data from Redis cache
   */
  async get(userId: string): Promise<RBACCacheData | null> {
    try {
      const key = this.getUserRBACKey(userId);
      const data = await this.fastify.getFromCache(key);
      
      if (data) {
        this.fastify.log.debug('RBAC cache hit', { userId });
        return data as RBACCacheData;
      }
      
      this.fastify.log.debug('RBAC cache miss', { userId });
      return null;
    } catch (error) {
      this.fastify.log.error('Failed to get RBAC data from cache', { userId, error });
      return null;
    }
  }

  /**
   * Invalidate user RBAC cache
   */
  async invalidate(userId: string): Promise<void> {
    try {
      const key = this.getUserRBACKey(userId);
      await this.fastify.deleteFromCache(key);
      
      this.fastify.log.debug('RBAC cache invalidated', { userId });
    } catch (error) {
      this.fastify.log.error('Failed to invalidate RBAC cache', { userId, error });
    }
  }

  /**
   * Invalidate all RBAC cache entries
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.fastify.deleteCachePattern('rbac:*');
      this.fastify.log.info('All RBAC cache invalidated');
    } catch (error) {
      this.fastify.log.error('Failed to invalidate all RBAC cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ pattern: string; count: number; memoryUsage: string }> {
    try {
      const stats = await this.fastify.getCacheStats();
      return {
        pattern: 'rbac:*',
        count: stats.keys || 0,
        memoryUsage: stats.memory || '0'
      };
    } catch (error) {
      this.fastify.log.error('Failed to get RBAC cache stats', { error });
      return { pattern: 'rbac:*', count: 0, memoryUsage: '0' };
    }
  }
}