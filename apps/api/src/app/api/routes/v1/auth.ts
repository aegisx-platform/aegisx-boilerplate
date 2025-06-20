import { FastifyInstance } from 'fastify';
import { authRoutes } from '../../../domains/auth/routes/auth-routes';

export default async function authV1Routes(fastify: FastifyInstance) {
  // Register auth routes with version prefix
  await fastify.register(authRoutes, { prefix: '/auth' });
}