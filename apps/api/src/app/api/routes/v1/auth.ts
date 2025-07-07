import { FastifyInstance } from 'fastify';
import { authRoutes } from '../../../domains/auth/routes/auth-routes';
import { apiKeyRoutes } from '../../../domains/auth/routes/api-key.routes';

export default async function authV1Routes(fastify: FastifyInstance) {
  // Register auth routes with version prefix
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // Register API key routes under auth prefix
  await fastify.register(apiKeyRoutes, { prefix: '/auth' });
}