import { FastifyInstance } from 'fastify'

/**
 * Authentication Event Subscribers
 * 
 * This module sets up event handlers for authentication-related events
 * to handle cross-cutting concerns like cache invalidation, security monitoring,
 * and user experience improvements.
 */

export async function setupAuthEventSubscribers(fastify: FastifyInstance): Promise<void> {
  
  // === Cache Management Subscribers ===
  
  /**
   * Invalidate user cache when profile is updated
   */
  await fastify.eventBus.subscribe('auth.profile.updated', async (data, metadata) => {
    try {
      // Invalidate user profile cache
      await fastify.redis.del(`user:${data.userId}:profile`)
      
      // If email changed, invalidate email-based lookups
      if (data.changes.email) {
        await fastify.redis.del(`user:email:${data.changes.email.old}`)
        await fastify.redis.del(`user:email:${data.changes.email.new}`)
      }
      
      fastify.log.debug('User cache invalidated after profile update', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to invalidate user cache after profile update', { 
        userId: data.userId, 
        error 
      })
    }
  })

  /**
   * Invalidate RBAC cache when user logs out (in case roles changed)
   */
  await fastify.eventBus.subscribe('auth.user.logout', async (data, metadata) => {
    try {
      // Clear RBAC cache to ensure fresh permissions on next login
      await fastify.redis.del(`rbac:user:${data.userId}:roles`)
      await fastify.redis.del(`rbac:user:${data.userId}:permissions`)
      
      fastify.log.debug('RBAC cache cleared after logout', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to clear RBAC cache after logout', { 
        userId: data.userId, 
        error 
      })
    }
  })

  // === Security Monitoring Subscribers ===

  /**
   * Track failed login attempts for security monitoring
   */
  await fastify.eventBus.subscribe('auth.user.login.failed', async (data, metadata) => {
    try {
      const key = `security:failed_logins:${data.identifier}`
      const attempts = await fastify.redis.incr(key)
      await fastify.redis.expire(key, 900) // 15 minutes
      
      if (attempts >= 5) {
        // Publish security alert for excessive failed logins
        await fastify.eventBus.publish('auth.security.alert', {
          alertType: 'multiple_failed_logins',
          severity: 'medium',
          details: {
            identifier: data.identifier,
            attempts,
            reason: data.reason,
            timeWindow: '15 minutes'
          },
          triggeredAt: new Date()
        })
      }
      
      fastify.log.info('Failed login attempt tracked', { 
        identifier: data.identifier, 
        attempts,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to track login attempt', { 
        identifier: data.identifier, 
        error 
      })
    }
  })

  /**
   * Clear failed login tracking on successful login
   */
  await fastify.eventBus.subscribe('auth.user.login', async (data, metadata) => {
    try {
      // Clear failed login attempts for this user
      await fastify.redis.del(`security:failed_logins:${data.email}`)
      if (data.username) {
        await fastify.redis.del(`security:failed_logins:${data.username}`)
      }
      
      fastify.log.debug('Failed login tracking cleared after successful login', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to clear login attempt tracking', { 
        userId: data.userId, 
        error 
      })
    }
  })

  /**
   * Log security events for audit trail
   */
  await fastify.eventBus.subscribe('auth.security.alert', async (data, metadata) => {
    try {
      fastify.log.warn('Security alert triggered', {
        alertType: data.alertType,
        severity: data.severity,
        details: data.details,
        correlationId: metadata.correlationId
      })
      
      // Could also send to external security monitoring systems here
      // await sendToSecurityMonitoring(data)
    } catch (error) {
      fastify.log.error('Failed to process security alert', { error })
    }
  })

  // === User Experience Subscribers ===

  /**
   * Send welcome email after user registration
   */
  await fastify.eventBus.subscribe('auth.user.registered', async (data, metadata) => {
    try {
      // Queue welcome email
      await fastify.eventBus.publish('email.send', {
        to: data.email,
        template: 'welcome',
        data: {
          name: data.name,
          userId: data.userId
        }
      })
      
      fastify.log.info('Welcome email queued for new user', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to queue welcome email', { 
        userId: data.userId, 
        error 
      })
    }
  })

  /**
   * Send password change notification
   */
  await fastify.eventBus.subscribe('auth.password.changed', async (data, metadata) => {
    try {
      // Send password change notification email
      await fastify.eventBus.publish('email.send', {
        to: data.email,
        template: 'password_changed',
        data: {
          userId: data.userId,
          changedAt: data.changedAt
        }
      })
      
      fastify.log.info('Password change notification sent', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to send password change notification', { 
        userId: data.userId, 
        error 
      })
    }
  })

  // === Analytics Subscribers ===

  /**
   * Track user login analytics
   */
  await fastify.eventBus.subscribe('auth.user.login', async (data, metadata) => {
    try {
      // Update login statistics
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      await fastify.redis.incr(`analytics:logins:${date}`)
      await fastify.redis.incr(`analytics:user:${data.userId}:logins`)
      
      // Track roles for analytics
      for (const role of data.roles) {
        await fastify.redis.incr(`analytics:role:${role}:logins:${date}`)
      }
      
      fastify.log.debug('Login analytics tracked', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to track login analytics', { 
        userId: data.userId, 
        error 
      })
    }
  })

  /**
   * Track user registration analytics
   */
  await fastify.eventBus.subscribe('auth.user.registered', async (data, metadata) => {
    try {
      const date = new Date().toISOString().split('T')[0]
      await fastify.redis.incr(`analytics:registrations:${date}`)
      
      fastify.log.debug('Registration analytics tracked', { 
        userId: data.userId,
        correlationId: metadata.correlationId 
      })
    } catch (error) {
      fastify.log.warn('Failed to track registration analytics', { 
        userId: data.userId, 
        error 
      })
    }
  })

  fastify.log.info('Authentication event subscribers set up successfully')
}