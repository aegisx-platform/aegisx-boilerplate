import { FastifyInstance } from 'fastify';
import v1Routes from './v1';

const apiRoutes = async (fastify: FastifyInstance) => {

  // API root endpoint
  fastify.get('/', async (request, reply) => {
    return { message: 'AegisX API V1.0' };
  });

  // Register versioned API routes
  await fastify.register(v1Routes, { prefix: '/api/v1' });

  fastify.log.info('✅ API routes loaded with versioning');
};

export default apiRoutes;
