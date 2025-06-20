import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// V1 API routes
import authRoutes from './auth';
import rbacRoutes from './rbac';

const v1Routes = async (fastify: FastifyInstance) => {
  // Register all v1 routes
  await fastify.register(authRoutes);
  await fastify.register(rbacRoutes);

  fastify.log.info('✅ API v1 routes loaded');
};

export default fp(v1Routes, {
  name: 'api-v1-routes'
});