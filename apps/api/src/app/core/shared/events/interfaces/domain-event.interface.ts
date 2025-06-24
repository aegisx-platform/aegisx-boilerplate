export interface DomainEventMetadata {
  // Tracing
  correlationId: string    // Request correlation ID
  causationId?: string     // Event that caused this event
  
  // Source Information
  source: string           // Service/domain that published
  sourceVersion?: string   // Source service version
  userId?: string          // User who triggered the event
  
  // Processing
  publishedAt: Date        // When event was published
  retryCount?: number      // Number of retries
  
  // Custom metadata
  [key: string]: any
}

export interface DomainEvent {
  // Event Identity
  eventId: string          // UUID v4
  eventType: string        // e.g., "user.created", "order.completed"
  eventVersion: string     // Event schema version (e.g., "1.0.0")
  
  // Event Context
  aggregateId: string      // Entity ID that generated the event
  aggregateType: string    // Entity type (e.g., "User", "Order")
  
  // Event Timing
  timestamp: Date          // Event occurrence time
  
  // Event Data
  data: Record<string, any>  // Actual event payload
  
  // Event Metadata
  metadata: DomainEventMetadata
}

export interface EventEnvelope {
  // Transport metadata
  messageId: string        // Transport-specific ID
  routingKey: string       // Routing information
  contentType: string      // "application/json"
  encoding: string         // "utf-8"
  
  // Delivery options
  priority: number         // Message priority (0-255)
  expiration?: number      // TTL in milliseconds
  persistent: boolean      // Persist to disk
  
  // Headers for transport
  headers: Record<string, any>
  
  // Actual event
  payload: DomainEvent
}

// Specific event types for type safety
export interface UserCreatedEvent extends DomainEvent {
  eventType: "user.created"
  aggregateType: "User"
  data: {
    email: string
    firstName: string
    lastName: string
    role: string
    createdAt: Date
  }
}

export interface UserUpdatedEvent extends DomainEvent {
  eventType: "user.updated"
  aggregateType: "User"
  data: {
    changes: Record<string, { old: any, new: any }>
    updatedAt: Date
  }
}

export interface SystemEvent extends DomainEvent {
  eventType: "system.maintenance" | "system.alert" | "system.health"
  aggregateType: "System"
  data: {
    level: "info" | "warning" | "error" | "critical"
    message: string
    details?: Record<string, any>
  }
}

// Domain event type registry for type safety
export type DomainEventMap = {
  "user.created": UserCreatedEvent
  "user.updated": UserUpdatedEvent
  "system.health": SystemEvent
  "system.alert": SystemEvent
  "system.maintenance": SystemEvent
}