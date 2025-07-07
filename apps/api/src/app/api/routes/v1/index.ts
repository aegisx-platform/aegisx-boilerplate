import { FastifyInstance } from 'fastify';

// V1 API routes
import authRoutes from './auth';
import rbacRoutes from './rbac';
import userManagementRoutes from './user-management';
import auditRoutes from './audit';
import storageRoutes from './storage';
import reportsRoutes from './reports';

export default async function v1Routes(fastify: FastifyInstance) {
  // Register all v1 routes
  await fastify.register(authRoutes);
  await fastify.register(rbacRoutes);
  await fastify.register(userManagementRoutes);
  await fastify.register(auditRoutes);
  await fastify.register(storageRoutes);
  await fastify.register(reportsRoutes);

  fastify.log.info('✅ API v1 routes loaded');
}
