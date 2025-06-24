/**
 * Event Bus Usage Examples
 * 
 * This file demonstrates how to use the Event Bus system in various scenarios
 */

import { FastifyInstance } from 'fastify'
import { EventFactory, EventBuilder } from '../'

// Basic usage examples
export class EventBusExamples {
  
  /**
   * Example 1: Publishing a simple event
   */
  static async basicPublish(fastify: FastifyInstance): Promise<void> {
    // Simple event publishing
    await fastify.eventBus.publish('user.login', {
      userId: '123',
      timestamp: new Date(),
      ipAddress: '192.168.1.1'
    })
  }

  /**
   * Example 2: Publishing with options
   */
  static async publishWithOptions(fastify: FastifyInstance): Promise<void> {
    // Publishing with delivery options
    await fastify.eventBus.publish('order.created', {
      orderId: 'order-456',
      customerId: 'customer-789',
      amount: 99.99
    }, {
      persistent: true,     // Persist in RabbitMQ
      priority: 5,          // High priority
      ttl: 300000,         // 5 minutes TTL
      retryAttempts: 3     // Retry up to 3 times
    })
  }

  /**
   * Example 3: Using Event Factory
   */
  static async usingEventFactory(fastify: FastifyInstance): Promise<void> {
    // Create a structured domain event
    const userCreatedEvent = EventFactory.createDomainEvent(
      'user.created',
      'user-123',
      'User',
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient'
      },
      {
        correlationId: 'req-456',
        userId: 'admin-789'
      }
    )

    // Publish the domain event
    await fastify.eventBus.publish(userCreatedEvent.eventType, userCreatedEvent.data)
  }

  /**
   * Example 4: Using Event Builder
   */
  static async usingEventBuilder(fastify: FastifyInstance): Promise<void> {
    // Build an event step by step
    const appointmentEvent = new EventBuilder()
      .eventType('appointment.scheduled')
      .aggregate('appointment-123', 'Appointment')
      .data({
        patientId: 'patient-456',
        doctorId: 'doctor-789',
        scheduledAt: new Date(),
        duration: 30 // minutes
      })
      .correlationId('req-999')
      .userId('patient-456')
      .build()

    await fastify.eventBus.publish(appointmentEvent.eventType, appointmentEvent.data)
  }

  /**
   * Example 5: Subscribing to events
   */
  static async subscribeToEvents(fastify: FastifyInstance): Promise<void> {
    // Subscribe to user creation events
    await fastify.eventBus.subscribe('user.created', async (data, metadata) => {
      fastify.log.info(`New user created: ${data.email}`, {
        eventId: metadata.eventId,
        correlationId: metadata.correlationId
      })

      // Send welcome email
      await sendWelcomeEmail(data.email, data.firstName)
    })

    // Subscribe to system alerts
    await fastify.eventBus.subscribe('system.alert', async (data, metadata) => {
      if (data.level === 'critical') {
        // Send immediate notification
        await sendCriticalAlert(data.message)
      }
    })
  }

  /**
   * Example 6: Event-driven workflow
   */
  static async eventDrivenWorkflow(fastify: FastifyInstance): Promise<void> {
    // Step 1: User registers
    await fastify.eventBus.subscribe('user.registered', async (data, metadata) => {
      // Create user profile
      const profileId = await createUserProfile(data.userId)
      
      // Publish profile created event
      await fastify.eventBus.publish('profile.created', {
        userId: data.userId,
        profileId,
        createdAt: new Date()
      })
    })

    // Step 2: Profile created
    await fastify.eventBus.subscribe('profile.created', async (data, metadata) => {
      // Setup default preferences
      await setupDefaultPreferences(data.userId)
      
      // Send welcome email
      await fastify.eventBus.publish('email.send', {
        to: data.email,
        template: 'welcome',
        data: { userId: data.userId }
      })
    })

    // Step 3: Email sent
    await fastify.eventBus.subscribe('email.sent', async (data, metadata) => {
      // Log email activity
      await logEmailActivity(data.to, data.template, 'sent')
    })
  }

  /**
   * Example 7: Error handling and retry
   */
  static async errorHandlingExample(fastify: FastifyInstance): Promise<void> {
    await fastify.eventBus.subscribe('payment.process', async (data, metadata) => {
      try {
        // Process payment (might fail)
        const result = await processPayment(data.orderId, data.amount)
        
        // Publish success event
        await fastify.eventBus.publish('payment.completed', {
          orderId: data.orderId,
          paymentId: result.paymentId,
          amount: data.amount
        })
      } catch (error) {
        // Publish failure event
        await fastify.eventBus.publish('payment.failed', {
          orderId: data.orderId,
          amount: data.amount,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: metadata.retryCount || 0
        })
        
        // Re-throw for retry middleware
        throw error
      }
    })
  }

  /**
   * Example 8: Monitoring and health checks
   */
  static async monitoringExample(fastify: FastifyInstance): Promise<void> {
    // Get event bus health
    const health = await fastify.eventBus.health()
    console.log('Event Bus Health:', health)

    // Get statistics
    const stats = fastify.eventBus.getStats()
    console.log('Event Bus Stats:', stats)

    // Get middleware metrics (if enabled)
    const metrics = fastify.eventBus.getMiddlewareMetrics()
    if (metrics) {
      console.log('Event Processing Metrics:', {
        totalEvents: metrics.totalEvents,
        successRate: `${((metrics.successfulEvents / metrics.totalEvents) * 100).toFixed(2)}%`,
        averageResponseTime: `${metrics.averageDuration.toFixed(2)}ms`,
        errorCount: metrics.failedEvents
      })
    }
  }

  /**
   * Example 9: Delayed events
   */
  static async delayedEvents(fastify: FastifyInstance): Promise<void> {
    // Schedule a reminder for 1 hour later
    await fastify.eventBus.publish('appointment.reminder', {
      appointmentId: 'apt-123',
      patientId: 'patient-456',
      reminderType: 'one_hour_before'
    }, {
      delay: 60 * 60 * 1000 // 1 hour in milliseconds
    })

    // Schedule password reset expiry
    await fastify.eventBus.publish('password.reset.expire', {
      userId: 'user-123',
      resetToken: 'token-456'
    }, {
      delay: 15 * 60 * 1000, // 15 minutes
      ttl: 16 * 60 * 1000    // Expire after 16 minutes total
    })
  }

  /**
   * Example 10: Cross-service communication
   */
  static async crossServiceCommunication(fastify: FastifyInstance): Promise<void> {
    // Publish events for other services
    await fastify.eventBus.publish('user.data.sync', {
      userId: 'user-123',
      changes: ['email', 'firstName'],
      timestamp: new Date()
    }, {
      persistent: true, // Ensure delivery
      priority: 3      // Medium priority
    })

    // Cache invalidation across services
    await fastify.eventBus.publish('cache.invalidate', {
      keys: ['user:123', 'user:123:profile'],
      reason: 'user_data_updated'
    })
  }
}

// Helper functions (would be implemented in your services)
async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  console.log(`Sending welcome email to ${email} for ${firstName}`)
}

async function sendCriticalAlert(message: string): Promise<void> {
  console.log(`CRITICAL ALERT: ${message}`)
}

async function createUserProfile(userId: string): Promise<string> {
  console.log(`Creating profile for user ${userId}`)
  return `profile-${userId}`
}

async function setupDefaultPreferences(userId: string): Promise<void> {
  console.log(`Setting up default preferences for user ${userId}`)
}

async function logEmailActivity(to: string, template: string, status: string): Promise<void> {
  console.log(`Email activity: ${to} - ${template} - ${status}`)
}

async function processPayment(orderId: string, amount: number): Promise<{ paymentId: string }> {
  console.log(`Processing payment for order ${orderId}: $${amount}`)
  return { paymentId: `payment-${orderId}` }
}