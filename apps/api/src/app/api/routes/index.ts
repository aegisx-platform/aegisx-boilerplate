import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import v1Routes from './v1';

const apiRoutes = async (fastify: FastifyInstance) => {
  // Register versioned API routes
  await fastify.register(v1Routes, { prefix: '/api/v1' });

  fastify.log.info('✅ API routes loaded with versioning');
};

export default fp(apiRoutes, {
  name: 'api-routes',
  dependencies: ['domains-plugin']
});