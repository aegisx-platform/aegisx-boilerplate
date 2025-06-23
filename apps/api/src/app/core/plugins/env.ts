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
