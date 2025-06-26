/**
 * Background Jobs Factory
 * 
 * Factory for creating pre-configured job managers for different environments
 * and use cases with optimized settings
 */

import {
  IJobManager,
  BackgroundJobsConfig,
  QueueAdapterType,
  MemoryAdapterConfig,
  RedisAdapterConfig,
  DatabaseAdapterConfig,
  HealthcareJobsConfig
} from '../types/background-jobs.types'
import { BackgroundJobsService } from './background-jobs.service'

export class BackgroundJobsFactory {
  /**
   * Create job manager with default configuration
   */
  static create(config: Partial<BackgroundJobsConfig> = {}): IJobManager {
    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager for development environment
   */
  static createForDevelopment(): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: 'development',
      queues: {
        development: {
          adapter: {
            type: 'memory',
            options: {
              maxJobs: 1000,
              persistToDisk: true,
              storageFile: './dev-jobs.json'
            } as MemoryAdapterConfig
          },
          workers: 1,
          concurrency: 2
        }
      },
      settings: {
        maxConcurrency: 5,
        defaultJobTimeout: 60000, // 1 minute
        defaultJobTTL: 3600000, // 1 hour
        defaultMaxAttempts: 2,
        cleanupInterval: 300000, // 5 minutes
        stalledInterval: 10000, // 10 seconds
        maxStalledCount: 1
      },
      monitoring: {
        enabled: true,
        metricsInterval: 30000, // 30 seconds
        healthCheckInterval: 15000 // 15 seconds
      },
      healthcare: {
        auditJobs: false,
        encryptSensitiveData: false,
        retentionPeriod: 86400000, // 1 day
        complianceMode: false
      }
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager for testing environment
   */
  static createForTesting(): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: 'test',
      queues: {
        test: {
          adapter: {
            type: 'memory',
            options: {
              maxJobs: 100,
              persistToDisk: false
            } as MemoryAdapterConfig
          },
          workers: 1,
          concurrency: 1
        }
      },
      settings: {
        maxConcurrency: 2,
        defaultJobTimeout: 5000, // 5 seconds
        defaultJobTTL: 60000, // 1 minute
        defaultMaxAttempts: 1,
        cleanupInterval: 10000, // 10 seconds
        stalledInterval: 1000, // 1 second
        maxStalledCount: 1
      },
      monitoring: {
        enabled: false,
        metricsInterval: 0,
        healthCheckInterval: 0
      },
      healthcare: {
        auditJobs: false,
        encryptSensitiveData: false,
        retentionPeriod: 60000, // 1 minute
        complianceMode: false
      }
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager for production environment
   */
  static createForProduction(options: ProductionOptions = {}): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: 'production',
      queues: {
        production: {
          adapter: {
            type: options.adapterType || 'redis',
            options: options.adapterOptions || {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              db: parseInt(process.env.REDIS_JOBS_DB || '1'),
              keyPrefix: 'jobs:production:'
            }
          },
          workers: options.workers || 5,
          concurrency: options.concurrency || 10
        },
        'high-priority': {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'jobs:high-priority:'
            }
          },
          workers: 3,
          concurrency: 5
        },
        'low-priority': {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'jobs:low-priority:'
            }
          },
          workers: 2,
          concurrency: 3
        }
      },
      settings: {
        maxConcurrency: options.maxConcurrency || 20,
        defaultJobTimeout: 1800000, // 30 minutes
        defaultJobTTL: 2592000000, // 30 days
        defaultMaxAttempts: 5,
        cleanupInterval: 3600000, // 1 hour
        stalledInterval: 60000, // 1 minute
        maxStalledCount: 3
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        healthCheckInterval: 30000 // 30 seconds
      },
      healthcare: {
        auditJobs: true,
        encryptSensitiveData: true,
        retentionPeriod: 7776000000, // 90 days
        complianceMode: true
      }
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager specifically for healthcare applications
   */
  static createForHealthcare(options: HealthcareOptions = {}): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      ...HealthcareJobsConfig,
      queues: {
        // Patient-related operations
        patients: {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'healthcare:patients:'
            }
          },
          workers: 3,
          concurrency: 5
        },
        // Appointment management
        appointments: {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'healthcare:appointments:'
            }
          },
          workers: 2,
          concurrency: 8
        },
        // Notifications (reminders, alerts)
        notifications: {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'healthcare:notifications:'
            }
          },
          workers: 4,
          concurrency: 10
        },
        // Lab results and medical data
        medical: {
          adapter: {
            type: options.adapterType || 'database',
            options: options.databaseOptions || {
              table: 'medical_jobs',
              pollInterval: 5000
            }
          },
          workers: 2,
          concurrency: 3
        },
        // Billing and insurance
        billing: {
          adapter: {
            type: options.adapterType || 'redis',
            options: {
              ...(options.adapterOptions || {}),
              keyPrefix: 'healthcare:billing:'
            }
          },
          workers: 2,
          concurrency: 4
        },
        // Reports and analytics
        reports: {
          adapter: {
            type: options.adapterType || 'database',
            options: options.databaseOptions || {
              table: 'report_jobs',
              pollInterval: 10000
            }
          },
          workers: 1,
          concurrency: 2
        },
        // Compliance and audit
        compliance: {
          adapter: {
            type: options.adapterType || 'database',
            options: options.databaseOptions || {
              table: 'compliance_jobs',
              pollInterval: 30000
            }
          },
          workers: 1,
          concurrency: 1
        }
      },
      settings: {
        maxConcurrency: options.maxConcurrency || 25,
        defaultJobTimeout: 900000, // 15 minutes
        defaultJobTTL: 7776000000, // 90 days (healthcare retention)
        defaultMaxAttempts: 3,
        cleanupInterval: 3600000, // 1 hour
        stalledInterval: 30000, // 30 seconds
        maxStalledCount: 2
      },
      monitoring: {
        enabled: true,
        metricsInterval: 30000, // 30 seconds
        healthCheckInterval: 15000 // 15 seconds
      },
      healthcare: {
        auditJobs: true,
        encryptSensitiveData: true,
        retentionPeriod: 7776000000, // 90 days
        complianceMode: true
      }
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager with Redis adapter
   */
  static createWithRedis(
    redisConfig: RedisAdapterConfig,
    options: CreateOptions = {}
  ): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: options.defaultQueue || 'redis',
      queues: {
        [options.defaultQueue || 'redis']: {
          adapter: {
            type: 'redis',
            options: redisConfig
          },
          workers: options.workers || 2,
          concurrency: options.concurrency || 5
        }
      },
      settings: options.settings,
      monitoring: options.monitoring,
      healthcare: options.healthcare
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager with Database adapter
   */
  static createWithDatabase(
    databaseConfig: DatabaseAdapterConfig,
    options: CreateOptions = {}
  ): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: options.defaultQueue || 'database',
      queues: {
        [options.defaultQueue || 'database']: {
          adapter: {
            type: 'database',
            options: databaseConfig
          },
          workers: options.workers || 1,
          concurrency: options.concurrency || 3
        }
      },
      settings: options.settings,
      monitoring: options.monitoring,
      healthcare: options.healthcare
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager with Memory adapter (for development)
   */
  static createWithMemory(
    memoryConfig: MemoryAdapterConfig = {},
    options: CreateOptions = {}
  ): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: options.defaultQueue || 'memory',
      queues: {
        [options.defaultQueue || 'memory']: {
          adapter: {
            type: 'memory',
            options: memoryConfig
          },
          workers: options.workers || 1,
          concurrency: options.concurrency || 2
        }
      },
      settings: options.settings,
      monitoring: options.monitoring,
      healthcare: options.healthcare
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager with multiple queues
   */
  static createWithMultipleQueues(
    queues: Record<string, QueueConfig>,
    defaultQueue: string,
    globalOptions: CreateOptions = {}
  ): IJobManager {
    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue,
      queues: Object.entries(queues).reduce((acc, [name, queueConfig]) => {
        acc[name] = {
          adapter: queueConfig.adapter,
          workers: queueConfig.workers || 1,
          concurrency: queueConfig.concurrency || 2
        }
        return acc
      }, {} as any),
      settings: globalOptions.settings,
      monitoring: globalOptions.monitoring,
      healthcare: globalOptions.healthcare
    }

    return new BackgroundJobsService(config)
  }

  /**
   * Create job manager from environment variables
   */
  static createFromEnvironment(): IJobManager {
    const adapterType = (process.env.JOBS_ADAPTER_TYPE || 'memory') as QueueAdapterType
    const workers = parseInt(process.env.JOBS_WORKERS || '2')
    const concurrency = parseInt(process.env.JOBS_CONCURRENCY || '5')
    const maxConcurrency = parseInt(process.env.JOBS_MAX_CONCURRENCY || '20')

    let adapterOptions: any = {}

    switch (adapterType) {
      case 'redis':
        adapterOptions = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          db: parseInt(process.env.REDIS_JOBS_DB || '1'),
          keyPrefix: process.env.JOBS_REDIS_PREFIX || 'jobs:'
        }
        break
      
      case 'database':
        adapterOptions = {
          table: process.env.JOBS_DB_TABLE || 'background_jobs',
          pollInterval: parseInt(process.env.JOBS_POLL_INTERVAL || '5000')
        }
        break
      
      case 'memory':
        adapterOptions = {
          maxJobs: parseInt(process.env.JOBS_MEMORY_MAX || '10000'),
          persistToDisk: process.env.JOBS_MEMORY_PERSIST === 'true',
          storageFile: process.env.JOBS_MEMORY_FILE
        }
        break
    }

    const config: Partial<BackgroundJobsConfig> = {
      defaultQueue: process.env.JOBS_DEFAULT_QUEUE || 'default',
      queues: {
        [process.env.JOBS_DEFAULT_QUEUE || 'default']: {
          adapter: {
            type: adapterType,
            options: adapterOptions
          },
          workers,
          concurrency
        }
      },
      settings: {
        maxConcurrency,
        defaultJobTimeout: parseInt(process.env.JOBS_DEFAULT_TIMEOUT || '300000'),
        defaultJobTTL: parseInt(process.env.JOBS_DEFAULT_TTL || '86400000'),
        defaultMaxAttempts: parseInt(process.env.JOBS_DEFAULT_ATTEMPTS || '3'),
        cleanupInterval: parseInt(process.env.JOBS_CLEANUP_INTERVAL || '3600000'),
        stalledInterval: parseInt(process.env.JOBS_STALLED_INTERVAL || '30000'),
        maxStalledCount: parseInt(process.env.JOBS_MAX_STALLED || '1')
      },
      monitoring: {
        enabled: process.env.JOBS_MONITORING_ENABLED !== 'false',
        metricsInterval: parseInt(process.env.JOBS_METRICS_INTERVAL || '60000'),
        healthCheckInterval: parseInt(process.env.JOBS_HEALTH_INTERVAL || '30000')
      },
      healthcare: {
        auditJobs: process.env.JOBS_AUDIT_ENABLED === 'true',
        encryptSensitiveData: process.env.JOBS_ENCRYPT_DATA === 'true',
        retentionPeriod: parseInt(process.env.JOBS_RETENTION_PERIOD || '2592000000'),
        complianceMode: process.env.JOBS_COMPLIANCE_MODE === 'true'
      }
    }

    return new BackgroundJobsService(config)
  }
}

// Supporting types
export interface ProductionOptions {
  adapterType?: QueueAdapterType
  adapterOptions?: any
  workers?: number
  concurrency?: number
  maxConcurrency?: number
}

export interface HealthcareOptions {
  adapterType?: QueueAdapterType
  adapterOptions?: any
  databaseOptions?: any
  maxConcurrency?: number
}

export interface CreateOptions {
  defaultQueue?: string
  workers?: number
  concurrency?: number
  settings?: BackgroundJobsConfig['settings']
  monitoring?: BackgroundJobsConfig['monitoring']
  healthcare?: BackgroundJobsConfig['healthcare']
}

export interface QueueConfig {
  adapter: {
    type: QueueAdapterType
    options?: any
  }
  workers?: number
  concurrency?: number
}

// Pre-configured job manager instances
export const JobManagers = {
  /**
   * Development job manager with memory persistence
   */
  development: () => BackgroundJobsFactory.createForDevelopment(),

  /**
   * Testing job manager with in-memory storage
   */
  testing: () => BackgroundJobsFactory.createForTesting(),

  /**
   * Production job manager with Redis
   */
  production: (options?: ProductionOptions) => BackgroundJobsFactory.createForProduction(options),

  /**
   * Healthcare job manager with specialized queues
   */
  healthcare: (options?: HealthcareOptions) => BackgroundJobsFactory.createForHealthcare(options),

  /**
   * Environment-based job manager
   */
  fromEnv: () => BackgroundJobsFactory.createFromEnvironment()
}

// Environment-specific configurations
export const EnvironmentConfigs = {
  development: {
    adapterType: 'memory' as QueueAdapterType,
    workers: 1,
    concurrency: 2,
    monitoring: true,
    healthcare: false
  },

  testing: {
    adapterType: 'memory' as QueueAdapterType,
    workers: 1,
    concurrency: 1,
    monitoring: false,
    healthcare: false
  },

  staging: {
    adapterType: 'redis' as QueueAdapterType,
    workers: 2,
    concurrency: 5,
    monitoring: true,
    healthcare: true
  },

  production: {
    adapterType: 'redis' as QueueAdapterType,
    workers: 5,
    concurrency: 10,
    monitoring: true,
    healthcare: true
  }
}