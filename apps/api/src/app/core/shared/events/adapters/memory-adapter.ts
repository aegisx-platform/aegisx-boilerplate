import { EventHandler, PublishOptions, HealthStatus } from '../interfaces'
import { BaseEventBusAdapter } from './base-adapter'
import { EventFactory } from '../utils'

export class MemoryEventBusAdapter extends BaseEventBusAdapter {
  private eventQueue: Array<{ eventName: string; data: any; options?: PublishOptions }> = []
  private isProcessing = false

  getType(): string {
    return 'memory'
  }

  async initialize(): Promise<void> {
    this.isInitialized = true
    this.startEventProcessing()
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false
    this.eventQueue = []
    this.handlers.clear()
  }

  async health(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      adapter: this.getType(),
      uptime: Date.now() - this.stats.startTime,
      lastCheck: new Date(),
      details: {
        queueSize: this.eventQueue.length,
        isProcessing: this.isProcessing,
        totalHandlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.size, 0)
      }
    }
  }

  protected async doPublish(eventName: string, data: any, options?: PublishOptions): Promise<void> {
    if (options?.delay && options.delay > 0) {
      // Handle delayed events
      setTimeout(() => {
        this.eventQueue.push({ eventName, data, options })
      }, options.delay)
    } else {
      this.eventQueue.push({ eventName, data, options })
    }
  }

  protected async doSubscribe(eventName: string, handler: EventHandler): Promise<void> {
    // Memory adapter doesn't need additional subscription logic
    // All handling is done in the base class
  }

  protected async doUnsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    // Memory adapter doesn't need additional unsubscription logic
    // All handling is done in the base class
  }

  private startEventProcessing(): void {
    if (this.isProcessing) return

    this.isProcessing = true
    this.processEvents()
  }

  private async processEvents(): Promise<void> {
    while (this.isInitialized) {
      if (this.eventQueue.length === 0) {
        await this.sleep(10) // Wait 10ms before checking again
        continue
      }

      const event = this.eventQueue.shift()
      if (!event) continue

      try {
        // Check TTL
        if (event.options?.ttl) {
          const eventAge = Date.now() - this.stats.startTime
          if (eventAge > event.options.ttl) {
            console.warn(`Event ${event.eventName} expired (TTL: ${event.options.ttl}ms)`)
            continue
          }
        }

        const metadata = {
          eventId: EventFactory.generateEventId(),
          timestamp: new Date(),
          source: 'memory-adapter',
          correlationId: EventFactory.generateCorrelationId()
        }

        await this.executeHandlers(event.eventName, event.data, metadata)
      } catch (error) {
        console.error(`Error processing event ${event.eventName}:`, error)
        
        // Retry logic
        if (event.options?.retryAttempts && event.options.retryAttempts > 0) {
          const retryEvent = {
            ...event,
            options: {
              ...event.options,
              retryAttempts: event.options.retryAttempts - 1
            }
          }
          
          // Add delay for retry
          setTimeout(() => {
            this.eventQueue.push(retryEvent)
          }, 1000) // 1 second retry delay
        }
      }
    }

    this.isProcessing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}