import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export interface APMConfig {
  enabled: boolean
  serviceName: string
  serviceVersion: string
  environment: string
  metricsPort: number
}

export class APMIntegration {
  private sdk: NodeSDK | null = null
  private config: APMConfig

  constructor(config: APMConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('APM Integration disabled')
      return
    }

    try {
      // Initialize OpenTelemetry SDK first (without metrics for now)
      this.sdk = new NodeSDK({
        instrumentations: [getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false
          }
        })]
      })

      this.sdk.start()
      console.log(`APM Integration initialized successfully - Tracing enabled`)
      
      // Note: Prometheus metrics can be added later when needed
      console.log(`For Prometheus metrics, install additional packages and configure metric readers`)
    } catch (error) {
      console.error('Failed to initialize APM Integration:', error)
      // Don't throw error, just disable APM
      this.config.enabled = false
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown()
      console.log('APM Integration shutdown completed')
    }
  }

  getMetricsEndpoint(): string {
    return `APM tracing enabled - Prometheus metrics require additional configuration`
  }

  isEnabled(): boolean {
    return this.config.enabled && this.sdk !== null
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    apm: APMIntegration
  }
}

async function apmPlugin(fastify: FastifyInstance): Promise<void> {
  const config = fastify.config as any

  const apmConfig: APMConfig = {
    enabled: config.APM_ENABLED === 'true',
    serviceName: config.APM_SERVICE_NAME || 'aegisx-api',
    serviceVersion: config.APM_SERVICE_VERSION || '1.0.0',
    environment: config.NODE_ENV || 'development',
    metricsPort: parseInt(config.APM_METRICS_PORT || '9090', 10)
  }

  const apm = new APMIntegration(apmConfig)
  
  if (apmConfig.enabled) {
    await apm.initialize()
  }

  fastify.decorate('apm', apm)

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await apm.shutdown()
  })

  // Health check integration
  fastify.addHook('onReady', async () => {
    if (apm.isEnabled()) {
      fastify.log.info(`APM Integration ready - Metrics available at ${apm.getMetricsEndpoint()}`)
    }
  })
}

export default fp(apmPlugin, {
  name: 'apm-integration',
  dependencies: ['env-plugin']
})