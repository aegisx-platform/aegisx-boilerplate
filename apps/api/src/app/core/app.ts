import { FastifyInstance } from 'fastify';

// Core layers
import corePlugins from './plugins';
import domainsPlugin from '../domains';
import apiRoutes from '../api/routes';

/* eslint-disable-next-line */
export interface AppOptions {}

const appPlugin = async (fastify: FastifyInstance, opts: AppOptions) => {
  // Load application layers in order
  await fastify.register(corePlugins);
  await fastify.register(domainsPlugin);
  await fastify.register(apiRoutes);

  fastify.log.info('🚀 Application layers loaded successfully');
};

export default appPlugin;
