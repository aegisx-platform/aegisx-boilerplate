/**
 * Cache Manager Service
 * 
 * Multi-level caching system with healthcare compliance,
 * intelligent fallback, and comprehensive monitoring
 */

import { EventBus } from '../events/interfaces/event-bus.interface'
import {
  CacheOperationEvent,
  CacheHealthChangedEvent
} from '../events/types/service-events.types'
import zlib from 'zlib'
import { promisify } from 'util'
import {
  ICacheManager,
  ICacheProvider,
  CacheManagerConfig,
  CacheGetOptions,
  CacheSetOptions,
  CacheDeleteOptions,
  CacheIncrementOptions,
  CacheScanOptions,
  CacheItem,
  CacheMetadata,
  CacheLayer,
  CacheStats,
  CacheHealth,
  CacheEvent,
  CacheEventListener,
  CacheEventData,
  CacheError,
  CacheLayerConfig,
  DefaultCacheManagerConfig
} from '../types/cache-manager.types'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export class CacheManagerService implements ICacheManager {
  private config: CacheManagerConfig
  private providers: Map<CacheLayer, ICacheProvider> = new Map()
  private isConnected = false
  private healthCheckInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout

  constructor(
    config: Partial<CacheManagerConfig> = {},
    private eventBus?: EventBus
  ) {
    
    this.config = {
      ...DefaultCacheManagerConfig,
      ...config,
      layers: config.layers || DefaultCacheManagerConfig.layers
    }
  }

  /**
   * Get value from cache with fallback support
   */
  async get<T>(key: string, options: CacheGetOptions = {}): Promise<T | null> {
    if (!this.config.enabled) {
      return null
    }

    const startTime = Date.now()
    const normalizedKey = this.normalizeKey(key)
    
    try {
      // Get sorted layers by priority
      const layers = this.getSortedLayers(options.layer)
      
      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const result = await provider.get<any>(normalizedKey)
          
          if (result !== null) {
            // Deserialize and decompress if needed
            const value = await this.deserialize<T>(result, layerConfig)
            
            // Promote to higher priority layers if fallback was used
            if (options.fallback && layerConfig.priority > 1) {
              await this.promoteToHigherLayers(normalizedKey, value, layerConfig, options)
            }
            
            // Update access metadata
            if (options.metadata && typeof value === 'object' && value !== null) {
              await this.updateAccessMetadata(normalizedKey, layerConfig.name as CacheLayer)
            }

            this.emitEvent('hit', {
              layer: layerConfig.name as CacheLayer,
              key: normalizedKey,
              duration: Date.now() - startTime
            })

            return value
          }
        } catch (error) {
          this.emitEvent('error', {
            layer: layerConfig.name as CacheLayer,
            key: normalizedKey,
            error: error as Error
          })
          
          // Continue to next layer on error
          if (!options.fallback) {
            throw new CacheError(
              `Cache get failed for layer ${layerConfig.name}`,
              'LAYER_UNAVAILABLE',
              layerConfig.name as CacheLayer,
              normalizedKey,
              error as Error
            )
          }
        }
      }

      // Cache miss
      this.emitEvent('miss', {
        key: normalizedKey,
        duration: Date.now() - startTime
      })

      return null
    } catch (error) {
      this.emitEvent('error', {
        key: normalizedKey,
        error: error as Error,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Set value in cache with write-through/write-back support
   */
  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    const startTime = Date.now()
    const normalizedKey = this.normalizeKey(key)
    
    try {
      // Validate healthcare data if applicable
      if (this.config.healthcare && options.metadata?.healthcare) {
        await this.validateHealthcareData(value, options.metadata.healthcare)
      }

      // Serialize and compress value
      const serializedValue = await this.serialize(value, options)
      
      // Determine target layers
      const layers = options.layer 
        ? [this.getLayerConfig(options.layer)]
        : this.getWriteLayers()

      const writePromises: Promise<void>[] = []

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        // Calculate TTL for this layer
        const ttl = this.calculateTtl(options.ttl, layerConfig)
        
        // Add metadata
        const enrichedValue = this.enrichValueWithMetadata(serializedValue, options.metadata, layerConfig)

        const writePromise = provider.set(normalizedKey, enrichedValue, ttl)
          .catch(error => {
            this.emitEvent('error', {
              layer: layerConfig.name as CacheLayer,
              key: normalizedKey,
              error: error as Error
            })
            
            if (!this.config.fallbackEnabled) {
              throw error
            }
          })

        if (this.config.writeThrough || options.writeThrough) {
          await writePromise
        } else {
          writePromises.push(writePromise)
        }
      }

      // Wait for write-back operations
      if (writePromises.length > 0) {
        await Promise.allSettled(writePromises)
      }

      // Emit set event
      this.emitEvent('set', {
        key: normalizedKey,
        value,
        metadata: options.metadata,
        duration: Date.now() - startTime
      })

      // Healthcare audit trail
      if (this.config.healthcare?.auditTrail && options.metadata?.healthcare) {
        await this.auditCacheOperation('SET', normalizedKey, options.metadata.healthcare)
      }

    } catch (error) {
      this.emitEvent('error', {
        key: normalizedKey,
        error: error as Error,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheDeleteOptions = {}): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const startTime = Date.now()
    const normalizedKey = this.normalizeKey(key)
    let deleted = false

    try {
      const layers = options.layer 
        ? [this.getLayerConfig(options.layer)]
        : this.getAllLayers()

      const deletePromises: Promise<boolean>[] = []

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        const deletePromise = provider.delete(normalizedKey)
          .then(result => {
            if (result) deleted = true
            return result
          })
          .catch(error => {
            this.emitEvent('error', {
              layer: layerConfig.name as CacheLayer,
              key: normalizedKey,
              error: error as Error
            })
            return false
          })

        deletePromises.push(deletePromise)
      }

      await Promise.allSettled(deletePromises)

      if (deleted) {
        this.emitEvent('delete', {
          key: normalizedKey,
          duration: Date.now() - startTime
        })
      }

      return deleted
    } catch (error) {
      this.emitEvent('error', {
        key: normalizedKey,
        error: error as Error,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, layer?: CacheLayer): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const normalizedKey = this.normalizeKey(key)
    
    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const exists = await provider.exists(normalizedKey)
          if (exists) {
            return true
          }
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], options: CacheGetOptions = {}): Promise<Array<T | null>> {
    if (!this.config.enabled) {
      return new Array(keys.length).fill(null)
    }

    const normalizedKeys = keys.map(key => this.normalizeKey(key))
    const results: Array<T | null> = new Array(keys.length).fill(null)
    const missingIndices = new Set<number>(keys.map((_, i) => i))

    try {
      const layers = this.getSortedLayers(options.layer)

      for (const layerConfig of layers) {
        if (missingIndices.size === 0) break

        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const missingKeys = Array.from(missingIndices).map(i => normalizedKeys[i])
          const layerResults = await provider.mget<any>(missingKeys)

          for (let i = 0; i < layerResults.length; i++) {
            const result = layerResults[i]
            if (result !== null) {
              const originalIndex = Array.from(missingIndices)[i]
              results[originalIndex] = await this.deserialize<T>(result, layerConfig)
              missingIndices.delete(originalIndex)
            }
          }
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return results
    } catch (error) {
      throw new CacheError(
        'Multiple get operation failed',
        'OPERATION_TIMEOUT',
        undefined,
        keys.join(','),
        error as Error
      )
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(items: CacheItem<T>[], options: CacheSetOptions = {}): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const layers = options.layer 
        ? [this.getLayerConfig(options.layer)]
        : this.getWriteLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        const serializedItems = await Promise.all(
          items.map(async item => ({
            key: this.normalizeKey(item.key),
            value: await this.serialize(item.value, { ...options, ttl: item.ttl }),
            ttl: this.calculateTtl(item.ttl || options.ttl, layerConfig)
          }))
        )

        await provider.mset(serializedItems)
      }
    } catch (error) {
      throw new CacheError(
        'Multiple set operation failed',
        'OPERATION_TIMEOUT',
        undefined,
        items.map(i => i.key).join(','),
        error as Error
      )
    }
  }

  /**
   * Delete multiple values from cache
   */
  async mdelete(keys: string[], options: CacheDeleteOptions = {}): Promise<number> {
    if (!this.config.enabled) {
      return 0
    }

    const normalizedKeys = keys.map(key => this.normalizeKey(key))
    let totalDeleted = 0

    try {
      const layers = options.layer 
        ? [this.getLayerConfig(options.layer)]
        : this.getAllLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const deleted = await provider.mdelete(normalizedKeys)
          totalDeleted = Math.max(totalDeleted, deleted)
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return totalDeleted
    } catch (error) {
      throw new CacheError(
        'Multiple delete operation failed',
        'OPERATION_TIMEOUT',
        undefined,
        keys.join(','),
        error as Error
      )
    }
  }

  /**
   * Increment numeric value in cache
   */
  async increment(key: string, amount = 1, options: CacheIncrementOptions = {}): Promise<number> {
    if (!this.config.enabled) {
      return amount
    }

    const normalizedKey = this.normalizeKey(key)

    try {
      const layer = options.layer || this.getDefaultWriteLayer()
      const provider = this.providers.get(layer)
      
      if (!provider) {
        throw new CacheError(
          `Provider not found for layer ${layer}`,
          'LAYER_UNAVAILABLE',
          layer,
          normalizedKey
        )
      }

      const result = await provider.increment(normalizedKey, amount)

      // Set TTL if specified and this is a new key
      if (options.ttl && result === amount) {
        await provider.expire(normalizedKey, options.ttl)
      }

      return result
    } catch (error) {
      throw new CacheError(
        `Increment operation failed for key ${normalizedKey}`,
        'OPERATION_TIMEOUT',
        options.layer,
        normalizedKey,
        error as Error
      )
    }
  }

  /**
   * Decrement numeric value in cache
   */
  async decrement(key: string, amount = 1, options: CacheIncrementOptions = {}): Promise<number> {
    return this.increment(key, -amount, options)
  }

  /**
   * Set expiration time for key
   */
  async expire(key: string, ttl: number, layer?: CacheLayer): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const normalizedKey = this.normalizeKey(key)

    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()
      let expired = false

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const result = await provider.expire(normalizedKey, ttl)
          if (result) expired = true
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return expired
    } catch (error) {
      throw new CacheError(
        `Expire operation failed for key ${normalizedKey}`,
        'OPERATION_TIMEOUT',
        layer,
        normalizedKey,
        error as Error
      )
    }
  }

  /**
   * Get time-to-live for key
   */
  async ttl(key: string, layer?: CacheLayer): Promise<number> {
    if (!this.config.enabled) {
      return -1
    }

    const normalizedKey = this.normalizeKey(key)

    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const ttl = await provider.ttl(normalizedKey)
          if (ttl >= 0) {
            return ttl
          }
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return -1
    } catch (error) {
      return -1
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string, layer?: CacheLayer): Promise<string[]> {
    if (!this.config.enabled) {
      return []
    }

    const normalizedPattern = this.normalizeKey(pattern)

    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()
      const allKeys = new Set<string>()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const keys = await provider.keys(normalizedPattern)
          keys.forEach(key => allKeys.add(this.denormalizeKey(key)))
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      return Array.from(allKeys)
    } catch (error) {
      throw new CacheError(
        `Keys operation failed for pattern ${pattern}`,
        'OPERATION_TIMEOUT',
        layer,
        pattern,
        error as Error
      )
    }
  }

  /**
   * Scan keys matching pattern with cursor support
   */
  async *scan(pattern: string, options: CacheScanOptions = {}): AsyncGenerator<string[], void, unknown> {
    if (!this.config.enabled) {
      return
    }

    const normalizedPattern = this.normalizeKey(pattern)
    const layer = options.layer || this.getDefaultReadLayer()
    const provider = this.providers.get(layer)

    if (!provider) {
      throw new CacheError(
        `Provider not found for layer ${layer}`,
        'LAYER_UNAVAILABLE',
        layer,
        pattern
      )
    }

    try {
      let cursor = options.cursor || '0'
      
      do {
        const result = await provider.scan(normalizedPattern, cursor)
        if (result.keys.length > 0) {
          yield result.keys.map(key => this.denormalizeKey(key))
        }
        cursor = result.cursor
      } while (cursor !== '0')
    } catch (error) {
      throw new CacheError(
        `Scan operation failed for pattern ${pattern}`,
        'OPERATION_TIMEOUT',
        layer,
        pattern,
        error as Error
      )
    }
  }

  /**
   * Clear cache by pattern or layer
   */
  async clear(pattern?: string, layer?: CacheLayer): Promise<number> {
    if (!this.config.enabled) {
      return 0
    }

    const normalizedPattern = pattern ? this.normalizeKey(pattern) : undefined

    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()
      let totalCleared = 0

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const cleared = await provider.clear(normalizedPattern)
          totalCleared += cleared
        } catch (error) {
          // Continue to next layer on error
          continue
        }
      }

      this.emitEvent('delete', {
        layer,
        metadata: { tags: [pattern || 'all'] }
      })

      return totalCleared
    } catch (error) {
      throw new CacheError(
        `Clear operation failed`,
        'OPERATION_TIMEOUT',
        layer,
        pattern,
        error as Error
      )
    }
  }

  /**
   * Invalidate entire cache layer
   */
  async invalidateLayer(layer: CacheLayer): Promise<void> {
    const provider = this.providers.get(layer)
    if (!provider) {
      throw new CacheError(
        `Provider not found for layer ${layer}`,
        'LAYER_UNAVAILABLE',
        layer
      )
    }

    try {
      await provider.clear()
      this.emitEvent('delete', { layer })
    } catch (error) {
      throw new CacheError(
        `Layer invalidation failed for ${layer}`,
        'OPERATION_TIMEOUT',
        layer,
        undefined,
        error as Error
      )
    }
  }

  /**
   * Warmup cache with predefined keys
   */
  async warmup(keys: string[], layer?: CacheLayer): Promise<void> {
    if (!this.config.enabled || !this.config.background.enabled) {
      return
    }

    // This would typically integrate with a data source
    // For now, we emit an event that can be handled by the application
    this.emitEvent('set', {
      layer,
      metadata: { tags: ['warmup'] }
    })
  }

  /**
   * Get cache statistics
   */
  async getStats(layer?: CacheLayer): Promise<CacheStats> {
    const layerStats: Record<CacheLayer, any> = {} as any

    try {
      const layers = layer ? [this.getLayerConfig(layer)] : this.getAllLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        if (!provider || !layerConfig.enabled) {
          continue
        }

        try {
          const providerStats = await provider.getStats()
          layerStats[layerConfig.name as CacheLayer] = {
            ...providerStats,
            name: layerConfig.name,
            type: layerConfig.type,
            enabled: layerConfig.enabled
          }
        } catch (error) {
          layerStats[layerConfig.name as CacheLayer] = {
            name: layerConfig.name,
            type: layerConfig.type,
            enabled: false,
            error: (error as Error).message
          }
        }
      }

      // Aggregate statistics
      const totalKeys = Object.values(layerStats).reduce((sum, stats) => sum + (stats.keys || 0), 0)
      const totalMemory = Object.values(layerStats).reduce((sum, stats) => sum + (stats.memory || 0), 0)
      const totalHits = Object.values(layerStats).reduce((sum, stats) => sum + (stats.hits || 0), 0)
      const totalMisses = Object.values(layerStats).reduce((sum, stats) => sum + (stats.misses || 0), 0)
      const totalOperations = totalHits + totalMisses

      return {
        totalKeys,
        totalMemory,
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalOperations > 0 ? (totalHits / totalOperations) * 100 : 0,
        gets: totalOperations,
        sets: Object.values(layerStats).reduce((sum, stats) => sum + (stats.sets || 0), 0),
        deletes: Object.values(layerStats).reduce((sum, stats) => sum + (stats.deletes || 0), 0),
        avgGetTime: this.calculateAverageLatency(layerStats, 'get'),
        avgSetTime: this.calculateAverageLatency(layerStats, 'set'),
        avgDeleteTime: this.calculateAverageLatency(layerStats, 'delete'),
        layerStats,
        lastReset: new Date(Date.now() - (process.uptime() * 1000)),
        uptime: process.uptime() * 1000
      }
    } catch (error) {
      throw new CacheError(
        'Failed to get cache statistics',
        'OPERATION_TIMEOUT',
        layer,
        undefined,
        error as Error
      )
    }
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<CacheHealth> {
    const layerHealths: Record<CacheLayer, any> = {} as any
    let overallScore = 0
    let healthyLayers = 0
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      const layers = this.getAllLayers()

      for (const layerConfig of layers) {
        const provider = this.providers.get(layerConfig.name as CacheLayer)
        const layerName = layerConfig.name as CacheLayer

        if (!provider) {
          layerHealths[layerName] = {
            status: 'unhealthy',
            score: 0,
            connected: false,
            issues: ['Provider not initialized']
          }
          issues.push(`${layerName} layer provider not initialized`)
          continue
        }

        try {
          const connected = provider.isConnected()
          const stats = await provider.getStats()
          
          // Calculate health score based on various factors
          let score = 100
          const layerIssues: string[] = []

          if (!connected) {
            score -= 50
            layerIssues.push('Not connected')
          }

          if (stats.connectionErrors > 0) {
            score -= Math.min(30, stats.connectionErrors * 5)
            layerIssues.push(`${stats.connectionErrors} connection errors`)
          }

          const hitRate = stats.hits + stats.misses > 0 
            ? (stats.hits / (stats.hits + stats.misses)) * 100 
            : 0
          
          if (hitRate < 50) {
            score -= 20
            layerIssues.push(`Low hit rate: ${hitRate.toFixed(1)}%`)
          }

          if (stats.avgLatency > 100) {
            score -= 15
            layerIssues.push(`High latency: ${stats.avgLatency}ms`)
          }

          const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'unhealthy'
          
          layerHealths[layerName] = {
            status,
            score: Math.max(0, score),
            connected,
            connectionLatency: stats.avgLatency || 0,
            hitRate,
            avgLatency: stats.avgLatency || 0,
            errorRate: stats.connectionErrors || 0,
            memoryUsage: stats.memory || 0,
            keyCount: stats.keys || 0,
            issues: layerIssues,
            lastCheck: new Date()
          }

          overallScore += Math.max(0, score)
          if (status === 'healthy') {
            healthyLayers++
          }

        } catch (error) {
          layerHealths[layerName] = {
            status: 'unhealthy',
            score: 0,
            connected: false,
            issues: [`Health check failed: ${(error as Error).message}`],
            lastCheck: new Date()
          }
          issues.push(`${layerName} layer health check failed`)
        }
      }

      // Calculate overall health
      const avgScore = layers.length > 0 ? overallScore / layers.length : 0
      const overallStatus = avgScore >= 80 ? 'healthy' : avgScore >= 50 ? 'degraded' : 'unhealthy'

      // Generate recommendations
      if (healthyLayers < layers.length) {
        recommendations.push('Check unhealthy cache layers and restore connections')
      }
      
      if (avgScore < 70) {
        recommendations.push('Consider reviewing cache configuration and infrastructure')
      }

      return {
        status: overallStatus,
        score: avgScore,
        layers: layerHealths,
        system: {
          memory: process.memoryUsage().heapUsed,
          connections: this.providers.size,
          errors: issues.length,
          latency: this.calculateSystemLatency(layerHealths)
        },
        issues,
        recommendations,
        lastCheck: new Date(),
        checkDuration: 0 // Would be calculated in a real implementation
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        score: 0,
        layers: layerHealths,
        system: {
          memory: process.memoryUsage().heapUsed,
          connections: 0,
          errors: 1,
          latency: 0
        },
        issues: [`Health check failed: ${(error as Error).message}`],
        recommendations: ['Restart cache manager service'],
        lastCheck: new Date(),
        checkDuration: 0
      }
    }
  }

  /**
   * Connect to all cache providers
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    try {
      // Initialize providers for each layer
      for (const layerConfig of this.config.layers) {
        if (!layerConfig.enabled) {
          continue
        }

        const provider = this.createProvider(layerConfig)
        await provider.connect()
        
        this.providers.set(layerConfig.name as CacheLayer, provider)
        this.emitEvent('connect', { layer: layerConfig.name as CacheLayer })
      }

      this.isConnected = true
      
      // Start background tasks
      this.startBackgroundTasks()
      
      this.emitEvent('connect', {})
    } catch (error) {
      throw new CacheError(
        'Failed to connect cache manager',
        'CONNECTION_FAILED',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  /**
   * Disconnect from all cache providers
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      // Stop background tasks
      this.stopBackgroundTasks()

      // Disconnect all providers
      for (const [layer, provider] of this.providers.entries()) {
        try {
          await provider.disconnect()
          this.emitEvent('disconnect', { layer })
        } catch (error) {
          // Log error but continue disconnecting other providers
          console.error(`Failed to disconnect ${layer} provider:`, error)
        }
      }

      this.providers.clear()
      this.isConnected = false
      
      this.emitEvent('disconnect', {})
    } catch (error) {
      throw new CacheError(
        'Failed to disconnect cache manager',
        'CONNECTION_FAILED',
        undefined,
        undefined,
        error as Error
      )
    }
  }

  /**
   * Event listening not supported - use Event Bus subscriptions instead
   */
  on(event: CacheEvent, listener: CacheEventListener): this {
    console.warn('Cache Manager event listening not supported. Use Event Bus subscriptions instead.')
    return this
  }

  /**
   * Event unsubscribing not supported - use Event Bus unsubscribe instead
   */
  off(event: CacheEvent, listener: CacheEventListener): this {
    console.warn('Cache Manager event unsubscribing not supported. Use Event Bus unsubscribe instead.')
    return this
  }

  // Private helper methods

  private normalizeKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key
  }

  private denormalizeKey(key: string): string {
    if (this.config.keyPrefix && key.startsWith(`${this.config.keyPrefix}:`)) {
      return key.substring(this.config.keyPrefix.length + 1)
    }
    return key
  }

  private getSortedLayers(preferredLayer?: CacheLayer): CacheLayerConfig[] {
    if (preferredLayer) {
      const layer = this.config.layers.find(l => l.name === preferredLayer)
      return layer ? [layer] : []
    }

    return [...this.config.layers]
      .filter(layer => layer.enabled)
      .sort((a, b) => a.priority - b.priority)
  }

  private getLayerConfig(layer: CacheLayer): CacheLayerConfig {
    const config = this.config.layers.find(l => l.name === layer)
    if (!config) {
      throw new CacheError(
        `Layer configuration not found: ${layer}`,
        'LAYER_UNAVAILABLE',
        layer
      )
    }
    return config
  }

  private getAllLayers(): CacheLayerConfig[] {
    return this.config.layers.filter(layer => layer.enabled)
  }

  private getWriteLayers(): CacheLayerConfig[] {
    return this.getAllLayers()
  }

  private getDefaultWriteLayer(): CacheLayer {
    const layers = this.getSortedLayers()
    return layers.length > 0 ? layers[0].name as CacheLayer : 'memory'
  }

  private getDefaultReadLayer(): CacheLayer {
    const layers = this.getSortedLayers()
    return layers.length > 0 ? layers[0].name as CacheLayer : 'memory'
  }

  private calculateTtl(requestedTtl: number | undefined, layerConfig: CacheLayerConfig): number {
    const ttl = requestedTtl || this.config.defaultTtl || layerConfig.ttl.default
    return Math.max(layerConfig.ttl.min, Math.min(layerConfig.ttl.max, ttl))
  }

  private async serialize<T>(value: T, options: CacheSetOptions): Promise<any> {
    let serialized: string | Buffer

    // Serialize based on configured serializer
    switch (this.config.serializer) {
      case 'json':
        serialized = JSON.stringify(value)
        break
      case 'msgpack':
        // Would use msgpack library
        serialized = JSON.stringify(value) // Fallback to JSON
        break
      case 'protobuf':
        // Would use protobuf library
        serialized = JSON.stringify(value) // Fallback to JSON
        break
      default:
        serialized = JSON.stringify(value)
    }

    // Compress if enabled and above threshold
    if (options.compress || 
        (this.config.compression.enabled && 
         Buffer.byteLength(serialized) >= this.config.compression.threshold)) {
      
      switch (this.config.compression.algorithm) {
        case 'gzip':
          return await gzip(serialized)
        case 'brotli':
          // Would use brotli compression
          return await gzip(serialized) // Fallback to gzip
        case 'lz4':
          // Would use lz4 compression
          return await gzip(serialized) // Fallback to gzip
        default:
          return await gzip(serialized)
      }
    }

    return serialized
  }

  private async deserialize<T>(value: any, layerConfig: CacheLayerConfig): Promise<T> {
    let deserialized: string

    // Decompress if needed
    if (Buffer.isBuffer(value)) {
      try {
        const decompressed = await gunzip(value)
        deserialized = decompressed.toString()
      } catch (error) {
        // Might not be compressed
        deserialized = value.toString()
      }
    } else {
      deserialized = value
    }

    // Deserialize based on configured serializer
    switch (this.config.serializer) {
      case 'json':
        return JSON.parse(deserialized)
      case 'msgpack':
        // Would use msgpack library
        return JSON.parse(deserialized) // Fallback to JSON
      case 'protobuf':
        // Would use protobuf library
        return JSON.parse(deserialized) // Fallback to JSON
      default:
        return JSON.parse(deserialized)
    }
  }

  private enrichValueWithMetadata(value: any, metadata?: CacheMetadata, layerConfig?: CacheLayerConfig): any {
    if (!metadata && !this.config.healthcare) {
      return value
    }

    const enriched = {
      data: value,
      metadata: {
        ...metadata,
        createdAt: new Date(),
        accessCount: 1,
        layer: layerConfig?.name
      }
    }

    return enriched
  }

  private async updateAccessMetadata(key: string, layer: CacheLayer): Promise<void> {
    // This would update access metadata in the cache
    // For now, we just emit an event
    this.emitEvent('hit', {
      layer,
      key
    })
  }

  private async promoteToHigherLayers<T>(
    key: string, 
    value: T, 
    currentLayer: CacheLayerConfig,
    options: CacheGetOptions
  ): Promise<void> {
    const higherLayers = this.config.layers
      .filter(layer => layer.priority < currentLayer.priority && layer.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const layer of higherLayers) {
      const provider = this.providers.get(layer.name as CacheLayer)
      if (!provider) continue

      try {
        const serialized = await this.serialize(value, {})
        const ttl = this.calculateTtl(undefined, layer)
        await provider.set(key, serialized, ttl)
      } catch (error) {
        // Continue to next layer on error
        continue
      }
    }
  }

  private async validateHealthcareData<T>(value: T, healthcare: any): Promise<void> {
    if (!this.config.healthcare) return

    // Validate healthcare data classification and compliance
    // This would integrate with healthcare compliance rules
    if (healthcare.classification === 'restricted' && !this.config.healthcare.encryption) {
      throw new CacheError(
        'Encryption required for restricted healthcare data',
        'ENCRYPTION_ERROR'
      )
    }
  }

  private async auditCacheOperation(operation: string, key: string, healthcare: any): Promise<void> {
    // This would log cache operations for healthcare audit trail
    this.emitEvent('set', {
      key,
      metadata: { tags: [operation] }
    })
  }

  private createProvider(layerConfig: CacheLayerConfig): ICacheProvider {
    // This would create the appropriate provider based on layer type
    // For now, return a mock provider
    return {
      async get<T>(key: string): Promise<T | null> { return null },
      async set<T>(key: string, value: T, ttl?: number): Promise<void> {},
      async delete(key: string): Promise<boolean> { return false },
      async exists(key: string): Promise<boolean> { return false },
      async mget<T>(keys: string[]): Promise<Array<T | null>> { return [] },
      async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {},
      async mdelete(keys: string[]): Promise<number> { return 0 },
      async increment(key: string, amount: number): Promise<number> { return amount },
      async decrement(key: string, amount: number): Promise<number> { return -amount },
      async expire(key: string, ttl: number): Promise<boolean> { return false },
      async ttl(key: string): Promise<number> { return -1 },
      async keys(pattern: string): Promise<string[]> { return [] },
      async scan(pattern: string, cursor?: string): Promise<{ cursor: string; keys: string[] }> {
        return { cursor: '0', keys: [] }
      },
      async clear(pattern?: string): Promise<number> { return 0 },
      async getStats(): Promise<any> {
        return {
          keys: 0,
          memory: 0,
          hits: 0,
          misses: 0,
          operations: 0,
          avgLatency: 0,
          connections: 0,
          connectionErrors: 0
        }
      },
      async connect(): Promise<void> {},
      async disconnect(): Promise<void> {},
      isConnected(): boolean { return true }
    }
  }

  private startBackgroundTasks(): void {
    if (this.config.background.enabled) {
      // Health check interval
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.getHealth()
          this.emitEvent('hit', { metadata: { tags: ['health'] } })
        } catch (error) {
          console.error('Health check failed:', error)
        }
      }, 60000) // Every minute

      // Cleanup interval
      if (this.config.background.cleanupInterval > 0) {
        this.cleanupInterval = setInterval(() => {
          this.performCleanup()
        }, this.config.background.cleanupInterval)
      }

      // Metrics collection
      if (this.config.metrics.enabled) {
        this.metricsInterval = setInterval(async () => {
          try {
            await this.getStats()
            this.emitEvent('hit', { metadata: { tags: ['metrics'] } })
          } catch (error) {
            console.error('Metrics collection failed:', error)
          }
        }, this.config.metrics.interval)
      }
    }
  }

  private stopBackgroundTasks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }
  }

  private performCleanup(): void {
    // Cleanup expired entries, old metrics, etc.
    this.emitEvent('delete', {
      metadata: { tags: ['cleanup'] }
    })
  }

  private calculateAverageLatency(layerStats: Record<string, any>, operation: string): number {
    const values = Object.values(layerStats)
      .map(stats => stats[`avg${operation.charAt(0).toUpperCase() + operation.slice(1)}Time`])
      .filter(value => typeof value === 'number' && value > 0)

    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private calculateSystemLatency(layerHealths: Record<string, any>): number {
    const latencies = Object.values(layerHealths)
      .map(health => health.avgLatency)
      .filter(latency => typeof latency === 'number' && latency > 0)

    return latencies.length > 0 ? latencies.reduce((sum, val) => sum + val, 0) / latencies.length : 0
  }

  private emitEvent(type: CacheEvent, data: Partial<CacheEventData> = {}): void {
    if (!this.eventBus) {
      return
    }

    // Fire and forget event publishing
    setImmediate(async () => {
      try {
        const timestamp = new Date()

        // Map cache events to standard Event Bus events
        switch (type) {
          case 'hit':
          case 'miss':
          case 'set':
          case 'delete':
          case 'expire':
          case 'evict':
            await this.eventBus?.publish('cache-manager.operation', {
              operation: type === 'hit' ? 'get' : 
                        type === 'miss' ? 'get' :
                        type === 'set' ? 'set' :
                        type === 'delete' ? 'delete' : 
                        type === 'expire' ? 'delete' :
                        type === 'evict' ? 'delete' : 'clear',
              key: data.key,
              layer: data.layer,
              success: type !== 'miss',
              duration: data.duration,
              timestamp,
              metadata: data.metadata
            } as CacheOperationEvent)
            break

          case 'connect':
          case 'disconnect':
            await this.eventBus?.publish('cache-manager.health-changed', {
              layer: data.layer || 'all',
              oldStatus: type === 'connect' ? 'disconnected' : 'connected',
              newStatus: type === 'connect' ? 'connected' : 'disconnected',
              healthScore: type === 'connect' ? 100 : 0,
              issues: type === 'disconnect' ? ['Connection lost'] : [],
              timestamp
            } as CacheHealthChangedEvent)
            break

          case 'layer-fallback':
          case 'health-check':
          case 'error':
            // Don't emit these events to avoid noise, log instead
            console.warn(`Cache event ${type} occurred:`, data)
            break
        }
      } catch (error) {
        console.warn(`Failed to publish cache event ${type}:`, error)
      }
    })
  }
}