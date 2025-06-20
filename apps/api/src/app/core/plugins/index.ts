import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Core plugins (manual register with specific order)
import env from './env';
import knex from './database/knex';
import sensible from './validation/sensible';
import jwt from './security/jwt';
import rateLimit from './security/rate-limit';
import helmet from './security/helmet';
import swagger from './docs/swagger';
import rbac from './security/rbac';

const corePlugins: FastifyPluginAsync = async (fastify) => {
  // Load core plugins in specific order
  await fastify.register(env);
  await fastify.register(knex);
  await fastify.register(sensible);
  await fastify.register(jwt);
  await fastify.register(rateLimit);
  await fastify.register(helmet);
  await fastify.register(swagger);
  await fastify.register(rbac);

  fastify.log.info('✅ Core plugins loaded successfully');
};

export default fp(corePlugins, {
  name: 'core-plugins',
});