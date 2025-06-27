/**
 * Circuit Breaker Factory
 * 
 * Factory service for creating pre-configured circuit breakers
 * for different environments and use cases
 */

import {
  ICircuitBreaker,
  ICircuitBreakerManager,
  CircuitBreakerConfig,
  CircuitBreakerManagerConfig,
  DefaultCircuitBreakerConfig,
  HealthcareCircuitBreakerConfig,
  ProductionCircuitBreakerConfig
} from '../types/circuit-breaker.types'
import { CircuitBreakerManager } from './circuit-breaker.manager'

export class CircuitBreakerFactory {
  /**
   * Create circuit breaker manager with default configuration
   */
  static createManager(config: Partial<CircuitBreakerManagerConfig> = {}): ICircuitBreakerManager {
    return new CircuitBreakerManager(config)
  }

  /**
   * Create circuit breaker manager for development environment
   */
  static createForDevelopment(): ICircuitBreakerManager {
    const config: Partial<CircuitBreakerManagerConfig> = {
      defaultConfig: {
        ...DefaultCircuitBreakerConfig,
        failureThreshold: 3,
        timeout: 5000,
        resetTimeout: 30000,
        enableMetrics: true,
        metricsInterval: 30000
      },
      maxBreakers: 50,
      enableGlobalMetrics: true,
      healthCheckInterval: 15000,
      metricsInterval: 30000,
      persistMetrics: false
    }

    return new CircuitBreakerManager(config)
  }

  /**
   * Create circuit breaker manager for testing environment
   */
  static createForTesting(): ICircuitBreakerManager {
    const config: Partial<CircuitBreakerManagerConfig> = {
      defaultConfig: {
        ...DefaultCircuitBreakerConfig,
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
        resetTimeout: 5000,
        monitoringPeriod: 10000,
        volumeThreshold: 3,
        enableMetrics: false
      },
      maxBreakers: 20,
      enableGlobalMetrics: false,
      healthCheckInterval: 5000,
      metricsInterval: 10000,
      persistMetrics: false
    }

    return new CircuitBreakerManager(config)
  }

  /**
   * Create circuit breaker manager for production environment
   */
  static createForProduction(options: ProductionOptions = {}): ICircuitBreakerManager {
    const config: Partial<CircuitBreakerManagerConfig> = {
      defaultConfig: {
        ...ProductionCircuitBreakerConfig,
        enableMetrics: true,
        metricsInterval: options.metricsInterval || 60000
      },
      maxBreakers: options.maxBreakers || 200,
      globalTimeout: options.globalTimeout || 60000,
      enableGlobalMetrics: true,
      healthCheckInterval: options.healthCheckInterval || 30000,
      metricsInterval: options.metricsInterval || 60000,
      cleanupInterval: options.cleanupInterval || 300000,
      persistMetrics: options.persistMetrics || true,
      metricsRetention: options.metricsRetention || 604800000 // 7 days
    }

    return new CircuitBreakerManager(config)
  }

  /**
   * Create circuit breaker manager for healthcare applications
   */
  static createForHealthcare(options: HealthcareOptions = {}): ICircuitBreakerManager {
    const config: Partial<CircuitBreakerManagerConfig> = {
      defaultConfig: {
        ...HealthcareCircuitBreakerConfig,
        metricsInterval: options.metricsInterval || 30000
      },
      maxBreakers: options.maxBreakers || 100,
      enableGlobalMetrics: true,
      healthCheckInterval: options.healthCheckInterval || 15000,
      metricsInterval: options.metricsInterval || 30000,
      persistMetrics: true,
      metricsRetention: 2592000000, // 30 days for healthcare
      healthcare: {
        enableAuditTrail: true,
        emergencyBypassCode: options.emergencyBypassCode,
        patientSafetyChecks: true,
        facilityIsolation: options.facilityIsolation || false
      }
    }

    return new CircuitBreakerManager(config)
  }

  /**
   * Create circuit breaker manager from environment variables
   */
  static createFromEnvironment(): ICircuitBreakerManager {
    const env = process.env

    const defaultConfig: CircuitBreakerConfig = {
      ...DefaultCircuitBreakerConfig,
      failureThreshold: parseInt(env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
      successThreshold: parseInt(env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '3'),
      timeout: parseInt(env.CIRCUIT_BREAKER_TIMEOUT || '10000'),
      resetTimeout: parseInt(env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'),
      monitoringPeriod: parseInt(env.CIRCUIT_BREAKER_MONITORING_PERIOD || '300000'),
      volumeThreshold: parseInt(env.CIRCUIT_BREAKER_VOLUME_THRESHOLD || '10'),
      errorPercentageThreshold: parseInt(env.CIRCUIT_BREAKER_ERROR_PERCENTAGE || '50'),
      slowCallDurationThreshold: parseInt(env.CIRCUIT_BREAKER_SLOW_CALL_THRESHOLD || '5000'),
      slowCallRateThreshold: parseInt(env.CIRCUIT_BREAKER_SLOW_CALL_RATE || '30'),
      exponentialBackoff: env.CIRCUIT_BREAKER_EXPONENTIAL_BACKOFF === 'true',
      maxResetTimeout: parseInt(env.CIRCUIT_BREAKER_MAX_RESET_TIMEOUT || '300000'),
      backoffMultiplier: parseFloat(env.CIRCUIT_BREAKER_BACKOFF_MULTIPLIER || '2'),
      enableMetrics: env.CIRCUIT_BREAKER_ENABLE_METRICS !== 'false',
      metricsWindowSize: parseInt(env.CIRCUIT_BREAKER_METRICS_WINDOW_SIZE || '100'),
      metricsInterval: parseInt(env.CIRCUIT_BREAKER_METRICS_INTERVAL || '60000')
    }

    const managerConfig: Partial<CircuitBreakerManagerConfig> = {
      defaultConfig,
      maxBreakers: parseInt(env.CIRCUIT_BREAKER_MAX_BREAKERS || '100'),
      globalTimeout: parseInt(env.CIRCUIT_BREAKER_GLOBAL_TIMEOUT || '60000'),
      enableGlobalMetrics: env.CIRCUIT_BREAKER_GLOBAL_METRICS !== 'false',
      healthCheckInterval: parseInt(env.CIRCUIT_BREAKER_HEALTH_CHECK_INTERVAL || '30000'),
      metricsInterval: parseInt(env.CIRCUIT_BREAKER_METRICS_INTERVAL || '60000'),
      cleanupInterval: parseInt(env.CIRCUIT_BREAKER_CLEANUP_INTERVAL || '300000'),
      persistMetrics: env.CIRCUIT_BREAKER_PERSIST_METRICS === 'true',
      metricsRetention: parseInt(env.CIRCUIT_BREAKER_METRICS_RETENTION || '86400000')
    }

    // Healthcare configuration
    if (env.CIRCUIT_BREAKER_HEALTHCARE_MODE === 'true') {
      managerConfig.healthcare = {
        enableAuditTrail: env.CIRCUIT_BREAKER_HEALTHCARE_AUDIT === 'true',
        emergencyBypassCode: env.CIRCUIT_BREAKER_EMERGENCY_CODE,
        patientSafetyChecks: env.CIRCUIT_BREAKER_PATIENT_SAFETY === 'true',
        facilityIsolation: env.CIRCUIT_BREAKER_FACILITY_ISOLATION === 'true'
      }
    }

    return new CircuitBreakerManager(managerConfig)
  }

  // Pre-configured circuit breaker creation methods

  /**
   * Create database circuit breaker
   */
  static createDatabaseBreaker(manager: ICircuitBreakerManager, name = 'database'): ICircuitBreaker {
    return manager.createFromTemplate(name, 'DATABASE')
  }

  /**
   * Create API call circuit breaker
   */
  static createApiBreaker(manager: ICircuitBreakerManager, name = 'api'): ICircuitBreaker {
    return manager.createFromTemplate(name, 'API_CALL')
  }

  /**
   * Create healthcare critical operations circuit breaker
   */
  static createHealthcareCriticalBreaker(
    manager: ICircuitBreakerManager, 
    name = 'healthcare-critical'
  ): ICircuitBreaker {
    return manager.createFromTemplate(name, 'HEALTHCARE_CRITICAL')
  }

  /**
   * Create payment processing circuit breaker
   */
  static createPaymentBreaker(manager: ICircuitBreakerManager, name = 'payment'): ICircuitBreaker {
    return manager.createFromTemplate(name, 'PAYMENT')
  }

  /**
   * Create notification service circuit breaker
   */
  static createNotificationBreaker(
    manager: ICircuitBreakerManager, 
    name = 'notification'
  ): ICircuitBreaker {
    return manager.createFromTemplate(name, 'NOTIFICATION')
  }

  // Specialized healthcare methods

  /**
   * Create patient data access circuit breaker
   */
  static createPatientDataBreaker(
    manager: ICircuitBreakerManager, 
    facilityId?: string
  ): ICircuitBreaker {
    const name = facilityId ? `patient-data-${facilityId}` : 'patient-data'
    
    const config: Partial<CircuitBreakerConfig> = {
      ...HealthcareCircuitBreakerConfig,
      healthcare: {
        patientSafetyMode: true,
        emergencyBypass: true,
        auditFailures: true
      }
    }

    return manager.create(name, config)
  }

  /**
   * Create medical device integration circuit breaker
   */
  static createMedicalDeviceBreaker(
    manager: ICircuitBreakerManager,
    deviceType: string
  ): ICircuitBreaker {
    const name = `medical-device-${deviceType}`
    
    const config: Partial<CircuitBreakerConfig> = {
      ...HealthcareCircuitBreakerConfig,
      failureThreshold: 2, // More sensitive for medical devices
      timeout: 15000,      // Shorter timeout for real-time data
      healthcare: {
        patientSafetyMode: true,
        emergencyBypass: false, // No bypass for critical medical data
        auditFailures: true
      }
    }

    return manager.create(name, config)
  }

  /**
   * Create laboratory integration circuit breaker
   */
  static createLabIntegrationBreaker(
    manager: ICircuitBreakerManager,
    labName: string
  ): ICircuitBreaker {
    const name = `lab-integration-${labName}`
    
    const config: Partial<CircuitBreakerConfig> = {
      ...HealthcareCircuitBreakerConfig,
      timeout: 60000,      // Longer timeout for lab results
      resetTimeout: 180000, // Longer reset for lab systems
      healthcare: {
        patientSafetyMode: true,
        emergencyBypass: true,
        auditFailures: true
      }
    }

    return manager.create(name, config)
  }

  // Environment-specific presets

  /**
   * Create standard enterprise circuit breakers
   */
  static createEnterpriseBreakers(manager: ICircuitBreakerManager): void {
    // Database operations
    this.createDatabaseBreaker(manager, 'database-read')
    this.createDatabaseBreaker(manager, 'database-write')
    
    // External APIs
    this.createApiBreaker(manager, 'external-api')
    this.createApiBreaker(manager, 'auth-service')
    
    // Notifications
    this.createNotificationBreaker(manager, 'email-service')
    this.createNotificationBreaker(manager, 'sms-service')
    
    // Payment processing (if applicable)
    this.createPaymentBreaker(manager, 'payment-gateway')
  }

  /**
   * Create healthcare-specific circuit breakers
   */
  static createHealthcareBreakers(manager: ICircuitBreakerManager): void {
    // Patient data access
    this.createPatientDataBreaker(manager)
    
    // Healthcare critical operations
    this.createHealthcareCriticalBreaker(manager, 'patient-records')
    this.createHealthcareCriticalBreaker(manager, 'medication-orders')
    this.createHealthcareCriticalBreaker(manager, 'lab-results')
    
    // Medical device integrations
    this.createMedicalDeviceBreaker(manager, 'vital-signs-monitor')
    this.createMedicalDeviceBreaker(manager, 'imaging-system')
    
    // Laboratory integrations
    this.createLabIntegrationBreaker(manager, 'main-lab')
    this.createLabIntegrationBreaker(manager, 'pathology-lab')
    
    // External healthcare systems
    this.createApiBreaker(manager, 'ehr-integration')
    this.createApiBreaker(manager, 'insurance-verification')
    this.createApiBreaker(manager, 'pharmacy-system')
    
    // Emergency systems
    manager.create('emergency-alerts', {
      ...HealthcareCircuitBreakerConfig,
      failureThreshold: 1,  // Very sensitive
      timeout: 5000,        // Quick timeout
      healthcare: {
        patientSafetyMode: true,
        emergencyBypass: false, // Never bypass emergency systems
        auditFailures: true
      }
    })
  }

  /**
   * Create microservices circuit breakers
   */
  static createMicroservicesBreakers(
    manager: ICircuitBreakerManager,
    services: string[]
  ): void {
    services.forEach(service => {
      const config: Partial<CircuitBreakerConfig> = {
        ...DefaultCircuitBreakerConfig,
        timeout: 15000,
        resetTimeout: 60000,
        failureThreshold: 5,
        successThreshold: 3
      }
      
      manager.create(`service-${service}`, config)
    })
  }

  /**
   * Validate circuit breaker configuration
   */
  static validateConfig(config: CircuitBreakerConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.failureThreshold <= 0) {
      errors.push('failureThreshold must be greater than 0')
    }

    if (config.successThreshold <= 0) {
      errors.push('successThreshold must be greater than 0')
    }

    if (config.timeout <= 0) {
      errors.push('timeout must be greater than 0')
    }

    if (config.resetTimeout <= 0) {
      errors.push('resetTimeout must be greater than 0')
    }

    if (config.monitoringPeriod <= 0) {
      errors.push('monitoringPeriod must be greater than 0')
    }

    if (config.volumeThreshold < 0) {
      errors.push('volumeThreshold must be 0 or greater')
    }

    if (config.errorPercentageThreshold < 0 || config.errorPercentageThreshold > 100) {
      errors.push('errorPercentageThreshold must be between 0 and 100')
    }

    if (config.slowCallRateThreshold < 0 || config.slowCallRateThreshold > 100) {
      errors.push('slowCallRateThreshold must be between 0 and 100')
    }

    if (config.backoffMultiplier <= 1) {
      errors.push('backoffMultiplier must be greater than 1')
    }

    if (config.maxResetTimeout < config.resetTimeout) {
      errors.push('maxResetTimeout must be greater than or equal to resetTimeout')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Supporting types
export interface ProductionOptions {
  maxBreakers?: number
  globalTimeout?: number
  healthCheckInterval?: number
  metricsInterval?: number
  cleanupInterval?: number
  persistMetrics?: boolean
  metricsRetention?: number
}

export interface HealthcareOptions {
  maxBreakers?: number
  healthCheckInterval?: number
  metricsInterval?: number
  emergencyBypassCode?: string
  facilityIsolation?: boolean
}

// Pre-configured manager instances
export const CircuitBreakerManagers = {
  /**
   * Development manager with relaxed settings
   */
  development: () => CircuitBreakerFactory.createForDevelopment(),

  /**
   * Testing manager with fast timeouts
   */
  testing: () => CircuitBreakerFactory.createForTesting(),

  /**
   * Production manager with robust settings
   */
  production: (options?: ProductionOptions) => CircuitBreakerFactory.createForProduction(options),

  /**
   * Healthcare manager with compliance features
   */
  healthcare: (options?: HealthcareOptions) => CircuitBreakerFactory.createForHealthcare(options),

  /**
   * Environment-based manager
   */
  fromEnv: () => CircuitBreakerFactory.createFromEnvironment()
}