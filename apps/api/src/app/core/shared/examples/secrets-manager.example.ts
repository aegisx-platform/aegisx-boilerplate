/**
 * Secrets Manager Usage Examples
 * 
 * Demonstrates how to use the Secrets Manager service in different scenarios
 */

import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Example 1: Basic secret operations
 */
export async function basicSecretsExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get secret using helper method
    const apiKey = await request.server.getSecret('PAYMENT_API_KEY')
    
    if (!apiKey) {
      return reply.code(500).send({
        error: 'Payment API key not configured'
      })
    }
    
    // Use the API key
    console.log('Payment API Key:', request.server.secretsManager.constructor.name.includes('Service') ? '****' : apiKey)
    
    return { success: true, message: 'API key retrieved successfully' }
  } catch (error) {
    request.log.error('Failed to get secret:', error)
    throw error
  }
}

/**
 * Example 2: Namespaced secrets
 */
export async function namespacedSecretsExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get secrets from different namespaces
    const [databaseUrl, redisUrl, jwtSecret] = await Promise.all([
      request.server.getSecret('DATABASE_URL', 'database'),
      request.server.getSecret('CONNECTION_STRING', 'redis'),
      request.server.getSecret('JWT_SECRET', 'auth')
    ])
    
    return {
      success: true,
      configured: {
        database: !!databaseUrl,
        redis: !!redisUrl,
        jwt: !!jwtSecret
      }
    }
  } catch (error) {
    request.log.error('Failed to get namespaced secrets:', error)
    throw error
  }
}

/**
 * Example 3: Setting secrets (admin operations)
 */
export async function setSecretsExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Set a secret with TTL
    await request.server.setSecret(
      'TEMP_TOKEN',
      'temporary-access-token-123',
      'auth',
      {
        ttl: 3600000, // 1 hour
        metadata: {
          purpose: 'temporary_access',
          createdBy: 'admin',
          environment: 'staging'
        }
      }
    )
    
    // Set multiple secrets
    await request.server.secretsManager.setMultiple({
      'STRIPE_PUBLIC_KEY': 'pk_test_...',
      'STRIPE_SECRET_KEY': 'sk_test_...',
      'STRIPE_WEBHOOK_SECRET': 'whsec_...'
    }, 'payment')
    
    return {
      success: true,
      message: 'Secrets configured successfully'
    }
  } catch (error) {
    request.log.error('Failed to set secrets:', error)
    throw error
  }
}

/**
 * Example 4: Healthcare API integration with secrets
 */
export async function healthcareAPIExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get healthcare API credentials
    const [apiKey, clientId, clientSecret] = await Promise.all([
      request.server.getSecret('API_KEY', 'healthcare'),
      request.server.getSecret('CLIENT_ID', 'healthcare'),
      request.server.getSecret('CLIENT_SECRET', 'healthcare')
    ])
    
    if (!apiKey || !clientId || !clientSecret) {
      return reply.code(500).send({
        error: 'Healthcare API credentials not configured'
      })
    }
    
    // Use with HTTP client
    const response = await request.server.httpClient
      .withAuth(apiKey, 'api-key')
      .withTimeout(30000)
      .get('/api/patients/123', {
        headers: {
          'X-Client-ID': clientId,
          'X-HIPAA-Audit': 'true'
        }
      })
    
    return {
      success: true,
      patientData: response.data,
      fromCache: response.cached
    }
  } catch (error) {
    request.log.error('Healthcare API call failed:', error)
    throw error
  }
}

/**
 * Example 5: Payment processing with secrets
 */
export async function paymentProcessingExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get payment gateway secrets
    const [stripeSecret] = await Promise.all([
      request.server.getSecret('STRIPE_SECRET_KEY', 'payment'),
      request.server.getSecret('STRIPE_WEBHOOK_SECRET', 'payment')
    ])
    
    if (!stripeSecret) {
      return reply.code(500).send({
        error: 'Payment gateway not configured'
      })
    }
    
    // Create payment with HTTP client
    const paymentClient = request.server.httpClientFactory.createForPayment({
      baseURL: 'https://api.stripe.com',
      apiKey: stripeSecret
    })
    
    const charge = await paymentClient.post('/v1/charges', {
      amount: 2000,
      currency: 'thb',
      source: 'tok_visa'
    })
    
    return {
      success: true,
      chargeId: charge.data.id,
      amount: charge.data.amount
    }
  } catch (error) {
    request.log.error('Payment processing failed:', error)
    throw error
  }
}

/**
 * Example 6: Database connection with encrypted secrets
 */
export async function databaseConnectionExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get database credentials
    const [host, username, password, database] = await Promise.all([
      request.server.getSecret('DB_HOST', 'database'),
      request.server.getSecret('DB_USERNAME', 'database'),
      request.server.getSecret('DB_PASSWORD', 'database'),
      request.server.getSecret('DB_NAME', 'database')
    ])
    
    if (!host || !username || !password || !database) {
      return reply.code(500).send({
        error: 'Database credentials incomplete'
      })
    }
    
    // Connection string would be built here (password is securely retrieved)
    // const connectionString = `postgresql://${username}:${password}@${host}:5432/${database}`
    
    // Test connection (in real app, you'd use this for actual connection)
    return {
      success: true,
      message: 'Database credentials available',
      host: host,
      database: database,
      // Never log the actual password
      passwordConfigured: !!password
    }
  } catch (error) {
    request.log.error('Database connection check failed:', error)
    throw error
  }
}

/**
 * Example 7: Secret rotation
 */
export async function secretRotationExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Generate new API key
    const newApiKey = generateSecureApiKey()
    
    // Rotate the secret
    await request.server.secretsManager.rotate(
      'API_KEY',
      newApiKey,
      'external'
    )
    
    // Verify the rotation
    const rotatedSecret = await request.server.getSecret('API_KEY', 'external')
    
    return {
      success: true,
      message: 'Secret rotated successfully',
      rotated: rotatedSecret === newApiKey
    }
  } catch (error) {
    request.log.error('Secret rotation failed:', error)
    throw error
  }
}

/**
 * Example 8: Bulk secret operations
 */
export async function bulkSecretsExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get multiple secrets at once
    const secrets = await request.server.secretsManager.getMultiple([
      'SMTP_HOST',
      'SMTP_USERNAME',
      'SMTP_PASSWORD',
      'SMTP_PORT'
    ], 'email')
    
    // Check which secrets are configured
    const configured = Object.entries(secrets).reduce((acc, [key, value]) => {
      acc[key] = value !== null
      return acc
    }, {} as Record<string, boolean>)
    
    return {
      success: true,
      configured
    }
  } catch (error) {
    request.log.error('Bulk secrets operation failed:', error)
    throw error
  }
}

/**
 * Example 9: Conditional secret loading
 */
export async function conditionalSecretsExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    const environment = process.env.NODE_ENV || 'development'
    
    // Load different secrets based on environment
    let secrets: Record<string, string | null> = {}
    
    if (environment === 'production') {
      secrets = await request.server.secretsManager.getMultiple([
        'PRODUCTION_API_KEY',
        'PRODUCTION_DB_PASSWORD',
        'ENCRYPTION_KEY'
      ], 'production')
    } else if (environment === 'staging') {
      secrets = await request.server.secretsManager.getMultiple([
        'STAGING_API_KEY',
        'STAGING_DB_PASSWORD'
      ], 'staging')
    } else {
      secrets = await request.server.secretsManager.getMultiple([
        'DEV_API_KEY',
        'DEV_DB_PASSWORD'
      ], 'development')
    }
    
    return {
      success: true,
      environment,
      secretsLoaded: Object.keys(secrets).length,
      configured: Object.values(secrets).filter(v => v !== null).length
    }
  } catch (error) {
    request.log.error('Conditional secrets loading failed:', error)
    throw error
  }
}

/**
 * Example 10: Secret validation and health checks
 */
export async function secretsHealthExample(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check secrets manager health
    const health = await request.server.secretsManager.healthCheck()
    
    // Get statistics
    const stats = await request.server.secretsManager.getStats()
    
    // Check critical secrets
    const criticalSecrets = ['JWT_SECRET', 'DB_PASSWORD']
    const criticalSecretsStatus = await Promise.all(
      criticalSecrets.map(async (secret) => ({
        secret,
        configured: await request.server.secretExists(secret)
      }))
    )
    
    return {
      health,
      stats,
      criticalSecrets: criticalSecretsStatus,
      summary: {
        adaptersHealthy: Object.values(health.adapters).filter(a => a.status === 'healthy').length,
        totalSecrets: stats.totalSecrets,
        cacheHitRate: stats.cacheStats?.hitRate || 0
      }
    }
  } catch (error) {
    request.log.error('Secrets health check failed:', error)
    throw error
  }
}

/**
 * Utility: Generate secure API key
 */
function generateSecureApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `sk_${result}`
}

/**
 * Example middleware: Ensure required secrets are available
 */
export async function requireSecretsMiddleware(
  requiredSecrets: Array<{ key: string; namespace?: string }>,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const missingSecrets = []
    
    for (const { key, namespace } of requiredSecrets) {
      const exists = await request.server.secretExists(key, namespace)
      if (!exists) {
        missingSecrets.push(`${namespace ? `${namespace}:` : ''}${key}`)
      }
    }
    
    if (missingSecrets.length > 0) {
      return reply.code(500).send({
        error: 'Required secrets not configured',
        missingSecrets
      })
    }
  } catch (error) {
    request.log.error('Secret validation failed:', error)
    return reply.code(500).send({
      error: 'Failed to validate required secrets'
    })
  }
}