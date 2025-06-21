import { Role, Permission } from '../../../domains/rbac/types/rbac-types';

export interface RBACCacheEntry {
  roles: Role[];
  permissions: Permission[];
  expiresAt: number;
}

export class RBACCache {
  private cache = new Map<string, RBACCacheEntry>();
  private readonly TTL_MS: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 15) {
    this.TTL_MS = ttlMinutes * 60 * 1000;
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private generateKey(userId: string, type: 'roles' | 'permissions'): string {
    return `${userId}:${type}`;
  }

  set(userId: string, data: { roles?: Role[], permissions?: Permission[] }): void {
    const expiresAt = Date.now() + this.TTL_MS;
    
    // Get existing entry or create new one
    const existingEntry = this.cache.get(this.generateKey(userId, 'roles')) || {
      roles: [],
      permissions: [],
      expiresAt
    };

    const entry: RBACCacheEntry = {
      roles: data.roles || existingEntry.roles,
      permissions: data.permissions || existingEntry.permissions,
      expiresAt
    };

    // Store with both keys pointing to the same object
    const rolesKey = this.generateKey(userId, 'roles');
    const permissionsKey = this.generateKey(userId, 'permissions');
    
    this.cache.set(rolesKey, entry);
    this.cache.set(permissionsKey, entry);
  }

  getRoles(userId: string): Role[] | null {
    const key = this.generateKey(userId, 'roles');
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.invalidate(userId);
      return null;
    }
    
    return entry.roles;
  }

  getPermissions(userId: string): Permission[] | null {
    const key = this.generateKey(userId, 'permissions');
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.invalidate(userId);
      return null;
    }
    
    return entry.permissions;
  }

  invalidate(userId: string): void {
    const rolesKey = this.generateKey(userId, 'roles');
    const permissionsKey = this.generateKey(userId, 'permissions');
    
    this.cache.delete(rolesKey);
    this.cache.delete(permissionsKey);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`RBAC Cache: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  getStats(): {
    size: number;
    totalEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      totalEntries: this.cache.size / 2, // Each user has 2 entries (roles & permissions)
      expiredEntries: expiredCount / 2
    };
  }
}