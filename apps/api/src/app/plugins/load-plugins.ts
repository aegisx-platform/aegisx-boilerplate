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

const allPlugins: FastifyPluginAsync = async (fastify) => {
  // Load core plugin (มีลำดับ)
  await fastify.register(env);
  await fastify.register(knex);
  await fastify.register(sensible);
  await fastify.register(jwt);
  await fastify.register(rateLimit);
  await fastify.register(helmet);

  // Load optional plugin (autoload)
  await fastify.register(autoload, {
    dir: path.join(__dirname, 'optional'),
    options: {},
  });
};

export default fp(allPlugins, {
  name: 'all-plugins',
});
