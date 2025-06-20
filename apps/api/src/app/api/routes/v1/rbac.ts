import { FastifyInstance } from 'fastify';
import rbacRoutes from '../../../domains/rbac/routes/rbac-routes';

export default async function rbacV1Routes(fastify: FastifyInstance) {
  // Register RBAC routes with version prefix
  await fastify.register(rbacRoutes, { prefix: '/rbac' });
}