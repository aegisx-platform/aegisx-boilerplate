/**
 * Environment Variables Secrets Adapter
 * 
 * Manages secrets stored in environment variables
 * Supports namespacing, caching, and secure transformations
 */

import {
  ISecretsAdapter,
  EnvironmentAdapterConfig,
  SetSecretOptions,
  SecretVersion,
  AdapterHealthStatus,
  AdapterStats,
  SecretsManagerError,
  ValidationError
} from '../../types/secrets-manager.types'

export class EnvironmentSecretsAdapter implements ISecretsAdapter {
  public readonly name = 'environment'
  public readonly priority = 1 // Lowest priority - fallback adapter
  
  private config: EnvironmentAdapterConfig
  private stats: AdapterStats

  constructor(config: EnvironmentAdapterConfig = {}) {
    this.config = {
      prefix: 'SECRET_',
      transformKeys: true,
      allowOverwrite: false,
      ...config
    }
    
    this.stats = {
      operationCounts: {
        gets: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      },
      averageResponseTime: 0,
      availability: 1,
      lastUsed: new Date()
    }
  }

  /**
   * Check if adapter is available
   */
  public async isAvailable(): Promise<boolean> {
    return true // Environment variables are always available
  }

  /**
   * Get secret from environment variables
   */
  public async get(key: string, namespace?: string): Promise<string | null> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      const envKey = this.buildEnvKey(key, namespace)
      const value = process.env[envKey] || null
      
      this.stats.operationCounts.gets++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
      
      return value
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Set secret in environment variables (runtime only)
   */
  public async set(
    key: string,
    value: string,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      this.validateValue(value)
      
      const envKey = this.buildEnvKey(key, namespace)
      
      // Check if key exists and overwrite is not allowed
      if (!this.config.allowOverwrite && process.env[envKey] !== undefined) {
        throw new SecretsManagerError(
          `Environment variable ${envKey} already exists and overwrite is not allowed`,
          'ENV_KEY_EXISTS',
          this.name,
          key
        )
      }
      
      // Set environment variable (runtime only)
      process.env[envKey] = value
      
      this.stats.operationCounts.sets++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Delete secret from environment variables
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const startTime = process.hrtime.bigint()
    
    try {
      this.validateKey(key)
      const envKey = this.buildEnvKey(key, namespace)
      
      if (process.env[envKey] === undefined) {
        this.updateResponseTime(startTime)
        return false
      }
      
      delete process.env[envKey]
      
      this.stats.operationCounts.deletes++
      this.updateResponseTime(startTime)
      this.stats.lastUsed = new Date()
      
      return true
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Check if secret exists in environment variables
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      this.validateKey(key)
      const envKey = this.buildEnvKey(key, namespace)
      return process.env[envKey] !== undefined
    } catch (error) {
      this.stats.operationCounts.errors++
      throw error
    }
  }

  /**
   * Get multiple secrets from environment variables
   */
  public async getMultiple(
    keys: string[],
    namespace?: string
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    
    for (const key of keys) {
      results[key] = await this.get(key, namespace)
    }
    
    return results
  }

  /**
   * Set multiple secrets in environment variables
   */
  public async setMultiple(
    secrets: Record<string, string>,
    namespace?: string,
    options?: SetSecretOptions
  ): Promise<void> {
    for (const [key, value] of Object.entries(secrets)) {
      await this.set(key, value, namespace, options)
    }
  }

  /**
   * List available namespaces
   * For environment adapter, we parse all env vars with our prefix
   */
  public async listNamespaces(): Promise<string[]> {
    const namespaces = new Set<string>()
    const prefix = this.config.prefix || ''
    
    for (const envKey of Object.keys(process.env)) {
      if (envKey.startsWith(prefix)) {
        const withoutPrefix = envKey.substring(prefix.length)
        const parts = withoutPrefix.split('__')
        
        if (parts.length > 1) {
          namespaces.add(parts[0].toLowerCase())
        }
      }
    }
    
    return Array.from(namespaces).sort()
  }

  /**
   * Clear all secrets in a namespace
   */
  public async clearNamespace(namespace: string): Promise<void> {
    const prefix = this.config.prefix || ''
    const namespacePrefix = this.config.transformKeys 
      ? `${prefix}${namespace.toUpperCase()}__`
      : `${prefix}${namespace}__`
    
    const keysToDelete = Object.keys(process.env).filter(key => 
      key.startsWith(namespacePrefix)
    )
    
    for (const key of keysToDelete) {
      delete process.env[key]
    }
  }

  /**
   * Rotate secret (same as set for environment adapter)
   */
  public async rotate(
    key: string,
    newValue: string,
    namespace?: string
  ): Promise<void> {
    await this.set(key, newValue, namespace, { replicate: true })
  }

  /**
   * Get secret versions (not supported for environment variables)
   */
  public async getVersions(key: string, namespace?: string): Promise<SecretVersion[]> {
    const value = await this.get(key, namespace)
    
    if (!value) {
      return []
    }
    
    return [{
      version: '1',
      value,
      createdAt: new Date(),
      metadata: { source: 'environment' }
    }]
  }

  /**
   * Health check for environment adapter
   */
  public async healthCheck(): Promise<AdapterHealthStatus> {
    const testKey = `${this.config.prefix}HEALTH_CHECK`
    const testValue = 'health-check-value'
    
    try {
      // Test basic operations
      const startTime = Date.now()
      process.env[testKey] = testValue
      const retrieved = process.env[testKey]
      delete process.env[testKey]
      const responseTime = Date.now() - startTime
      
      const isHealthy = retrieved === testValue
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        available: true,
        responseTime,
        errorCount: this.stats.operationCounts.errors,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        available: false,
        responseTime: 0,
        errorCount: this.stats.operationCounts.errors,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      }
    }
  }

  /**
   * Get adapter statistics
   */
  public async getStats(): Promise<AdapterStats> {
    return {
      ...this.stats,
      availability: this.calculateAvailability()
    }
  }

  /**
   * Initialize adapter
   */
  public async initialize(): Promise<void> {
    // Environment adapter doesn't need initialization
    this.stats.lastUsed = new Date()
  }

  /**
   * Shutdown adapter
   */
  public async shutdown(): Promise<void> {
    // Environment adapter doesn't need cleanup
  }

  /**
   * Build environment variable key
   */
  private buildEnvKey(key: string, namespace?: string): string {
    const prefix = this.config.prefix || ''
    
    if (!this.config.transformKeys) {
      return namespace ? `${prefix}${namespace}__${key}` : `${prefix}${key}`
    }
    
    // Transform to uppercase and replace special characters
    const transformedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    const transformedNamespace = namespace?.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    
    return transformedNamespace 
      ? `${prefix}${transformedNamespace}__${transformedKey}`
      : `${prefix}${transformedKey}`
  }

  /**
   * Validate secret key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new ValidationError('key', 'Key must be a non-empty string')
    }
    
    if (key.length > 250) {
      throw new ValidationError('key', 'Key must be less than 250 characters')
    }
    
    // Check for invalid characters in environment variable names
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key.replace(/[^a-zA-Z0-9_]/g, '_'))) {
      throw new ValidationError('key', 'Key contains invalid characters for environment variable')
    }
  }

  /**
   * Validate secret value
   */
  private validateValue(value: string): void {
    if (typeof value !== 'string') {
      throw new ValidationError('value', 'Value must be a string')
    }
    
    // Check for excessively large values
    if (value.length > 32768) { // 32KB limit
      throw new ValidationError('value', 'Value too large (max 32KB)')
    }
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(startTime: bigint): void {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000 // Convert to ms
    
    // Simple moving average
    const totalOps = Object.values(this.stats.operationCounts).reduce((sum, count) => sum + count, 0)
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (totalOps - 1)) + duration
    ) / totalOps
  }

  /**
   * Calculate availability percentage
   */
  private calculateAvailability(): number {
    const totalOps = Object.values(this.stats.operationCounts).reduce((sum, count) => sum + count, 0)
    
    if (totalOps === 0) {
      return 1 // 100% if no operations yet
    }
    
    const successOps = totalOps - this.stats.operationCounts.errors
    return successOps / totalOps
  }

  /**
   * Get environment variables that match our pattern
   */
  public getMatchingEnvVars(): Record<string, string> {
    const prefix = this.config.prefix || ''
    const matching: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && value !== undefined) {
        matching[key] = value
      }
    }
    
    return matching
  }

  /**
   * Load secrets from .env file format
   */
  public loadFromEnvString(envContent: string): void {
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex === -1) {
        continue
      }
      
      const key = trimmed.substring(0, equalIndex).trim()
      let value = trimmed.substring(equalIndex + 1).trim()
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      if (key.startsWith(this.config.prefix || '')) {
        process.env[key] = value
      }
    }
  }
}