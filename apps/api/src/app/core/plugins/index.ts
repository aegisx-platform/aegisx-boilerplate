import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Core plugins (manual register with specific order)
import env from './env';
import redis from './database/redis';
import knex from './database/knex';
import sensible from './validation/sensible';
import jwt from './security/jwt';
import rateLimit from './security/rate-limit';
import helmet from './security/helmet';
import swagger from './docs/swagger';
import rbac from './security/rbac';
import underPressure from './monitoring/under-pressure';
import healthCheck from './monitoring/health-check';
import structuredLogging from './logging';
import apmIntegration from './logging/apm-integration';
import eventBus from './event-bus';
import audit from './audit';
import httpClient from './http-client';
import secretsManager from './secrets-manager';
import connectionPool from './connection-pool';
import configValidator from './config-validator';
import retryService from './retry-service';

const corePlugins: FastifyPluginAsync = async (fastify) => {
  // Load core plugins in specific order
  await fastify.register(env);
  await fastify.register(sensible);
  await fastify.register(structuredLogging);
  await fastify.register(apmIntegration);
  await fastify.register(redis);
  await fastify.register(knex);
  await fastify.register(connectionPool);
  await fastify.register(configValidator);
  await fastify.register(retryService);
  await fastify.register(httpClient);
  await fastify.register(secretsManager);
  await fastify.register(jwt);
  await fastify.register(rateLimit);
  await fastify.register(helmet);
  await fastify.register(underPressure);
  await fastify.register(swagger);
  await fastify.register(rbac);
  await fastify.register(eventBus);
  await fastify.register(audit);
  await fastify.register(healthCheck);

  fastify.log.info('✅ Core plugins loaded successfully');
};

export default fp(corePlugins, {
  name: 'core-plugins',
});
