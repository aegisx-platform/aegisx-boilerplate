import { EventBus, EventHandler, PublishOptions, HealthStatus, EventBusStats } from '../interfaces'

export abstract class BaseEventBusAdapter implements EventBus {
  protected handlers = new Map<string, Set<EventHandler>>()
  protected stats = {
    publishedCount: 0,
    consumedCount: 0,
    errorCount: 0,
    startTime: Date.now()
  }
  protected isInitialized = false

  abstract getType(): string
  abstract initialize(): Promise<void>
  abstract cleanup(): Promise<void>
  abstract health(): Promise<HealthStatus>

  async publish(eventName: string, data: any, options?: PublishOptions): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(`Event bus adapter ${this.getType()} is not initialized`)
    }

    try {
      await this.doPublish(eventName, data, options)
      this.stats.publishedCount++
    } catch (error) {
      this.stats.errorCount++
      throw error
    }
  }

  async subscribe(eventName: string, handler: EventHandler): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(`Event bus adapter ${this.getType()} is not initialized`)
    }

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set())
    }

    this.handlers.get(eventName)!.add(handler)
    await this.doSubscribe(eventName, handler)
  }

  async unsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(`Event bus adapter ${this.getType()} is not initialized`)
    }

    if (handler) {
      this.handlers.get(eventName)?.delete(handler)
      if (this.handlers.get(eventName)?.size === 0) {
        this.handlers.delete(eventName)
      }
    } else {
      this.handlers.delete(eventName)
    }

    await this.doUnsubscribe(eventName, handler)
  }

  getStats(): EventBusStats {
    return {
      adapter: this.getType(),
      publishedCount: this.stats.publishedCount,
      consumedCount: this.stats.consumedCount,
      errorCount: this.stats.errorCount,
      activeSubscriptions: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.size, 0),
      uptime: Date.now() - this.stats.startTime
    }
  }

  protected async executeHandlers(eventName: string, data: any, metadata: any): Promise<void> {
    const handlers = this.handlers.get(eventName)
    if (!handlers || handlers.size === 0) {
      return
    }

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data, metadata)
        this.stats.consumedCount++
      } catch (error) {
        this.stats.errorCount++
        console.error(`Error executing handler for event ${eventName}:`, error)
        // In production, you might want to send this to a dead letter queue
        throw error
      }
    })

    await Promise.allSettled(promises)
  }

  protected abstract doPublish(eventName: string, data: any, options?: PublishOptions): Promise<void>
  protected abstract doSubscribe(eventName: string, handler: EventHandler): Promise<void>
  protected abstract doUnsubscribe(eventName: string, handler?: EventHandler): Promise<void>
}