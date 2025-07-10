import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import env from '@fastify/env';

/**
 * This plugin loads and validates environment variables
 *
 * @see https://github.com/fastify/fastify-env
 */

// Define the schema for environment variables
const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: {
      type: 'string',
      default: '3000'
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0'
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development'
    },
    JWT_SECRET: {
      type: 'string',
      default: 'your-super-secret-jwt-key-change-this-in-production'
    },
    JWT_EXPIRES_IN: {
      type: 'string',
      default: '1h'
    },
    DB_CONNECTION_STRING: {
      type: 'string',
      default: ''
    },
    DB_HOST: {
      type: 'string',
      default: 'localhost'
    },
    DB_PORT: {
      type: 'string',
      default: '5432'
    },
    DB_NAME: {
      type: 'string',
      default: 'aegisx_db'
    },
    DB_USER: {
      type: 'string',
      default: 'postgres'
    },
    DB_PASSWORD: {
      type: 'string',
      default: ''
    },
    DB_SSL: {
      type: 'string',
      default: 'false'
    },
    DB_POOL_MIN: {
      type: 'string',
      default: '2'
    },
    DB_POOL_MAX: {
      type: 'string',
      default: '10'
    },
    CORS_ORIGIN: {
      type: 'string',
      default: '*'
    },
    API_VERSION: {
      type: 'string',
      default: 'v1'
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
      default: 'info'
    },
    RATE_LIMIT_MAX: {
      type: 'string',
      default: '100'
    },
    RATE_LIMIT_TIME_WINDOW: {
      type: 'string',
      default: '900000' // 15 minutes in ms
    },
    REDIS_HOST: {
      type: 'string',
      default: 'localhost'
    },
    REDIS_PORT: {
      type: 'string',
      default: '6379'
    },
    REDIS_PASSWORD: {
      type: 'string',
      default: ''
    },
    REDIS_DB: {
      type: 'string',
      default: '0'
    },
    REDIS_TTL: {
      type: 'string',
      default: '900' // 15 minutes in seconds
    },
    AUDIT_ENABLED: {
      type: 'string',
      default: 'true'
    },
    AUDIT_LOG_BODY: {
      type: 'string',
      default: 'false'
    },
    AUDIT_SUCCESS_ONLY: {
      type: 'string',
      default: 'false'
    },
    AUDIT_MAX_BODY_SIZE: {
      type: 'string',
      default: '5120' // 5KB in bytes
    },
    AUDIT_EXCLUDE_ROUTES: {
      type: 'string',
      default: '/health,/ready,/docs,/docs/*'
    },
    AUDIT_EXCLUDE_METHODS: {
      type: 'string',
      default: 'GET,HEAD,OPTIONS'
    },
    AUDIT_INCLUDE_DOMAINS: {
      type: 'string',
      default: '' // Empty = all domains, or comma-separated: 'users,roles,reports'
    },
    AUDIT_EXCLUDE_DOMAINS: {
      type: 'string',
      default: '' // Empty = no exclusions, or comma-separated: 'logs,metrics'
    },
    AUDIT_ADAPTER: {
      type: 'string',
      enum: ['direct', 'redis', 'rabbitmq', 'hybrid'],
      default: 'direct'
    },
    AUDIT_INTEGRITY_ENABLED: {
      type: 'string',
      default: 'true'
    },
    AUDIT_HASH_ALGORITHM: {
      type: 'string',
      default: 'sha256'
    },
    AUDIT_SIGNATURE_ALGORITHM: {
      type: 'string',
      default: 'RSA-SHA256'
    },
    AUDIT_BATCH_SIZE: {
      type: 'string',
      default: '100'
    },
    AUDIT_BATCH_TIMEOUT: {
      type: 'string',
      default: '5000' // 5 seconds in ms
    },
    AUDIT_QUEUE_NAME: {
      type: 'string',
      default: 'audit_logs_queue'
    },
    AUDIT_EXCHANGE_NAME: {
      type: 'string',
      default: 'audit_exchange'
    },
    AUDIT_MAX_RETRIES: {
      type: 'string',
      default: '3'
    },
    AUDIT_RETRY_DELAY: {
      type: 'string',
      default: '1000' // 1 second in ms
    },
    // RabbitMQ Configuration
    RABBITMQ_URL: {
      type: 'string',
      default: 'amqp://guest:guest@localhost:5672'
    },
    RABBITMQ_CONNECTION_TIMEOUT: {
      type: 'string',
      default: '5000'
    },
    AUDIT_RABBITMQ_EXCHANGE: {
      type: 'string',
      default: 'audit.logs'
    },
    AUDIT_RABBITMQ_QUEUE: {
      type: 'string',
      default: 'audit_logs_simple'
    },
    AUDIT_RABBITMQ_ROUTING_KEY: {
      type: 'string',
      default: 'audit.log'
    },
    AUDIT_RABBITMQ_PRIORITY: {
      type: 'string',
      default: 'true'
    },
    AUDIT_RABBITMQ_DURABLE: {
      type: 'string',
      default: 'true'
    },
    AUDIT_RABBITMQ_PERSISTENT: {
      type: 'string',
      default: 'true'
    },
    AUDIT_MESSAGE_TTL: {
      type: 'string',
      default: '86400000' // 24 hours in ms
    },
    AUDIT_WORKER_CONCURRENCY: {
      type: 'string',
      default: '3'
    },
    AUDIT_WORKER_PREFETCH: {
      type: 'string',
      default: '10'
    },
    AUDIT_ACK_TIMEOUT: {
      type: 'string',
      default: '30000' // 30 seconds in ms
    },
    AUDIT_REDIS_CHANNEL: {
      type: 'string',
      default: 'audit_events'
    },
    // HTTP Client Configuration
    HTTP_CLIENT_TIMEOUT: {
      type: 'string',
      default: '30000' // 30 seconds in ms
    },
    HTTP_CLIENT_RETRY_ATTEMPTS: {
      type: 'string',
      default: '3'
    },
    HTTP_CLIENT_RETRY_DELAY: {
      type: 'string',
      default: '1000' // 1 second in ms
    },
    HTTP_CLIENT_CIRCUIT_BREAKER_ENABLED: {
      type: 'string',
      default: 'true'
    },
    HTTP_CLIENT_CIRCUIT_BREAKER_FAILURE_THRESHOLD: {
      type: 'string',
      default: '5'
    },
    HTTP_CLIENT_CIRCUIT_BREAKER_SUCCESS_THRESHOLD: {
      type: 'string',
      default: '3'
    },
    HTTP_CLIENT_CIRCUIT_BREAKER_TIMEOUT: {
      type: 'string',
      default: '60000' // 60 seconds in ms
    },
    HTTP_CLIENT_CACHE_ENABLED: {
      type: 'string',
      default: 'false'
    },
    HTTP_CLIENT_CACHE_TTL: {
      type: 'string',
      default: '300000' // 5 minutes in ms
    },
    HTTP_CLIENT_LOGGING_REQUESTS: {
      type: 'string',
      default: 'false'
    },
    HTTP_CLIENT_LOGGING_RESPONSES: {
      type: 'string',
      default: 'false'
    },
    HTTP_CLIENT_LOGGING_ERRORS: {
      type: 'string',
      default: 'true'
    },
    // Secrets Manager Configuration
    SECRETS_ADAPTER: {
      type: 'string',
      enum: ['environment', 'database', 'redis', 'hashicorp-vault', 'aws-secrets-manager', 'azure-key-vault'],
      default: 'environment'
    },
    SECRETS_ENCRYPTION_KEY: {
      type: 'string',
      default: ''
    },
    SECRETS_ENV_PREFIX: {
      type: 'string',
      default: 'SECRET_'
    },
    SECRETS_CACHE_ENABLED: {
      type: 'string',
      default: 'true'
    },
    SECRETS_CACHE_TTL: {
      type: 'string',
      default: '300000' // 5 minutes in ms
    },
    SECRETS_CACHE_MAX_SIZE: {
      type: 'string',
      default: '1000'
    },
    SECRETS_AUDIT_ACCESS: {
      type: 'string',
      default: 'false'
    },
    SECRETS_REQUIRE_NAMESPACE: {
      type: 'string',
      default: 'false'
    },
    SECRETS_DB_TABLE: {
      type: 'string',
      default: 'secrets'
    },

    // Background Jobs Configuration
    JOBS_ADAPTER_TYPE: {
      type: 'string',
      enum: ['memory', 'redis', 'rabbitmq', 'database'],
      default: 'memory'
    },
    JOBS_WORKERS: {
      type: 'string',
      default: '2'
    },
    JOBS_CONCURRENCY: {
      type: 'string', 
      default: '5'
    },
    JOBS_MAX_CONCURRENCY: {
      type: 'string',
      default: '20'
    },
    JOBS_DEFAULT_QUEUE: {
      type: 'string',
      default: 'default'
    },
    JOBS_DEFAULT_TIMEOUT: {
      type: 'string',
      default: '300000' // 5 minutes
    },
    JOBS_DEFAULT_TTL: {
      type: 'string',
      default: '86400000' // 24 hours
    },
    JOBS_DEFAULT_ATTEMPTS: {
      type: 'string',
      default: '3'
    },
    JOBS_CLEANUP_INTERVAL: {
      type: 'string',
      default: '3600000' // 1 hour
    },
    JOBS_STALLED_INTERVAL: {
      type: 'string',
      default: '30000' // 30 seconds
    },
    JOBS_MAX_STALLED: {
      type: 'string',
      default: '1'
    },
    JOBS_MONITORING_ENABLED: {
      type: 'string',
      default: 'true'
    },
    JOBS_METRICS_INTERVAL: {
      type: 'string',
      default: '60000' // 1 minute
    },
    JOBS_HEALTH_INTERVAL: {
      type: 'string',
      default: '30000' // 30 seconds
    },
    JOBS_AUDIT_ENABLED: {
      type: 'string',
      default: 'false'
    },
    JOBS_ENCRYPT_DATA: {
      type: 'string',
      default: 'false'
    },
    JOBS_COMPLIANCE_MODE: {
      type: 'string',
      default: 'false'
    },
    JOBS_RETENTION_PERIOD: {
      type: 'string',
      default: '2592000000' // 30 days
    },
    REDIS_JOBS_DB: {
      type: 'string',
      default: '1'
    },
    JOBS_REDIS_PREFIX: {
      type: 'string',
      default: 'jobs:'
    },
    JOBS_DB_TABLE: {
      type: 'string',
      default: 'background_jobs'
    },
    JOBS_POLL_INTERVAL: {
      type: 'string',
      default: '5000' // 5 seconds
    },
    JOBS_MEMORY_MAX: {
      type: 'string',
      default: '10000'
    },
    JOBS_MEMORY_PERSIST: {
      type: 'string',
      default: 'false'
    },
    JOBS_MEMORY_FILE: {
      type: 'string',
      default: ''
    },
    
    // ===================================================
    // Bull + RabbitMQ Queue System Configuration
    // ===================================================
    QUEUE_BROKER: {
      type: 'string',
      enum: ['redis', 'rabbitmq'],
      default: 'redis'
    },
    
    // Redis Queue Configuration (Bull)
    QUEUE_REDIS_DB: {
      type: 'string',
      default: '1'
    },
    QUEUE_PREFIX: {
      type: 'string',
      default: 'bull'
    },
    QUEUE_DEFAULT_ATTEMPTS: {
      type: 'string',
      default: '3'
    },
    QUEUE_BACKOFF_TYPE: {
      type: 'string',
      enum: ['fixed', 'exponential', 'linear'],
      default: 'exponential'
    },
    QUEUE_BACKOFF_DELAY: {
      type: 'string',
      default: '2000'
    },
    QUEUE_REMOVE_ON_COMPLETE: {
      type: 'string',
      default: 'true'
    },
    QUEUE_REMOVE_ON_FAIL: {
      type: 'string',
      default: 'false'
    },
    QUEUE_METRICS_INTERVAL: {
      type: 'string',
      default: '60000'
    },
    
    // RabbitMQ Configuration
    RABBITMQ_HOST: {
      type: 'string',
      default: 'localhost'
    },
    RABBITMQ_PORT: {
      type: 'string',
      default: '5672'
    },
    RABBITMQ_USER: {
      type: 'string',
      default: 'guest'
    },
    RABBITMQ_PASS: {
      type: 'string',
      default: 'guest'
    },
    RABBITMQ_VHOST: {
      type: 'string',
      default: '/'
    },
    RABBITMQ_PROTOCOL: {
      type: 'string',
      enum: ['amqp', 'amqps'],
      default: 'amqp'
    },
    RABBITMQ_EXCHANGE: {
      type: 'string',
      default: 'notifications'
    },
    RABBITMQ_EXCHANGE_TYPE: {
      type: 'string',
      enum: ['direct', 'topic', 'fanout', 'headers'],
      default: 'topic'
    },
    RABBITMQ_EXCHANGE_DURABLE: {
      type: 'string',
      default: 'true'
    },
    RABBITMQ_QUEUE_DURABLE: {
      type: 'string',
      default: 'true'
    },
    RABBITMQ_QUEUE_EXCLUSIVE: {
      type: 'string',
      default: 'false'
    },
    RABBITMQ_QUEUE_AUTO_DELETE: {
      type: 'string',
      default: 'false'
    },
    RABBITMQ_PREFETCH: {
      type: 'string',
      default: '10'
    },
    RABBITMQ_RECONNECT_INTERVAL: {
      type: 'string',
      default: '5000'
    },
    
    // Queue Monitoring & Management
    QUEUE_MONITORING_ENABLED: {
      type: 'string',
      default: 'true'
    },
    QUEUE_MONITORING_INTERVAL: {
      type: 'string',
      default: '30000'
    },
    
    // ===================================================
    // Notification Queue Settings (Bull/RabbitMQ Integration)
    // ===================================================
    NOTIFICATION_REDIS_DB: {
      type: 'string',
      default: '1'
    },
    NOTIFICATION_AUTO_PROCESS_ENABLED: {
      type: 'string',
      default: 'true'
    },
    NOTIFICATION_PROCESS_INTERVAL: {
      type: 'string',
      default: '30s'
    },
    
    // Redis-based Rate Limiting for Notifications
    NOTIFICATION_REDIS_RATE_LIMIT: {
      type: 'string',
      default: 'true'
    },
    NOTIFICATION_RATE_LIMIT_WINDOW: {
      type: 'string',
      default: '60000'
    },
    NOTIFICATION_RATE_LIMIT_MAX: {
      type: 'string',
      default: '100'
    },
    NOTIFICATION_RETRY_ATTEMPTS: {
      type: 'string',
      default: '3'
    },

    // Event Bus Configuration
    EVENT_BUS_ENABLED: {
      type: 'string',
      default: 'true'
    },
    EVENT_BUS_ADAPTER: {
      type: 'string',
      enum: ['memory', 'redis', 'rabbitmq'],
      default: 'memory'
    },
    EVENT_BUS_REDIS_URL: {
      type: 'string',
      default: ''
    },
    EVENT_BUS_REDIS_HOST: {
      type: 'string',
      default: 'localhost'
    },
    EVENT_BUS_REDIS_PORT: {
      type: 'string',
      default: '6379'
    },
    EVENT_BUS_REDIS_PASSWORD: {
      type: 'string',
      default: ''
    },
    EVENT_BUS_REDIS_DB: {
      type: 'string',
      default: '1'
    },
    EVENT_BUS_REDIS_KEY_PREFIX: {
      type: 'string',
      default: 'events:'
    },
    EVENT_BUS_REDIS_MAX_RETRIES: {
      type: 'string',
      default: '3'
    },
    EVENT_BUS_RABBITMQ_URL: {
      type: 'string',
      default: 'amqp://guest:guest@localhost:5672'
    },
    EVENT_BUS_RABBITMQ_HOST: {
      type: 'string',
      default: 'localhost'
    },
    EVENT_BUS_RABBITMQ_PORT: {
      type: 'string',
      default: '5672'
    },
    EVENT_BUS_RABBITMQ_USERNAME: {
      type: 'string',
      default: 'guest'
    },
    EVENT_BUS_RABBITMQ_PASSWORD: {
      type: 'string',
      default: 'guest'
    },
    EVENT_BUS_RABBITMQ_VHOST: {
      type: 'string',
      default: '/'
    },
    EVENT_BUS_RABBITMQ_EXCHANGE: {
      type: 'string',
      default: 'events'
    },
    EVENT_BUS_RABBITMQ_EXCHANGE_TYPE: {
      type: 'string',
      default: 'topic'
    },
    EVENT_BUS_RABBITMQ_DLX: {
      type: 'string',
      default: 'events.dlx'
    },
    EVENT_BUS_RABBITMQ_PREFETCH: {
      type: 'string',
      default: '10'
    },
    // Structured Logging Configuration
    STRUCTURED_LOGGING_ENABLED: {
      type: 'string',
      default: 'true'
    },
    LOG_CONSOLE_ENABLED: {
      type: 'string',
      default: 'true'
    },
    LOG_FILE_ENABLED: {
      type: 'string',
      default: 'false'
    },
    LOG_CORRELATION_HEADER: {
      type: 'string',
      default: 'x-correlation-id'
    },
    SERVICE_NAME: {
      type: 'string',
      default: 'aegisx-api'
    },
    SERVICE_VERSION: {
      type: 'string',
      default: '1.0.0'
    },
    // APM Configuration
    APM_ENABLED: {
      type: 'string',
      default: 'false'
    },
    APM_SERVICE_NAME: {
      type: 'string',
      default: 'aegisx-api'
    },
    APM_SERVICE_VERSION: {
      type: 'string',
      default: '1.0.0'
    },
    APM_METRICS_PORT: {
      type: 'string',
      default: '9090'
    },
    // Seq Log Monitoring Configuration
    SEQ_ENABLED: {
      type: 'string',
      default: 'false'
    },
    SEQ_URL: {
      type: 'string',
      default: 'http://localhost:5342'
    },
    SEQ_API_KEY: {
      type: 'string',
      default: ''
    }
  }
};

// Extend FastifyInstance interface to include config
declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string;
      HOST: string;
      NODE_ENV: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      DB_CONNECTION_STRING: string;
      DB_HOST: string;
      DB_PORT: string;
      DB_NAME: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DB_SSL: string;
      DB_POOL_MIN: string;
      DB_POOL_MAX: string;
      CORS_ORIGIN: string;
      API_VERSION: string;
      LOG_LEVEL: string;
      RATE_LIMIT_MAX: string;
      RATE_LIMIT_TIME_WINDOW: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_PASSWORD: string;
      REDIS_DB: string;
      REDIS_TTL: string;
      AUDIT_ENABLED: string;
      AUDIT_LOG_BODY: string;
      AUDIT_SUCCESS_ONLY: string;
      AUDIT_MAX_BODY_SIZE: string;
      AUDIT_ADAPTER: string;
      AUDIT_BATCH_SIZE: string;
      AUDIT_BATCH_TIMEOUT: string;
      AUDIT_QUEUE_NAME: string;
      AUDIT_EXCHANGE_NAME: string;
      AUDIT_MAX_RETRIES: string;
      AUDIT_RETRY_DELAY: string;
      RABBITMQ_URL: string;
      AUDIT_RABBITMQ_EXCHANGE: string;
      AUDIT_RABBITMQ_QUEUE: string;
      AUDIT_RABBITMQ_ROUTING_KEY: string;
      AUDIT_RABBITMQ_PRIORITY: string;
      AUDIT_RABBITMQ_DURABLE: string;
      AUDIT_RABBITMQ_PERSISTENT: string;
      AUDIT_MESSAGE_TTL: string;
      AUDIT_WORKER_CONCURRENCY: string;
      AUDIT_WORKER_PREFETCH: string;
      AUDIT_ACK_TIMEOUT: string;
      AUDIT_REDIS_CHANNEL: string;
      EVENT_BUS_ENABLED: string;
      EVENT_BUS_ADAPTER: string;
      EVENT_BUS_REDIS_URL: string;
      EVENT_BUS_REDIS_HOST: string;
      EVENT_BUS_REDIS_PORT: string;
      EVENT_BUS_REDIS_PASSWORD: string;
      EVENT_BUS_REDIS_DB: string;
      EVENT_BUS_REDIS_KEY_PREFIX: string;
      EVENT_BUS_REDIS_MAX_RETRIES: string;
      EVENT_BUS_RABBITMQ_URL: string;
      EVENT_BUS_RABBITMQ_HOST: string;
      EVENT_BUS_RABBITMQ_PORT: string;
      EVENT_BUS_RABBITMQ_USERNAME: string;
      EVENT_BUS_RABBITMQ_PASSWORD: string;
      EVENT_BUS_RABBITMQ_VHOST: string;
      EVENT_BUS_RABBITMQ_EXCHANGE: string;
      EVENT_BUS_RABBITMQ_EXCHANGE_TYPE: string;
      EVENT_BUS_RABBITMQ_DLX: string;
      EVENT_BUS_RABBITMQ_PREFETCH: string;
      STRUCTURED_LOGGING_ENABLED: string;
      LOG_CONSOLE_ENABLED: string;
      LOG_FILE_ENABLED: string;
      LOG_CORRELATION_HEADER: string;
      SERVICE_NAME: string;
      SERVICE_VERSION: string;
      APM_ENABLED: string;
      APM_SERVICE_NAME: string;
      APM_SERVICE_VERSION: string;
      APM_METRICS_PORT: string;
      SEQ_ENABLED: string;
      SEQ_URL: string;
      SEQ_API_KEY: string;
      SECRETS_ADAPTER: string;
      SECRETS_ENCRYPTION_KEY: string;
      SECRETS_ENV_PREFIX: string;
      SECRETS_CACHE_ENABLED: string;
      SECRETS_CACHE_TTL: string;
      SECRETS_CACHE_MAX_SIZE: string;
      SECRETS_AUDIT_ACCESS: string;
      SECRETS_REQUIRE_NAMESPACE: string;
      SECRETS_DB_TABLE: string;

      // Background Jobs Configuration
      JOBS_ADAPTER_TYPE: string;
      JOBS_WORKERS: string;
      JOBS_CONCURRENCY: string;
      JOBS_MAX_CONCURRENCY: string;
      JOBS_DEFAULT_QUEUE: string;
      JOBS_DEFAULT_TIMEOUT: string;
      JOBS_DEFAULT_TTL: string;
      JOBS_DEFAULT_ATTEMPTS: string;
      JOBS_CLEANUP_INTERVAL: string;
      JOBS_STALLED_INTERVAL: string;
      JOBS_MAX_STALLED: string;
      JOBS_MONITORING_ENABLED: string;
      JOBS_METRICS_INTERVAL: string;
      JOBS_HEALTH_INTERVAL: string;
      JOBS_AUDIT_ENABLED: string;
      JOBS_ENCRYPT_DATA: string;
      JOBS_COMPLIANCE_MODE: string;
      JOBS_RETENTION_PERIOD: string;
      REDIS_JOBS_DB: string;
      JOBS_REDIS_PREFIX: string;
      JOBS_DB_TABLE: string;
      JOBS_POLL_INTERVAL: string;
      JOBS_MEMORY_MAX: string;
      JOBS_MEMORY_PERSIST: string;
      JOBS_MEMORY_FILE: string;
      
      // Bull + RabbitMQ Queue System Configuration
      QUEUE_BROKER: string;
      QUEUE_REDIS_DB: string;
      QUEUE_PREFIX: string;
      QUEUE_DEFAULT_ATTEMPTS: string;
      QUEUE_BACKOFF_TYPE: string;
      QUEUE_BACKOFF_DELAY: string;
      QUEUE_REMOVE_ON_COMPLETE: string;
      QUEUE_REMOVE_ON_FAIL: string;
      QUEUE_METRICS_INTERVAL: string;
      RABBITMQ_HOST: string;
      RABBITMQ_PORT: string;
      RABBITMQ_USER: string;
      RABBITMQ_PASS: string;
      RABBITMQ_VHOST: string;
      RABBITMQ_PROTOCOL: string;
      RABBITMQ_EXCHANGE: string;
      RABBITMQ_EXCHANGE_TYPE: string;
      RABBITMQ_EXCHANGE_DURABLE: string;
      RABBITMQ_QUEUE_DURABLE: string;
      RABBITMQ_QUEUE_EXCLUSIVE: string;
      RABBITMQ_QUEUE_AUTO_DELETE: string;
      RABBITMQ_PREFETCH: string;
      RABBITMQ_RECONNECT_INTERVAL: string;
      QUEUE_MONITORING_ENABLED: string;
      QUEUE_MONITORING_INTERVAL: string;
      
      // Notification Queue Settings
      NOTIFICATION_REDIS_DB: string;
      NOTIFICATION_AUTO_PROCESS_ENABLED: string;
      NOTIFICATION_PROCESS_INTERVAL: string;
      NOTIFICATION_REDIS_RATE_LIMIT: string;
      NOTIFICATION_RATE_LIMIT_WINDOW: string;
      NOTIFICATION_RATE_LIMIT_MAX: string;
      NOTIFICATION_RETRY_ATTEMPTS: string;
    };
  }
}

export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(env, {
    schema,
    confKey: 'config', // optional, default: 'config'
    dotenv: true, // will read .env in root folder
    data: process.env // optional, default: process.env
  });

}, {
  name: 'env-plugin'
});
