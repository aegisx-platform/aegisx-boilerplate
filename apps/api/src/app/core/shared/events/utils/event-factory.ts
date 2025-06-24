import { DomainEvent, DomainEventMetadata } from '../interfaces'
import { v4 as uuidv4 } from 'uuid'

export interface CreateEventOptions {
  correlationId?: string
  causationId?: string
  userId?: string
  version?: string
  source?: string
}

export class EventFactory {
  static createDomainEvent<T = any>(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    data: T,
    options: CreateEventOptions = {}
  ): DomainEvent {
    const now = new Date()
    
    return {
      eventId: uuidv4(),
      eventType,
      eventVersion: options.version || "1.0.0",
      aggregateId,
      aggregateType,
      timestamp: now,
      data: data as Record<string, any>,
      metadata: {
        correlationId: options.correlationId || this.generateCorrelationId(),
        causationId: options.causationId,
        source: options.source || process.env.SERVICE_NAME || "unknown",
        sourceVersion: process.env.SERVICE_VERSION,
        userId: options.userId,
        publishedAt: now,
        retryCount: 0
      }
    }
  }

  static generateCorrelationId(): string {
    return `corr-${uuidv4()}`
  }

  static generateEventId(): string {
    return uuidv4()
  }
}

export class EventBuilder {
  private event: Partial<DomainEvent> = {}
  private eventMetadata: Partial<DomainEventMetadata> = {}

  eventType(type: string): this {
    this.event.eventType = type
    return this
  }

  aggregate(id: string, type: string): this {
    this.event.aggregateId = id
    this.event.aggregateType = type
    return this
  }

  data(data: any): this {
    this.event.data = data
    return this
  }

  version(version: string): this {
    this.event.eventVersion = version
    return this
  }

  correlationId(id: string): this {
    this.eventMetadata.correlationId = id
    return this
  }

  causationId(id: string): this {
    this.eventMetadata.causationId = id
    return this
  }

  source(source: string): this {
    this.eventMetadata.source = source
    return this
  }

  userId(userId: string): this {
    this.eventMetadata.userId = userId
    return this
  }

  build(): DomainEvent {
    if (!this.event.eventType) {
      throw new Error('Event type is required')
    }
    if (!this.event.aggregateId) {
      throw new Error('Aggregate ID is required')
    }
    if (!this.event.aggregateType) {
      throw new Error('Aggregate type is required')
    }
    if (!this.event.data) {
      throw new Error('Event data is required')
    }

    const now = new Date()

    return {
      eventId: EventFactory.generateEventId(),
      eventVersion: this.event.eventVersion || "1.0.0",
      timestamp: now,
      metadata: {
        correlationId: this.eventMetadata.correlationId || EventFactory.generateCorrelationId(),
        source: this.eventMetadata.source || process.env.SERVICE_NAME || "unknown",
        sourceVersion: process.env.SERVICE_VERSION,
        publishedAt: now,
        retryCount: 0,
        ...this.eventMetadata
      },
      ...this.event
    } as DomainEvent
  }
}