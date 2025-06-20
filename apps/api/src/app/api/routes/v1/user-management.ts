import { FastifyInstance } from 'fastify';
import { userManagementRoutes } from '../../../domains/user-management/routes/user-management-routes';

export default async function userManagementV1Routes(fastify: FastifyInstance) {
  // Register user management routes with version prefix
  await fastify.register(userManagementRoutes, { prefix: '/user-management' });
}
