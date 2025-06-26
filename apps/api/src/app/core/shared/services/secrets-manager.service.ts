/**
 * Secrets Manager Service
 * 
 * Main service for managing secrets with multi-adapter support,
 * caching, encryption, and comprehensive monitoring
 */

import {
  ISecretsManager,
  ISecretsAdapter,
  SecretsManagerConfig,
  SetSecretOptions,
  SecretVersion,
  SecretsHealthStatus,
  SecretsStats,
  SecretsAdapterType,
  SecretsManagerError,
  SecretNotFoundError,
  AdapterUnavailableError,
  DefaultSecretsManagerConfig
} from '../types/secrets-manager.types'

export class SecretsManagerService implements ISecretsManager {
  private adapters: Map<string, ISecretsAdapter> = new Map()
  private primaryAdapter: ISecretsAdapter | null = null
  private fallbackAdapters: ISecretsAdapter[] = []
  private cache: Map<string, { value: string; expiresAt: number; tags?: string[] }> = new Map()
  private config: SecretsManagerConfig
  private stats: SecretsStats
  private initialized = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor(config: SecretsManagerConfig) {
    this.config = {
      ...DefaultSecretsManagerConfig,
      ...config
    }
    
    this.stats = {
      totalSecrets: 0,
      secretsByNamespace: {},
      cacheStats: this.config.cache?.enabled ? {
        hitRate: 0,
        size: 0,
        evictions: 0
      } : undefined,
      operationCounts: {
        gets: 0,
        sets: 0,
        deletes: 0,
        rotations: 0
      },
      adapters: {}
    }
  }

  /**
   * Initialize the secrets manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Initialize all adapters
      for (const [name, adapter] of this.adapters.entries()) {
        try {
          await adapter.initialize()
          this.stats.adapters[name] = await adapter.getStats()
        } catch (error) {
          console.warn(`Failed to initialize adapter ${name}:`, error instanceof Error ? error.message : error)
        }
      }
      
      // Set primary adapter
      if (this.adapters.size === 0) {
        throw new SecretsManagerError(
          'No adapters configured',
          'NO_ADAPTERS_CONFIGURED'
        )
      }
      
      // Find primary adapter by name
      const primaryAdapterName = this.getAdapterName(this.config.adapter)
      this.primaryAdapter = this.adapters.get(primaryAdapterName) || null
      
      if (!this.primaryAdapter) {
        throw new SecretsManagerError(
          `Primary adapter '${this.config.adapter}' not found`,
          'PRIMARY_ADAPTER_NOT_FOUND'
        )
      }
      
      // Set fallback adapters
      if (this.config.fallbackAdapters) {
        this.fallbackAdapters = this.config.fallbackAdapters
          .map(type => this.adapters.get(this.getAdapterName(type)))
          .filter((adapter): adapter is ISecretsAdapter => adapter !== undefined)
      }
      
      // Start health check if enabled
      if (this.config.healthCheck?.enabled) {
        this.startHealthCheck()
      }
      
      this.initialized = true
    } catch (error) {
      throw new SecretsManagerError(
        `Failed to initialize secrets manager: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR'
      )
    }
  }

  /**
   * Add an adapter to the manager
   */
  public addAdapter(adapter: ISecretsAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  /**
   * Get secret value
   */
  public async get(key: string, namespace?: string): Promise<string | null> {
    this.assertInitialized()
    
    const cacheKey = this.buildCacheKey(key, namespace)
    
    // Check cache first
    if (this.config.cache?.enabled) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.updateCacheStats(true)
        this.stats.operationCounts.gets++
        return cached.value
      }
      
      if (cached && cached.expiresAt <= Date.now()) {
        this.cache.delete(cacheKey)
      }
    }
    
    let lastError: Error | null = null
    
    // Try primary adapter first
    if (this.primaryAdapter) {
      try {
        if (await this.primaryAdapter.isAvailable()) {
          const value = await this.primaryAdapter.get(key, namespace)
          
          if (value !== null) {
            // Cache the result
            if (this.config.cache?.enabled) {
              this.cacheValue(cacheKey, value)
              this.updateCacheStats(false)
            }
            
            this.stats.operationCounts.gets++
            return value
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Primary adapter ${this.primaryAdapter.name} failed:`, lastError.message)
      }
    }
    
    // Try fallback adapters
    for (const adapter of this.fallbackAdapters) {
      try {
        if (await adapter.isAvailable()) {
          const value = await adapter.get(key, namespace)
          
          if (value !== null) {
            // Cache the result
            if (this.config.cache?.enabled) {
              this.cacheValue(cacheKey, value)
              this.updateCacheStats(false)
            }
            
            this.stats.operationCounts.gets++
            return value
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Fallback adapter ${adapter.name} failed:`, lastError.message)
      }
    }
    
    this.stats.operationCounts.gets++
    
    if (this.config.cache?.enabled) {
      this.updateCacheStats(false)
    }
    
    return null
  }

  /**
   * Set secret value
   */
  public async set(
    key: string,
    value: string,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    this.assertInitialized()
    
    let lastError: Error | null = null
    let success = false
    
    // Try primary adapter first
    if (this.primaryAdapter) {
      try {
        if (await this.primaryAdapter.isAvailable()) {
          await this.primaryAdapter.set(key, value, namespace, options)
          success = true
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Primary adapter ${this.primaryAdapter.name} failed:`, lastError.message)
      }
    }
    
    // If primary failed, try fallbacks
    if (!success) {
      for (const adapter of this.fallbackAdapters) {
        try {
          if (await adapter.isAvailable()) {
            await adapter.set(key, value, namespace, options)
            success = true
            break
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error')
          console.warn(`Fallback adapter ${adapter.name} failed:`, lastError.message)
        }
      }
    }
    
    if (!success) {
      throw new AdapterUnavailableError(
        'all',
        lastError?.message || 'All adapters failed'
      )
    }
    
    // Update cache
    if (this.config.cache?.enabled) {
      const cacheKey = this.buildCacheKey(key, namespace)
      this.cacheValue(cacheKey, value, options?.ttl)
    }
    
    // Update stats
    this.stats.operationCounts.sets++
    if (namespace) {
      this.stats.secretsByNamespace[namespace] = (this.stats.secretsByNamespace[namespace] || 0) + 1
    }
    this.stats.totalSecrets++
  }

  /**
   * Delete secret
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    this.assertInitialized()
    
    let success = false
    
    // Delete from all adapters
    const deletePromises = []
    
    if (this.primaryAdapter) {
      deletePromises.push(
        this.primaryAdapter.delete(key, namespace).catch(error => {
          console.warn(`Primary adapter ${this.primaryAdapter!.name} delete failed:`, error)
          return false
        })
      )
    }
    
    for (const adapter of this.fallbackAdapters) {
      deletePromises.push(
        adapter.delete(key, namespace).catch(error => {
          console.warn(`Fallback adapter ${adapter.name} delete failed:`, error)
          return false
        })
      )
    }
    
    const results = await Promise.all(deletePromises)
    success = results.some(result => result === true)
    
    // Remove from cache
    if (this.config.cache?.enabled) {
      const cacheKey = this.buildCacheKey(key, namespace)
      this.cache.delete(cacheKey)
    }
    
    // Update stats
    if (success) {
      this.stats.operationCounts.deletes++
      if (namespace && this.stats.secretsByNamespace[namespace]) {
        this.stats.secretsByNamespace[namespace]--
        if (this.stats.secretsByNamespace[namespace] <= 0) {
          delete this.stats.secretsByNamespace[namespace]
        }
      }
      this.stats.totalSecrets = Math.max(0, this.stats.totalSecrets - 1)
    }
    
    return success
  }

  /**
   * Check if secret exists
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    this.assertInitialized()
    
    // Check cache first
    if (this.config.cache?.enabled) {
      const cacheKey = this.buildCacheKey(key, namespace)
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return true
      }
    }
    
    // Check adapters
    if (this.primaryAdapter && await this.primaryAdapter.isAvailable()) {
      try {
        return await this.primaryAdapter.exists(key, namespace)
      } catch (error) {
        console.warn(`Primary adapter ${this.primaryAdapter.name} exists check failed:`, error)
      }
    }
    
    for (const adapter of this.fallbackAdapters) {
      try {
        if (await adapter.isAvailable()) {
          return await adapter.exists(key, namespace)
        }
      } catch (error) {
        console.warn(`Fallback adapter ${adapter.name} exists check failed:`, error)
      }
    }
    
    return false
  }

  /**
   * Get multiple secrets
   */
  public async getMultiple(
    keys: string[],
    namespace?: string
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    
    // Use Promise.all for parallel execution
    const promises = keys.map(async (key) => {
      const value = await this.get(key, namespace)
      return { key, value }
    })
    
    const keyValues = await Promise.all(promises)
    
    for (const { key, value } of keyValues) {
      results[key] = value
    }
    
    return results
  }

  /**
   * Set multiple secrets
   */
  public async setMultiple(
    secrets: Record<string, string>,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    const promises = Object.entries(secrets).map(([key, value]) =>
      this.set(key, value, namespace, options)
    )
    
    await Promise.all(promises)
  }

  /**
   * List available namespaces
   */
  public async listNamespaces(): Promise<string[]> {
    this.assertInitialized()
    
    const namespacesSet = new Set<string>()
    
    // Collect namespaces from all adapters
    const namespacePromises = []
    
    if (this.primaryAdapter) {
      namespacePromises.push(
        this.primaryAdapter.listNamespaces().catch(() => [])
      )
    }
    
    for (const adapter of this.fallbackAdapters) {
      namespacePromises.push(
        adapter.listNamespaces().catch(() => [])
      )
    }
    
    const namespaceLists = await Promise.all(namespacePromises)
    
    for (const namespaces of namespaceLists) {
      for (const namespace of namespaces) {
        namespacesSet.add(namespace)
      }
    }
    
    return Array.from(namespacesSet).sort()
  }

  /**
   * Clear namespace
   */
  public async clearNamespace(namespace: string): Promise<void> {
    this.assertInitialized()
    
    const promises = []
    
    if (this.primaryAdapter) {
      promises.push(
        this.primaryAdapter.clearNamespace(namespace).catch(error => {
          console.warn(`Primary adapter ${this.primaryAdapter!.name} clear namespace failed:`, error)
        })
      )
    }
    
    for (const adapter of this.fallbackAdapters) {
      promises.push(
        adapter.clearNamespace(namespace).catch(error => {
          console.warn(`Fallback adapter ${adapter.name} clear namespace failed:`, error)
        })
      )
    }
    
    await Promise.all(promises)
    
    // Clear from cache
    if (this.config.cache?.enabled) {
      for (const [cacheKey] of this.cache.entries()) {
        if (cacheKey.startsWith(`${namespace}:`)) {
          this.cache.delete(cacheKey)
        }
      }
    }
    
    // Update stats
    delete this.stats.secretsByNamespace[namespace]
  }

  /**
   * Rotate secret
   */
  public async rotate(
    key: string,
    newValue: string,
    namespace?: string
  ): Promise<void> {
    await this.set(key, newValue, namespace, { replicate: true })
    this.stats.operationCounts.rotations++
  }

  /**
   * Get secret versions
   */
  public async getVersions(
    key: string,
    namespace?: string
  ): Promise<SecretVersion[]> {
    this.assertInitialized()
    
    if (this.primaryAdapter && await this.primaryAdapter.isAvailable()) {
      try {
        return await this.primaryAdapter.getVersions(key, namespace)
      } catch (error) {
        console.warn(`Primary adapter ${this.primaryAdapter.name} getVersions failed:`, error)
      }
    }
    
    for (const adapter of this.fallbackAdapters) {
      try {
        if (await adapter.isAvailable()) {
          return await adapter.getVersions(key, namespace)
        }
      } catch (error) {
        console.warn(`Fallback adapter ${adapter.name} getVersions failed:`, error)
      }
    }
    
    return []
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<SecretsHealthStatus> {
    const adapterHealth: Record<string, any> = {}
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let healthyCount = 0
    let totalCount = 0
    
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        const health = await adapter.healthCheck()
        adapterHealth[name] = health
        totalCount++
        
        if (health.status === 'healthy') {
          healthyCount++
        }
      } catch (error) {
        adapterHealth[name] = {
          status: 'unhealthy',
          available: false,
          responseTime: 0,
          errorCount: 0,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        }
        totalCount++
      }
    }
    
    // Determine overall status
    if (healthyCount === 0) {
      overallStatus = 'unhealthy'
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded'
    }
    
    return {
      status: overallStatus,
      adapters: adapterHealth,
      timestamp: new Date(),
      uptime: Date.now() - (this.stats as any).startTime || 0
    }
  }

  /**
   * Get statistics
   */
  public async getStats(): Promise<SecretsStats> {
    // Update adapter stats
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        this.stats.adapters[name] = await adapter.getStats()
      } catch (error) {
        console.warn(`Failed to get stats from adapter ${name}:`, error)
      }
    }
    
    // Update cache stats
    if (this.config.cache?.enabled && this.stats.cacheStats) {
      this.stats.cacheStats.size = this.cache.size
    }
    
    return { ...this.stats }
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Shutdown all adapters
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.shutdown().catch(error => {
        console.warn(`Failed to shutdown adapter ${adapter.name}:`, error)
      })
    )
    
    await Promise.all(shutdownPromises)
    
    // Clear cache
    this.cache.clear()
    
    this.initialized = false
  }

  /**
   * Clear cache
   */
  public async clearCache(tags?: string[]): Promise<void> {
    if (!this.config.cache?.enabled) return
    
    if (!tags) {
      this.cache.clear()
      return
    }
    
    // Clear by tags
    for (const [key, cached] of this.cache.entries()) {
      if (cached.tags && cached.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Build cache key
   */
  private buildCacheKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  /**
   * Cache value
   */
  private cacheValue(cacheKey: string, value: string, ttl?: number): void {
    if (!this.config.cache?.enabled) return
    
    const expiresAt = Date.now() + (ttl || this.config.cache.ttl)
    
    // Evict if cache is full
    if (this.cache.size >= (this.config.cache.maxSize || 1000)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
        if (this.stats.cacheStats) {
          this.stats.cacheStats.evictions++
        }
      }
    }
    
    this.cache.set(cacheKey, { value, expiresAt })
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(isHit: boolean): void {
    if (!this.stats.cacheStats) return
    
    const total = this.stats.operationCounts.gets + 1
    const hits = isHit ? (this.stats.cacheStats.hitRate * (total - 1)) + 1 : this.stats.cacheStats.hitRate * (total - 1)
    
    this.stats.cacheStats.hitRate = hits / total
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    if (!this.config.healthCheck?.enabled) return
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        console.warn('Health check failed:', error)
      }
    }, this.config.healthCheck.interval || 30000)
  }

  /**
   * Get adapter name
   */
  private getAdapterName(type: SecretsAdapterType): string {
    return type
  }

  /**
   * Assert that the manager is initialized
   */
  private assertInitialized(): void {
    if (!this.initialized) {
      throw new SecretsManagerError(
        'Secrets manager not initialized',
        'NOT_INITIALIZED'
      )
    }
  }
}