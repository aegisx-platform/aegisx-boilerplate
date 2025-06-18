import fp from 'fastify-plugin';
import path from 'path';
import autoload from '@fastify/autoload';
import { FastifyPluginAsync } from 'fastify';

// core (manual register)
import env from './core/env';
import knex from './core/knex';
import sensible from './core/sensible';
import jwt from './core/jwt';
import rateLimit from './core/rate-limit';
import helmet from './core/helmet';
import swagger from './core/swagger';
import rbac from './core/rbac';
// import compress from './core/compress';

// modules
import authModule from '../modules/core/auth';
import rbacModule from '../modules/core/rbac';

const allPlugins: FastifyPluginAsync = async (fastify) => {
  // Load core plugin (มีลำดับ)
  await fastify.register(env);
  await fastify.register(knex);
  await fastify.register(sensible);
  await fastify.register(jwt);
  await fastify.register(rateLimit);
  await fastify.register(helmet);
  await fastify.register(swagger);
  await fastify.register(rbac);
  // await fastify.register(compress);


  // Load other optional plugins (autoload)
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'optional'),
    options: {}
  });

  // Load core modules (after Swagger is ready)
  await fastify.register(authModule);
  await fastify.register(rbacModule);
};

export default fp(allPlugins, {
  name: 'all-plugins',
});
