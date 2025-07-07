/**
 * API Key Types and Interfaces
 * 
 * Type definitions for API key authentication system
 */

import { UserData } from './auth-types'

/**
 * API Key database record
 */
export interface ApiKey {
  id: string
  user_id: string
  key_hash: string
  key_prefix: string
  name: string
  description?: string
  permissions: ApiKeyPermissions
  expires_at?: Date
  rate_limit: number
  ip_whitelist: string[]
  last_used_at?: Date
  last_used_ip?: string
  usage_count: number
  is_active: boolean
  revoked_at?: Date
  revoked_by?: string
  revoked_reason?: string
  created_at: Date
  updated_at: Date
}

/**
 * API Key permissions structure
 */
export interface ApiKeyPermissions {
  resources?: string[]      // ['users', 'files', 'reports']
  actions?: string[]        // ['read', 'write', 'delete']
  scopes?: string[]         // ['own', 'department', 'all']
  endpoints?: string[]      // Specific endpoint patterns
  rateLimit?: number        // Override default rate limit
  maxRequests?: number      // Total request limit
}

/**
 * API Key validation result
 */
export interface ApiKeyValidation {
  valid: boolean
  userId?: string
  apiKeyId?: string
  permissions?: ApiKeyPermissions
  rateLimit?: number
  user?: UserData
  reason?: string // Reason for validation failure
}

/**
 * Create API Key request
 */
export interface CreateApiKeyRequest {
  name: string
  description?: string
  permissions?: ApiKeyPermissions
  expiresAt?: Date
  rateLimit?: number
  ipWhitelist?: string[]
}

/**
 * API Key response (for creation only)
 */
export interface ApiKeyResponse {
  id: string
  key: string // Full key - only shown once!
  name: string
  prefix: string
  createdAt: Date
}

/**
 * API Key list item (safe for listing)
 */
export interface ApiKeyListItem {
  id: string
  name: string
  description?: string
  prefix: string
  permissions: ApiKeyPermissions
  expiresAt?: Date
  lastUsedAt?: Date
  usageCount: number
  isActive: boolean
  createdAt: Date
}

/**
 * API Key usage statistics
 */
export interface ApiKeyUsageStats {
  apiKeyId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  lastUsedAt?: Date
  lastUsedIp?: string
  topEndpoints: Array<{
    endpoint: string
    count: number
  }>
  dailyUsage: Array<{
    date: string
    count: number
  }>
}

/**
 * API Key environment type
 */
export enum ApiKeyEnvironment {
  LIVE = 'live',
  TEST = 'test',
  SANDBOX = 'sandbox'
}

/**
 * API Key prefix configuration
 */
export interface ApiKeyPrefixConfig {
  prefix: string
  environment: ApiKeyEnvironment
  length: number
}

/**
 * Extended FastifyRequest with API Key context
 */
declare module 'fastify' {
  interface FastifyRequest {
    authMethod?: 'jwt' | 'api_key'
    apiKeyId?: string
    permissions?: ApiKeyPermissions
  }
}