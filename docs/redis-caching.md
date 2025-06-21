# Redis Caching System

The AegisX Boilerplate includes a Redis-based caching system optimized for performance, scalability, and ease of use. This document covers the complete Redis integration including setup, configuration, usage patterns, and best practices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Debugging](#monitoring--debugging)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Redis caching system provides:

- **High Performance**: Sub-millisecond data access
- **Scalability**: Shared cache across multiple application instances
- **Reliability**: Automatic reconnection and error handling
- **Flexibility**: Multiple data types and expiration strategies
- **Integration**: Seamless Fastify plugin integration
- **Monitoring**: Built-in health checks and statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                           │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Controllers   │    │    Services     │                   │
│  └─────────┬───────┘    └─────────┬───────┘                   │
│            │                      │                           │
│            ▼                      ▼                           │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │ Redis Utilities │    │ Cache Helpers   │                   │
│  └─────────┬───────┘    └─────────┬───────┘                   │
└────────────┼──────────────────────┼───────────────────────────┘
             │                      │
             ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Fastify Redis Plugin                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    @fastify/redis                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Redis Server                              │
│                   (Docker Container)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Redis Plugin**: Fastify plugin for Redis connection management
2. **Cache Utilities**: High-level helper functions for common operations
3. **Health Monitoring**: Connection status and performance metrics
4. **Error Handling**: Graceful degradation and retry logic
5. **Configuration Management**: Environment-based settings

## Installation & Setup

### 1. Docker Setup

The Redis server is included in the Docker Compose configuration:

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  container_name: aegisx-redis
  restart: unless-stopped
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
  networks:
    - aegisx-network
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  healthcheck:
    test: ['CMD', 'redis-cli', 'ping']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

### 2. Start Services

```bash
# Start all services including Redis
docker-compose up -d

# Verify Redis is running
docker-compose ps redis

# Test Redis connectivity
docker exec -it aegisx-redis redis-cli ping
# Expected output: PONG
```

### 3. Local Development (Alternative)

If you prefer running Redis locally:

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Verify installation
redis-cli ping
```

## Configuration

### Environment Variables

```bash
# .env file
REDIS_HOST=localhost          # Redis server hostname
REDIS_PORT=6379              # Redis server port
REDIS_PASSWORD=              # Redis password (if required)
REDIS_DB=0                   # Redis database number (0-15)
REDIS_TTL=900               # Default TTL in seconds (15 minutes)
```

### Docker Environment

```yaml
# docker-compose.yml - API service environment
environment:
  REDIS_HOST: redis           # Docker service name
  REDIS_PORT: 6379
  REDIS_PASSWORD: 
  REDIS_DB: 0
  REDIS_TTL: 900
```

### Plugin Configuration

The Redis plugin is automatically configured based on environment variables:

```typescript
// apps/api/src/app/core/plugins/database/redis.ts
const redisConfig = {
  host: fastify.config.REDIS_HOST,
  port: parseInt(fastify.config.REDIS_PORT, 10),
  password: fastify.config.REDIS_PASSWORD || undefined,
  db: parseInt(fastify.config.REDIS_DB, 10),
  connectTimeout: 10000,        // 10 seconds
  lazyConnect: true,            // Connect when first command is issued
  retryDelayOnFailover: 100,    // Retry delay
  maxRetriesPerRequest: 3,      // Maximum retries per request
  family: 4                     // IPv4
};
```

## API Reference

The Redis plugin extends the Fastify instance with utility methods:

### 1. `getFromCache(key: string)`

Retrieve data from cache with automatic JSON parsing.

```typescript
const userData = await fastify.getFromCache('user:123');
// Returns: parsed object or null if not found
```

**Features:**
- Automatic JSON deserialization
- Graceful error handling
- Returns `null` if key doesn't exist or Redis is unavailable

### 2. `setToCache(key: string, value: any, ttlSeconds?: number)`

Store data in cache with automatic JSON serialization.

```typescript
const success = await fastify.setToCache('user:123', userData, 300);
// Returns: true if successful, false otherwise
```

**Features:**
- Automatic JSON serialization
- Optional TTL override
- Graceful error handling
- Returns boolean success status

### 3. `deleteFromCache(key: string)`

Remove data from cache.

```typescript
const success = await fastify.deleteFromCache('user:123');
// Returns: true if key was deleted, false otherwise
```

### 4. `deleteCachePattern(pattern: string)`

Remove multiple keys matching a pattern.

```typescript
const deletedCount = await fastify.deleteCachePattern('user:*');
// Returns: number of keys deleted
```

**Warning**: Use with caution in production as this operation can be expensive for large datasets.

### 5. `getCacheStats()`

Get comprehensive Redis statistics and connection information.

```typescript
const stats = await fastify.getCacheStats();
// Returns: detailed statistics object
```

**Response:**
```json
{
  "connected": true,
  "status": "ready",
  "memory_info": "# Memory\nused_memory:1048576\n...",
  "keyspace_info": "# Keyspace\ndb0:keys=150,expires=10\n...",
  "server_info": "# Server\nredis_version:7.0.0\n...",
  "config": {
    "host": "redis",
    "port": "6379",
    "db": "0",
    "ttl": "900"
  }
}
```

### 6. `isCacheHealthy()`

Check if Redis connection is healthy.

```typescript
const isHealthy = await fastify.isCacheHealthy();
// Returns: true if Redis responds to PING, false otherwise
```

### 7. Direct Redis Access

Access the underlying Redis client for advanced operations:

```typescript
// Direct Redis commands
await fastify.redis.set('key', 'value');
await fastify.redis.get('key');
await fastify.redis.hset('hash', 'field', 'value');
await fastify.redis.lpush('list', 'item');

// Pipeline operations
const pipeline = fastify.redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();
```

## Usage Examples

### 1. Basic Caching Pattern

```typescript
class UserService {
  async getUser(userId: string) {
    // Try cache first
    const cached = await fastify.getFromCache(`user:${userId}`);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Cache for 15 minutes
    await fastify.setToCache(`user:${userId}`, user, 900);
    
    return user;
  }

  async updateUser(userId: string, updates: any) {
    const user = await this.userRepository.update(userId, updates);
    
    // Update cache
    await fastify.setToCache(`user:${userId}`, user, 900);
    
    // Invalidate related caches
    await fastify.deleteCachePattern(`user:${userId}:*`);
    
    return user;
  }

  async deleteUser(userId: string) {
    await this.userRepository.delete(userId);
    
    // Remove from cache
    await fastify.deleteFromCache(`user:${userId}`);
    await fastify.deleteCachePattern(`user:${userId}:*`);
  }
}
```

### 2. Session Caching

```typescript
class SessionService {
  async createSession(userId: string, sessionData: any) {
    const sessionId = generateSessionId();
    const session = {
      userId,
      ...sessionData,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    // Store session with 24-hour expiry
    await fastify.setToCache(`session:${sessionId}`, session, 86400);
    
    return sessionId;
  }

  async getSession(sessionId: string) {
    const session = await fastify.getFromCache(`session:${sessionId}`);
    if (!session) {
      return null;
    }

    // Update last accessed time
    session.lastAccessed = new Date();
    await fastify.setToCache(`session:${sessionId}`, session, 86400);
    
    return session;
  }

  async destroySession(sessionId: string) {
    await fastify.deleteFromCache(`session:${sessionId}`);
  }
}
```

### 3. API Response Caching

```typescript
class ApiCacheService {
  async cacheApiResponse(
    cacheKey: string, 
    apiCall: () => Promise<any>, 
    ttl: number = 300
  ) {
    // Check cache first
    const cached = await fastify.getFromCache(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }

    // Make API call
    const data = await apiCall();
    
    // Cache the result
    await fastify.setToCache(cacheKey, data, ttl);
    
    return { data, fromCache: false };
  }
}

// Usage in controller
fastify.get('/api/v1/reports/dashboard', async (request, reply) => {
  const cacheKey = `dashboard:${request.user.id}`;
  
  const result = await apiCacheService.cacheApiResponse(
    cacheKey,
    () => dashboardService.generateDashboard(request.user.id),
    600 // 10 minutes
  );

  reply.header('X-Cache', result.fromCache ? 'HIT' : 'MISS');
  return result.data;
});
```

### 4. Rate Limiting with Redis

```typescript
class RateLimitService {
  async checkRateLimit(
    identifier: string, 
    windowSize: number = 3600, 
    maxRequests: number = 100
  ) {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSize * 1000);

    // Use Redis sorted set for sliding window
    const pipeline = fastify.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, now, now);
    
    // Count requests in window
    pipeline.zcard(key);
    
    // Set expiry
    pipeline.expire(key, windowSize);
    
    const results = await pipeline.exec();
    const requestCount = results[2][1] as number;

    return {
      allowed: requestCount <= maxRequests,
      requestCount,
      maxRequests,
      resetTime: windowStart + (windowSize * 1000)
    };
  }
}
```

### 5. Cache Warming Strategy

```typescript
class CacheWarmingService {
  async warmUserCache(userId: string) {
    try {
      // Warm multiple related caches
      const promises = [
        this.warmUserProfile(userId),
        this.warmUserPermissions(userId),
        this.warmUserPreferences(userId)
      ];

      await Promise.allSettled(promises);
      fastify.log.info(`Cache warmed for user ${userId}`);
    } catch (error) {
      fastify.log.error('Cache warming failed:', error);
    }
  }

  private async warmUserProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (user) {
      await fastify.setToCache(`user:${userId}`, user, 900);
    }
  }

  private async warmUserPermissions(userId: string) {
    const permissions = await rbacService.getUserPermissions(userId);
    await fastify.setToCache(`permissions:${userId}`, permissions, 900);
  }

  private async warmUserPreferences(userId: string) {
    const preferences = await preferencesService.getUserPreferences(userId);
    await fastify.setToCache(`preferences:${userId}`, preferences, 1800);
  }
}
```

## Performance Optimization

### 1. Connection Pooling

Redis connections are managed by ioredis with built-in connection pooling:

```typescript
// Automatic connection management
const redisConfig = {
  host: 'redis',
  port: 6379,
  connectTimeout: 10000,
  lazyConnect: true,              // Connect only when needed
  retryDelayOnFailover: 100,      // Fast failover
  maxRetriesPerRequest: 3,        // Limit retries
  keepAlive: 30000               // Keep connections alive
};
```

### 2. Pipeline Operations

Use pipelines for multiple operations:

```typescript
async function bulkCache(items: Array<{key: string, value: any}>) {
  const pipeline = fastify.redis.pipeline();
  
  items.forEach(item => {
    pipeline.setex(item.key, 900, JSON.stringify(item.value));
  });
  
  const results = await pipeline.exec();
  return results.every(result => result[0] === null); // Check for errors
}
```

### 3. Memory Optimization

Configure Redis for optimal memory usage:

```bash
# Redis configuration (docker-compose.yml)
command: redis-server 
  --appendonly yes 
  --maxmemory 256mb 
  --maxmemory-policy allkeys-lru  # Evict least recently used keys
  --save 900 1                    # Periodic snapshots
```

### 4. Key Naming Conventions

Use consistent, hierarchical key naming:

```typescript
// Good key naming patterns
const userKey = `user:${userId}`;                    // user:123
const sessionKey = `session:${sessionId}`;           // session:abc123
const permissionsKey = `permissions:${userId}`;      // permissions:123
const cacheKey = `cache:${service}:${id}`;          // cache:reports:456

// Namespace for different environments
const envKey = `${process.env.NODE_ENV}:user:${userId}`;  // prod:user:123
```

### 5. TTL Strategy

Use appropriate TTL values based on data characteristics:

```typescript
const TTL_CONFIG = {
  USER_PROFILE: 900,      // 15 minutes - changes occasionally
  USER_PERMISSIONS: 1800, // 30 minutes - changes rarely
  SESSION_DATA: 86400,    // 24 hours - user session length
  API_RESPONSES: 300,     // 5 minutes - external API data
  STATIC_DATA: 3600,      // 1 hour - configuration data
  TEMPORARY: 60           // 1 minute - temporary calculations
};

// Usage
await fastify.setToCache(userKey, userData, TTL_CONFIG.USER_PROFILE);
```

## Monitoring & Debugging

### 1. Health Checks

Monitor Redis health in your application:

```typescript
// Health check endpoint
fastify.get('/health/cache', async (request, reply) => {
  try {
    const isHealthy = await fastify.isCacheHealthy();
    const stats = await fastify.getCacheStats();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: {
        connected: stats.connected,
        status: stats.status
      }
    };
  } catch (error) {
    return reply.status(503).send({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 2. Performance Metrics

Track cache performance:

```typescript
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private errors = 0;

  async getWithMetrics(key: string) {
    try {
      const value = await fastify.getFromCache(key);
      if (value !== null) {
        this.hits++;
        return value;
      } else {
        this.misses++;
        return null;
      }
    } catch (error) {
      this.errors++;
      throw error;
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) : 0
    };
  }
}
```

### 3. Logging Configuration

Configure appropriate logging:

```typescript
// Redis event logging
fastify.redis.on('connect', () => {
  fastify.log.info('Redis connected successfully');
});

fastify.redis.on('error', (error) => {
  fastify.log.error('Redis connection error:', error);
});

fastify.redis.on('close', () => {
  fastify.log.warn('Redis connection closed');
});

fastify.redis.on('reconnecting', () => {
  fastify.log.info('Redis reconnecting...');
});
```

### 4. Debug Utilities

Debugging helpers for development:

```typescript
// Debug cache state
async function debugCache(pattern: string = '*') {
  const keys = await fastify.redis.keys(pattern);
  const values = await Promise.all(
    keys.map(async key => ({
      key,
      value: await fastify.getFromCache(key),
      ttl: await fastify.redis.ttl(key)
    }))
  );
  
  console.table(values);
  return values;
}

// Usage in development
// debugCache('user:*');
// debugCache('session:*');
```

## Security Considerations

### 1. Network Security

- Redis runs in isolated Docker network
- No direct external access to Redis port
- Communication between services is encrypted in production

### 2. Data Sensitivity

Never cache sensitive data without encryption:

```typescript
// Bad - don't cache sensitive data directly
await fastify.setToCache('user:123', {
  id: 123,
  password: 'secret123',  // Don't cache passwords!
  creditCard: '1234-5678' // Don't cache sensitive data!
});

// Good - cache only safe data
await fastify.setToCache('user:123', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  preferences: { theme: 'dark' }
});
```

### 3. Cache Isolation

Use key prefixes to isolate different data types:

```typescript
// Environment isolation
const getEnvKey = (key: string) => `${process.env.NODE_ENV}:${key}`;

// Tenant isolation (for multi-tenant applications)
const getTenantKey = (tenantId: string, key: string) => `tenant:${tenantId}:${key}`;
```

### 4. Access Control

Redis authentication (if needed):

```typescript
// Production Redis with authentication
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
  password: process.env.REDIS_PASSWORD, // Use strong password
  db: 0,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined
};
```

## Best Practices

### 1. Cache Strategy

**Cache-Aside Pattern** (Recommended):
```typescript
async function getUser(id: string) {
  // 1. Check cache
  let user = await fastify.getFromCache(`user:${id}`);
  
  // 2. If miss, fetch from database
  if (!user) {
    user = await userRepository.findById(id);
    
    // 3. Update cache
    if (user) {
      await fastify.setToCache(`user:${id}`, user, 900);
    }
  }
  
  return user;
}
```

**Write-Through Pattern**:
```typescript
async function updateUser(id: string, data: any) {
  // 1. Update database
  const user = await userRepository.update(id, data);
  
  // 2. Update cache
  await fastify.setToCache(`user:${id}`, user, 900);
  
  return user;
}
```

### 2. Error Handling

Always handle cache failures gracefully:

```typescript
async function getUserWithFallback(id: string) {
  try {
    // Try cache first
    const cached = await fastify.getFromCache(`user:${id}`);
    if (cached) return cached;
  } catch (cacheError) {
    fastify.log.warn('Cache read failed, falling back to database:', cacheError);
  }

  // Fallback to database
  const user = await userRepository.findById(id);
  
  // Try to cache result (but don't fail if caching fails)
  try {
    await fastify.setToCache(`user:${id}`, user, 900);
  } catch (cacheError) {
    fastify.log.warn('Cache write failed:', cacheError);
  }
  
  return user;
}
```

### 3. Cache Invalidation

Implement proper cache invalidation:

```typescript
class UserService {
  async updateUser(id: string, data: any) {
    const user = await userRepository.update(id, data);
    
    // Invalidate specific caches
    await fastify.deleteFromCache(`user:${id}`);
    await fastify.deleteFromCache(`user:profile:${id}`);
    
    // Invalidate related caches
    if (data.email) {
      await fastify.deleteFromCache(`user:email:${data.email}`);
    }
    
    return user;
  }

  async deleteUser(id: string) {
    await userRepository.delete(id);
    
    // Clear all user-related caches
    await fastify.deleteCachePattern(`user:${id}:*`);
    await fastify.deleteFromCache(`user:${id}`);
  }
}
```

### 4. Memory Management

Monitor and manage Redis memory usage:

```typescript
// Check memory usage
async function checkMemoryUsage() {
  const info = await fastify.redis.info('memory');
  const lines = info.split('\n');
  const memoryData = {};
  
  lines.forEach(line => {
    const [key, value] = line.split(':');
    if (key && value) {
      memoryData[key] = value.trim();
    }
  });
  
  const usedMemory = parseInt(memoryData.used_memory || '0');
  const maxMemory = parseInt(memoryData.maxmemory || '0');
  
  if (maxMemory > 0 && usedMemory / maxMemory > 0.8) {
    fastify.log.warn('Redis memory usage is high:', {
      used: usedMemory,
      max: maxMemory,
      percentage: (usedMemory / maxMemory * 100).toFixed(2)
    });
  }
}
```

### 5. Testing

Test cache behavior in your application:

```typescript
// Test cache functionality
describe('User Service Cache', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await fastify.redis.flushdb();
  });

  it('should cache user data', async () => {
    const user = await userService.getUser('123');
    
    // Verify data was cached
    const cached = await fastify.getFromCache('user:123');
    expect(cached).toEqual(user);
  });

  it('should handle cache miss gracefully', async () => {
    // Simulate cache failure
    jest.spyOn(fastify, 'getFromCache').mockRejectedValue(new Error('Redis down'));
    
    const user = await userService.getUser('123');
    expect(user).toBeDefined(); // Should fallback to database
  });
});
```

## Troubleshooting

### 1. Connection Issues

**Problem**: "Redis connection failed"

**Solutions**:
```bash
# Check Redis service status
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test direct connection
docker exec -it aegisx-redis redis-cli ping

# Verify network connectivity
docker-compose exec api ping redis
```

### 2. Performance Issues

**Problem**: Slow cache operations

**Solutions**:
- Check Redis memory usage
- Review key naming patterns
- Use pipeline operations for bulk operations
- Monitor network latency

```typescript
// Performance monitoring
const start = Date.now();
const result = await fastify.getFromCache(key);
const duration = Date.now() - start;

if (duration > 100) { // Log slow operations
  fastify.log.warn(`Slow cache operation: ${duration}ms for key ${key}`);
}
```

### 3. Memory Issues

**Problem**: Redis running out of memory

**Solutions**:
```bash
# Check memory usage
docker exec -it aegisx-redis redis-cli info memory

# Increase memory limit
# Update docker-compose.yml: --maxmemory 512mb

# Implement cache cleanup
docker exec -it aegisx-redis redis-cli flushdb
```

### 4. Cache Inconsistency

**Problem**: Stale data in cache

**Solutions**:
- Implement proper cache invalidation
- Use shorter TTL values
- Add cache versioning

```typescript
// Cache versioning
const CACHE_VERSION = 'v1';
const versionedKey = `${CACHE_VERSION}:user:${userId}`;
```

### 5. Development Issues

**Problem**: Cache interfering with development

**Solutions**:
```typescript
// Disable caching in development
const cacheEnabled = process.env.NODE_ENV !== 'development';

if (cacheEnabled) {
  await fastify.setToCache(key, value, ttl);
}

// Or use shorter TTL in development
const ttl = process.env.NODE_ENV === 'development' ? 60 : 900;
```

## Migration & Maintenance

### Upgrading Redis

```bash
# Backup data
docker exec aegisx-redis redis-cli bgsave

# Update docker-compose.yml with new Redis version
# docker-compose.yml: image: redis:7.2-alpine

# Restart with new version
docker-compose up -d redis

# Verify upgrade
docker exec aegisx-redis redis-cli info server
```

### Data Migration

```typescript
// Migrate cache data between versions
async function migrateCacheData() {
  const oldKeys = await fastify.redis.keys('v1:*');
  
  for (const oldKey of oldKeys) {
    const value = await fastify.redis.get(oldKey);
    const newKey = oldKey.replace('v1:', 'v2:');
    
    await fastify.redis.set(newKey, value);
    await fastify.redis.del(oldKey);
  }
}
```

The Redis caching system provides a robust foundation for high-performance applications. Proper configuration, monitoring, and maintenance ensure optimal performance and reliability.