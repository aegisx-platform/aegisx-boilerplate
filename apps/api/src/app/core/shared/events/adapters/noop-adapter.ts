import { EventBus, PublishOptions, HealthStatus, EventBusStats, EventHandler } from '../interfaces/event-bus.interface';

/**
 * NoOp Event Bus Adapter
 * 
 * A no-operation implementation of the EventBus interface that does nothing.
 * Useful for disabling event processing without modifying application code.
 * Similar to how audit system can be disabled.
 */
export class NoOpAdapter implements EventBus {
  private _isHealthy = true;
  private _startTime = Date.now();
  private _stats = {
    adapter: 'noop' as const,
    publishedCount: 0,
    consumedCount: 0,
    errorCount: 0,
    activeSubscriptions: 0,
    uptime: 0
  };

  async initialize(): Promise<void> {
    // No-op: Do nothing
  }

  async publish(eventName: string, data: any, options?: PublishOptions): Promise<void> {
    // No-op: Silently drop events, but increment counter for stats
    this._stats.publishedCount++;
  }

  async subscribe(eventName: string, handler: EventHandler): Promise<void> {
    // No-op: Accept subscription but don't actually subscribe, increment counter
    this._stats.activeSubscriptions++;
  }

  async unsubscribe(eventName: string, handler?: EventHandler): Promise<void> {
    // No-op: Accept unsubscription, decrement counter if > 0
    if (this._stats.activeSubscriptions > 0) {
      this._stats.activeSubscriptions--;
    }
  }

  async health(): Promise<HealthStatus> {
    return {
      status: this._isHealthy ? 'healthy' : 'unhealthy',
      adapter: 'noop',
      uptime: Date.now() - this._startTime,
      lastCheck: new Date(),
      details: {
        message: 'Event bus is disabled (NoOp adapter)',
        eventsProcessed: 0,
        eventsDropped: this._stats.publishedCount,
        isProcessing: false,
        totalHandlers: this._stats.activeSubscriptions
      }
    };
  }

  getStats(): EventBusStats {
    return {
      ...this._stats,
      uptime: Date.now() - this._startTime
    };
  }

  getType(): string {
    return 'noop';
  }

  async cleanup(): Promise<void> {
    // No-op: Nothing to clean up
    this._isHealthy = false;
  }
}